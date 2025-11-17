import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { calculateComplexInterest, getPreviousMonthWindow, isSecondOfMonth } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { force } = req.query;
    const isForceMode = force === 'true' || req.body?.force === true;

    if (!isSecondOfMonth() && req.method === 'GET' && !isForceMode) {
      return res.status(200).json({
        message: 'Automatic calculation runs on 2nd of each month. Use ?force=true to test manually.',
        isCalculated: false,
        today: new Date().getDate(),
        tip: 'Add ?force=true to query string to test manually'
      });
    }

    const { start, end, month } = getPreviousMonthWindow();

    if (await db.isMonthCalculated(month)) {
      if (!isForceMode) {
        return res.status(200).json({
          message: `Returns for ${month} already calculated`,
          month,
          calculated: true,
          tip: 'Use ?force=true to recalculate'
        });
      }
    }

    const allMembers = await db.getMembers();
    let calculatedCount = 0;
    let totalReturns = 0;

    for (const memberData of allMembers) {
      const member = await db.getMember(memberData.id);
      if (!member) continue;

      const deposits = member.deposits || [];
      const withdrawals = member.withdrawals || [];

      if (deposits.length === 0) continue;

      const interest = calculateComplexInterest(
        deposits.map((d: any) => ({
          amount: d.amount,
          date: d.deposit_date,
          percentage: d.percentage !== null && d.percentage !== undefined ? d.percentage : member.percentage_of_return
        })),
        withdrawals.map((w: any) => ({
          amount: w.amount,
          date: w.withdrawal_date
        })),
        member.percentage_of_return,
        start,
        end
      );

      if (interest > 0) {
        const returnDate = new Date();
        returnDate.setDate(2);

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

    await db.markMonthCalculated(month);

    return res.status(200).json({
      message: `Successfully calculated returns for ${month}`,
      month,
      membersCalculated: calculatedCount,
      totalReturns: Math.round(totalReturns * 100) / 100,
      calculationDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating monthly returns:', error);
    return res.status(500).json({ error: 'Failed to calculate monthly returns' });
  }
}

