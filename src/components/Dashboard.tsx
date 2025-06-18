import { useState } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { getMonthStartEnd, getCurrentDate, getDonorBorrowedMap, getProportionalBorrowedMap } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { IconButton, Collapse, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import styles from '../styles/Dashboard.module.css';

const ACCENT = '#3b6ea5';
const BLUE = '#232946';
const RED = '#e63946';

const Dashboard = () => {
  const { loading: globalLoading, error: globalError, testDate, summary, budgetLimits } = useGlobalState();
  const [expanded, setExpanded] = useState<{ [budget: string]: boolean }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  // Calculate total spending across all budgets
  const totalSpent = budgetProgress.reduce((sum, budget) => sum + budget.spent, 0);
  const totalLimit = budgetProgress.reduce((sum, budget) => sum + budget.limit, 0);

  // Calculate donor borrowed map for each budget (expanded view)
  const donorBorrowedMaps: Record<string, ReturnType<typeof getDonorBorrowedMap>> = {};
  if (summary?.data?.spending && Object.keys(summary.data.spending).length > 0) {
    for (const budget of budgetData) {
      const spending = summary.data.spending[budget.name]?.categories || {};
      const limits = budget.categories || {};
      donorBorrowedMaps[budget.name] = getDonorBorrowedMap(spending, limits);
    }
  }

  // Calculate proportional borrowed map for each budget (expanded view)
  const proportionalBorrowedMaps: Record<string, ReturnType<typeof getProportionalBorrowedMap>> = {};
  if (summary?.data?.spending && Object.keys(summary.data.spending).length > 0) {
    for (const budget of budgetData) {
      const spending = summary.data.spending[budget.name]?.categories || {};
      const limits = budget.categories || {};
      proportionalBorrowedMaps[budget.name] = getProportionalBorrowedMap(spending, limits);
    }
  }

  // Show loading only if we don't have static data yet
  if (globalLoading.budgets || !budgetLimits) {
    return <div className={styles.loading}>Loading budgets...</div>;
  }

  // Show error if static data failed
  if (globalError.budgets) {
    return <div className={styles.error}>{globalError.budgets}</div>;
  }

  // Show budget structure immediately, with loading indicator for spending
  const hasSpendingData = summary?.data?.spending && Object.keys(summary.data.spending).length > 0;
  const isSpendingLoading = globalLoading.summary && !hasSpendingData;

  // Safety check for required data
  if (!budgetLimits) {
    console.log('Missing budget limits data');
    return <div className={styles.loading}>Loading budget data...</div>;
  }

  const currentDate = getCurrentDate(testDate);

  // Calculate over/under budget sitewide
  const overUnder = totalSpent - totalLimit;
  const isOver = overUnder > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Top Infographics/Summary Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: BLUE, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                Total Spent This Month
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {isSpendingLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <span>Loading...</span>
                  </Box>
                ) : (
                  `$${(totalSpent).toFixed(2)}`
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: BLUE, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                {isOver ? 'Over Budget (Sitewide)' : 'Under Budget (Sitewide)'}
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {isSpendingLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <span>Loading...</span>
                  </Box>
                ) : (
                  `${isOver ? '+' : ''}$${Math.abs(overUnder).toFixed(2)}`
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Projected Year-End Over/Under Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: BLUE, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                Projected Year-End Over/Under
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {(() => {
                  if (isSpendingLoading) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <span>Loading...</span>
                      </Box>
                    );
                  }
                  // Calculate percent of year elapsed
                  const now = new Date();
                  const startOfYear = new Date(now.getFullYear(), 0, 1);
                  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                  const elapsed = now.getTime() - startOfYear.getTime();
                  const total = endOfYear.getTime() - startOfYear.getTime();
                  const percentElapsed = Math.max(0.01, Math.min(1, elapsed / total));
                  // Projected total spent
                  const projectedTotal = totalSpent / percentElapsed;
                  const projectedOverUnder = projectedTotal - totalLimit;
                  const sign = projectedOverUnder > 0 ? '+' : '';
                  return `${sign}$${Math.abs(projectedOverUnder).toFixed(2)}`;
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Budgets Section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" color={BLUE} fontWeight={600} mb={2} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Budgets
        </Typography>
        <Card sx={{ background: 'white', borderRadius: 3, boxShadow: '0 2px 8px rgba(35,41,70,0.06)', p: 0, overflow: 'hidden' }}>
          {budgetProgress.map((budget, idx) => {
            const overSpent = budget.spent > budget.limit;
            const isExpanded = !!expanded[budget.name];
            
            return (
              <Box key={budget.name} sx={{
                borderBottom: idx !== budgetProgress.length - 1 ? '1px solid #f0f1f6' : 'none',
                px: 2,
                pt: 1.2,
                pb: 0.4,
                background: isExpanded ? '#f7f8fa' : 'white',
                transition: 'background 0.2s',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <BudgetProgressBar
                      name={budget.name}
                      spent={isSpendingLoading ? 0 : budget.spent}
                      limit={budget.limit}
                      startDate={getMonthStartEnd(currentDate).startDate}
                      endDate={getMonthStartEnd(currentDate).endDate}
                      isOverall
                      hidePercentLabel
                      isLoading={isSpendingLoading}
                    />
                    {!isSpendingLoading && overSpent && (
                      <span style={{ color: RED, fontWeight: 700, marginLeft: 8, fontSize: 12 }}>
                        Over Budget
                      </span>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <IconButton
                        onClick={() => setExpanded(e => {
                          const newState: typeof expanded = {};
                          if (!e[budget.name]) newState[budget.name] = true;
                          return newState;
                        })}
                        size="small"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        sx={{ ml: 1, border: '1.5px solid #e0e3ea', borderRadius: '6px', background: '#fff', alignSelf: 'center', mt: 'auto', mb: 'auto' }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
                  <Box sx={{ pl: 4, pr: 2, py: 1 }}>
                    {Object.entries(budget.categories).map(([category, limit]) => {
                      const spent = spendingData[budget.name]?.categories?.[category] || 0;
                      const limitValue = typeof limit === 'number' ? limit : 0;
                      
                      // Calculate overall budget status for this budget
                      const overallBudgetSpent = spendingData[budget.name]?.total || 0;
                      const overallBudgetLimit = budget.limit;
                      const overallBudgetStatus = {
                        isOver: overallBudgetSpent > overallBudgetLimit,
                        totalSpent: overallBudgetSpent,
                        totalLimit: overallBudgetLimit
                      };
                      
                      // Proportional borrowed data
                      const proportionalData = proportionalBorrowedMaps[budget.name]?.[category];
                      
                      // Only pass proportional data if the category is actually borrowing
                      const proportionalBorrowed = proportionalData?.borrowed && proportionalData.borrowed > 0 
                        ? proportionalData.borrowed 
                        : undefined;
                      const equalizedPercent = proportionalData?.borrowed && proportionalData.borrowed > 0 
                        ? proportionalData.equalizedPercent 
                        : undefined;
                      
                      return (
                        <Box key={category} sx={{ mb: 1 }}>
                          <BudgetProgressBar
                            name={category}
                            spent={spent}
                            limit={limitValue}
                            startDate={getMonthStartEnd(currentDate).startDate}
                            endDate={getMonthStartEnd(currentDate).endDate}
                            hidePercentLabel
                            isCategory
                            overallBudgetStatus={overallBudgetStatus}
                            proportionalBorrowed={proportionalBorrowed}
                            equalizedPercent={equalizedPercent}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Card>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      {!isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => navigate('/submit-receipt')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: ACCENT,
            '&:hover': {
              bgcolor: BLUE
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Container>
  );
};

export default Dashboard; 