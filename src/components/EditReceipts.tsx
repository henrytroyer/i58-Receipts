import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { API_BASE_URL } from '../config';

interface Receipt {
  id: string;
  date: string;
  amount: number;
  vendor: string;
  budget: string;
  category: string;
  card: string;
  receiptUrl?: string;
  userEmail: string;
  userName: string;
}

interface EditReceiptsProps {
  open: boolean;
}

const EditReceipts: React.FC<EditReceiptsProps> = ({ open }) => {
  const { user } = useAuth();
  const { cards } = useGlobalState();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    vendor: '',
    budget: '',
    category: '',
    card: ''
  });

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBudget, setFilterBudget] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // New vendor state
  const [showNewVendorInput, setShowNewVendorInput] = useState(false);
  const [newVendor, setNewVendor] = useState('');

  // Get unique budgets and categories from receipts
  const uniqueBudgets = [...new Set(receipts.map(r => r.budget))].sort();
  const uniqueCategories = [...new Set(receipts.map(r => r.category))].sort();
  const uniqueVendors = [...new Set(receipts.map(r => r.vendor))].sort();

  useEffect(() => {
    if (open && user) {
      fetchUserReceipts();
    }
  }, [open, user]);

  const fetchUserReceipts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=getUserReceipts&userEmail=${encodeURIComponent(user.email || '')}`);
      const data = await response.json();
      
      if (data.success) {
        setReceipts(data.data || []);
      } else {
        setError(data.error || 'Failed to load receipts');
      }
    } catch (err) {
      setError('Failed to load receipts');
      console.error('Error fetching user receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditForm({
      amount: receipt.amount.toString(),
      vendor: receipt.vendor,
      budget: receipt.budget,
      category: receipt.category,
      card: receipt.card
    });
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt || !user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'updateReceipt',
          data: JSON.stringify({
            receiptId: editingReceipt.id,
            amount: parseFloat(editForm.amount),
            vendor: editForm.vendor,
            budget: editForm.budget,
            category: editForm.category,
            card: editForm.card,
            userEmail: user.email
          })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingReceipt(null);
        setShowNewVendorInput(false);
        setNewVendor('');
        fetchUserReceipts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update receipt');
      }
    } catch (err) {
      setError('Failed to update receipt');
      console.error('Error updating receipt:', err);
    }
  };

  const handleVendorChange = (value: string) => {
    if (value === '__new__') {
      setShowNewVendorInput(true);
      setNewVendor('');
    } else {
      setShowNewVendorInput(false);
      setEditForm(prev => ({ ...prev, vendor: value }));
    }
  };

  const handleNewVendorChange = (value: string) => {
    setNewVendor(value);
    setEditForm(prev => ({ ...prev, vendor: value }));
  };

  const handleDelete = async (receiptId: string) => {
    if (!user || !confirm('Are you sure you want to delete this receipt?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'deleteReceipt',
          data: JSON.stringify({
            receiptId,
            userEmail: user.email
          })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchUserReceipts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete receipt');
      }
    } catch (err) {
      setError('Failed to delete receipt');
      console.error('Error deleting receipt:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Filter and sort receipts
  const filteredAndSortedReceipts = receipts
    .filter(receipt => {
      const matchesSearch = receipt.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           receipt.budget.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           receipt.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBudget = !filterBudget || receipt.budget === filterBudget;
      const matchesCategory = !filterCategory || receipt.category === filterCategory;
      
      return matchesSearch && matchesBudget && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'vendor':
          comparison = a.vendor.localeCompare(b.vendor);
          break;
        case 'budget':
          comparison = a.budget.localeCompare(b.budget);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Please sign in to view and edit your receipts.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Budget</InputLabel>
                <Select
                  value={filterBudget}
                  onChange={(e) => setFilterBudget(e.target.value)}
                  label="Budget"
                >
                  <MenuItem value="">All Budgets</MenuItem>
                  {uniqueBudgets.map(budget => (
                    <MenuItem key={budget} value={budget}>{budget}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {uniqueCategories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="amount">Amount</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                  <MenuItem value="budget">Budget</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                startIcon={<SortIcon />}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Receipts List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredAndSortedReceipts.length === 0 ? (
        <Alert severity="info">
          {receipts.length === 0 ? 'No receipts found. Submit your first receipt to see it here.' : 'No receipts match your filters.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredAndSortedReceipts.map((receipt) => (
            <Grid item xs={12} key={receipt.id}>
              <Card
                sx={{
                  mb: 2,
                  p: 1,
                  maxWidth: { xs: 380, sm: 500 },
                  mx: { xs: 'auto', sm: 0 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                      {formatCurrency(receipt.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {receipt.vendor}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      <Chip label={receipt.budget} size="small" />
                      <Chip label={receipt.category} size="small" variant="outlined" />
                      <Chip label={receipt.card} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {format(new Date(receipt.date), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 1 }}>
                    {receipt.receiptUrl && (
                      <IconButton
                        size="small"
                        component="a"
                        href={receipt.receiptUrl}
                        target="_blank"
                        sx={{ mb: 0.5 }}
                      >
                        <ReceiptIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => handleEdit(receipt)} sx={{ mb: 0.5 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(receipt.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReceipt} onClose={() => setEditingReceipt(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Receipt</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={editForm.amount}
              onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={editForm.vendor}
                onChange={(e) => handleVendorChange(e.target.value)}
                label="Vendor"
              >
                {uniqueVendors.map(vendor => (
                  <MenuItem key={vendor} value={vendor}>{vendor}</MenuItem>
                ))}
                <MenuItem value="__new__">+ Add New Vendor</MenuItem>
              </Select>
            </FormControl>
            {showNewVendorInput && (
              <TextField
                label="New Vendor Name"
                value={newVendor}
                onChange={(e) => handleNewVendorChange(e.target.value)}
                fullWidth
                autoFocus
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Budget</InputLabel>
              <Select
                value={editForm.budget}
                onChange={(e) => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
                label="Budget"
              >
                {uniqueBudgets.map(budget => (
                  <MenuItem key={budget} value={budget}>{budget}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                {uniqueCategories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Card</InputLabel>
              <Select
                value={editForm.card}
                onChange={(e) => setEditForm(prev => ({ ...prev, card: e.target.value }))}
                label="Card"
              >
                {cards.map(card => (
                  <MenuItem key={card.card} value={card.card}>{card.card}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingReceipt(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditReceipts; 