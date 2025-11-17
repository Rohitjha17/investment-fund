import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { parseDate } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const withdrawals = await db.getWithdrawals();
      return res.status(200).json(withdrawals);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      return res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { member_id, amount, withdrawal_date, notes } = req.body;

      if (!member_id || !amount || !withdrawal_date) {
        return res.status(400).json({ error: 'Member ID, amount, and withdrawal date are required' });
      }

      const parsedDate = parseDate(withdrawal_date);

      const withdrawal = await db.createWithdrawal({
        member_id,
        amount,
        withdrawal_date: parsedDate,
        notes
      });

      return res.status(201).json({ id: withdrawal.id, success: true });
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      return res.status(500).json({ error: 'Failed to create withdrawal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
