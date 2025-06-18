import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import { api } from '../config';

interface LoadingState {
  budgets: boolean;
  categories: boolean;
  cards: boolean;
  summary: boolean;
}

interface ErrorState {
  budgets: string | null;
  categories: string | null;
  cards: string | null;
  summary: string | null;
}

interface Summary {
  success: boolean;
  data: {
    totalSpent: number;
    receiptsCount: number;
    budgetLimits: Record<string, {
      total: number;
      categories: Record<string, number>;
    }>;
    spending: Record<string, {
      total: number;
      categories: Record<string, number>;
    }>;
    totalBudgeted: number;
    remaining: number;
    budgetYearToDateTotals?: Record<string, number>;
    categoryYearToDateTotals?: Record<string, number>;
  };
}

// Cache interface for calendar month-based caching
interface CacheData {
  data: any;
  timestamp: number;
  monthKey: string; // Format: 'YYYY-MM'
}

// Cache interface for 24-hour caching
interface TimeBasedCacheData {
  data: any;
  timestamp: number;
}

interface CacheState {
  staticData: CacheData | null; // Budget limits - cached for calendar month
  budgets: TimeBasedCacheData | null; // Budget names - cached for 24 hours
  categories: TimeBasedCacheData | null; // Categories - cached for 24 hours
  cards: TimeBasedCacheData | null; // Cards - cached for 24 hours
}

interface GlobalState {
  budgets: any[];
  categories: any[];
  cards: any[];
  loading: LoadingState;
  error: ErrorState;
  summary: Summary | null;
  testDate?: string | null;
  budgetLimits?: Record<string, { total: number; categories: Record<string, number> }>;
  cache: CacheState;
  setBudgets: (budgets: any[]) => void;
  setCategories: (categories: any[]) => void;
  setCards: (cards: any[]) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: Partial<ErrorState>) => void;
  setSummary: (summary: Summary | null) => void;
  refreshSummary: () => Promise<void>;
  clearCache: () => void;
  dispatch: React.Dispatch<any>;
}

