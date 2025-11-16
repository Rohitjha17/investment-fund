import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { parseDate } from '@/lib/utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET all returns
  if (req.method === 'GET') {
    try {
      const returns = db.getReturns();
      return res.status(200).json(returns);
    } catch (error) {
      console.error('Error fetching returns:', error);
      return res.status(500).json({ error: 'Failed to fetch returns' });
    }
  }

  // POST create return
  if (req.method === 'POST') {
    try {
      const { member_id, return_amount, return_date, interest_days, notes } = req.body;

      if (!member_id || !return_amount || !return_date) {
        return res.status(400).json({ error: 'Member ID, return amount, and return date are required' });
      }

      const parsedDate = parseDate(return_date);

      const returnItem = db.createReturn({
        member_id,
        return_amount,
        return_date: parsedDate,
        interest_days: interest_days || 30,
        notes
      });

      return res.status(201).json({ id: returnItem.id, success: true });
    } catch (error) {
      console.error('Error creating return:', error);
      return res.status(500).json({ error: 'Failed to create return' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
