import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { calculateComplexInterest, getNextMonthWindow } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    const referrer = await db.getMember(parseInt(member_id));
    if (!referrer) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Type assertion for referrer with all properties
    const referrerData = referrer as any;

    // Use next month window (1-30)
    const window = getNextMonthWindow();
    const startDate = window.start;
    const endDate = window.end;

    // Find all members referred by this person
    const allMembers = await db.getMembers();
    const referredMembers = allMembers.filter((m: any) => 
      m.referral_name && 
      (m.referral_name.toLowerCase() === referrerData.name.toLowerCase() ||
       m.referral_name.toLowerCase() === `${referrerData.name} #${referrerData.unique_number || referrerData.id}`.toLowerCase())
    );

    let totalReferralIncome = 0;
    const referralBreakdown: any[] = [];

    // Calculate referral income for each referred member (next month cycle)
    for (const referred of referredMembers) {
      const fullReferred = await db.getMember(parseInt(referred.id.toString()));
      if (!fullReferred) continue;

      // Type assertion for fullReferred with all properties
      const referredData = fullReferred as any;

      const deposits = (fullReferred.deposits || []).map((d: any) => ({
        amount: d.amount,
        date: d.deposit_date,
        percentage: d.percentage !== null && d.percentage !== undefined 
          ? d.percentage 
          : referredData.percentage_of_return
      }));
      
      const withdrawals = (fullReferred.withdrawals || []).map((w: any) => ({
        amount: w.amount,
        date: w.withdrawal_date
      }));

      // Calculate interest for next month (1-30 day cycle)
      const interestEarned = calculateComplexInterest(
        deposits,
        withdrawals,
        referredData.percentage_of_return,
        startDate,
        endDate
      );

      const referralPercent = referredData.referral_percent || 0;
      const referralIncome = (interestEarned * referralPercent) / 100;

      totalReferralIncome += referralIncome;

      referralBreakdown.push({
        member_id: fullReferred.id,
        member_name: referredData.name,
        interest_earned: interestEarned,
        referral_percent: referralPercent,
        referral_income: referralIncome
      });
    }

    return res.status(200).json({
      referrer_id: parseInt(member_id),
      referrer_name: referrerData.name,
      next_referral_amount: Math.round(totalReferralIncome * 100) / 100,
      referred_count: referredMembers.length,
      breakdown: referralBreakdown,
      period: 'Next Month (1-30)',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error calculating next referral:', error);
    return res.status(500).json({ error: 'Failed to calculate next referral' });
  }
}

