import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from '../styles/BudgetDetail.module.css';
import BudgetProgressBar from './BudgetProgressBar';
import { getCurrentDate } from '../utils/budget';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { API_BASE_URL } from '../config';

const BLUE = '#232946';
const LIGHT = '#e8eefd';

interface BudgetSummary {
  totalSpent: number;
  receiptsCount: number;
  categoryTotals: Record<string, number>;
  categoryYearToDateTotals?: Record<string, Record<string, number>>;
  budgetCategoryTotals?: Record<string, Record<string, number>>;
  totalBudgeted?: number;
  categoryLimits?: Record<string, number>;
}

interface CategoryLimit {
  [category: string]: number;
}

const getMonthStartEnd = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    start,
    end
  };
};

const BudgetDetail = () => {
  const { budgetName = '' } = useParams<{ budgetName: string }>();
  const { categories, loading: globalLoading, error: globalError, testDate } = useGlobalState();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}?action=getBudgetSummary&budget=${encodeURIComponent(budgetName)}${testDate ? `&date=${testDate}` : ''}`)
      .then((summaryRes) => {
        console.log('Budget Summary Response:', summaryRes.data.data);
        setSummary(summaryRes.data.data);
        setCategoryLimits(summaryRes.data.data.categoryLimits || {});
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load budget summary');
        setLoading(false);
      });
  }, [budgetName, categories, testDate]);

  if (loading || globalLoading.categories) return <div className={styles.loading}>Loading...</div>;
  if (error || globalError.categories) return <div className={styles.error}>{error || globalError.categories}</div>;
  if (!summary) return null;

  const currentDate = getCurrentDate(testDate);
  const { startDate, endDate } = getMonthStartEnd(currentDate);
  
  // Use the snapshot's total budget limit if available
  const totalLimit = summary.totalBudgeted || 0;
  
  // This month's spending for all categories
  const overallSpent = summary.totalSpent || 0;
  
  // Year-to-date spending for all categories (current budget year only)
  const overallYearToDateSpent = summary.categoryYearToDateTotals
    ? Object.values(summary.categoryYearToDateTotals).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0;

  return (
    <div className={styles.budgetDetail}>
      <div className={styles.header}>
        <h1>{budgetName}</h1>
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span>This Month</span>
            <span className={styles.amount}>€{overallSpent.toFixed(2)}</span>
            <span className={styles.limit}>of €{totalLimit.toFixed(2)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span>Year to Date</span>
            <span className={styles.amount}>€{overallYearToDateSpent.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.progressList}>
        {Object.entries(categoryLimits).map(([cat, limit]) => {
          const spent = summary.budgetCategoryTotals?.[budgetName]?.[cat] || 0;
          const snapshotLimit = summary.categoryLimits?.[cat] ?? 0;
          return (
            <BudgetProgressBar
              key={cat}
              name={cat}
              spent={spent}
              limit={snapshotLimit}
              startDate={startDate}
              endDate={endDate}
            />
          );
        })}
        {/* Overall bar */}
        <BudgetProgressBar
          name="Overall"
          spent={Object.values(summary.budgetCategoryTotals?.[budgetName] || {}).reduce((a, b) => a + (Number(b) || 0), 0)}
          limit={totalLimit}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};

export default BudgetDetail; 