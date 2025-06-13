import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from '../styles/BudgetDetail.module.css';
import BudgetProgressBar from './BudgetProgressBar';
import { getRollingMonthlyLimit } from '../utils/budget';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { API_BASE_URL } from '../config';

const BLUE = '#232946';
const LIGHT = '#e8eefd';

interface BudgetSummary {
  totalSpent: number;
  receiptsCount: number;
  categoryTotals: Record<string, number>;
  categoryYearToDateTotals?: Record<string, number>;
}

interface CategoryLimit {
  [category: string]: number;
}

const getMonthStartEnd = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    start,
    end
  };
};

const BudgetDetail = () => {
  const { budgetName = '' } = useParams<{ budgetName: string }>();
  const { categories, loading: globalLoading, error: globalError } = useGlobalState();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}?action=getBudgetSummary&budget=${encodeURIComponent(budgetName)}`)
      .then((summaryRes) => {
        setSummary(summaryRes.data.data);
        // Find category limits for this budget
        const catLimits: CategoryLimit = {};
        if (Array.isArray(categories)) {
          categories.forEach((cat: any) => {
            if (cat.budgetName === budgetName) {
              catLimits[cat.name] = Number(cat.monthlyLimit) || 0;
            }
          });
        }
        setCategoryLimits(catLimits);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load budget summary');
        setLoading(false);
      });
  }, [budgetName, categories]);

  if (loading || globalLoading.categories) return <div className={styles.loading}>Loading...</div>;
  if (error || globalError.categories) return <div className={styles.error}>{error || globalError.categories}</div>;
  if (!summary) return null;

  const { startDate, endDate } = getMonthStartEnd();
  const totalLimit = Object.values(categoryLimits).reduce((a, b) => a + (Number(b) || 0), 0);
  // This month's spending for all categories
  const overallSpent = summary.totalSpent || 0;
  // Year-to-date spending for all categories (current budget year only)
  const overallYearToDateSpent = summary.categoryYearToDateTotals
    ? Object.values(summary.categoryYearToDateTotals).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0;
  // Use real date
  const date = new Date();
  const rollingOverallLimit = getRollingMonthlyLimit(totalLimit, overallYearToDateSpent, date);

  return (
    <div className={styles.budgetDetail}>
      <h1 style={{ color: BLUE, textAlign: 'center', marginBottom: '2rem' }}>{budgetName} Budget</h1>
      <div style={{ marginBottom: '2rem' }}>
        <BudgetProgressBar
          name="Overall Budget"
          spent={overallSpent}
          limit={rollingOverallLimit}
          startDate={startDate}
          endDate={endDate}
          isOverall
        />
      </div>
      <div className={styles.summaryCards}>
        <div className={styles.card} style={{ background: LIGHT, color: BLUE }}>
          <div className={styles.cardLabel}>Total Spent This Month</div>
          <div className={styles.cardValue}>${summary.totalSpent.toFixed(2)}</div>
        </div>
        <div className={styles.card} style={{ background: LIGHT, color: BLUE }}>
          <div className={styles.cardLabel}>Receipts This Month</div>
          <div className={styles.cardValue}>{summary.receiptsCount}</div>
        </div>
        <div className={styles.card} style={{ background: LIGHT, color: BLUE }}>
          <div className={styles.cardLabel}>Budget Limit (Sum of Categories)</div>
          <div className={styles.cardValue}>${totalLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      </div>
      <div className={styles.progressList}>
        {Object.entries(categoryLimits).map(([cat, limit]) => {
          const spent = Number(summary.categoryTotals[cat]) || 0;
          const date = new Date();
          const rollingLimit = getRollingMonthlyLimit(Number(limit) || 0, spent, date);
          return (
            <BudgetProgressBar
              key={cat}
              name={cat}
              spent={spent}
              limit={rollingLimit}
              startDate={startDate}
              endDate={endDate}
            />
          );
        })}
        {/* Overall bar */}
        <BudgetProgressBar
          name="Overall"
          spent={Object.values(summary.categoryTotals).reduce((a, b) => a + (Number(b) || 0), 0)}
          limit={totalLimit}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};

export default BudgetDetail; 