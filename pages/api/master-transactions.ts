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
          // Normalize member_id to number
          let memberId: number;
          if (typeof r.member_id === 'number') {
            memberId = r.member_id;
          } else if (typeof r.member_id === 'string') {
            const parsed = parseInt(r.member_id);
            memberId = isNaN(parsed) ? 0 : parsed;
          } else {
            memberId = parseInt(String(r.member_id)) || 0;
          }
          
          let member = null;
          if (memberId > 0) {
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
          
          // Type assertion for member with all properties
          const memberData = member as any;
          
          // Get current deposits (always fetch latest)
          const memberDeposits = member.deposits || [];
          
          // Ensure we have valid deposits data with all details
          const depositsData = memberDeposits.length > 0 ? memberDeposits.map((d: any) => ({
            id: parseInt(d.id) || d.id,
            amount: parseFloat(d.amount) || 0,
            deposit_date: d.deposit_date || '',
            percentage: d.percentage !== null && d.percentage !== undefined 
              ? parseFloat(d.percentage) 
              : (memberData?.percentage_of_return || 0),
            notes: d.notes || null
          })) : [];
          
          // Return with latest member details
          return {
            id: r.id,
            type: 'return',
            transaction_type: 'return',
            member_id: memberId,
            member_name: memberData.name || r.member_name || '',
            alias_name: memberData.alias_name || null,
            unique_number: memberData.unique_number || null,
            village: memberData.village || null,
            town: memberData.town || null,
            percentage_of_return: memberData.percentage_of_return || null,
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
        const filterMemberId = typeof member_id === 'string' ? parseInt(member_id) : member_id;
        filteredTransactions = filteredTransactions.filter((t: any) => {
          const tMemberId = typeof t.member_id === 'number' ? t.member_id : parseInt(String(t.member_id)) || 0;
          return tMemberId === filterMemberId;
        });
      }

      // Filter by date range if provided
      if (start_date && end_date) {
        try {
          const start = new Date(start_date as string);
          const end = new Date(end_date as string);
          // Set end date to end of day
          end.setHours(23, 59, 59, 999);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            filteredTransactions = filteredTransactions.filter((t: any) => {
              if (!t.date) return false;
              const transactionDate = new Date(t.date);
              return !isNaN(transactionDate.getTime()) && transactionDate >= start && transactionDate <= end;
            });
          }
        } catch (error) {
          console.error('Error filtering by date:', error);
        }
      }

      // Sort by date (newest first)
      filteredTransactions.sort((a: any, b: any) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      return res.status(200).json(filteredTransactions);
    } catch (error) {
      console.error('Error fetching master transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

