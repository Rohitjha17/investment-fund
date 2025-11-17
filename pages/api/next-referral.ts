import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
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

    const referrer = await db.getMember(parseInt(member_id, 10));
    if (!referrer) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const window = getNextMonthWindow();
    const startDate = window.start;
    const endDate = window.end;

    const allMembers = await db.getMembers();
    const referredMembers = allMembers.filter((m: any) => {
      if (!m.referral_name) return false;
      const normalizedReferral = m.referral_name.toLowerCase();
      return (
        normalizedReferral === referrer.name.toLowerCase() ||
        normalizedReferral === `${referrer.name} #${referrer.unique_number || referrer.id}`.toLowerCase()
      );
    });

    let totalReferralIncome = 0;
    const referralBreakdown: any[] = [];

    for (const referred of referredMembers) {
      const fullReferred = await db.getMember(referred.id);
      if (!fullReferred) continue;

      const deposits = (fullReferred.deposits || []).map((d: any) => ({
        amount: d.amount,
        date: d.deposit_date,
        percentage:
          d.percentage !== null && d.percentage !== undefined ? d.percentage : fullReferred.percentage_of_return
      }));

      const withdrawals = (fullReferred.withdrawals || []).map((w: any) => ({
        amount: w.amount,
        date: w.withdrawal_date
      }));

      const interestEarned = calculateComplexInterest(
        deposits,
        withdrawals,
        fullReferred.percentage_of_return,
        startDate,
        endDate
      );

      const referralPercent = fullReferred.referral_percent || 0;
      const referralIncome = (interestEarned * referralPercent) / 100;

      totalReferralIncome += referralIncome;

      referralBreakdown.push({
        member_id: fullReferred.id,
        member_name: fullReferred.name,
        interest_earned: interestEarned,
        referral_percent: referralPercent,
        referral_income: referralIncome
      });
    }

    return res.status(200).json({
      referrer_id: parseInt(member_id, 10),
      referrer_name: referrer.name,
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

