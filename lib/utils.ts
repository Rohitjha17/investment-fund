// Calculate interest for a given amount, rate, and days
function calculateInterestSimple(
  principal: number,
  percentage: number,
  days: number
): number {
  return (principal * percentage * days) / (100 * 30);
}

// Get current month start (day 1) and end (day 30)
export function getCurrentMonthWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  // Set end date to end of day 30 (23:59:59) to include the full day
  const end = new Date(now.getFullYear(), now.getMonth(), 30, 23, 59, 59, 999);
  return { start, end };
}

// Get next month window (day 1-30)
export function getNextMonthWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Set end date to end of day 30 (23:59:59) to include the full day
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 30, 23, 59, 59, 999);
  return { start, end };
}

// Get previous month window (day 1-30)
export function getPreviousMonthWindow(): { start: Date; end: Date; month: string } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const start = new Date(year, month, 1);
  // Set end date to end of day 30 (23:59:59) to include the full day
  const end = new Date(year, month, 30, 23, 59, 59, 999);
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`; // Format: YYYY-MM
  return { start, end, month: monthKey };
}

// Check if today is 2nd of the month
export function isSecondOfMonth(): boolean {
  const now = new Date();
  return now.getDate() === 2;
}

// Complex interest calculation with multiple deposits/withdrawals and different rates
// ALWAYS clamps to provided window (1-30 day cycle)
export function calculateComplexInterest(
  deposits: Array<{ amount: number; date: string; percentage?: number }>,
  withdrawals: Array<{ amount: number; date: string }>,
  defaultPercentage: number,
  startDate: Date,
  endDate: Date
): number {
  if (deposits.length === 0) return 0;
  if (!startDate || !endDate) return 0;

  // Sort all transactions by date
  const transactions: Array<{
    date: Date;
    type: 'deposit' | 'withdrawal';
    amount: number;
    percentage?: number;
  }> = [];

  deposits.forEach(d => {
    // Parse date string (YYYY-MM-DD) and create at midnight local time
    const dateParts = d.date.split('-');
    const depositDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(depositDate.getTime())) return;
    
    // Start counting from next day after deposit (interest starts from next day)
    const interestStartDate = new Date(depositDate);
    interestStartDate.setDate(interestStartDate.getDate() + 1);
    
    transactions.push({
      date: interestStartDate,
      type: 'deposit',
      amount: d.amount,
      percentage: d.percentage !== null && d.percentage !== undefined ? d.percentage : defaultPercentage
    });
  });

  withdrawals.forEach(w => {
    // Parse date string (YYYY-MM-DD) and create at midnight local time
    const dateParts = w.date.split('-');
    const withdrawalDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    if (isNaN(withdrawalDate.getTime())) return;
    
    transactions.push({
      date: withdrawalDate,
      type: 'withdrawal',
      amount: w.amount
    });
  });

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Use provided window - NO auto-calculation
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);

  let totalInterest = 0;
  let currentBalance = 0;
  let currentRate = defaultPercentage;
  let lastDate = new Date(periodStart);
  
  // Track balance changes over time with rates
  const balanceSegments: Array<{
    amount: number;
    rate: number;
    startDate: Date;
    endDate: Date;
  }> = [];

  // Process transactions within the window
  transactions.forEach((transaction, index) => {
    // Skip if transaction is outside window
    if (transaction.date > periodEnd) return;
    
    const nextDate = index < transactions.length - 1 
      ? transactions[index + 1].date 
      : periodEnd;
    
    if (transaction.type === 'deposit') {
      // For deposits: calculate interest for balance BEFORE this deposit (if any)
      // Segment from lastDate until this deposit's interest start date
      if (currentBalance > 0) {
        const segmentStart = new Date(Math.max(lastDate.getTime(), periodStart.getTime()));
        const segmentEnd = new Date(Math.min(transaction.date.getTime(), periodEnd.getTime()));
        
        if (segmentStart < segmentEnd) {
          balanceSegments.push({
            amount: currentBalance,
            rate: currentRate,
            startDate: segmentStart,
            endDate: segmentEnd
          });
        }
      }
      
      // Update balance and rate for this deposit
      currentBalance += transaction.amount;
      currentRate = transaction.percentage !== null && transaction.percentage !== undefined 
        ? transaction.percentage 
        : defaultPercentage;
      
      // Set lastDate to the deposit's interest start date (from which new balance earns interest)
      lastDate = new Date(transaction.date);
    } else {
      // For withdrawals: calculate interest for balance BEFORE withdrawal
      const segmentStart = new Date(Math.max(lastDate.getTime(), periodStart.getTime()));
      const segmentEnd = new Date(Math.min(transaction.date.getTime(), periodEnd.getTime()));
      
      if (currentBalance > 0 && segmentStart < segmentEnd) {
        balanceSegments.push({
          amount: currentBalance,
          rate: currentRate,
          startDate: segmentStart,
          endDate: segmentEnd
        });
      }
      
      // Update balance after withdrawal
      currentBalance -= transaction.amount;
      if (currentBalance < 0) currentBalance = 0;
      
      lastDate = new Date(transaction.date);
    }
  });

  // Calculate interest for remaining balance until period end
  if (currentBalance > 0) {
    const effectiveStart = new Date(Math.max(lastDate.getTime(), periodStart.getTime()));
    const effectiveEnd = new Date(periodEnd);
    
    if (effectiveStart < effectiveEnd) {
      balanceSegments.push({
        amount: currentBalance,
        rate: currentRate,
        startDate: effectiveStart,
        endDate: effectiveEnd
      });
    }
  }

  // Calculate total interest from all segments (clamped to window)
  balanceSegments.forEach(segment => {
    // Clamp segment to window
    const segmentStart = new Date(Math.max(segment.startDate.getTime(), periodStart.getTime()));
    const segmentEnd = new Date(Math.min(segment.endDate.getTime(), periodEnd.getTime()));
    
    if (segmentStart >= segmentEnd) return;
    
    // Calculate days - add 1 to include both start and end dates (inclusive)
    const days = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 0) {
      totalInterest += calculateInterestSimple(segment.amount, segment.rate, days);
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

