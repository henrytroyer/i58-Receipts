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

// Calculate flexible budget visualization data
export function calculateFlexibleBudgetVisualization(
  categorySpending: Record<string, number>,
  categoryLimits: Record<string, number>,
  overspentCategory: string,
  overspentAmount: number
) {
  // Find underspent categories (spending below limit)
  const underspentCategories = Object.entries(categorySpending)
    .filter(([category, spent]) => {
      const limit = categoryLimits[category] || 0;
      return category !== overspentCategory && spent < limit;
    })
    .map(([category, spent]) => ({
      category,
      spent,
      limit: categoryLimits[category] || 0,
      remaining: (categoryLimits[category] || 0) - spent,
      remainingPercentage: (categoryLimits[category] || 0) > 0 ? 
        ((categoryLimits[category] || 0) - spent) / (categoryLimits[category] || 0) : 0
    }))
    .sort((a, b) => a.remainingPercentage - b.remainingPercentage); // Sort by least remaining percentage first

  // Calculate how much we need to borrow
  const amountToBorrow = overspentAmount;
  let remainingToBorrow = amountToBorrow;
  const borrowedFrom: Array<{
    category: string;
    amount: number;
    originalLimit: number;
    originalSpent: number;
  }> = [];

  // Fill from categories with least remaining percentage first
  for (const category of underspentCategories) {
    if (remainingToBorrow <= 0) break;

    const canBorrow = Math.min(category.remaining, remainingToBorrow);
    
    borrowedFrom.push({
      category: category.category,
      amount: canBorrow,
      originalLimit: category.limit,
      originalSpent: category.spent
    });

    remainingToBorrow -= canBorrow;
  }

  return {
    borrowedFrom,
    totalBorrowed: amountToBorrow - remainingToBorrow
  };
}

// Returns a map: { [donorCategory]: { total: number, details: Array<{ from: string, amount: number }> } }
export function getDonorBorrowedMap(
  categorySpending: Record<string, number>,
  categoryLimits: Record<string, number>
) {
  // 1. Find all overspent categories
  const overspentCategories = Object.entries(categoryLimits)
    .filter(([cat]) => (categorySpending[cat] || 0) > (categoryLimits[cat] || 0))
    .map(([cat]) => ({
      cat,
      overspentAmount: (categorySpending[cat] || 0) - (categoryLimits[cat] || 0)
    }));

  // 2. Aggregate borrowed amounts for each donor category
  const donorBorrowedMap: Record<string, { total: number; details: Array<{ from: string; amount: number }> }> = {};
  overspentCategories.forEach(({ cat: overspentCat, overspentAmount }) => {
    const viz = calculateFlexibleBudgetVisualization(
      categorySpending,
      categoryLimits,
      overspentCat,
      overspentAmount
    );
    viz.borrowedFrom.forEach(borrow => {
      if (!donorBorrowedMap[borrow.category]) {
        donorBorrowedMap[borrow.category] = { total: 0, details: [] };
      }
      donorBorrowedMap[borrow.category].total += borrow.amount;
      donorBorrowedMap[borrow.category].details.push({ from: overspentCat, amount: borrow.amount });
    });
  });
  return donorBorrowedMap;
}

// Proportional redistribution with cap: only borrow up to remaining budget in each donor category
export function getProportionalBorrowedMap(
  categorySpending: Record<string, number>,
  categoryLimits: Record<string, number>
) {
  const categories = Object.keys(categoryLimits);
  const limits = categories.map(cat => categoryLimits[cat] || 0);
  const spent = categories.map(cat => categorySpending[cat] || 0);
  const remaining = limits.map((lim, i) => Math.max(lim - spent[i], 0));
  const totalAvailable = remaining.reduce((a, b) => a + b, 0);
  const totalSpent = spent.reduce((a, b) => a + b, 0);

  // If not enough available, set equalized percent as high as possible
  let x = 0;
  if (totalAvailable > 0) {
    // Find x such that sum(min(lim, spent + max(0, lim * x - spent))) = totalSpent
    // This is a capped redistribution: no category can go above its limit
    // Use binary search to find x
    let low = 0, high = 1.5, mid;
    for (let iter = 0; iter < 30; ++iter) {
      mid = (low + high) / 2;
      let sum = 0;
      for (let i = 0; i < categories.length; ++i) {
        const target = limits[i] * mid;
        sum += Math.min(limits[i], Math.max(spent[i], target));
      }
      if (sum > totalSpent) high = mid;
      else low = mid;
    }
    x = low;
  }

  // For each category, calculate borrowed amount and equalized percent
  const result: Record<string, { borrowed: number; equalizedPercent: number }> = {};
  categories.forEach((cat, i) => {
    const eqSpent = Math.min(limits[i], Math.max(spent[i], limits[i] * x));
    const borrowed = eqSpent - spent[i];
    result[cat] = {
      borrowed,
      equalizedPercent: (eqSpent / limits[i]) * 100
    };
  });
  return result;
} 