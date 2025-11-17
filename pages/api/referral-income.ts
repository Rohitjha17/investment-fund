import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { calculateComplexInterest, getCurrentMonthWindow } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { member_id, start_date, end_date } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    const referrer = await db.getMember(parseInt(member_id, 10));
    if (!referrer) {
      return res.status(404).json({ error: 'Member not found' });
    }

    let startDate: Date;
    let endDate: Date;

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      const window = getCurrentMonthWindow();
      startDate = window.start;
      endDate = window.end;
    }

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

    for (const basicReferred of referredMembers) {
      const referred = await db.getMember(basicReferred.id);
      if (!referred) continue;

      const deposits = (referred.deposits || []).map((d: any) => ({
        amount: d.amount,
        date: d.deposit_date,
        percentage:
          d.percentage !== null && d.percentage !== undefined ? d.percentage : referred.percentage_of_return
      }));

      const withdrawals = (referred.withdrawals || []).map((w: any) => ({
        amount: w.amount,
        date: w.withdrawal_date
      }));

      const interestEarned = calculateComplexInterest(
        deposits,
        withdrawals,
        referred.percentage_of_return,
        startDate,
        endDate
      );

      const referralPercent = referred.referral_percent || 0;
      const referralIncome = (interestEarned * referralPercent) / 100;

      totalReferralIncome += referralIncome;

      referralBreakdown.push({
        member_id: referred.id,
        member_name: referred.name,
        interest_earned: interestEarned,
        referral_percent: referralPercent,
        referral_income: referralIncome
      });
    }

    return res.status(200).json({
      referrer_id: parseInt(member_id, 10),
      referrer_name: referrer.name,
      total_referral_income: Math.round(totalReferralIncome * 100) / 100,
      referred_count: referredMembers.length,
      breakdown: referralBreakdown,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error calculating referral income:', error);
    return res.status(500).json({ error: 'Failed to calculate referral income' });
  }
}

