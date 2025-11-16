import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { calculateComplexInterest, getNextMonthWindow } from '@/lib/utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    const member = db.getMember(parseInt(member_id));
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Use next month window (1-30)
    const window = getNextMonthWindow();
    const startDate = window.start;
    const endDate = window.end;

    // Get all deposits and withdrawals
    const deposits = member.deposits || [];
    const withdrawals = member.withdrawals || [];

    // Calculate interest for next month cycle
    const interest = calculateComplexInterest(
      deposits.map((d: any) => ({
        amount: d.amount,
        date: d.deposit_date,
        percentage: d.percentage !== null && d.percentage !== undefined 
          ? d.percentage 
          : member.percentage_of_return
      })),
      withdrawals.map((w: any) => ({
        amount: w.amount,
        date: w.withdrawal_date
      })),
      member.percentage_of_return,
      startDate,
      endDate
    );

    const currentBalance = deposits.reduce((sum: number, d: any) => sum + d.amount, 0) - 
                          withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

    return res.status(200).json({
      member_id: parseInt(member_id),
      next_return_amount: interest,
      principal: currentBalance,
      percentage: member.percentage_of_return,
      period: 'Next Month (1-30)',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error calculating next return:', error);
    return res.status(500).json({ error: 'Failed to calculate next return' });
  }
}

