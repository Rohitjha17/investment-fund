import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { calculateComplexInterest, getCurrentMonthWindow, isSecondOfMonth } from '@/lib/utils';

/**
 * Batch endpoint to calculate current returns for multiple members at once
 * This avoids N+1 query problem
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { member_ids } = req.body;

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'member_ids array is required' });
    }

    // Limit batch size to prevent timeout
    const MAX_BATCH_SIZE = 50;
    const memberIds = member_ids.slice(0, MAX_BATCH_SIZE).map((id: any) => parseInt(id));

    const today = new Date();
    const currentDate = today.getDate();
    const isPastSecond = currentDate >= 2;
    const currentWindow = getCurrentMonthWindow();

    // Fetch all members in parallel
    const members = await Promise.all(
      memberIds.map(id => db.getMember(id))
    );

    const results: Record<number, number> = {};

    // Process each member
    for (const member of members) {
      if (!member) continue;

      const memberId = typeof member.id === 'number' ? member.id : parseInt(member.id.toString());
      const deposits = member.deposits || [];
      const withdrawals = member.withdrawals || [];
      const defaultPercentage = (member as any).percentage_of_return || 0;

      if (deposits.length === 0) {
        results[memberId] = 0;
        continue;
      }

      // Check if any deposit is in current month
      const depositsInCurrentMonth = deposits.filter((d: any) => {
        const depositDate = new Date(d.deposit_date);
        return depositDate.getMonth() === today.getMonth() && 
               depositDate.getFullYear() === today.getFullYear();
      });

      let returnAmount = 0;

      if (depositsInCurrentMonth.length > 0) {
        // Has deposits in current month
        const firstDeposit = depositsInCurrentMonth.sort((a: any, b: any) => 
          new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
        )[0];

        const depositDate = new Date(firstDeposit.deposit_date);
        const startDate = new Date(depositDate);
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 30, 23, 59, 59, 999);

        returnAmount = calculateComplexInterest(
          deposits.map((d: any) => ({
            amount: d.amount,
            date: d.deposit_date,
            percentage: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage
          })),
          withdrawals.map((w: any) => ({
            amount: w.amount,
            date: w.withdrawal_date
          })),
          defaultPercentage,
          startDate,
          endDate
        );
      } else {
        // No deposits in current month
        if (isPastSecond) {
          // Check if return exists in database
          const currentMonthReturns = member.returns.filter((r: any) => {
            const returnDate = new Date(r.return_date);
            return returnDate.getMonth() === today.getMonth() && 
                   returnDate.getFullYear() === today.getFullYear();
          });

          if (currentMonthReturns.length > 0) {
            returnAmount = currentMonthReturns.reduce((sum: number, r: any) => sum + r.return_amount, 0);
          } else {
            // Calculate for current month
            returnAmount = calculateComplexInterest(
              deposits.map((d: any) => ({
                amount: d.amount,
                date: d.deposit_date,
                percentage: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage
              })),
              withdrawals.map((w: any) => ({
                amount: w.amount,
                date: w.withdrawal_date
              })),
              defaultPercentage,
              currentWindow.start,
              currentWindow.end
            );
          }
        } else {
          // Before 2nd - calculate projected return
          returnAmount = calculateComplexInterest(
            deposits.map((d: any) => ({
              amount: d.amount,
              date: d.deposit_date,
              percentage: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage
            })),
            withdrawals.map((w: any) => ({
              amount: w.amount,
              date: w.withdrawal_date
            })),
            defaultPercentage,
            currentWindow.start,
            currentWindow.end
          );
        }
      }

      results[memberId] = Math.round(returnAmount * 100) / 100;
    }

    // Set no-cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json({
      current_returns: results
    });
  } catch (error) {
    console.error('Error calculating batch current returns:', error);
    return res.status(500).json({ error: 'Failed to calculate current returns' });
  }
}

