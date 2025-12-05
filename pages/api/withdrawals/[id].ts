import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid withdrawal ID' });
  }

  const withdrawalId = parseInt(id);

  // DELETE withdrawal
  if (req.method === 'DELETE') {
    try {
      const success = await db.deleteWithdrawal(withdrawalId);

      if (!success) {
        return res.status(404).json({ error: 'Withdrawal not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
      return res.status(500).json({ error: 'Failed to delete withdrawal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

