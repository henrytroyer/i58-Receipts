import { createContext, useContext, useState, useEffect, useReducer } from 'react';
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
  totalSpent: number;
  receiptsCount: number;
  budgetTotals: Record<string, number>;
  categoryTotals: Record<string, number>;
  budgetCategoryTotals?: Record<string, Record<string, number>>;
  budgetYearToDateTotals?: Record<string, number>;
  categoryYearToDateTotals?: Record<string, Record<string, number>>;
}

interface GlobalState {
  budgets: any[];
  categories: any[];
  cards: any[];
  loading: LoadingState;
  error: ErrorState;
  summary: Summary | null;
  testDate?: string | null;
  setBudgets: (budgets: any[]) => void;
  setCategories: (categories: any[]) => void;
  setCards: (cards: any[]) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: Partial<ErrorState>) => void;
  setSummary: (summary: Summary | null) => void;
  dispatch: React.Dispatch<any>;
}

const initialState: GlobalState = {
  budgets: [],
  categories: [],
  cards: [],
  loading: { budgets: false, categories: false, cards: false, summary: false },
  error: { budgets: null, categories: null, cards: null, summary: null },
  summary: null,
  testDate: localStorage.getItem('testDate') || null,
  setBudgets: () => {},
  setCategories: () => {},
  setCards: () => {},
  setLoading: () => {},
  setError: () => {},
  setSummary: () => {},
  dispatch: () => {},
};

function globalStateReducer(state: GlobalState, action: any): GlobalState {
  switch (action.type) {
    case 'SET_TEST_DATE':
      localStorage.setItem('testDate', action.payload || '');
      return { ...state, testDate: action.payload };
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading({ budgets: true, categories: true, cards: true, summary: true });
      // Fetch each resource individually for better error handling
      try {
        // Budgets
        try {
          const budgetsResponse = await api.get('', { params: { action: 'getBudgets' } });
          console.log('budgetsResponse', budgetsResponse.data);
          dispatch({ type: 'SET_BUDGETS', payload: budgetsResponse.data.data || budgetsResponse.data });
          setError({ budgets: null });
        } catch (err) {
          setError({ budgets: 'Failed to load budgets' });
          dispatch({ type: 'SET_BUDGETS', payload: [] });
        }
        setLoading({ budgets: false });

        // Categories
        try {
          const categoriesResponse = await api.get('', { params: { action: 'getCategories' } });
          console.log('categoriesResponse', categoriesResponse.data);
          dispatch({ type: 'SET_CATEGORIES', payload: categoriesResponse.data.data || categoriesResponse.data });
          setError({ categories: null });
        } catch (err) {
          setError({ categories: 'Failed to load categories' });
          dispatch({ type: 'SET_CATEGORIES', payload: [] });
        }
        setLoading({ categories: false });

        // Cards
        try {
          const cardsResponse = await api.get('', { params: { action: 'getCards' } });
          console.log('cardsResponse', cardsResponse.data);
          dispatch({ type: 'SET_CARDS', payload: cardsResponse.data.data || cardsResponse.data });
          setError({ cards: null });
        } catch (err) {
          setError({ cards: 'Failed to load cards' });
          dispatch({ type: 'SET_CARDS', payload: [] });
        }
        setLoading({ cards: false });

        // Summary
        try {
          const summaryResponse = await api.get('', { params: { action: 'getGlobalSummary' } });
          console.log('summaryResponse', summaryResponse.data);
          dispatch({ type: 'SET_SUMMARY', payload: summaryResponse.data.data || summaryResponse.data });
          setError({ summary: null });
        } catch (err) {
          setError({ summary: 'Failed to load summary' });
          dispatch({ type: 'SET_SUMMARY', payload: null });
        }
        setLoading({ summary: false });
      } catch (err) {
        // This catch is just a fallback; individual errors are handled above
        console.error('Error fetching global data:', err);
      }
    };
    fetchData();
  }, [dispatch]);

  return (
    <GlobalStateContext.Provider value={{ ...state, dispatch }}>
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