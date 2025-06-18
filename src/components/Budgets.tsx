import { Link } from 'react-router-dom';
import styles from '../styles/Budgets.module.css';
import { 
  Box, 
  Container, 
  Typography, 
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar
} from '@mui/material';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { getMonthStartEnd } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { BLUE } from '../theme';
import { useEffect } from 'react';

const Budgets = () => {
  const { budgetLimits, loading, error, summary } = useGlobalState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get budget data from budgetLimits (faster than summary)
  const budgetData = budgetLimits ? Object.entries(budgetLimits).map(([budgetName, budget]) => ({
    name: budgetName,
    limit: budget.total,
    categories: budget.categories || {}
  })) : [];

  // Get spending data from summary
  const spendingData = summary?.data?.spending || {};

  // Calculate budget progress
  const budgetProgress = budgetData.map(budget => {
    const spent = spendingData[budget.name]?.total || 0;
    const remaining = budget.limit - spent;
    const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    
    return {
      ...budget,
      spent,
      remaining,
      percentage: Math.min(percentage, 100)
    };
  });

  // Debug logging
  useEffect(() => {
    console.log('Budgets - budgetLimits:', budgetLimits);
    console.log('Budgets - summary:', summary);
    console.log('Budgets - budgetData:', budgetData);
    console.log('Budgets - spendingData:', spendingData);
    console.log('Budgets - budgetProgress:', budgetProgress);
  }, [budgetLimits, summary, budgetData, spendingData, budgetProgress]);

  if (loading.budgets || loading.summary) {
    return <div>Loading...</div>;
  }

  if (error.budgets || error.summary) {
    return <div>Error: {error.budgets || error.summary}</div>;
  }

  if (!budgetLimits || !summary?.data?.spending) {
    return <div>No budget data available</div>;
  }

  const { startDate, endDate } = getMonthStartEnd();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" color={BLUE} fontWeight={600} mb={3} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Budgets
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        {startDate} - {endDate}
      </Typography>
      <Box className={styles.budgetList}>
        {budgetProgress.map((budget) => (
          <Link 
            to={`/budgets/${budget.name}`} 
            key={budget.name}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <BudgetProgressBar
              name={budget.name}
              spent={summary.data.spending[budget.name]?.total || 0}
              limit={summary.data.budgetLimits[budget.name]?.total || 0}
              startDate={startDate}
              endDate={endDate}
            />
          </Link>
        ))}
      </Box>
      {isMobile && (
        <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
          <Toolbar>
            <Link to="/budgets" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
              Budgets
            </Link>
            <Link to="/submit-receipt" style={{ color: 'white', textDecoration: 'none' }}>
              Submit Receipt
            </Link>
          </Toolbar>
        </AppBar>
      )}
    </Container>
  );
};

export default Budgets; 