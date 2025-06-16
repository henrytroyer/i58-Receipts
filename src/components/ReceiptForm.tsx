import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  FormControlLabel,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import axios from 'axios';
import { BLUE } from '../theme';
import ImageIcon from '@mui/icons-material/Image';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { API_BASE_URL } from '../config';
import { getRollingMonthlyLimit } from '../utils/budget';

interface FormData {
  amount: string;
  date: Date;
  vendor: string;
  card: string;
  photo: File | null;
}

interface BudgetData {
  name: string;
  spent: number;
  monthlyLimit: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const ReceiptForm = () => {
  const { budgets, categories, cards, loading: globalLoading, error: globalError, summary } = useGlobalState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
  const [selectedBudgetSpent, setSelectedBudgetSpent] = useState(0);
  const [selectedCategorySpent, setSelectedCategorySpent] = useState(0);

  // Get selected budget and category data
  const selectedBudgetObj = budgets.find((b: BudgetData) => b.name === selectedBudget);
  const budgetLimit = summary?.data?.budgetLimits?.[selectedBudget]?.total ?? 0;
  const categoryLimit = summary?.data?.budgetLimits?.[selectedBudget]?.categories?.[selectedCategory] ?? 0;

  // Use spending for actual spent amounts
  const budgetSpent = summary?.data?.spending?.[selectedBudget]?.total ?? 0;
  const categorySpent = summary?.data?.spending?.[selectedBudget]?.categories?.[selectedCategory] ?? 0;

  // Dynamically include the value in the amount field
  const amountValue = parseFloat(amount) || 0;
  const shownBudgetSpent = budgetSpent + (selectedBudget && amount ? amountValue : 0);
  const shownCategorySpent = categorySpent + (selectedCategory && amount ? amountValue : 0);

  // Load last used budget from localStorage
  useEffect(() => {
    const lastUsedBudget = localStorage.getItem('lastUsedBudget');
    if (lastUsedBudget) {
      setSelectedBudget(lastUsedBudget);
    }
  }, []);

  // Save selected budget to localStorage
  useEffect(() => {
    if (selectedBudget) {
      localStorage.setItem('lastUsedBudget', selectedBudget);
    }
  }, [selectedBudget]);

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

  // Update categories when budget changes
  useEffect(() => {
    if (selectedBudget && categories.length > 0) {
      const budgetCategories = categories.filter(
        c => c.budgetName.trim() === selectedBudget.trim()
      );
      if (budgetCategories.length > 0) {
        setSelectedCategory(budgetCategories[0].name);
      } else {
        setSelectedCategory('');
      }
    } else {
      setSelectedCategory('');
    }
  }, [selectedBudget, categories]);

  // Debug logging for budget progress bar
  useEffect(() => {
    console.log('selectedBudget:', selectedBudget);
    console.log('summary:', summary);
    console.log('selectedBudgetObj:', selectedBudgetObj);
    console.log('selectedBudgetSpent:', selectedBudgetSpent);
    console.log('budgetLimit:', budgetLimit);
  }, [selectedBudget, summary, selectedBudgetObj, selectedBudgetSpent, budgetLimit]);

  // Add effect to update budget calculations when amount changes
  useEffect(() => {
    if (selectedBudget && amount) {
      const newAmount = parseFloat(amount) || 0;
      setSelectedBudgetSpent(prev => prev + newAmount);
      if (selectedCategory) {
        setSelectedCategorySpent(prev => prev + newAmount);
      }
    }
  }, [amount, selectedBudget, selectedCategory]);

  useEffect(() => {
    const availableBudgets = Object.keys(summary?.data?.budgetLimits || {});
    if (selectedBudget && !availableBudgets.includes(selectedBudget)) {
      setSelectedBudget('');
    }
  }, [summary, selectedBudget]);

  // Format as cents to euros as user types
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (!raw) raw = '0';
    // Convert to euros
    const euros = (parseInt(raw, 10) / 100).toFixed(2);
    setAmount(euros);
    setFormData(prev => ({ ...prev, amount: euros }));
  };

