import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { parseDate } from '@/lib/utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, type } = req.query;

  if (!id || typeof id !== 'string' || !type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const transactionId = parseInt(id);

  // GET single transaction
  if (req.method === 'GET') {
    try {
      let transaction = null;
      if (type === 'deposit') {
        transaction = db.getDeposit(transactionId);
      } else if (type === 'withdrawal') {
        transaction = db.getWithdrawal(transactionId);
      }

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  }

  // PUT update transaction
  if (req.method === 'PUT') {
    try {
      let success = false;
      
      if (type === 'deposit') {
        const { member_id, amount, deposit_date, percentage, notes } = req.body;
        const parsedDate = parseDate(deposit_date);
        success = db.updateDeposit(transactionId, {
          member_id,
          amount,
          deposit_date: parsedDate,
          percentage,
          notes
        });
      } else if (type === 'withdrawal') {
        const { member_id, amount, withdrawal_date, notes } = req.body;
        const parsedDate = parseDate(withdrawal_date);
        success = db.updateWithdrawal(transactionId, {
          member_id,
          amount,
          withdrawal_date: parsedDate,
          notes
        });
      }

      if (!success) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating transaction:', error);
      return res.status(500).json({ error: 'Failed to update transaction' });
    }
  }

  // DELETE transaction
  if (req.method === 'DELETE') {
    try {
      let success = false;
      
      if (type === 'deposit') {
        success = db.deleteDeposit(transactionId);
      } else if (type === 'withdrawal') {
        success = db.deleteWithdrawal(transactionId);
      }

      if (!success) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

