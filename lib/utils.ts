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
// ALWAYS clamps to provided window (full month cycle)
export function calculateComplexInterest(
  deposits: Array<{ amount: number; date: string; percentage?: number }>,
  withdrawals: Array<{ amount: number; date: string }>,
  defaultPercentage: number,
  startDate: Date,
  endDate: Date
): number {
  if (deposits.length === 0) return 0;
  if (!startDate || !endDate) return 0;

  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);

  // Track each deposit separately with its own rate
  const depositSegments: Array<{
    amount: number;
    rate: number;
    startDate: Date; // Interest start date (deposit date + 1)
  }> = [];

  // Process deposits
  deposits.forEach(d => {
    const dateParts = d.date.split('-');
    const depositDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(depositDate.getTime())) return;
    
    // Interest starts from next day after deposit
    const interestStartDate = new Date(depositDate);
    interestStartDate.setDate(interestStartDate.getDate() + 1);
    
    depositSegments.push({
      amount: d.amount,
      rate: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage,
      startDate: interestStartDate
    });
  });

  // Process withdrawals - reduce deposits proportionally (FIFO)
  withdrawals.forEach(w => {
    const dateParts = w.date.split('-');
    const withdrawalDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(withdrawalDate.getTime())) return;
    
    let remainingWithdrawal = w.amount;
    
    // Reduce from oldest deposits first (FIFO)
    for (let i = 0; i < depositSegments.length && remainingWithdrawal > 0; i++) {
      if (depositSegments[i].amount > 0) {
        const reduction = Math.min(depositSegments[i].amount, remainingWithdrawal);
        depositSegments[i].amount -= reduction;
        remainingWithdrawal -= reduction;
      }
    }
  });

  // Calculate interest for each deposit separately
  let totalInterest = 0;

  depositSegments.forEach(segment => {
    if (segment.amount <= 0) return;

    // Calculate interest start and end dates for this deposit
    const effectiveStart = new Date(Math.max(segment.startDate.getTime(), periodStart.getTime()));
    const effectiveEnd = new Date(periodEnd);
    
    if (effectiveStart >= effectiveEnd) return;
    
    // Calculate days - add 1 to include both start and end dates (inclusive)
    const days = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (days > 0) {
      const interest = calculateInterestSimple(segment.amount, segment.rate, days);
      totalInterest += interest;
    }
  });

  return Math.round(totalInterest * 100) / 100;
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

