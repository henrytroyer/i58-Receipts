import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { getMonthStartEnd, getRollingMonthlyLimit } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const ACCENT = '#3b6ea5';
const BLUE = '#232946';
const RED = '#e63946';
const GREEN = '#1a4d2e';

const Dashboard = () => {
  const { budgets, summary, loading, error, categories } = useGlobalState();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [expanded, setExpanded] = useState<{ [budget: string]: boolean }>({});
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading.budgets || loading.summary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }
  if (error.budgets || error.summary) {
    return (
      <Box sx={{ textAlign: 'center', mt: 6, px: 2 }}>
        <Typography color="error.main">{error.budgets || error.summary}</Typography>
        {!isOnline && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            You're offline. Showing cached data.
          </Typography>
        )}
      </Box>
    );
  }
  if (!summary) return null;

  const { startDate, endDate } = getMonthStartEnd();

  // Calculate over/under budget sitewide
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (Number(b.monthlyLimit) || 0), 0);
  const overUnder = summary.totalSpent - totalBudgetLimit;
  const isOver = overUnder > 0;

  // Sort budgets: over-spent first
  const dashboardBudgets = budgets
    .map(b => {
      const spent = Number(summary.budgetTotals[b.name]) || 0;
      const limit = getRollingMonthlyLimit(Number(b.monthlyLimit) || 0, Number(summary.budgetYearToDateTotals?.[b.name]) || 0, new Date());
      return { ...b, spent, limit };
    })
    .sort((a, b) => {
      const aOver = a.spent > a.limit;
      const bOver = b.spent > b.limit;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      // Otherwise, sort by % spent desc
      return (b.spent / b.limit) - (a.spent / a.limit);
    });

  // Helper: get categories for a budget
  const getBudgetCategories = (budgetName: string) =>
    categories.filter((cat: any) => cat.budgetName === budgetName);

  // Placeholder for yearly outlook and year-end estimate
  const YearlyOutlookChart = () => (
    <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: 14, opacity: 0.7 }}>
      {/* Replace with chart lib later */}
      [Yearly Outlook Chart]
    </Box>
  );
  const YearEndEstimate = () => (
    <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: 14, opacity: 0.7 }}>
      {/* Replace with chart lib later */}
      [Year-End Estimate]
    </Box>
  );

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
                ${summary.totalSpent.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: isOver ? RED : GREEN, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                {isOver ? 'Over Budget (Sitewide)' : 'Under Budget (Sitewide)'}
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {isOver ? '+' : ''}${Math.abs(overUnder).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: BLUE, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                Yearly Outlook
              </Typography>
              <YearlyOutlookChart />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'white', color: BLUE, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color={ACCENT} gutterBottom>
                Estimate by Year End
              </Typography>
              <YearEndEstimate />
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
          {dashboardBudgets.map((budget, idx) => {
            const overSpent = budget.spent > budget.limit;
            const percentUsed = budget.limit ? (budget.spent / budget.limit) * 100 : 0;
            const cats = getBudgetCategories(budget.name);
            const isExpanded = !!expanded[budget.name];
            
            // Calculate overall budget status for this budget
            const totalBudgetLimit = cats.reduce((sum, cat) => sum + (Number(cat.monthlyLimit) || 0), 0);
            // Use budgetCategoryTotals for correct per-budget, per-category spent
            const totalSpent = cats.reduce((sum, cat) => sum + (Number(summary.budgetCategoryTotals?.[budget.name]?.[cat.name]) || 0), 0);
            const overallBudgetStatus = {
              isOver: totalSpent > totalBudgetLimit,
              totalSpent,
              totalLimit: totalBudgetLimit
            };

            return (
              <Box key={budget.name} sx={{
                borderBottom: idx !== dashboardBudgets.length - 1 ? '1px solid #f0f1f6' : 'none',
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
                      spent={budget.spent}
                      limit={budget.limit}
                      startDate={startDate}
                      endDate={endDate}
                      isOverall
                      hidePercentLabel
                    />
                    {overSpent && !overallBudgetStatus.isOver && (
                      <span style={{ color: '#3b6ea5', fontWeight: 700, marginLeft: 8, fontSize: 12 }}>
                        Flexible Budget Available
                      </span>
                    )}
                    {overSpent && overallBudgetStatus.isOver && (
                      <span style={{ color: RED, fontWeight: 700, marginLeft: 8, fontSize: 12 }}>
                        Over Budget
                      </span>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <IconButton
                        onClick={() => setExpanded(e => {
                          // Only one can expand at a time
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
                  <Box sx={{ pl: 4, pr: 2, py: 1, maxHeight: 320, overflowY: 'auto' }}>
                    {cats.length === 0 ? (
                      <Typography color="text.secondary" fontSize={13}>No categories</Typography>
                    ) : (
                      cats.map(cat => {
                        // Use budgetCategoryTotals for correct per-budget, per-category spent
                        const catSpent = summary.budgetCategoryTotals?.[budget.name]?.[cat.name] || 0;
                        const catYearToDate = summary.categoryYearToDateTotals?.[budget.name]?.[cat.name] || 0;
                        const catLimit = getRollingMonthlyLimit(Number(cat.monthlyLimit) || 0, catYearToDate, new Date());
                        return (
                          <Box key={cat.name} sx={{ mb: 1 }}>
                            <BudgetProgressBar
                              name={cat.name}
                              spent={catSpent}
                              limit={catLimit}
                              startDate={startDate}
                              endDate={endDate}
                              hidePercentLabel
                              isCategory
                              overallBudgetStatus={overallBudgetStatus}
                            />
                          </Box>
                        );
                      })
                    )}
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
          onClick={() => navigate('/receipts/new')}
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

export default Dashboard; 