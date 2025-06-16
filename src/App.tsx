import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Budgets from './components/Budgets';
import BudgetDetail from './components/BudgetDetail';
import ReceiptForm from './components/ReceiptForm';
import TestMode from './components/TestMode';
import AdminReceiptForm from './components/AdminReceiptForm';
import styles from './styles/App.module.css';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { BudgetProvider } from './contexts/BudgetContext';
import { GlobalStateProvider } from './contexts/GlobalStateContext';

const ACCENT = '#3b6ea5';

function MobileAppBar() {
  const navigate = useNavigate();
  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        borderTop: '1px solid',
        borderColor: 'divider',
        top: 'auto',
        bottom: 0,
        width: '100%',
        height: `calc(64px + env(safe-area-inset-bottom, 0px) + 24px)`,
        minHeight: `calc(64px + env(safe-area-inset-bottom, 0px) + 24px)`,
        zIndex: 1300,
      }}
    >
      <Toolbar sx={{ 
        minHeight: 64, 
        height: 64,
        px: 2,
        pt: 3,
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => navigate('/budgets')}
          sx={{
            flex: 1,
            maxWidth: '45%',
            minHeight: 40,
            flexDirection: 'column',
            p: 1,
            borderColor: ACCENT,
            color: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            borderRadius: '12px',
          }}
        >
          <AccountBalanceWalletIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 600, color: ACCENT, fontSize: '0.75rem' }}>
            Budgets
          </Typography>
        </Button>

        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => navigate('/submit-receipt')}
          sx={{
            flex: 1,
            maxWidth: '45%',
            minHeight: 40,
            flexDirection: 'column',
            p: 1,
            borderColor: ACCENT,
            color: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            borderRadius: '12px',
          }}
        >
          <AddIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 600, color: ACCENT, fontSize: '0.75rem' }}>
            Submit
          </Typography>
        </Button>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery('(min-width:900px)');
  return (
    <GlobalStateProvider>
    <BudgetProvider>
      <Router>
        <div className={styles.appContainer}>
          <Sidebar />
          <main className={styles.mainContent}>
            {isMobile && <MobileAppBar />}
            <Routes>
              <Route path="/" element={<Navigate to={isDesktop ? "/dashboard" : "/budgets"} />} />
              {isDesktop && <Route path="/dashboard" element={<Dashboard />} />}
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/budgets/:budgetName" element={<BudgetDetail />} />
              <Route path="/submit-receipt" element={<ReceiptForm />} />
              <Route path="/admin-receipt" element={<AdminReceiptForm />} />
              <Route path="/test-mode" element={<TestMode />} />
            </Routes>
          </main>
        </div>
      </Router>
    </BudgetProvider>
    </GlobalStateProvider>
  );
}

export default App;
