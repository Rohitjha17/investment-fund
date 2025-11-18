import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { calculateComplexInterest, getPreviousMonthWindow, isSecondOfMonth } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For testing: Allow bypass of date check with ?force=true query parameter
    const { force } = req.query;
    const isForceMode = force === 'true' || req.body?.force === true;

    // Check if today is 2nd of the month (skip if force mode)
    if (!isSecondOfMonth() && req.method === 'GET' && !isForceMode) {
      return res.status(200).json({
        message: 'Automatic calculation runs on 2nd of each month. Use ?force=true to test manually.',
        isCalculated: false,
        today: new Date().getDate(),
        tip: 'Add ?force=true to query string to test manually'
      });
    }

    // Get previous month window (1-30)
    const { start, end, month } = getPreviousMonthWindow();

    // Check if already calculated (skip if force mode)
    if (await db.isMonthCalculated(month) && !isForceMode) {
      return res.status(200).json({
        message: `Returns for ${month} already calculated`,
        month,
        calculated: true,
        tip: 'Use ?force=true to recalculate'
      });
    }

    // Get all members
    const allMembers = await db.getMembers();
    let calculatedCount = 0;
    let totalReturns = 0;

    // Calculate returns for each member
    for (const memberData of allMembers) {
      const member = await db.getMember(parseInt(memberData.id.toString()));
      if (!member) continue;

      const deposits = member.deposits || [];
      const withdrawals = member.withdrawals || [];

      // Skip if no deposits
      if (deposits.length === 0) continue;

      // Calculate interest for previous month (1-30 day window)
      const defaultPercentage = (member as any).percentage_of_return || 0;
      
      const interest = calculateComplexInterest(
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
        start,
        end
      );

      // Only create return if interest > 0
      if (interest > 0) {
        // Return date is 2nd of current month (when calculation runs)
        const returnDate = new Date();
        returnDate.setDate(2); // Always 2nd of current month
        
        await db.createReturn({
          member_id: member.id,
          return_amount: interest,
          return_date: returnDate.toISOString().split('T')[0],
          interest_days: 30,
          notes: `Automatic return for ${month} (1-30 day cycle)`
        });

        calculatedCount++;
        totalReturns += interest;
      }
    }

    // Mark month as calculated
    await db.markMonthCalculated(month);

    return res.status(200).json({
      message: `Successfully calculated returns for ${month}`,
      month,
      membersCalculated: calculatedCount,
      totalReturns: Math.round(totalReturns * 100) / 100,
      calculated: true,
      calculationDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating monthly returns:', error);
    return res.status(500).json({ error: 'Failed to calculate monthly returns' });
  }
}

