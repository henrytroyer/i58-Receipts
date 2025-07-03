import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Budgets from './components/Budgets';
import BudgetDetail from './components/BudgetDetail';
import ReceiptForm from './components/ReceiptForm';
import TestMode from './components/TestMode';
import AdminReceiptForm from './components/AdminReceiptForm';
import EditReceiptsPage from './components/EditReceiptsPage';
import MobileHeader from './components/MobileHeader';
import ProtectedRoute from './components/ProtectedRoute';
import Settings from './components/Settings';
import PettyCash from './components/PettyCash';
import styles from './styles/App.module.css';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BudgetProvider } from './contexts/BudgetContext';
import { GlobalStateProvider, useGlobalState } from './contexts/GlobalStateContext';
import { AuthProvider } from './contexts/AuthContext';

// Wrapper component to pass test date props to TestMode
const TestModeWrapper = () => {
  const { testDate, dispatch } = useGlobalState();
  
  const setTestDate = (date: string | null) => {
    dispatch({ type: 'SET_TEST_DATE', payload: date });
  };
  
  return <TestMode testDate={testDate || null} setTestDate={setTestDate} />;
};

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery('(min-width:900px)');
  
  return (
    <AuthProvider>
      <GlobalStateProvider>
        <BudgetProvider>
          <Router>
            <div className={styles.appContainer}>
              <MobileHeader />
              {isDesktop && <Sidebar />}
              <main className={styles.mainContent}>
                <Routes>
                  <Route path="/" element={<Navigate to={isMobile ? "/submit-receipt" : "/dashboard"} />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/budgets/:budgetName" element={<BudgetDetail />} />
                  <Route path="/submit-receipt" element={<ReceiptForm />} />
                  <Route path="/edit-receipts" element={<EditReceiptsPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/petty-cash" element={
                    <ProtectedRoute requiredDomain="i58global.org">
                      <PettyCash />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin-receipt" element={
                    <ProtectedRoute requiredDomain="i58global.org">
                      <AdminReceiptForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/test-mode" element={
                    <ProtectedRoute requiredEmail="henry@i58global.org">
                      <TestModeWrapper />
                    </ProtectedRoute>
                  } />
                </Routes>
              </main>
            </div>
          </Router>
        </BudgetProvider>
      </GlobalStateProvider>
    </AuthProvider>
  );
}

export default App;
