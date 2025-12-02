# Member Investment Calculation Logic - Detailed Explanation

## Core Calculation Function: `calculateComplexInterest`

### Formula Used:
```
Interest = (Principal × Percentage × Days) / (100 × 30)
```

### Key Rules:
1. **Interest starts from deposit date + 1 day** (not from deposit date itself)
2. **Each deposit maintains its own percentage rate** (if custom rate provided)
3. **Withdrawals are applied using FIFO** (First In First Out - oldest deposits first)
4. **Days are calculated inclusively** (both start and end dates included)

---

## FIRST MONTH CALCULATION (When deposit is in current month)

### Scenario: Deposit made on 15th January 2024

**Calculation Logic:**
1. **Interest Start Date:** 16th January 2024 (deposit date + 1)
2. **Interest End Date:** 30th of current month (hardcoded to 30th)
3. **Days:** 16th to 30th = 15 days
4. **Formula:** `(Amount × Rate × 15) / (100 × 30)`

**Code Location:** `pages/api/member/current-returns.ts` (lines 60-95)

**Example:**
- Deposit: ₹100,000 on 15th Jan
- Rate: 12% per annum
- Interest = (100,000 × 12 × 15) / (100 × 30) = ₹6,000

**⚠️ ISSUE FOUND:** Line 71 hardcodes end date to 30th, but should use actual last day of month (28/29/30/31)

---

## NEXT MONTH CALCULATION (For months after first deposit)

### Scenario: February 2024 (next month after January deposit)

**Calculation Logic:**
1. **Interest Start Date:** 1st February 2024 (full month start)
2. **Interest End Date:** Last day of February (28th/29th depending on leap year)
3. **Days:** Full month (28/29/30/31 days depending on month)
4. **Formula:** `(Amount × Rate × Days) / (100 × 30)`

**Code Location:** `pages/api/calculate-monthly-returns.ts` (lines 54-72)

**Example:**
- Same deposit: ₹100,000 (from January)
- Rate: 12% per annum
- February has 29 days (2024 is leap year)
- Interest = (100,000 × 12 × 29) / (100 × 30) = ₹11,600

---

## DETAILED STEP-BY-STEP PROCESS

### Step 1: Process Deposits
- Each deposit is tracked separately with:
  - Amount
  - Custom rate (if provided) or default member rate
  - Interest start date = Deposit date + 1 day

### Step 2: Process Withdrawals (FIFO)
- Withdrawals reduce deposits starting from oldest first
- Example: If you have deposits of ₹50k (Jan) and ₹50k (Feb), and withdraw ₹30k:
  - First ₹30k reduces from January deposit
  - January deposit becomes ₹20k
  - February deposit remains ₹50k

### Step 3: Calculate Interest for Each Deposit
For each remaining deposit:
- Find effective start date = max(deposit date + 1, period start date)
- Find effective end date = period end date
- Calculate days = (end - start) + 1 (inclusive)
- Calculate interest = (amount × rate × days) / (100 × 30)

### Step 4: Sum All Interests
- Total interest = sum of all individual deposit interests

---

## EXAMPLES

### Example 1: First Month (Partial)
**Deposit:** ₹100,000 on 15th January 2024
**Rate:** 12% per annum

**Calculation:**
- Interest period: 16th Jan to 30th Jan = 15 days
- Interest = (100,000 × 12 × 15) / (100 × 30) = ₹6,000

### Example 2: Next Month (Full Month)
**Same deposit:** ₹100,000 (from January)
**Rate:** 12% per annum
**Month:** February 2024 (29 days)

**Calculation:**
- Interest period: 1st Feb to 29th Feb = 29 days
- Interest = (100,000 × 12 × 29) / (100 × 30) = ₹11,600

### Example 3: Multiple Deposits
**Deposit 1:** ₹50,000 on 5th January (Rate: 10%)
**Deposit 2:** ₹50,000 on 20th January (Rate: 12%)
**Month:** January 2024

**Calculation:**
- Deposit 1: (50,000 × 10 × 25) / (100 × 30) = ₹4,166.67 (6th to 30th = 25 days)
- Deposit 2: (50,000 × 12 × 11) / (100 × 30) = ₹2,200 (21st to 30th = 11 days)
- Total = ₹6,366.67

---

## POTENTIAL ISSUES FOUND

1. **First Month End Date:** Line 71 in `current-returns.ts` hardcodes to 30th, should use actual last day
2. **Next Month:** Uses full month correctly (1st to last day)

---

## SUMMARY

- **First Month:** Interest from (deposit date + 1) to 30th of same month
- **Next Months:** Interest from 1st to last day of month (full month)
- **Formula:** Always `(Principal × Rate × Days) / (100 × 30)`
- **Interest Start:** Always deposit date + 1 day
- **Withdrawals:** Applied FIFO (oldest deposits first)

