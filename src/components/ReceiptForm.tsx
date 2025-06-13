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
  Checkbox,
  FormControlLabel
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
  description: string;
  photo: File | null;
  monthlyExpense: boolean;
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
    description: '',
    photo: null,
    monthlyExpense: false,
  });
  const [amount, setAmount] = useState('');
  const [selectedBudgetSpent, setSelectedBudgetSpent] = useState(0);
  const [selectedCategorySpent, setSelectedCategorySpent] = useState(0);

  // Get selected budget and category data
  const selectedBudgetObj = budgets.find((b: BudgetData) => b.name === selectedBudget);
  const selectedBudgetYTD = summary && selectedBudget ? summary.budgetYearToDateTotals?.[selectedBudget] || 0 : 0;
  const rollingBudgetLimit = getRollingMonthlyLimit(selectedBudgetObj ? selectedBudgetObj.monthlyLimit : 0, selectedBudgetYTD, new Date());

  const selectedCategoryObj = categories.find((c: any) => c.name === selectedCategory && c.budgetName === selectedBudget);
  const selectedCategoryYTD = summary && selectedCategory ? summary.categoryYearToDateTotals?.[selectedCategory] || 0 : 0;
  const rollingCategoryLimit = getRollingMonthlyLimit(selectedCategoryObj ? selectedCategoryObj.monthlyLimit : 0, selectedCategoryYTD, new Date());

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
    console.log('selectedBudgetLimit:', rollingBudgetLimit);
  }, [selectedBudget, summary, selectedBudgetObj, selectedBudgetSpent, rollingBudgetLimit]);

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
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('date', format(formData.date, 'yyyy-MM-dd'));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('budget', selectedBudget);
      formDataToSend.append('category', selectedCategory);
      formDataToSend.append('vendor', formData.vendor);
      formDataToSend.append('card', formData.card);
      formDataToSend.append('monthlyExpense', formData.monthlyExpense.toString());
      if (photoBase64) {
        formDataToSend.append('pdf', photoBase64);
        formDataToSend.append('pdfIsNative', pdfIsNative.toString());
      }

      const response = await axios.post(API_BASE_URL, formDataToSend.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          amount: '',
          date: new Date(),
          vendor: '',
          card: '',
          description: '',
          photo: null,
          monthlyExpense: false,
        });
        setSelectedBudget('');
        setSelectedCategory('');
      } else {
        setError(response.data.error || 'Failed to submit receipt');
      }
    } catch (error) {
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
            <FormControl fullWidth>
              <InputLabel>Budget</InputLabel>
              <Select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                label="Budget"
              >
                {budgets.map((budget) => (
                  <MenuItem key={budget.name} value={budget.name}>
                    {budget.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Budget Progress Section */}
            {selectedBudget && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Budget Progress</Typography>
                {/* Overall Budget Progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Overall Budget</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(selectedBudgetSpent)} / {formatCurrency(rollingBudgetLimit)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                    <Box 
                      sx={{ 
                        bgcolor: 'primary.main',
                        height: 8,
                        borderRadius: 1,
                        width: `${Math.min(100, (selectedBudgetSpent / (rollingBudgetLimit || 1)) * 100)}%`
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
                        {formatCurrency(selectedCategorySpent)} / {formatCurrency(rollingCategoryLimit)}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                      <Box 
                        sx={{ 
                          bgcolor: 'success.main',
                          height: 8,
                          borderRadius: 1,
                          width: `${Math.min(100, (selectedCategorySpent / (rollingCategoryLimit || 1)) * 100)}%`
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                {categories
                  .filter((category) => category.budgetName === selectedBudget)
                  .map((category) => (
                    <MenuItem key={category.name} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

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

            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              fullWidth
              required
              inputProps={{ step: "0.01" }}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={handleDateChange}
              />
            </LocalizationProvider>

            <TextField
              label="Vendor"
              value={formData.vendor}
              onChange={handleInputChange('vendor')}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              multiline
              rows={4}
              required
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.monthlyExpense}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyExpense: e.target.checked }))}
                />
              }
              label="Monthly Expense"
            />

            <Button
              variant="contained"
              component="label"
              startIcon={<ImageIcon />}
            >
              Upload Receipt
              <input
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
            </Button>

            {formData.photo && (
              <Typography variant="body2" color="text.secondary">
                Selected file: {formData.photo.name}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Receipt'}
            </Button>

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