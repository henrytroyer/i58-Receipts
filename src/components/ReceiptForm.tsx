import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Grid,
  Container,
  Paper,
  Autocomplete
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import axios from 'axios';
import { BLUE } from '../theme';
import ImageIcon from '@mui/icons-material/Image';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { API_BASE_URL } from '../config';
import { getCurrentDate, getMonthStartEnd, getProportionalBorrowedMap } from '../utils/budget';
import BudgetProgressBar from './BudgetProgressBar';
import { useAuth } from '../contexts/AuthContext';
import SignInButton from './SignInButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface FormData {
  amount: string;
  date: Date;
  vendor: string;
  card: string;
  photo: File | null;
}

export const ReceiptForm = () => {
  const { categories, cards, loading: globalLoading, summary, budgetLimits, refreshSummary } = useGlobalState();
  const { user, loading: authLoading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Array<{
    id: string;
    status: 'submitting' | 'success' | 'error';
    data: any;
    timestamp: number;
  }>>([]);
  const [pendingSuccessfulSubmissions, setPendingSuccessfulSubmissions] = useState<Array<{
    budget: string;
    category: string;
    amount: number;
  }>>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    date: new Date(),
    vendor: '',
    card: '',
    photo: null,
  });
  const [amount, setAmount] = useState('');

  // Get budget limits from the separate budgetLimits state (faster than summary)
  const budgetLimit = budgetLimits?.[selectedBudget]?.total ?? 0;
  const categoryLimit = budgetLimits?.[selectedBudget]?.categories?.[selectedCategory] ?? 0;

  // Use spending for actual spent amounts (from summary)
  const budgetSpent = summary?.data?.spending?.[selectedBudget]?.total ?? 0;
  const categorySpent = summary?.data?.spending?.[selectedBudget]?.categories?.[selectedCategory] ?? 0;

  // Calculate pending amounts from successful submissions that haven't been reflected in server data yet
  const pendingBudgetAmount = pendingSuccessfulSubmissions
    .filter(sub => sub.budget === selectedBudget)
    .reduce((sum, sub) => sum + sub.amount, 0);
  
  const pendingCategoryAmount = pendingSuccessfulSubmissions
    .filter(sub => sub.budget === selectedBudget && sub.category === selectedCategory)
    .reduce((sum, sub) => sum + sub.amount, 0);

  // Dynamically include the value in the amount field
  const amountValue = (parseFloat(amount) || 0) / 100; // Convert cents to euros
  const shownBudgetSpent = budgetSpent + pendingBudgetAmount + (selectedBudget && amount ? amountValue : 0);
  const shownCategorySpent = categorySpent + pendingCategoryAmount + (selectedCategory && amount ? amountValue : 0);

  // Calculate proportional borrowed map for the selected budget
  let proportionalBorrowed: number | undefined = undefined;
  let equalizedPercent: number | undefined = undefined;
  if (
    selectedBudget &&
    budgetLimits?.[selectedBudget]?.categories &&
    summary?.data?.spending?.[selectedBudget]?.categories
  ) {
    const propMap = getProportionalBorrowedMap(
      summary.data.spending[selectedBudget].categories,
      budgetLimits[selectedBudget].categories
    );
    if (selectedCategory && propMap[selectedCategory]) {
      const categoryData = propMap[selectedCategory];
      // Only set proportional data if the category is actually borrowing
      proportionalBorrowed = categoryData.borrowed && categoryData.borrowed > 0 ? categoryData.borrowed : undefined;
      equalizedPercent = categoryData.borrowed && categoryData.borrowed > 0 ? categoryData.equalizedPercent : undefined;
    }
  }

  // Load last used budget and category from localStorage immediately
  useEffect(() => {
    const lastUsedBudget = localStorage.getItem('lastUsedBudget');
    const lastUsedCategory = localStorage.getItem('lastUsedCategory');
    
    if (lastUsedBudget) {
      setSelectedBudget(lastUsedBudget);
    }
    if (lastUsedCategory) {
      setSelectedCategory(lastUsedCategory);
    }
  }, []);

  // Cache budget names and categories in localStorage when they load
  useEffect(() => {
    if (budgetLimits && Object.keys(budgetLimits).length > 0) {
      const budgetNames = Object.keys(budgetLimits);
      localStorage.setItem('cachedBudgetNames', JSON.stringify(budgetNames));
      
      // Cache categories for each budget
      const budgetCategories: Record<string, string[]> = {};
      Object.entries(budgetLimits).forEach(([budgetName, budget]) => {
        budgetCategories[budgetName] = Object.keys(budget.categories || {});
      });
      localStorage.setItem('cachedBudgetCategories', JSON.stringify(budgetCategories));
    }
  }, [budgetLimits]);

  // Get cached budget names and categories for immediate display
  const getCachedBudgetNames = () => {
    try {
      const cached = localStorage.getItem('cachedBudgetNames');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const getCachedBudgetCategories = (budgetName: string) => {
    try {
      const cached = localStorage.getItem('cachedBudgetCategories');
      if (!cached) return [];
      const budgetCategories = JSON.parse(cached);
      return budgetCategories[budgetName] || [];
    } catch {
      return [];
    }
  };

  // Use cached data if API data is not available yet
  const availableBudgetNames = Object.keys(budgetLimits || {}).length > 0 
    ? Object.keys(budgetLimits || {}) 
    : getCachedBudgetNames();

  const availableCategories = selectedBudget && Object.keys(budgetLimits?.[selectedBudget]?.categories || {}).length > 0
    ? Object.keys(budgetLimits?.[selectedBudget]?.categories || {})
    : getCachedBudgetCategories(selectedBudget);

  // Save selected budget to localStorage
  useEffect(() => {
    if (selectedBudget) {
      localStorage.setItem('lastUsedBudget', selectedBudget);
    }
  }, [selectedBudget]);

  // Save selected category to localStorage
  useEffect(() => {
    if (selectedCategory) {
      localStorage.setItem('lastUsedCategory', selectedCategory);
    }
  }, [selectedCategory]);

  // Load last used card from localStorage or default to first card when cards change
  useEffect(() => {
    if (cards.length > 0) {
      const lastUsedCard = localStorage.getItem('lastUsedCard');
      if (lastUsedCard && cards.some(c => String(c.card) === lastUsedCard)) {
        setFormData(prev => ({ ...prev, card: lastUsedCard }));
      } else {
        setFormData(prev => ({ ...prev, card: String(cards[0].card) }));
      }
    }
  }, [cards]);

  // Save selected card to localStorage
  useEffect(() => {
    if (formData.card) {
      localStorage.setItem('lastUsedCard', formData.card);
    }
  }, [formData.card]);

  // Update categories when budget changes (but don't override if category is already set from localStorage)
  useEffect(() => {
    if (selectedBudget && categories.length > 0) {
      const budgetCategories = categories.filter(
        c => c.budgetName.trim() === selectedBudget.trim()
      );
      if (budgetCategories.length > 0 && !selectedCategory) {
        // Only set category if none is currently selected
        setSelectedCategory(budgetCategories[0].name);
      }
    }
  }, [selectedBudget, categories, selectedCategory]);

  // Validate budget and category against available data (only after data loads)
  useEffect(() => {
    if (budgetLimits && Object.keys(budgetLimits).length > 0) {
      const availableBudgets = Object.keys(budgetLimits);
      if (selectedBudget && !availableBudgets.includes(selectedBudget)) {
        console.log('Clearing invalid budget:', selectedBudget, 'Available:', availableBudgets);
        setSelectedBudget('');
        setSelectedCategory(''); // Clear category too since budget is invalid
      }
    }
  }, [budgetLimits, selectedBudget]);

  // Format for display with euro symbol - treat input as cents
  const formatAmountDisplay = (value: string) => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    // Convert cents to euros (divide by 100)
    const euros = numValue / 100;
    return `€${euros.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
  };

  // Handle amount input changes - strip formatting and store only raw numeric value
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove euro symbol and any non-numeric characters
    const numericValue = inputValue.replace(/[€\s,]/g, '').replace(/\./g, '');
    // Only allow valid numeric input
    if (numericValue === '' || /^\d*$/.test(numericValue)) {
      setAmount(numericValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Store the current form data for submission
    const currentFormData = {
      amount,
      date: formData.date,
      vendor: formData.vendor,
      card: formData.card,
      photo: formData.photo,
      budget: selectedBudget,
      category: selectedCategory
    };

    // Create a unique ID for this submission
    const submissionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Add submission to tracking
    setSubmissions(prev => [...prev, {
      id: submissionId,
      status: 'submitting',
      data: currentFormData,
      timestamp: Date.now()
    }]);

    // Immediately reset the form for better UX
    setFormData(prev => ({
      ...prev,
      amount: '',
      vendor: '',
      photo: null,
    }));
    setAmount('');
    
    // Reset loading state immediately so user can submit another receipt
    setLoading(false);

    try {
      let photoBase64: string | null = null;
      let pdfIsNative = false;
      if (currentFormData.photo) {
        pdfIsNative = currentFormData.photo.type === 'application/pdf';
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(currentFormData.photo!);
        });
      }

      const formDataToSend = new URLSearchParams();
      formDataToSend.append('data', JSON.stringify({
        amount: (parseFloat(currentFormData.amount) / 100).toString(), // Convert cents to euros
        date: format(currentFormData.date, 'yyyy-MM-dd'),
        budget: currentFormData.budget,
        category: currentFormData.category,
        vendor: currentFormData.vendor,
        card: currentFormData.card,
        description: currentFormData.vendor, // Using vendor as description since we removed the description field
        pdf: photoBase64,
        pdfIsNative: pdfIsNative,
        userEmail: user?.email || '',
        userName: user?.displayName || user?.email || 'Unknown User'
      }));

      console.log('Submitting form data:', {
        amount: currentFormData.amount,
        date: format(currentFormData.date, 'yyyy-MM-dd'),
        budget: currentFormData.budget,
        category: currentFormData.category,
        vendor: currentFormData.vendor,
        card: currentFormData.card,
        hasPhoto: !!photoBase64
      });

      const response = await axios.post(API_BASE_URL, formDataToSend.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        withCredentials: false,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      console.log('Response:', response);

      if (response.data.success) {
        // Update submission status to success
        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId ? { ...sub, status: 'success' } : sub
        ));
        
        // Add to pending successful submissions for immediate budget progress update
        setPendingSuccessfulSubmissions(prev => [...prev, {
          budget: currentFormData.budget,
          category: currentFormData.category,
          amount: parseFloat(currentFormData.amount) / 100 // Convert cents to euros
        }]);
        
        // Trigger background refresh of budget data
        try {
          await refreshSummary();
          // Clear pending submissions after server data is refreshed
          setPendingSuccessfulSubmissions([]);
        } catch (err) {
          console.error('Failed to refresh budget data:', err);
          // Don't show error to user as this is background refresh
        }
        
        // Remove success submission after 4 seconds
        setTimeout(() => {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
        }, 4000);
      } else {
        // Update submission status to error
        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId ? { ...sub, status: 'error' } : sub
        ));
        
        // Remove error submission after 6 seconds
        setTimeout(() => {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
        }, 6000);
      }
    } catch (error: any) {
      console.error('Submit error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      // Update submission status to error
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId ? { ...sub, status: 'error' } : sub
      ));
      
      // Remove error submission after 6 seconds
      setTimeout(() => {
        setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
      }, 6000);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
    }
  };

  const handleCardChange = (event: any) => {
    setFormData(prev => ({ ...prev, card: event.target.value }));
  };

  // Fetch vendor suggestions from past receipts
  const fetchVendorSuggestions = async () => {
    if (!user) return;
    
    try {
      const response = await axios.post(API_BASE_URL, new URLSearchParams({
        action: 'getVendorSuggestions',
        data: JSON.stringify({
          userEmail: user.email
        })
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: false,
      });

      if (response.data.success && response.data.vendors) {
        setVendorSuggestions(response.data.vendors);
      }
    } catch (error) {
      console.error('Failed to fetch vendor suggestions:', error);
    }
  };

  // Load vendor suggestions when user is authenticated
  useEffect(() => {
    if (user) {
      fetchVendorSuggestions();
    }
  }, [user]);

  // Filter vendor suggestions based on current input
  const getFilteredVendorSuggestions = (inputValue: string) => {
    if (!inputValue) return vendorSuggestions.slice(0, 3);
    
    const filtered = vendorSuggestions
      .filter(vendor => 
        vendor.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 3);
    
    return filtered;
  };

  // Show form immediately - no loading spinner blocking the UI
  const hasSpendingData = summary?.data?.spending && Object.keys(summary.data.spending).length > 0;
  const isSpendingLoading = globalLoading.summary && !hasSpendingData;

  // Only do conditional rendering after all hooks
  if (authLoading) {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}>
        <Container maxWidth="sm">
          {isMobile ? (
            <Box sx={{ p: 0, textAlign: 'center', bgcolor: '#fff' }}>
              <Typography variant="h4" gutterBottom color={BLUE}>
                Sign In Required
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Please sign in to submit receipts. This helps us track your submissions and allows you to edit them later.
              </Typography>
              <SignInButton />
            </Box>
          ) : (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom color={BLUE}>
                Sign In Required
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Please sign in to submit receipts. This helps us track your submissions and allows you to edit them later.
              </Typography>
              <SignInButton />
            </Paper>
          )}
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: 'calc(100vh - 56px)', // 56px for AppBar height
      bgcolor: '#fff',
      px: 0,
      py: 0,
      pt: { xs: 7, sm: 2 }, // Add top padding: 56px (7 * 8px) on mobile, 16px on desktop
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <Box
        sx={{
          width: '100%',
          mt: { xs: 0, sm: 2 },
          mb: 2,
          px: { xs: 1, sm: 2 },
          maxWidth: { xs: '100%', sm: 480 },
          mx: { xs: 0, sm: 'auto' },
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Grid container spacing={0} sx={{ m: 0, width: '100%' }}>
              <Grid item xs={6} sx={{ m: 0, p: 0, pr: 1 }}>
                <FormControl fullWidth>
                  <InputLabel shrink>Budget</InputLabel>
                  <Select
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    label="Budget"
                  >
                    {availableBudgetNames.length > 0 ? (
                      availableBudgetNames.map((budgetName: string) => (
                        <MenuItem key={budgetName} value={budgetName}>
                          {budgetName}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>Loading budgets...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sx={{ m: 0, p: 0, pl: 1, position: 'relative' }}>
                <FormControl fullWidth>
                  <InputLabel shrink>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category"
                    disabled={!selectedBudget}
                  >
                    {availableCategories.length > 0 ? (
                      availableCategories.map((categoryName: string) => (
                        <MenuItem key={categoryName} value={categoryName}>
                          {categoryName}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>Loading categories...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Budget Progress Bar */}
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef', position: 'relative' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Budget Progress
              </Typography>
              
              {/* Show loading state or actual progress */}
              {isSpendingLoading ? (
                <>
                  {/* Overall Budget Progress - Loading */}
                  <Box sx={{ mb: 2 }}>
                    <BudgetProgressBar
                      name="Overall Budget"
                      spent={0}
                      limit={1000}
                      startDate={getMonthStartEnd(getCurrentDate()).startDate}
                      endDate={getMonthStartEnd(getCurrentDate()).endDate}
                      hidePercentLabel
                      isLoading={true}
                    />
                  </Box>

                  {/* Category Progress - Loading */}
                  {selectedCategory && (
                    <Box>
                      <BudgetProgressBar
                        name={selectedCategory}
                        spent={0}
                        limit={500}
                        startDate={getMonthStartEnd(getCurrentDate()).startDate}
                        endDate={getMonthStartEnd(getCurrentDate()).endDate}
                        hidePercentLabel
                        isCategory
                        isLoading={true}
                        overallBudgetStatus={{
                          isOver: false,
                          totalSpent: 0,
                          totalLimit: 1000
                        }}
                      />
                    </Box>
                  )}
                </>
              ) : (
                <>
                  {/* Overall Budget Progress */}
                  <Box sx={{ mb: 2 }}>
                    <BudgetProgressBar
                      name="Overall Budget"
                      spent={shownBudgetSpent}
                      limit={budgetLimit}
                      startDate={getMonthStartEnd(getCurrentDate()).startDate}
                      endDate={getMonthStartEnd(getCurrentDate()).endDate}
                      hidePercentLabel
                      isLoading={false}
                    />
                  </Box>

                  {/* Category Progress */}
                  {selectedCategory && (
                    <Box>
                      <BudgetProgressBar
                        name={selectedCategory}
                        spent={shownCategorySpent}
                        limit={categoryLimit}
                        startDate={getMonthStartEnd(getCurrentDate()).startDate}
                        endDate={getMonthStartEnd(getCurrentDate()).endDate}
                        hidePercentLabel
                        isCategory
                        overallBudgetStatus={{
                          isOver: shownBudgetSpent > budgetLimit,
                          totalSpent: shownBudgetSpent,
                          totalLimit: budgetLimit
                        }}
                        proportionalBorrowed={proportionalBorrowed}
                        equalizedPercent={equalizedPercent}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>

            <Grid container spacing={0} sx={{ m: 0, width: '100%' }}>
              <Grid item xs={6} sx={{ m: 0, p: 0, pr: 1 }}>
                <TextField
                  label="Amount"
                  value={formatAmountDisplay(amount)}
                  onChange={handleAmountChange}
                  onFocus={e => e.target.select()}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ inputMode: "numeric" }}
                />
              </Grid>
              <Grid item xs={6} sx={{ m: 0, p: 0, pl: 1 }}>
                <FormControl fullWidth>
                  <InputLabel shrink>Card</InputLabel>
                  <Select
                    value={formData.card}
                    onChange={handleCardChange}
                    label="Card"
                  >
                    {cards.length > 0 ? (
                      cards.map((card) => (
                        <MenuItem key={card.card} value={card.card}>
                          {card.card}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>Loading cards...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={0} sx={{ m: 0, width: '100%' }}>
              <Grid item xs={6} sx={{ m: 0, p: 0, pr: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={handleDateChange}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true, 
                        required: true,
                        InputLabelProps: { shrink: true }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={6} sx={{ m: 0, p: 0, pl: 1 }}>
                <Autocomplete
                  value={formData.vendor}
                  onChange={(_, newValue) => {
                    setFormData(prev => ({ ...prev, vendor: newValue || '' }));
                  }}
                  onInputChange={(_, newInputValue) => {
                    setFormData(prev => ({ ...prev, vendor: newInputValue }));
                  }}
                  options={getFilteredVendorSuggestions(formData.vendor)}
                  freeSolo
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Vendor" 
                      fullWidth 
                      required 
                      InputLabelProps={{ shrink: true }} 
                    />
                  )}
                />
              </Grid>
            </Grid>

            {!formData.photo ? (
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                sx={{ mt: 1 }}
              >
                Upload Receipt
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </Button>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected file: {formData.photo.name}
                </Typography>
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit Receipt'}
                </Button>
              </Box>
            )}

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Stack>
        </form>

        {/* Submission Status Cards */}
        {submissions.length > 0 && (
          <Box sx={{ mt: 3, width: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Submission Status
            </Typography>
            <Stack spacing={1}>
              {submissions.map((submission) => (
                <Paper
                  key={submission.id}
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: submission.status === 'submitting' ? '#e6f3ff' : 
                             submission.status === 'success' ? '#f0f8ff' : '#fff5f5',
                    border: submission.status === 'submitting' ? '1px solid #4a90e2' :
                           submission.status === 'success' ? '1px solid #4a90e2' : '1px solid #f44336',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {submission.status === 'submitting' && (
                    <CircularProgress size={20} sx={{ color: '#4a90e2' }} />
                  )}
                  {submission.status === 'success' && (
                    <Box sx={{ color: '#4a90e2', fontSize: 20 }}>✔️</Box>
                  )}
                  {submission.status === 'error' && (
                    <Box sx={{ color: '#f44336', fontSize: 20 }}>❌</Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {submission.data.vendor} - {formatAmountDisplay(submission.data.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {submission.status === 'submitting' && 'Submitting...'}
                      {submission.status === 'success' && 'Successfully submitted'}
                      {submission.status === 'error' && 'Failed to submit'}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ReceiptForm; 