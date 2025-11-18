import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { parseDate } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET all deposits
  if (req.method === 'GET') {
    try {
      const deposits = await db.getDeposits();
      return res.status(200).json(deposits);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      return res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  }

  // POST create deposit
  if (req.method === 'POST') {
    try {
      const { member_id, amount, deposit_date, percentage, notes } = req.body;

      if (!member_id || !amount || !deposit_date) {
        return res.status(400).json({ error: 'Member ID, amount, and deposit date are required' });
      }

      const parsedDate = parseDate(deposit_date);
      
      const deposit = await db.createDeposit({
        member_id,
        amount,
        deposit_date: parsedDate,
        percentage: percentage ? parseFloat(percentage) : null,
        notes
      });

      return res.status(201).json({ id: deposit.id, success: true });
    } catch (error) {
      console.error('Error creating deposit:', error);
      return res.status(500).json({ error: 'Failed to create deposit' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
