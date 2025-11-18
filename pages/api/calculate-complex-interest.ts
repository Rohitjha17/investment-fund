import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
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

    const member = await db.getMember(parseInt(member_id));
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get all deposits and withdrawals for this member
    const deposits = member.deposits || [];
    const withdrawals = member.withdrawals || [];

    // Use provided dates OR default to current month (1-30)
    let startDate: Date;
    let endDate: Date;

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      // Default to current month window (1-30)
      const window = getCurrentMonthWindow();
      startDate = window.start;
      endDate = window.end;
    }

    // Calculate complex interest with clamped window
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
      interest: interest,
      principal: currentBalance,
      percentage: member.percentage_of_return,
      calculation_period: '30 days',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error calculating complex interest:', error);
    return res.status(500).json({ error: 'Failed to calculate interest' });
  }
}

