import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { calculateComplexInterest, getCurrentMonthWindow } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current month window for calculations
    const window = getCurrentMonthWindow();
    const startDate = window.start;
    const endDate = window.end;

    // Get all members
    const allMembers = await db.getMembers();
    
    // Create a map to store referral commissions for each referrer
    const referralCommissions: Record<string, {
      referrer_name: string;
      total_commission: number;
      referred_count: number;
      breakdown: Array<{
        member_id: number;
        member_name: string;
        interest_earned: number;
        referral_percent: number;
        commission_amount: number;
        is_direct: boolean;
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

    // Process each member to calculate referral commissions
    for (const member of allMembers) {
      const memberId = parseInt(member.id.toString());
      const fullMember = await db.getMember(memberId);
      if (!fullMember) continue;

      const referralName = (fullMember as any).referral_name;
      const referralPercent = (fullMember as any).referral_percent || 0;

      if (!referralName || referralPercent === 0) continue;

      // Calculate this member's current month interest
      const defaultPercentage = (fullMember as any).percentage_of_return || 0;
      const deposits = (fullMember.deposits || []).map((d: any) => ({
        amount: d.amount,
        date: d.deposit_date,
        percentage: d.percentage !== null && d.percentage !== undefined 
          ? d.percentage 
          : defaultPercentage
      }));
      
      const withdrawals = (fullMember.withdrawals || []).map((w: any) => ({
        amount: w.amount,
        date: w.withdrawal_date
      }));

      // Calculate interest earned by this member
      const interestEarned = calculateComplexInterest(
        deposits,
        withdrawals,
        defaultPercentage,
        startDate,
        endDate
      );

      // Calculate commission for the referrer
      const commissionAmount = (interestEarned * referralPercent) / 100;

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
        member_id: memberId,
        member_name: (fullMember as any).name,
        interest_earned: interestEarned,
        referral_percent: referralPercent,
        commission_amount: commissionAmount,
        is_direct: isDirect
      });
    }

    // Convert to array and sort by total commission (highest first)
    const commissionData = Object.values(referralCommissions)
      .map(data => ({
        ...data,
        total_commission: Math.round(data.total_commission * 100) / 100
      }))
      .sort((a, b) => b.total_commission - a.total_commission);

    return res.status(200).json({
      period: 'Current Month',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      referral_commissions: commissionData
    });
  } catch (error) {
    console.error('Error calculating referral commissions:', error);
    return res.status(500).json({ error: 'Failed to calculate referral commissions' });
  }
}
