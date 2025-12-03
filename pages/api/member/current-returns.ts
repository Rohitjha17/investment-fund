import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { calculateComplexInterest, getCurrentMonthWindow, isSecondOfMonth } from '@/lib/utils';

/**
 * Calculate current returns for a member
 * - If deposit date is in current month: Calculate from deposit date+1 to last day of current month
 * - If past 2nd of month: Returns are already stored, return from database
 * - If before 2nd: Calculate what will be the return for current month cycle
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    const member = await db.getMember(parseInt(member_id));
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const deposits = member.deposits || [];
    const withdrawals = member.withdrawals || [];
    const defaultPercentage = (member as any).percentage_of_return || 0;

    if (deposits.length === 0) {
      return res.status(200).json({
        member_id: parseInt(member_id),
        current_return: 0,
        period_type: 'no_deposits',
        message: 'No deposits found'
      });
    }

    const today = new Date();
    const currentDate = today.getDate();
    const isPastSecond = currentDate >= 2;

    // Get current month window (1 to last day)
    const currentWindow = getCurrentMonthWindow();

    // Check if any deposit is in current month
    const depositsInCurrentMonth = deposits.filter((d: any) => {
      const depositDate = new Date(d.deposit_date);
      return depositDate.getMonth() === today.getMonth() && 
             depositDate.getFullYear() === today.getFullYear();
    });

    let returnAmount = 0;
    let periodType = '';
    let periodInfo = '';
    let interestDays = 0;

    // Get last day of current month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthEndDate = new Date(today.getFullYear(), today.getMonth(), lastDay, 23, 59, 59, 999);

    if (depositsInCurrentMonth.length > 0) {
      // Has deposits in current month
      // IMPORTANT: Use 1st of month as periodStart
      // calculateComplexInterest internally handles (deposit date + 1) for each deposit
      // So old deposits will calculate from 1st, new deposits from their date + 1
      
      interestDays = lastDay;

      // Calculate interest for current month (use 1st of month as start)
      returnAmount = calculateComplexInterest(
        deposits.map((d: any) => ({
          amount: d.amount,
          date: d.deposit_date,
          percentage: d.percentage !== null && d.percentage !== undefined
            ? d.percentage
            : defaultPercentage
        })),
        withdrawals.map((w: any) => ({
          amount: w.amount,
          date: w.withdrawal_date
        })),
        defaultPercentage,
        currentWindow.start, // Always use 1st of month - the function handles deposit date + 1 internally
        monthEndDate
      );

      periodType = 'current_month_with_new_deposits';
      periodInfo = `1st to ${lastDay}th of ${today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} (includes new deposits)`;
    } else {
      // No deposits in current month - use full month window
      if (isPastSecond) {
        // Already past 2nd - return should be in database
        const currentMonthReturns = member.returns.filter((r: any) => {
          const returnDate = new Date(r.return_date);
          return returnDate.getMonth() === today.getMonth() && 
                 returnDate.getFullYear() === today.getFullYear();
        });

        if (currentMonthReturns.length > 0) {
          // Return exists in database
          returnAmount = currentMonthReturns.reduce((sum: number, r: any) => sum + r.return_amount, 0);
          interestDays = currentMonthReturns[0].interest_days || 30;
          periodType = 'stored_return';
          periodInfo = `Stored return for ${today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`;
        } else {
          // Calculate for current month (full month)
          returnAmount = calculateComplexInterest(
            deposits.map((d: any) => ({
              amount: d.amount,
              date: d.deposit_date,
              percentage: d.percentage !== null && d.percentage !== undefined
                ? d.percentage
                : defaultPercentage
            })),
            withdrawals.map((w: any) => ({
              amount: w.amount,
              date: w.withdrawal_date
            })),
            defaultPercentage,
            currentWindow.start,
            currentWindow.end
          );
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          interestDays = lastDay;
          periodType = 'current_month_full';
          periodInfo = `1st to ${lastDay}th of ${today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`;
        }
      } else {
        // Before 2nd - calculate what will be the return
        returnAmount = calculateComplexInterest(
          deposits.map((d: any) => ({
            amount: d.amount,
            date: d.deposit_date,
            percentage: d.percentage !== null && d.percentage !== undefined
              ? d.percentage
              : defaultPercentage
          })),
          withdrawals.map((w: any) => ({
            amount: w.amount,
            date: w.withdrawal_date
          })),
          defaultPercentage,
          currentWindow.start,
          currentWindow.end
        );
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        interestDays = lastDay;
        periodType = 'current_month_projected';
        periodInfo = `1st to ${lastDay}th of ${today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} (Projected)`;
      }
    }

    // Calculate per-deposit breakdown
    // First, apply withdrawals to deposits using FIFO to get remaining amounts
    const depositsWithWithdrawals = [...deposits].sort((a: any, b: any) => 
      new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
    );
    
    let remainingWithdrawal = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
    const adjustedDeposits = depositsWithWithdrawals.map((d: any) => {
      let adjustedAmount = d.amount;
      if (remainingWithdrawal > 0) {
        const reduction = Math.min(adjustedAmount, remainingWithdrawal);
        adjustedAmount -= reduction;
        remainingWithdrawal -= reduction;
      }
      return {
        ...d,
        original_amount: d.amount,
        adjusted_amount: adjustedAmount
      };
    });
    
    // Use full month window for breakdown calculation
    // calculateComplexInterest handles (deposit date + 1) internally for each deposit
    const breakdownStartDate = currentWindow.start;
    const breakdownEndDate = currentWindow.end;
    
    // Calculate interest for each deposit on its adjusted amount
    const depositBreakdown = adjustedDeposits.map((d: any) => {
      const depositRate = d.percentage !== null && d.percentage !== undefined
        ? d.percentage
        : defaultPercentage;
      
      // Calculate interest for this specific deposit (without withdrawals, as they're already applied)
      // calculateComplexInterest handles (deposit date + 1) internally
      const depositInterest = calculateComplexInterest(
        [{
          amount: d.adjusted_amount,
          date: d.deposit_date,
          percentage: depositRate
        }],
        [], // No withdrawals - already applied above
        defaultPercentage,
        breakdownStartDate,
        breakdownEndDate
      );
      
      return {
        deposit_id: d.id,
        amount: d.original_amount,
        adjusted_amount: d.adjusted_amount,
        percentage: depositRate,
        interest: Math.round(depositInterest * 100) / 100
      };
    });

    return res.status(200).json({
      member_id: parseInt(member_id),
      current_return: Math.round(returnAmount * 100) / 100,
      interest_days: interestDays,
      period_type: periodType,
      period_info: periodInfo,
      calculation_date: today.toISOString(),
      deposit_breakdown: depositBreakdown
    });
  } catch (error) {
    console.error('Error calculating current returns:', error);
    return res.status(500).json({ error: 'Failed to calculate current returns' });
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

