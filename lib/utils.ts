// Calculate interest for a given amount, rate, and days
function calculateInterestSimple(
  principal: number,
  percentage: number,
  days: number
): number {
  return (principal * percentage * days) / (100 * 30);
}

// Get current month start (day 1) and end (last day of month)
export function getCurrentMonthWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  // Get last day of current month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Set end date to end of last day (23:59:59) to include the full day
  const end = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999);
  return { start, end };
}

// Get next month window (day 1 to last day of next month)
export function getNextMonthWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Get last day of next month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
  // Set end date to end of last day (23:59:59) to include the full day
  const end = new Date(now.getFullYear(), now.getMonth() + 1, lastDay, 23, 59, 59, 999);
  return { start, end };
}

// Get previous month window (day 1 to last day of previous month)
export function getPreviousMonthWindow(): { start: Date; end: Date; month: string } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const start = new Date(year, month, 1);
  // Get last day of previous month
  const lastDay = new Date(year, month + 1, 0).getDate();
  // Set end date to end of last day (23:59:59) to include the full day
  const end = new Date(year, month, lastDay, 23, 59, 59, 999);
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`; // Format: YYYY-MM
  return { start, end, month: monthKey };
}

// Check if today is 2nd of the month
export function isSecondOfMonth(): boolean {
  const now = new Date();
  return now.getDate() === 2;
}

// Complex interest calculation with multiple deposits/withdrawals and different rates
// Each deposit maintains its own percentage rate
// Withdrawals are handled within the same month (partial month calculation)
// ALWAYS clamps to provided window (full month cycle = 30 days)
//
// LOGIC:
// Example: 15 lakh invested, 5 lakh withdrawn on 10th
// - Days 1-9 (9 days): Interest on 15 lakh
// - Days 10-30 (21 days): Interest on 10 lakh
export function calculateComplexInterest(
  deposits: Array<{ amount: number; date: string; percentage?: number }>,
  withdrawals: Array<{ amount: number; date: string }>,
  defaultPercentage: number,
  startDate: Date,
  endDate: Date
): { interest: number; withdrawalDetails: Array<{ date: string; amount: number; dayOfWithdrawal: number }> } {
  if (deposits.length === 0) return { interest: 0, withdrawalDetails: [] };
  if (!startDate || !endDate) return { interest: 0, withdrawalDetails: [] };

  const periodStart = new Date(startDate);
  const periodYearMonth = periodStart.getFullYear() * 12 + periodStart.getMonth();

  // Parse all deposits with their details
  const parsedDeposits: Array<{
    amount: number;
    rate: number;
    depositDate: Date;
    depositDay: number;
    depositYearMonth: number;
  }> = [];

  deposits.forEach(d => {
    const dateStr = String(d.date).split('T')[0];
    const dateParts = dateStr.split('-');
    const depositDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(depositDate.getTime())) return;
    
    parsedDeposits.push({
      amount: d.amount,
      rate: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage,
      depositDate,
      depositDay: depositDate.getDate(),
      depositYearMonth: depositDate.getFullYear() * 12 + depositDate.getMonth()
    });
  });

  // Sort deposits by date (oldest first) for FIFO
  parsedDeposits.sort((a, b) => a.depositDate.getTime() - b.depositDate.getTime());

  // Parse all withdrawals
  const parsedWithdrawals: Array<{
    amount: number;
    withdrawalDate: Date;
    withdrawalDay: number;
    withdrawalYearMonth: number;
  }> = [];
  
  const withdrawalDetails: Array<{ date: string; amount: number; dayOfWithdrawal: number }> = [];

  withdrawals.forEach(w => {
    const dateStr = String(w.date).split('T')[0];
    const dateParts = dateStr.split('-');
    const withdrawalDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(withdrawalDate.getTime())) return;
    
    const withdrawalYearMonth = withdrawalDate.getFullYear() * 12 + withdrawalDate.getMonth();
    
    parsedWithdrawals.push({
      amount: w.amount,
      withdrawalDate,
      withdrawalDay: withdrawalDate.getDate(),
      withdrawalYearMonth
    });
    
    // Track withdrawal details for this month
    if (withdrawalYearMonth === periodYearMonth) {
      withdrawalDetails.push({
        date: dateStr,
        amount: w.amount,
        dayOfWithdrawal: withdrawalDate.getDate()
      });
    }
  });

  // Sort withdrawals by date (oldest first)
  parsedWithdrawals.sort((a, b) => a.withdrawalDate.getTime() - b.withdrawalDate.getTime());

  // Step 1: Apply all withdrawals BEFORE this month using FIFO
  // This reduces the deposit amounts permanently
  const depositAmounts = parsedDeposits.map(d => ({
    ...d,
    currentAmount: d.amount
  }));

  for (const w of parsedWithdrawals) {
    if (w.withdrawalYearMonth >= periodYearMonth) break; // Stop at this month's withdrawals
    
    let remainingWithdrawal = w.amount;
    for (let i = 0; i < depositAmounts.length && remainingWithdrawal > 0; i++) {
      if (depositAmounts[i].currentAmount > 0) {
        const reduction = Math.min(depositAmounts[i].currentAmount, remainingWithdrawal);
        depositAmounts[i].currentAmount -= reduction;
        remainingWithdrawal -= reduction;
      }
    }
  }

  // Step 2: Get withdrawals IN this month
  const withdrawalsThisMonth = parsedWithdrawals.filter(w => w.withdrawalYearMonth === periodYearMonth);
  withdrawalsThisMonth.sort((a, b) => a.withdrawalDay - b.withdrawalDay);

  // Step 3: Calculate total principal at start of this month (after past withdrawals)
  let totalPrincipalStart = depositAmounts.reduce((sum, d) => {
    // Only count deposits made before or in this month
    if (d.depositYearMonth <= periodYearMonth) {
      return sum + d.currentAmount;
    }
    return sum;
  }, 0);

  if (totalPrincipalStart <= 0) return { interest: 0, withdrawalDetails };

  // Step 4: Calculate interest considering withdrawals within the month
  // Use weighted average rate based on deposit amounts
  const totalOriginalDeposits = depositAmounts.reduce((sum, d) => {
    if (d.depositYearMonth <= periodYearMonth && d.currentAmount > 0) {
      return sum + d.currentAmount;
    }
    return sum;
  }, 0);

  const weightedRate = depositAmounts.reduce((sum, d) => {
    if (d.depositYearMonth <= periodYearMonth && d.currentAmount > 0) {
      return sum + (d.rate * d.currentAmount / totalOriginalDeposits);
    }
    return sum;
  }, 0);

  // Step 5: Find earliest deposit day in THIS month (for new deposits this month)
  let interestStartDay = 1; // Default: full month
  const depositsThisMonth = depositAmounts.filter(d => d.depositYearMonth === periodYearMonth);
  
  // If ALL deposits are from THIS month, start from earliest deposit day + 1
  const depositsBeforeThisMonth = depositAmounts.filter(d => d.depositYearMonth < periodYearMonth && d.currentAmount > 0);
  
  if (depositsBeforeThisMonth.length === 0 && depositsThisMonth.length > 0) {
    // All deposits are from this month - find earliest
    const earliestDepositDay = Math.min(...depositsThisMonth.map(d => d.depositDay));
    interestStartDay = earliestDepositDay + 1;
  }

  // Step 6: Calculate interest in time segments
  let totalInterest = 0;
  let currentPrincipal = totalPrincipalStart;
  let currentDay = interestStartDay;

  if (withdrawalsThisMonth.length === 0) {
    // No withdrawals this month - simple calculation
    const days = 30 - currentDay + 1;
    if (days > 0 && currentPrincipal > 0) {
      totalInterest = calculateInterestSimple(currentPrincipal, weightedRate, days);
    }
  } else {
    // Process withdrawals and calculate interest in segments
    for (const w of withdrawalsThisMonth) {
      const withdrawalDay = w.withdrawalDay;
      
      // Calculate interest from currentDay to withdrawalDay - 1
      if (withdrawalDay > currentDay && currentPrincipal > 0) {
        const daysBeforeWithdrawal = withdrawalDay - currentDay;
        totalInterest += calculateInterestSimple(currentPrincipal, weightedRate, daysBeforeWithdrawal);
        currentDay = withdrawalDay;
      }
      
      // Apply withdrawal
      currentPrincipal -= w.amount;
      if (currentPrincipal < 0) currentPrincipal = 0;
    }
    
    // Calculate interest from last withdrawal to day 30
    if (currentPrincipal > 0 && currentDay <= 30) {
      const remainingDays = 30 - currentDay + 1;
      totalInterest += calculateInterestSimple(currentPrincipal, weightedRate, remainingDays);
    }
  }

  return { 
    interest: Math.round(totalInterest * 100) / 100,
    withdrawalDetails
  };
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Parse date from input - supports both calendar picker (YYYY-MM-DD) and text format ("4 jan")
export function parseDate(dateString: string): string {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // If already in ISO format (YYYY-MM-DD), return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle text formats like "4 jan", "15 apr"
  const parts = dateString.split(' ');
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const month = parts[1].toLowerCase();
    const monthMap: { [key: string]: number } = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const currentYear = new Date().getFullYear();
    const monthIndex = monthMap[month] ?? new Date().getMonth();
    const date = new Date(currentYear, monthIndex, day);
    return date.toISOString().split('T')[0];
  }
  
  return dateString;
}

// Convert ISO date to calendar picker format (YYYY-MM-DD)
export function formatDateForInput(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

