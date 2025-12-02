import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';

// Get month window for any given month (format: YYYY-MM)
function getMonthWindow(monthStr?: string): { start: Date; end: Date } {
  let year: number, month: number;
  
  if (monthStr) {
    const [y, m] = monthStr.split('-');
    year = parseInt(y);
    month = parseInt(m) - 1; // Convert to 0-indexed
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }
  
  const start = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = new Date(year, month, lastDay, 23, 59, 59, 999);
  
  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get month from query params (optional - defaults to current month)
    const { month } = req.query;
    const monthStr = typeof month === 'string' ? month : undefined;
    
    // Get month window for calculations
    const window = getMonthWindow(monthStr);
    const startDate = window.start;
    const endDate = window.end;

    // Get all members (optimized - only basic info needed)
    const allMembers = await db.getMembers();
    
    // Create a map to store referral commissions for each referrer
    const referralCommissions: Record<string, {
      referrer_name: string;
      total_commission: number;
      referred_count: number;
      breakdown: Array<{
        member_id: number;
        member_name: string;
        principal_amount: number;
        referral_percent: number;
        commission_amount: number;
        is_direct: boolean;
        investment_date?: string;
      }>;
    }> = {};

    // Helper function to find the root referrer
    const findRootReferrer = (memberName: string, visited = new Set<string>()): string => {
      if (visited.has(memberName.toLowerCase())) {
        return memberName; // Prevent infinite loops
      }
      visited.add(memberName.toLowerCase());

      const member = allMembers.find((m: any) => 
        m.name && m.name.toLowerCase() === memberName.toLowerCase()
      );
      
      if (!member || !(member as any).referral_name) {
        return memberName; // This is the root referrer
      }
      
      return findRootReferrer((member as any).referral_name, visited);
    };

    // OPTIMIZED: Only fetch full member data for members with referrals
    const membersWithReferrals = allMembers.filter((m: any) => 
      (m as any).referral_name && (m as any).referral_percent > 0
    );

    // OPTIMIZED: Fetch all members in parallel instead of sequentially
    const memberIds = membersWithReferrals.map(m => parseInt(m.id.toString()));
    const fullMembers = await Promise.all(
      memberIds.map(id => db.getMember(id))
    );

    // Process each member to calculate referral commissions
    for (let i = 0; i < fullMembers.length; i++) {
      const fullMember = fullMembers[i];
      if (!fullMember) continue;

      const referralName = (fullMember as any).referral_name;
      const referralPercent = (fullMember as any).referral_percent || 0;

      if (!referralName || referralPercent === 0) continue;

      // Calculate principal amount (total deposits - total withdrawals) as of the selected month
      const deposits = (fullMember.deposits || []).filter((d: any) => {
        const depositDate = new Date(d.deposit_date);
        return depositDate <= endDate;
      });
      
      const withdrawals = (fullMember.withdrawals || []).filter((w: any) => {
        const withdrawalDate = new Date(w.withdrawal_date);
        return withdrawalDate <= endDate;
      });

      const totalDeposits = deposits.reduce((sum: number, d: any) => sum + d.amount, 0);
      const totalWithdrawals = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
      const principalAmount = totalDeposits - totalWithdrawals;

      if (principalAmount <= 0) continue;

      // Find earliest deposit date for this member
      const depositDates = deposits.map((d: any) => new Date(d.deposit_date));
      const earliestDepositDate = depositDates.length > 0 
        ? new Date(Math.min(...depositDates.map((d: Date) => d.getTime())))
        : null;

      // Calculate commission based on principal amount
      // For first month: If investment is made mid-month, commission should be prorated
      let commissionAmount = (principalAmount * referralPercent) / 100;
      
      // If this is the first month (investment month), prorate commission based on investment date
      if (earliestDepositDate && 
          earliestDepositDate.getMonth() === startDate.getMonth() && 
          earliestDepositDate.getFullYear() === startDate.getFullYear()) {
        // Investment was made in this month - calculate days from investment date+1 to end of month
        const investmentDate = new Date(earliestDepositDate);
        investmentDate.setHours(0, 0, 0, 0);
        // Calculate actual last day of the month (28/29/30/31)
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        // Interest starts from next day after deposit, so calculate from deposit date + 1
        const daysFromInvestment = daysInMonth - investmentDate.getDate(); // Days from (deposit date + 1) to end of month
        const proratedFactor = daysFromInvestment / daysInMonth;
        commissionAmount = commissionAmount * proratedFactor;
      }

      // Find the root referrer for hierarchical referrals
      const rootReferrer = findRootReferrer(referralName);
      const normalizedRootReferrer = rootReferrer.toLowerCase().trim();
      const isDirect = rootReferrer.toLowerCase() === referralName.toLowerCase();

      if (!referralCommissions[normalizedRootReferrer]) {
        referralCommissions[normalizedRootReferrer] = {
          referrer_name: rootReferrer,
          total_commission: 0,
          referred_count: 0,
          breakdown: []
        };
      }

      referralCommissions[normalizedRootReferrer].total_commission += commissionAmount;
      referralCommissions[normalizedRootReferrer].referred_count += 1;
      referralCommissions[normalizedRootReferrer].breakdown.push({
        member_id: memberIds[i],
        member_name: (fullMember as any).name,
        principal_amount: principalAmount,
        referral_percent: referralPercent,
        commission_amount: commissionAmount,
        is_direct: isDirect,
        investment_date: earliestDepositDate ? earliestDepositDate.toISOString().split('T')[0] : undefined
      });
    }

    // Convert to array and sort by total commission (highest first)
    const commissionData = Object.values(referralCommissions)
      .map(data => ({
        ...data,
        total_commission: Math.round(data.total_commission * 100) / 100,
        breakdown: data.breakdown.map(b => ({
          ...b,
          commission_amount: Math.round(b.commission_amount * 100) / 100
        }))
      }))
      .sort((a, b) => b.total_commission - a.total_commission);

    // Format period name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const periodName = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    // Set no-cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json({
      period: periodName,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      referral_commissions: commissionData
    });
  } catch (error) {
    console.error('Error calculating referral commissions:', error);
    return res.status(500).json({ error: 'Failed to calculate referral commissions' });
  }
}
