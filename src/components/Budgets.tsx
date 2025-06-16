import { Link } from 'react-router-dom';
import styles from '../styles/Budgets.module.css';
import { 
  Box, 
  Container, 
  Typography, 
  useTheme,
  useMediaQuery,
  CircularProgress,
  AppBar,
  Toolbar
} from '@mui/material';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { getMonthStartEnd } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { BLUE } from '../theme';

const Budgets = () => {
  const { budgets, loading, error, summary } = useGlobalState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading.budgets || loading.summary) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  if (error.budgets || error.summary) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        mt: 6,
        px: 2
      }}>
        <Typography color="error.main">{error.budgets || error.summary}</Typography>
      </Box>
    );
  }

  if (!summary) return null;

  const { startDate, endDate } = getMonthStartEnd();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom color={BLUE}>
        Budgets
      </Typography>
      <Box className={styles.budgetList}>
        {budgets.map((budget) => (
          <Link 
            to={`/budgets/${budget.name}`} 
            key={budget.name}
            className={styles.budgetLink}
          >
            <BudgetProgressBar
              name={budget.name}
              spent={summary.budgetTotals[budget.name] || 0}
              limit={summary.budgetTotals[budget.name] || 0}
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