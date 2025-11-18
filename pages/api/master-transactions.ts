import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { member_id, start_date, end_date } = req.query;

      // Get all transactions
      const deposits = await db.getDeposits();
      const withdrawals = await db.getWithdrawals();
      const returns = await db.getReturns();

      // Combine all transactions
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
        ...(await Promise.all(returns.map(async (r: any) => {
          // Always fetch latest member details to ensure data is up-to-date
          const memberId = parseInt(r.member_id) || r.member_id;
          let member = await db.getMember(parseInt(memberId));
          
          // If member not found with parsed ID, try with original ID
          if (!member && memberId !== parseInt(memberId)) {
            member = await db.getMember(memberId);
          }
          
          // If still no member, return basic info from return record
          if (!member) {
            return {
              id: r.id,
              type: 'return',
              transaction_type: 'return',
              member_id: memberId,
              member_name: r.member_name || 'Unknown',
              alias_name: null,
              unique_number: null,
              village: null,
              town: null,
              percentage_of_return: null,
              deposits: [],
              amount: r.return_amount,
              date: r.return_date,
              percentage: null,
              interest_days: r.interest_days,
              notes: r.notes,
              created_at: r.created_at
            };
          }
          
          // Get current deposits (always fetch latest)
          const memberDeposits = member.deposits || [];
          
          // Ensure we have valid deposits data with all details
          const memberPercentage = (member as any)?.percentage_of_return || 0;
          const depositsData = memberDeposits.length > 0 ? memberDeposits.map((d: any) => ({
            id: parseInt(d.id) || d.id,
            amount: parseFloat(d.amount) || 0,
            deposit_date: d.deposit_date || '',
            percentage: d.percentage !== null && d.percentage !== undefined 
              ? parseFloat(d.percentage) 
              : memberPercentage,
            notes: d.notes || null
          })) : [];
          
          // Return with latest member details
          return {
            id: r.id,
            type: 'return',
            transaction_type: 'return',
            member_id: memberId,
            member_name: (member as any).name || r.member_name || '',
            alias_name: (member as any).alias_name || null,
            unique_number: (member as any).unique_number || null,
            village: (member as any).village || null,
            town: (member as any).town || null,
            percentage_of_return: (member as any).percentage_of_return || null,
            deposits: depositsData,
            amount: r.return_amount,
            date: r.return_date,
            percentage: null,
            interest_days: r.interest_days,
            notes: r.notes,
            created_at: r.created_at,
            last_updated: new Date().toISOString() // Track when data was fetched
          };
        })))
      ];

      // Filter by member_id if provided
      let filteredTransactions = allTransactions;
      if (member_id) {
        filteredTransactions = filteredTransactions.filter(t => t.member_id === parseInt(member_id as string));
      }

      // Filter by date range if provided
      if (start_date && end_date) {
        const start = new Date(start_date as string);
        const end = new Date(end_date as string);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        
        filteredTransactions = filteredTransactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate >= start && transactionDate <= end;
        });
      }

      // Sort by date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json(filteredTransactions);
    } catch (error) {
      console.error('Error fetching master transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

