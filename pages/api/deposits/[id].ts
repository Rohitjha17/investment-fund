import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid deposit ID' });
  }

  const depositId = parseInt(id);

  // DELETE deposit
  if (req.method === 'DELETE') {
    try {
      const success = await db.deleteDeposit(depositId);

      if (!success) {
        return res.status(404).json({ error: 'Deposit not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting deposit:', error);
      return res.status(500).json({ error: 'Failed to delete deposit' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}