// Helper function to get current month key
const getCurrentMonthKey = (testDate?: string | null): string => {
  const date = testDate ? new Date(testDate) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper function to check if cache is valid for current month
const isCacheValid = (cache: CacheData | null, testDate?: string | null): boolean => {
  if (!cache) return false;
  const currentMonthKey = getCurrentMonthKey(testDate);
  return cache.monthKey === currentMonthKey;
};

// Helper function to check if time-based cache is valid (24 hours)
const isTimeBasedCacheValid = (cache: TimeBasedCacheData | null): boolean => {
  if (!cache) return false;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return (now - cache.timestamp) < twentyFourHours;
};

const initialState: GlobalState = {
  budgets: [],
  categories: [],
  cards: [],
  loading: { budgets: false, categories: false, cards: false, summary: false },
  error: { budgets: null, categories: null, cards: null, summary: null },
  summary: null,
  testDate: localStorage.getItem('testDate') || null,
  budgetLimits: {},
  cache: {
    staticData: null,
    budgets: null,
    categories: null,
    cards: null
  },
  setBudgets: () => {},
  setCategories: () => {},
  setCards: () => {},
  setLoading: () => {},
  setError: () => {},
  setSummary: () => {},
  refreshSummary: async () => {},
  clearCache: () => {},
  dispatch: () => {},
};

function globalStateReducer(state: GlobalState, action: any): GlobalState {
  switch (action.type) {
    case 'SET_TEST_DATE':
      localStorage.setItem('testDate', action.payload || '');
      return { ...state, testDate: action.payload };
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } };
    case 'SET_ERROR':
      return { ...state, error: { ...state.error, ...action.payload } };
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    case 'SET_BUDGET_LIMITS':
      return { ...state, budgetLimits: action.payload };
    case 'SET_CACHE':
      return { ...state, cache: { ...state.cache, ...action.payload } };
    case 'CLEAR_CACHE':
      return { 
        ...state, 
        cache: { staticData: null, budgets: null, categories: null, cards: null },
        budgets: [],
        categories: [],
        cards: [],
        summary: null,
        budgetLimits: {}
      };
    default:
      return state;
  }
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  const setLoading = (newLoading: Partial<LoadingState>) => {
    dispatch({ type: 'SET_LOADING', payload: newLoading });
  };

  const setError = (newError: Partial<ErrorState>) => {
    dispatch({ type: 'SET_ERROR', payload: newError });
  };

  const clearCache = () => {
    dispatch({ type: 'CLEAR_CACHE' });
  };

  // Function to refresh summary data (spending data only)
  const refreshSummary = async () => {
    try {
      setLoading({ summary: true });
      
      const spendingResponse = await api.get('', { 
        params: { 
          action: 'getCurrentSpending', 
          ...(state.testDate ? { date: state.testDate } : {}) 
        } 
      });
      
      if (spendingResponse.data.success && spendingResponse.data.data) {
        const spendingData = spendingResponse.data.data;
        const currentBudgetLimits = state.budgetLimits || {};
        
        // Create updated summary with new spending data
        const summaryData = {
          success: true,
          data: {
            totalSpent: spendingData.totalSpent,
            receiptsCount: spendingData.receiptsCount,
            budgetLimits: currentBudgetLimits,
            spending: spendingData.spending,
            totalBudgeted: Object.values(currentBudgetLimits).reduce((sum: number, budget: any) => sum + (budget.total || 0), 0),
            remaining: Object.values(currentBudgetLimits).reduce((sum: number, budget: any) => sum + (budget.total || 0), 0) - spendingData.totalSpent
          }
        };
        
        dispatch({ type: 'SET_SUMMARY', payload: summaryData });
        setError({ summary: null });
      }
    } catch (err) {
      console.error('Error refreshing summary data:', err);
      setError({ summary: 'Failed to refresh spending data' });
    } finally {
      setLoading({ summary: false });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const currentMonthKey = getCurrentMonthKey(state.testDate);
      
      // Check if we need to clear cache due to month change (only for static data)
      const staticCacheValid = isCacheValid(state.cache.staticData, state.testDate);
      
      // If static cache is invalid (different month), clear only static data cache
      if (!staticCacheValid) {
        dispatch({ 
          type: 'SET_CACHE', 
          payload: { staticData: null } 
        });
      }
      
      setLoading({ budgets: true, categories: true, cards: true, summary: true });
      
      // Phase 1: Fetch static data (budget limits - cached for calendar month) - FAST - Show immediately
      const staticDataPromise = (async () => {
        try {
          // Check cache first
          if (state.cache.staticData && isCacheValid(state.cache.staticData, state.testDate)) {
            const staticData = state.cache.staticData.data;
            dispatch({ type: 'SET_BUDGET_LIMITS', payload: staticData.budgetLimits || {} });
            setLoading({ budgets: false, categories: false });
            return staticData;
          }
          
          const staticResponse = await api.get('', { params: { action: 'getStaticData', ...(state.testDate ? { date: state.testDate } : {}) } });
          
          if (staticResponse.data.success && staticResponse.data.data) {
            const staticData = staticResponse.data.data;
            
            // Set budget limits immediately
            dispatch({ type: 'SET_BUDGET_LIMITS', payload: staticData.budgetLimits || {} });
            
            // Cache the static data (budget limits only)
            dispatch({ 
              type: 'SET_CACHE', 
              payload: { 
                staticData: { 
                  data: staticData, 
                  timestamp: Date.now(), 
                  monthKey: currentMonthKey 
                } 
              } 
            });
            
            setLoading({ budgets: false, categories: false });
            
            return staticData; // Return for use in spending phase
          }
        } catch (err) {
          console.error('Error fetching static data:', err);
          setError({ budgets: 'Failed to load budgets', categories: 'Failed to load categories' });
          setLoading({ budgets: false, categories: false });
        }
        return null;
      })();

      // Phase 2: Fetch budgets (cached for 24 hours) - FAST - Show immediately
      const budgetsPromise = (async () => {
        try {
          // Check cache first
          if (state.cache.budgets && isTimeBasedCacheValid(state.cache.budgets)) {
            const budgetsData = state.cache.budgets.data;
            dispatch({ type: 'SET_BUDGETS', payload: budgetsData });
            setError({ budgets: null });
            setLoading({ budgets: false });
            return;
          }
          
          // Use getStaticData to get budget names since there's no separate getBudgets endpoint
          const staticResponse = await api.get('', { params: { action: 'getStaticData', ...(state.testDate ? { date: state.testDate } : {}) } });
          
          if (staticResponse.data.success && staticResponse.data.data) {
            const budgetsData = staticResponse.data.data.budgetNames || [];
            dispatch({ type: 'SET_BUDGETS', payload: budgetsData });
            
            // Cache the budgets data
            dispatch({ 
              type: 'SET_CACHE', 
              payload: { 
                budgets: { 
                  data: budgetsData, 
                  timestamp: Date.now()
                } 
              } 
            });
            
            setError({ budgets: null });
          } else {
            throw new Error('Failed to get budget data from static data');
          }
        } catch (err) {
          console.error('Error fetching budgets:', err);
          setError({ budgets: 'Failed to load budgets' });
          dispatch({ type: 'SET_BUDGETS', payload: [] });
        }
        setLoading({ budgets: false });
      })();

      // Phase 3: Fetch categories (cached for 24 hours) - FAST - Show immediately
      const categoriesPromise = (async () => {
        try {
          // Check cache first
          if (state.cache.categories && isTimeBasedCacheValid(state.cache.categories)) {
            const categoriesData = state.cache.categories.data;
            dispatch({ type: 'SET_CATEGORIES', payload: categoriesData });
            setError({ categories: null });
            setLoading({ categories: false });
            return;
          }
          
          // Use getStaticData to get categories since there's no separate getCategories endpoint
          const staticResponse = await api.get('', { params: { action: 'getStaticData', ...(state.testDate ? { date: state.testDate } : {}) } });
          
          if (staticResponse.data.success && staticResponse.data.data) {
            const categoriesData = staticResponse.data.data.categories || [];
            dispatch({ type: 'SET_CATEGORIES', payload: categoriesData });
            
            // Cache the categories data
            dispatch({ 
              type: 'SET_CACHE', 
              payload: { 
                categories: { 
                  data: categoriesData, 
                  timestamp: Date.now()
                } 
              } 
            });
            
            setError({ categories: null });
          } else {
            throw new Error('Failed to get category data from static data');
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
          setError({ categories: 'Failed to load categories' });
          dispatch({ type: 'SET_CATEGORIES', payload: [] });
        }
        setLoading({ categories: false });
      })();

      // Phase 4: Fetch cards (cached for 24 hours) - FAST - Show immediately
      const cardsPromise = (async () => {
        try {
          // Check cache first
          if (state.cache.cards && isTimeBasedCacheValid(state.cache.cards)) {
            const cardsData = state.cache.cards.data;
            dispatch({ type: 'SET_CARDS', payload: cardsData });
            setError({ cards: null });
            setLoading({ cards: false });
            return;
          }
          
          const cardsResponse = await api.get('', { params: { action: 'getCards', ...(state.testDate ? { date: state.testDate } : {}) } });
          const cardsData = cardsResponse.data.data || cardsResponse.data;
          dispatch({ type: 'SET_CARDS', payload: cardsData });
          
          // Cache the cards data
          dispatch({ 
            type: 'SET_CACHE', 
            payload: { 
              cards: { 
                data: cardsData, 
                timestamp: Date.now()
              } 
            } 
          });
          
          setError({ cards: null });
        } catch (err) {
          setError({ cards: 'Failed to load cards' });
          dispatch({ type: 'SET_CARDS', payload: [] });
        }
        setLoading({ cards: false });
      })();

      // Phase 5: Fetch current spending (real-time - NEVER cached) - SLOWER - Load in background
      const spendingPromise = (async () => {
        try {
          const spendingResponse = await api.get('', { params: { action: 'getCurrentSpending', ...(state.testDate ? { date: state.testDate } : {}) } });
          
          if (spendingResponse.data.success && spendingResponse.data.data) {
            const spendingData = spendingResponse.data.data;
            
            // Wait for static data to be available
            const staticData = await staticDataPromise;
            const currentBudgetLimits = staticData?.budgetLimits || {};
            
            // Create summary with spending data and budget limits
            const summaryData = {
              success: true,
              data: {
                totalSpent: spendingData.totalSpent,
                receiptsCount: spendingData.receiptsCount,
                budgetLimits: currentBudgetLimits,
                spending: spendingData.spending,
                totalBudgeted: Object.values(currentBudgetLimits).reduce((sum: number, budget: any) => sum + (budget.total || 0), 0),
                remaining: Object.values(currentBudgetLimits).reduce((sum: number, budget: any) => sum + (budget.total || 0), 0) - spendingData.totalSpent
              }
            };
            
            dispatch({ type: 'SET_SUMMARY', payload: summaryData });
            setError({ summary: null });
          }
        } catch (err) {
          console.error('Error fetching current spending:', err);
          setError({ summary: 'Failed to load spending data' });
          dispatch({ type: 'SET_SUMMARY', payload: null });
        }
        setLoading({ summary: false });
      })();

      // Run all phases in parallel
      try {
        await Promise.all([staticDataPromise, budgetsPromise, categoriesPromise, cardsPromise, spendingPromise]);
      } catch (err) {
        console.error('Error in parallel data fetch:', err);
      }
    };
    fetchData();
  }, [state.testDate]); // Removed dispatch from dependencies to prevent re-renders

  return (
    <GlobalStateContext.Provider value={{ ...state, refreshSummary, clearCache, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
} 