  // Format for display with euro symbol
  const formatAmountDisplay = (value: string) => {
    if (!value) return '';
    return `€${Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let photoBase64: string | null = null;
      let pdfIsNative = false;
      if (formData.photo) {
        pdfIsNative = formData.photo.type === 'application/pdf';
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(formData.photo!);
        });
      }

      const formDataToSend = new URLSearchParams();
      formDataToSend.append('action', 'submitReceipt');
      formDataToSend.append('data', JSON.stringify({
        amount,
        date: format(formData.date, 'yyyy-MM-dd'),
        budget: selectedBudget,
        category: selectedCategory,
        vendor: formData.vendor,
        card: formData.card,
        description: formData.vendor, // Using vendor as description since we removed the description field
        pdf: photoBase64,
        pdfIsNative: pdfIsNative
      }));

      console.log('Submitting form data:', {
        action: 'submitReceipt',
        amount,
        date: format(formData.date, 'yyyy-MM-dd'),
        budget: selectedBudget,
        category: selectedCategory,
        vendor: formData.vendor,
        card: formData.card,
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
        setSuccess(true);
        setFormData({
          amount: '',
          date: new Date(),
          vendor: '',
          card: '',
          photo: null,
        });
        setAmount('');
        setSelectedBudget('');
        setSelectedCategory('');
      } else {
        setError(response.data.error || 'Failed to submit receipt');
      }
    } catch (error: any) {
      console.error('Submit error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      setError('Failed to submit receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
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

  if (globalLoading.budgets || globalLoading.categories || globalLoading.cards) {
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

  if (globalError.budgets || globalError.categories || globalError.cards) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        mt: 6,
        px: 2
      }}>
        <Typography color="error.main">{globalError.budgets || globalError.categories || globalError.cards}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color={BLUE}>
          Submit Receipt
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Budget</InputLabel>
                  <Select
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    label="Budget"
                  >
                    {Object.keys(summary?.data?.budgetLimits || {}).map((budgetName) => (
                      <MenuItem key={budgetName} value={budgetName}>
                        {budgetName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category"
                  >
                    {Object.keys(summary?.data?.budgetLimits?.[selectedBudget]?.categories || {}).map((categoryName) => (
                      <MenuItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Budget Progress Section */}
            {selectedBudget && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Budget Progress</Typography>
                {/* Overall Budget Progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Overall Budget</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(shownBudgetSpent)} / {formatCurrency(budgetLimit)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                    <Box 
                      sx={{ 
                        bgcolor: 'primary.main',
                        height: 8,
                        borderRadius: 1,
                        width: `${Math.min(100, (shownBudgetSpent / (budgetLimit || 1)) * 100)}%`
                      }}
                    />
                  </Box>
                </Box>
                {/* Category Progress */}
                {selectedCategory && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Category: {selectedCategory}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(shownCategorySpent)} / {formatCurrency(categoryLimit)}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                      <Box 
                        sx={{ 
                          bgcolor: 'success.main',
                          height: 8,
                          borderRadius: 1,
                          width: `${Math.min(100, (shownCategorySpent / (categoryLimit || 1)) * 100)}%`
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  value={formatAmountDisplay(amount)}
                  onChange={handleAmountChange}
                  onFocus={e => e.target.select()}
                  fullWidth
                  required
                  inputProps={{ inputMode: "numeric" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={handleDateChange}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Card</InputLabel>
                  <Select
                    value={formData.card}
                    onChange={handleCardChange}
                    label="Card"
                  >
                    {cards.map((card) => (
                      <MenuItem key={card.card} value={card.card}>
                        {card.card}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  label="Vendor"
                  value={formData.vendor}
                  onChange={handleInputChange('vendor')}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>

            {!formData.photo ? (
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  {loading ? <CircularProgress size={24} /> : 'Confirm Submission'}
                </Button>
              </Box>
            )}

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" onClose={() => setSuccess(false)}>
                Receipt submitted successfully!
              </Alert>
            )}
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default ReceiptForm; 