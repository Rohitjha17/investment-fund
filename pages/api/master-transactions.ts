import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { member_id, start_date, end_date, month } = req.query;

      const [deposits, withdrawals, returns, members] = await Promise.all([
        db.getDeposits(),
        db.getWithdrawals(),
        db.getReturns(),
        db.getMembers()
      ]);

      const memberMap = new Map(members.map((m: any) => [m.id, m]));

      const allTransactions: any[] = [
        ...deposits.map((d: any) => ({
          id: d.id,
          type: 'deposit',
          transaction_type: 'deposit',
          member_id: d.member_id,
          member_name: d.member_name,
          alias_name: d.alias_name,
          unique_number: d.unique_number,
          amount: d.amount,
          date: d.deposit_date,
          percentage: d.percentage,
          notes: d.notes,
          created_at: d.created_at
        })),
        ...withdrawals.map((w: any) => ({
          id: w.id,
          type: 'withdrawal',
          transaction_type: 'withdrawal',
          member_id: w.member_id,
          member_name: w.member_name,
          alias_name: w.alias_name,
          unique_number: w.unique_number,
          amount: w.amount,
          date: w.withdrawal_date,
          percentage: null,
          notes: w.notes,
          created_at: w.created_at
        })),
        ...returns.map((r: any) => {
          const member = memberMap.get(r.member_id);
          return {
            id: r.id,
            type: 'return',
            transaction_type: 'return',
            member_id: r.member_id,
            member_name: r.member_name,
            alias_name: r.alias_name,
            unique_number: member?.unique_number || null,
            village: member?.village || null,
            town: member?.town || null,
            percentage_of_return: member?.percentage_of_return || null,
            amount: r.return_amount,
            date: r.return_date,
            percentage: null,
            interest_days: r.interest_days,
            notes: r.notes,
            created_at: r.created_at
          };
        })
      ];

      let filteredTransactions = allTransactions;
      if (member_id) {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.member_id === parseInt(member_id as string, 10)
        );
      }

      let rangeStart: Date | null = null;
      let rangeEnd: Date | null = null;

      if (month && typeof month === 'string') {
        const [yearStr, monthStr] = month.split('-');
        if (yearStr && monthStr) {
          const year = parseInt(yearStr, 10);
          const monthIndex = parseInt(monthStr, 10) - 1;
          rangeStart = new Date(year, monthIndex, 1);
          rangeEnd = new Date(year, monthIndex, 30, 23, 59, 59, 999);
        }
      } else if (start_date && end_date) {
        rangeStart = new Date(start_date as string);
        rangeEnd = new Date(end_date as string);
        rangeEnd.setHours(23, 59, 59, 999);
      }

      if (rangeStart && rangeEnd) {
        filteredTransactions = filteredTransactions.filter((t) => {
          const transactionDate = new Date(t.date);
          return transactionDate >= rangeStart! && transactionDate <= rangeEnd!;
        });
      }

      filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json(filteredTransactions);
    } catch (error) {
      console.error('Error fetching master transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

