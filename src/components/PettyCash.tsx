import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalState } from '../contexts/GlobalStateContext';
import styles from '../styles/PettyCash.module.css';
import { API_BASE_URL } from '../config';

interface PettyCashFund {
  currentBalance: number;
  totalWithdrawals: number;
  totalExpenses: number;
  transactionCount: number;
}

interface PettyCashBalance {
  funds: { [key: string]: PettyCashFund };
  totalBalance: number;
}

interface PettyCashTransaction {
  id: string;
  date: string;
  type: 'WITHDRAWAL' | 'EXPENSE';
  amount: number;
  description: string;
  location: string;
  balance: number;
  user: string;
  receiptUrl: string;
  fund: string;
}

interface PettyCashHistory {
  transactions: PettyCashTransaction[];
  totalTransactions: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface Card {
  card: string;
  assignee: string;
  location: string;
}

const PettyCash: React.FC = () => {
  const { user } = useAuth();
  const { userSettings, setUserSettings, cards } = useGlobalState();
  const [balances, setBalances] = useState<PettyCashBalance | null>(null);
  const [history, setHistory] = useState<PettyCashHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transfers' | 'history'>('overview');
  
  // Withdrawal form state
  const [transferForm, setTransferForm] = useState({
    fromCard: '',
    fund: '',
    amount: '',
    description: '',
  });
  
  // History filter state
  const [historyFilters, setHistoryFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  // Load petty cash balances
  const loadBalances = async () => {
    if (!userSettings?.pettyCashFunds?.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=getPettyCashBalance&funds=${userSettings.pettyCashFunds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        setBalances(data.data);
      } else {
        setError(data.error || 'Failed to load petty cash balances');
      }
    } catch (err) {
      setError('Failed to load petty cash balances');
      console.error('Error loading petty cash balances:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load petty cash history
  const loadHistory = async () => {
    if (!userSettings?.pettyCashFunds?.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}?action=getPettyCashHistory&funds=${userSettings.pettyCashFunds.join(',')}&startDate=${historyFilters.startDate}&endDate=${historyFilters.endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data);
      } else {
        setError(data.error || 'Failed to load petty cash history');
      }
    } catch (err) {
      setError('Failed to load petty cash history');
      console.error('Error loading petty cash history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Record withdrawal
  const recordWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferForm.fromCard || !transferForm.fund || !transferForm.amount || !transferForm.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=recordPettyCashWithdrawal&data=${encodeURIComponent(JSON.stringify({
        fromCard: transferForm.fromCard,
        fund: transferForm.fund,
        amount: parseFloat(transferForm.amount),
        description: transferForm.description,
        userEmail: user?.email
      }))}`);
      
      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setTransferForm({
          fromCard: '',
          fund: '',
          amount: '',
          description: '',
        });
        
        // Reload balances and history
        await loadBalances();
        await loadHistory();
        
        alert('Withdrawal recorded successfully!');
      } else {
        setError(data.error || 'Failed to record withdrawal');
      }
    } catch (err) {
      setError('Failed to record withdrawal');
      console.error('Error recording withdrawal:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user settings
  const loadUserSettings = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=getUserSettings&email=${encodeURIComponent(user.email)}`);
      
      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText);
        if (data.success) {
          setUserSettings(data.data);
        } else {
          console.error('API call to getUserSettings was not successful:', data.error);
          setError('Failed to load your settings.');
        }
      } catch (e) {
        console.error('Failed to parse JSON from getUserSettings, received text:', responseText);
        setError('An unexpected error occurred while fetching your data.');
      }

    } catch (err) {
      console.error('Network error loading user settings:', err);
      setError('Could not connect to the server to get your user data.');
    }
  };

  // Load data when component mounts or user settings change
  useEffect(() => {
    if (userSettings?.pettyCashFunds?.length) {
      loadBalances();
      if (activeTab === 'history') {
        loadHistory();
      }
    } else if (user?.email && userSettings === null) {
      // Try to load user settings if they're not available
      loadUserSettings();
    }
  }, [userSettings?.pettyCashFunds, activeTab, user?.email]);

  // Load history when filters change
  useEffect(() => {
    if (activeTab === 'history' && userSettings?.pettyCashFunds?.length) {
      loadHistory();
    }
  }, [historyFilters, activeTab]);

  // Check if user has petty cash access
  if (!user?.email?.endsWith('@i58global.org')) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>Petty cash management is only available to i58global.org users.</p>
        </div>
      </div>
    );
  }

  // Check if user settings are still loading
  if (userSettings === null) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <h2>Loading...</h2>
          <p>Please wait while we load your settings.</p>
        </div>
      </div>
    );
  }

  // Check if user has petty cash funds configured
  if (!userSettings?.pettyCashFunds?.length) {
    return (
      <div className={styles.container}>
        <div className={styles.noFunds}>
          <h2>No Petty Cash Funds Configured</h2>
          <p>Please configure your petty cash funds in the Settings page.</p>
          <p>You need to:</p>
          <ol>
            <li>Select your region</li>
            <li>Select your sub-regions</li>
            <li>Select your petty cash funds</li>
            <li>Save your settings</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Petty Cash Management</h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'transfers' ? styles.active : ''}`}
            onClick={() => setActiveTab('transfers')}
          >
            New Transfer
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Transaction History
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          Loading...
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && balances && (
        <div className={styles.overview}>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h3>Total Balance</h3>
              <div className={styles.amount}>€{balances.totalBalance.toFixed(2)}</div>
            </div>
            <div className={styles.summaryCard}>
              <h3>Active Funds</h3>
              <div className={styles.count}>{Object.keys(balances.funds).length}</div>
            </div>
          </div>

          <div className={styles.fundsGrid}>
            {Object.entries(balances.funds).map(([fundName, fund]) => (
              <div key={fundName} className={styles.fundCard}>
                <h3>{fundName}</h3>
                <div className={styles.fundBalance}>€{fund.currentBalance.toFixed(2)}</div>
                <div className={styles.fundDetails}>
                  <div>Withdrawals: €{fund.totalWithdrawals.toFixed(2)}</div>
                  <div>Expenses: €{fund.totalExpenses.toFixed(2)}</div>
                  <div>Transactions: {fund.transactionCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className={styles.transfers}>
          <form onSubmit={recordWithdrawal} className={styles.transferForm}>
            <div className={styles.formGroup}>
              <label htmlFor="fromCard">From Card *</label>
              <select
                id="fromCard"
                value={transferForm.fromCard}
                onChange={(e) => setTransferForm({ ...transferForm, fromCard: e.target.value })}
                required
              >
                <option value="">Select a card</option>
                {cards?.map((card: Card) => (
                  <option key={card.card} value={card.card}>{card.card}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="fund">Fund *</label>
              <select
                id="fund"
                value={transferForm.fund}
                onChange={(e) => setTransferForm({ ...transferForm, fund: e.target.value })}
                required
              >
                <option value="">Select a fund</option>
                {userSettings?.pettyCashFunds?.map((fund: string) => (
                  <option key={fund} value={fund}>{fund}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="amount">Amount (€) *</label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                value={transferForm.description}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                required
              />
            </div>

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Recording...' : 'Record Transfer'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={styles.history}>
          <div className={styles.historyFilters}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={historyFilters.startDate}
                onChange={(e) => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                value={historyFilters.endDate}
                onChange={(e) => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
              />
            </div>
          </div>

          {history && (
            <div className={styles.transactions}>
              <h3>Transactions ({history.totalTransactions})</h3>
              {history.transactions.length > 0 ? (
                <div className={styles.transactionList}>
                  {history.transactions.map(transaction => (
                    <div key={transaction.id} className={styles.transaction}>
                      <div className={styles.transactionHeader}>
                        <div className={styles.transactionDate}>
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                        <div className={`${styles.transactionAmount} ${transaction.amount > 0 ? styles.positive : styles.negative}`}>
                          €{Math.abs(transaction.amount).toFixed(2)}
                        </div>
                      </div>
                      <div className={styles.transactionDetails}>
                        <div className={styles.transactionType}>{transaction.type}</div>
                        <div className={styles.transactionDescription}>{transaction.description}</div>
                        <div className={styles.transactionFund}>{transaction.fund}</div>
                        {transaction.user && <div className={styles.transactionUser}>{transaction.user}</div>}
                      </div>
                      <div className={styles.transactionBalance}>
                        Balance: €{transaction.balance.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noTransactions}>
                  No transactions found for the selected date range.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PettyCash; 