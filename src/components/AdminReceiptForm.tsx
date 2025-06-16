import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminReceiptForm.module.css';
import { useGlobalState } from '../contexts/GlobalStateContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import { Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const AdminReceiptForm: React.FC = () => {
  const { summary, cards } = useGlobalState();
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [pdfIsNative, setPdfIsNative] = useState(false);
  const [card, setCard] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  // Set today's date as default on mount
  useEffect(() => {
    if (!date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const formDataToSend = new URLSearchParams();
      formDataToSend.append('action', 'submitReceipt');
      formDataToSend.append('data', JSON.stringify({
        amount,
        date,
        vendor,
        budget,
        category,
        card,
        description,
        monthlyExpense,
        pdf: photoBase64,
        pdfIsNative: pdfIsNative,
        ...(monthlyExpense ? { startDate, endDate } : {})
      }));
      const response = await axios.post(API_BASE_URL, formDataToSend.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        withCredentials: false,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      if (response.data.success) {
        setSuccess(true);
        setAmount('');
        setVendor('');
        setBudget('');
        setCategory('');
        setCard('');
        setDescription('');
        setMonthlyExpense(false);
        setPhoto(null);
        setPhotoBase64(null);
        setPdfIsNative(false);
      } else {
        setError(response.data.error || 'Failed to submit receipt');
      }
    } catch (err: any) {
      setError('Failed to submit receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Check if it's a PDF
      if (file.type === 'application/pdf') {
        setPdfIsNative(true);
        // Remove the prefix if present
        const base64 = result.split(',')[1] || result;
        setPhotoBase64(base64);
      } else {
        setPdfIsNative(false);
        // Remove the prefix if present
        const base64 = result.split(',')[1] || result;
        setPhotoBase64(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setPhoto(null);
    setPhotoBase64(null);
    setPdfIsNative(false);
  };

  // Get budget options from summary
  const budgetOptions = summary?.data?.budgetLimits ? Object.keys(summary.data.budgetLimits) : [];
  // Get category options for selected budget
  const categoryOptions = budget && summary?.data?.budgetLimits?.[budget]?.categories ? Object.keys(summary.data.budgetLimits[budget].categories) : [];
  // Get card options from summary
  const cardOptions = cards ? cards.map((c: any) => c.card) : [];

  // Format as cents to euros as user types
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (!raw) raw = '0';
    // Convert to euros
    const euros = (parseInt(raw, 10) / 100).toFixed(2);
    setAmount(euros);
  };

  // Format for display with euro symbol
  const formatAmountDisplay = (value: string) => {
    if (!value) return '';
    return `€${Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
  };

  // When Monthly Expense is checked, show modal
  const handleMonthlyExpenseClick = () => {
    if (!monthlyExpense) {
      setShowMonthlyModal(true);
    } else {
      setMonthlyExpense(false);
      setStartDate('');
      setEndDate('');
    }
  };

  const handleMonthlyModalSave = () => {
    setMonthlyExpense(true);
    setShowMonthlyModal(false);
  };

  const handleMonthlyModalCancel = () => {
    setMonthlyExpense(false);
    setShowMonthlyModal(false);
    setStartDate('');
    setEndDate('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Admin Only:</strong> This form is for authorized users only. If you are not an admin, please use the regular <Link to="/submit-receipt">Submit Receipt</Link> form.
      </Alert>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Receipt submitted successfully!</div>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Amount (€)"
            value={formatAmountDisplay(amount)}
            onChange={handleAmountChange}
            required
            fullWidth
            inputProps={{ inputMode: 'numeric' }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Vendor"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Budget"
            value={budget}
            onChange={e => {
              setBudget(e.target.value);
              setCategory('');
            }}
            required
            fullWidth
          >
            {budgetOptions.map(b => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            fullWidth
            disabled={!budget}
          >
            {categoryOptions.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Card"
            value={card}
            onChange={e => setCard(e.target.value)}
            fullWidth
          >
            <MenuItem value="">None</MenuItem>
            {cardOptions.map((c: string) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            placeholder="Optional"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box
            component="button"
            type="button"
            onClick={handleMonthlyExpenseClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: 56,
              minHeight: 56,
              boxSizing: 'border-box',
              padding: '6.5px 14px',
              border: '1px solid',
              borderColor: monthlyExpense ? 'primary.main' : 'rgba(0, 0, 0, 0.23)',
              borderRadius: '4px',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
              fontSize: '1rem',
              lineHeight: 1.4375,
              outline: 'none',
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main', background: 'rgba(56, 120, 255, 0.04)' }
            }}
            tabIndex={0}
            aria-pressed={monthlyExpense}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontWeight: 500 }}>Monthly Expense</span>
              <Tooltip title="If checked, this expense will be automatically added to the budget each month. Use for recurring expenses.">
                <HelpOutlineIcon color="action" className={styles.tooltipIcon} />
              </Tooltip>
            </Box>
            <Checkbox
              checked={monthlyExpense}
              onChange={handleMonthlyExpenseClick}
              sx={{
                ml: 1,
                minHeight: 0,
                height: 32,
                p: 0,
                '& .MuiSvgIcon-root': {
                  fontSize: 20,
                  margin: 0,
                  padding: 0
                }
              }}
              tabIndex={-1}
              inputProps={{ 'aria-label': 'Monthly Expense' }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          {!photo && (
            <Button
              variant="outlined"
              component="label"
              startIcon={<ImageIcon />}
              fullWidth
              sx={{ height: 56 }}
            >
              Upload Receipt (optional)
              <input
                type="file"
                accept="application/pdf,image/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
          )}
          {photo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 56, border: '1px solid', borderColor: 'rgba(0,0,0,0.23)', borderRadius: '4px', px: 2 }}>
              <span>{photo.name}</span>
              <IconButton size="small" onClick={handleRemoveFile} aria-label="Remove file">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }} />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </Button>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/submit-receipt">Go to regular Submit Receipt form</Link>
      </div>
      {/* Monthly Expense Modal */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog open={showMonthlyModal} onClose={handleMonthlyModalCancel}>
          <DialogTitle>Monthly Expense Details</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
              <DatePicker
                label="Start Date"
                value={startDate ? new Date(startDate) : (date ? new Date(date) : null)}
                onChange={newValue => {
                  if (newValue instanceof Date && !isNaN(newValue.getTime())) {
                    setStartDate(newValue.toISOString().slice(0, 10));
                  } else {
                    setStartDate('');
                  }
                }}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
              <DatePicker
                label="End Date (optional)"
                value={endDate ? new Date(endDate) : null}
                onChange={newValue => {
                  if (newValue instanceof Date && !isNaN(newValue.getTime())) {
                    setEndDate(newValue.toISOString().slice(0, 10));
                  } else {
                    setEndDate('');
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
                minDate={startDate ? new Date(startDate) : (date ? new Date(date) : undefined)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleMonthlyModalCancel}>Cancel</Button>
            <Button onClick={handleMonthlyModalSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
    </form>
  );
};

export default AdminReceiptForm; 