import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const deposits = db.getDeposits();
      const withdrawals = db.getWithdrawals();
      const returns = db.getReturns();

      // Combine and sort by date
      const allTransactions = [
        ...deposits.map((d: any) => ({ 
          ...d, 
          date: d.deposit_date, 
          amount: d.amount,
          type: 'deposit',
          transaction_type: 'deposit'
        })),
        ...withdrawals.map((w: any) => ({ 
          ...w, 
          date: w.withdrawal_date, 
          amount: Math.abs(w.amount),
          type: 'withdrawal',
          transaction_type: 'withdrawal'
        })),
        ...returns.map((r: any) => ({ 
          ...r, 
          date: r.return_date, 
          amount: r.return_amount,
          type: 'return',
          transaction_type: 'return'
        }))
      ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }


  return res.status(405).json({ error: 'Method not allowed' });
}

