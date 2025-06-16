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
import { getMonthStartEnd, getCurrentDate } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from 'axios';
import styles from '../styles/Dashboard.module.css';
import { API_BASE_URL } from '../config';

interface BudgetData {
  total: number;
  categories: Record<string, number>;
}

interface GlobalSummary {
  totalSpent: number;
  receiptsCount: number;
  budgetLimits: Record<string, BudgetData>;
  spending: Record<string, BudgetData>;
  totalBudgeted: number;
  remaining: number;
}

const ACCENT = '#3b6ea5';
const BLUE = '#232946';
const RED = '#e63946';
const GREEN = '#1a4d2e';

const Dashboard = () => {
  const { loading: globalLoading, error: globalError, testDate } = useGlobalState();
  const [summary, setSummary] = useState<GlobalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [expanded, setExpanded] = useState<{ [budget: string]: boolean }>({});
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}?action=getGlobalSummary${testDate ? `&date=${testDate}` : ''}`)
      .then((summaryRes) => {
        console.log('Raw Global Summary Response:', summaryRes.data);
        console.log('Global Summary Data:', summaryRes.data.data);
        setSummary(summaryRes.data.data.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching global summary:', error);
        setError('Failed to load global summary');
        setLoading(false);
      });
  }, [testDate]);

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

  if (loading || globalLoading.summary) return <div className={styles.loading}>Loading...</div>;
  if (error || globalError.summary) return <div className={styles.error}>{error || globalError.summary}</div>;
  if (!summary) return null;

  const currentDate = getCurrentDate(testDate);

  // Sort budgets: over-spent first
  const dashboardBudgets = Object.entries(summary.budgetLimits || {})
    .map(([name, limitData]) => {
      const spentData = summary.spending[name] || { total: 0, categories: {} };
      return {
        name,
        spent: spentData.total,
        limit: limitData.total,
        categories: limitData.categories || {},
        spentCategories: spentData.categories || {}
      };
    })
    .sort((a, b) => {
      const aOver = a.spent > a.limit;
      const bOver = b.spent > b.limit;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      return (b.spent / b.limit) - (a.spent / a.limit);
    });

  // Calculate over/under budget sitewide
  const totalBudgetLimit = summary.totalBudgeted || 0;
  const overUnder = summary.totalSpent - totalBudgetLimit;
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
      </Grid>

      {/* Budgets Section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" color={BLUE} fontWeight={600} mb={2} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Budgets
        </Typography>
        <Card sx={{ background: 'white', borderRadius: 3, boxShadow: '0 2px 8px rgba(35,41,70,0.06)', p: 0, overflow: 'hidden' }}>
          {dashboardBudgets.map((budget, idx) => {
            const overSpent = budget.spent > budget.limit;
            const isExpanded = !!expanded[budget.name];
            
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
                      startDate={getMonthStartEnd(currentDate).startDate}
                      endDate={getMonthStartEnd(currentDate).endDate}
                      isOverall
                      hidePercentLabel
                    />
                    {overSpent && (
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
                      const spent = budget.spentCategories[category] || 0;
                      return (
                        <Box key={category} sx={{ mb: 1 }}>
                          <BudgetProgressBar
                            name={category}
                            spent={spent}
                            limit={limit}
                            startDate={getMonthStartEnd(currentDate).startDate}
                            endDate={getMonthStartEnd(currentDate).endDate}
                            hidePercentLabel
                            isCategory
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