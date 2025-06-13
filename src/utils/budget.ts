// Utility to calculate rolling monthly limit for budgets and categories
export function getRollingMonthlyLimit(
  monthlyLimit: number,
  totalSpentThisYear: number,
  now: Date = new Date()
): number {
  if (monthlyLimit === 0) return 0;
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JS months are 0-based

  // Special case: 2025, app starts in July (6 months: July–Dec)
  if (year === 2025 && month >= 7 && month <= 12) {
    const monthsElapsed = month - 7; // July=0, Aug=1, ..., Dec=5
    const monthsLeft = 6 - monthsElapsed;
    const yearlyLimit = monthlyLimit * 6;
    return Math.max(0, (yearlyLimit - totalSpentThisYear) / monthsLeft);
  }

  // Normal years: Jan–Dec
  const monthsElapsed = month - 1;
  const monthsLeft = 12 - monthsElapsed;
  const yearlyLimit = monthlyLimit * 12;
  return Math.max(0, (yearlyLimit - totalSpentThisYear) / monthsLeft);
}

export function getMonthStartEnd(now: Date = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

// Utility to get the current date, using test date if set
export function getCurrentDate(testDate?: string | null): Date {
  if (testDate) {
    return new Date(testDate);
  }
  return new Date();
} 