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
  budgetId: string;
  budgetName?: string;
  category: string;
  card: string;
  receiptUrl?: string;
  userEmail: string;
  userName: string;
  isOwnedByCurrentUser: boolean; // New field to indicate if current user can edit this receipt
}

interface EditReceiptsProps {
  open: boolean;
}

// Change type options per enhancement plan
const CHANGE_TYPE_OPTIONS = [
  { value: 'corrected_amount', label: 'Corrected amount' },
  { value: 'fixed_vendor', label: 'Fixed vendor name' },
  { value: 'moved_budget', label: 'Moved to different budget' },
  { value: 'updated_category', label: 'Updated category' },
  { value: 'changed_card', label: 'Changed card' },
  { value: 'corrected_date', label: 'Corrected date' },
  { value: 'deleted_receipt', label: 'Deleted receipt' },
  { value: 'other', label: 'Other' },
];

const EditReceipts: React.FC<EditReceiptsProps> = ({ open }) => {
  const { user } = useAuth();
  const { cards, budgetLimits, categories } = useGlobalState();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    vendor: '',
    budgetId: '',
    category: '',
    card: ''
  });

  // Loading states for operations
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Change description state
  const [changeType, setChangeType] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [changeDescriptionError, setChangeDescriptionError] = useState('');

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBudget, setFilterBudget] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // New vendor state
  const [showNewVendorInput, setShowNewVendorInput] = useState(false);
  const [newVendor, setNewVendor] = useState('');

  // Delete confirmation state
  const [deleteChangeType, setDeleteChangeType] = useState('');
  const [deleteChangeDescription, setDeleteChangeDescription] = useState('');
  const [deleteChangeDescriptionError, setDeleteChangeDescriptionError] = useState('');

  // Get unique budgets and categories from receipts
  const uniqueBudgets = [...new Set(receipts.map(r => r.budgetId))].sort();
  const uniqueVendors = [...new Set(receipts.map(r => r.vendor))].sort();

  // Get available categories for the selected budget - FIXED to use same source as ReceiptForm.tsx
  const getAvailableCategories = (selectedBudgetId: string) => {
    if (!selectedBudgetId) return [];
    
    // Use the same logic as ReceiptForm.tsx - get categories from budgetLimits
    const budgetCategories = budgetLimits?.[selectedBudgetId]?.categories;
    if (budgetCategories && Object.keys(budgetCategories).length > 0) {
      return Object.keys(budgetCategories).sort();
    }
    
    // Fallback to categories from global state (for backward compatibility)
    if (categories && selectedBudgetId) {
      const budgetCategories = categories.filter(cat => cat.budgetId === selectedBudgetId);
      const categoryNames = [...new Set(budgetCategories.map(cat => cat.name))].sort();
      return categoryNames;
    }
    
    // Final fallback to categories from existing receipts
    const receiptCategories = [...new Set(receipts.map(r => r.category))].filter(Boolean);
    return receiptCategories.sort();
  };

  // Get available categories for filtering (all categories from all budgets)
  const getAllCategories = () => {
    if (!budgetLimits) return [];
    
    // Get all categories from all budgets
    const allCategories: string[] = [];
    Object.values(budgetLimits).forEach(budget => {
      if (budget.categories) {
        allCategories.push(...Object.keys(budget.categories));
      }
    });
    
    // Also include categories from global state and existing receipts for backward compatibility
    const globalCategories = categories ? [...new Set(categories.map(cat => cat.name))] : [];
    const receiptCategories = [...new Set(receipts.map(r => r.category))].filter(Boolean);
    
    const allUniqueCategories = [...new Set([...allCategories, ...globalCategories, ...receiptCategories])].sort();
    return allUniqueCategories;
  };

  // Get budget display names for UI
  const getBudgetDisplayName = (budgetId: string) => {
    const budgetData = budgetLimits?.[budgetId];
    if (!budgetData) return budgetId;
    
    // Create a full display name with region/sub-region info
    return budgetData.displayName 
      ? `${budgetData.displayName} (${budgetData.region}${budgetData.subRegion && budgetData.subRegion !== budgetData.displayName ? ` - ${budgetData.subRegion}` : ''})`
      : budgetId;
  };

  // Get available budget options for editing - ENHANCED to include current receipt's budget
  const getAvailableBudgetOptions = (currentBudgetId?: string) => {
    if (!budgetLimits) return [];
    
    const options = Object.entries(budgetLimits).map(([budgetId, budgetData]) => ({
      budgetId,
      displayName: budgetData.displayName || budgetId,
      // Create a full display name with region/sub-region info
      fullDisplayName: budgetData.displayName 
        ? `${budgetData.displayName} (${budgetData.region}${budgetData.subRegion && budgetData.subRegion !== budgetData.displayName ? ` - ${budgetData.subRegion}` : ''})`
        : budgetId
    }));

    // If we have a current budget ID that's not in the options, add it
    if (currentBudgetId && !options.find(opt => opt.budgetId === currentBudgetId)) {
      options.push({
        budgetId: currentBudgetId,
        displayName: currentBudgetId,
        fullDisplayName: currentBudgetId
      });
    }

    return options;
  };

  // Get available categories for the selected budget - ENHANCED to include current receipt's category
  const getAvailableCategoriesForEdit = (selectedBudgetId: string, currentCategory?: string) => {
    const categories = getAvailableCategories(selectedBudgetId);
    
    // If we have a current category that's not in the list, add it
    if (currentCategory && !categories.includes(currentCategory)) {
      return [...categories, currentCategory].sort();
    }
    
    return categories;
  };

  useEffect(() => {
    if (open && user) {
      fetchAllReceipts();
    }
  }, [open, user]);

  const fetchAllReceipts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=getAllReceipts&userEmail=${encodeURIComponent(user.email || '')}`);
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to include budgetId and budgetName
        const transformedReceipts = (data.data || []).map((receipt: any) => ({
          ...receipt,
          budgetId: receipt.budgetId || receipt.budget, // Handle both old and new formats
          budgetName: receipt.budgetName || receipt.budget // Keep display name for UI
        }));
        setReceipts(transformedReceipts);
      } else {
        setError(data.error || 'Failed to load receipts');
      }
    } catch (err) {
      setError('Failed to load receipts');
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    // Check if user can edit this receipt
    if (!receipt.isOwnedByCurrentUser) {
      setError('You can only edit receipts that you entered');
      return;
    }
    
    console.log('handleEdit called with receipt:', receipt);
    console.log('Available budget options:', getAvailableBudgetOptions(receipt.budgetId));
    console.log('Available categories for budgetId:', receipt.budgetId, getAvailableCategoriesForEdit(receipt.budgetId, receipt.category));
    
    setEditingReceipt(receipt);
    setEditForm({
      amount: receipt.amount.toString(),
      vendor: receipt.vendor,
      budgetId: receipt.budgetId,
      category: receipt.category,
      card: receipt.card
    });
    
    console.log('Edit form set to:', {
      amount: receipt.amount.toString(),
      vendor: receipt.vendor,
      budgetId: receipt.budgetId,
      category: receipt.category,
      card: receipt.card
    });
    
    // Reset change description fields
    setChangeType('');
    setChangeDescription('');
    setChangeDescriptionError('');
  };

  // Debug useEffect to log form state changes
  useEffect(() => {
    if (editingReceipt) {
      console.log('Edit form state:', editForm);
      console.log('Available categories for current budgetId:', editForm.budgetId, getAvailableCategoriesForEdit(editForm.budgetId, editForm.category));
    }
  }, [editForm, editingReceipt]);

  // Ensure form is properly initialized when editing receipt changes
  useEffect(() => {
    if (editingReceipt) {
      console.log('Editing receipt changed, ensuring form is properly set');
      setEditForm({
        amount: editingReceipt.amount.toString(),
        vendor: editingReceipt.vendor,
        budgetId: editingReceipt.budgetId,
        category: editingReceipt.category,
        card: editingReceipt.card
      });
    }
  }, [editingReceipt]);

  const handleSaveEdit = async () => {
    if (!editingReceipt || !user) return;
    
    // Validate change description
    if (!changeDescription.trim()) {
      setChangeDescriptionError('Change description is required');
      return;
    }
    
    setChangeDescriptionError('');
    setSavingEdit(true);
    setError(null);
    
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
            budgetId: editForm.budgetId,
            category: editForm.category,
            card: editForm.card,
            userEmail: user.email,
            changeDescription: changeDescription.trim(),
            changeType: changeType || undefined
          })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingReceipt(null);
        setShowNewVendorInput(false);
        setNewVendor('');
        setChangeType('');
        setChangeDescription('');
        setChangeDescriptionError('');
        fetchAllReceipts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update receipt');
      }
    } catch (err) {
      setError('Failed to update receipt');
      console.error('Error updating receipt:', err);
    } finally {
      setSavingEdit(false);
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
    if (!user) return;
    
    // Find the receipt to delete
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    if (!receiptToDelete) return;
    
    // Check if user can delete this receipt
    if (!receiptToDelete.isOwnedByCurrentUser) {
      setError('You can only delete receipts that you entered');
      return;
    }
    
    // Open delete confirmation dialog
    setDeletingReceipt(receiptToDelete);
    setDeleteChangeType('');
    setDeleteChangeDescription('');
    setDeleteChangeDescriptionError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingReceipt || !user) return;
    
    // Validate change description
    if (!deleteChangeDescription.trim()) {
      setDeleteChangeDescriptionError('Change description is required for deletion');
      return;
    }
    
    setDeleteChangeDescriptionError('');
    setConfirmingDelete(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'deleteReceipt',
          data: JSON.stringify({
            receiptId: deletingReceipt.id,
            userEmail: user.email,
            changeDescription: deleteChangeDescription.trim(),
            changeType: deleteChangeType || undefined
          })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDeletingReceipt(null);
        setDeleteChangeType('');
        setDeleteChangeDescription('');
        setDeleteChangeDescriptionError('');
        fetchAllReceipts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete receipt');
      }
    } catch (err) {
      setError('Failed to delete receipt');
      console.error('Error deleting receipt:', err);
    } finally {
      setConfirmingDelete(false);
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
      const matchesSearch = (receipt.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           getBudgetDisplayName(receipt.budgetId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (receipt.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBudget = !filterBudget || receipt.budgetId === filterBudget;
      const matchesCategory = !filterCategory || (receipt.category || '') === filterCategory;
      
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
          comparison = (a.vendor || '').localeCompare(b.vendor || '');
          break;
        case 'budget':
          comparison = getBudgetDisplayName(a.budgetId).localeCompare(getBudgetDisplayName(b.budgetId));
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handle change type selection
  const handleChangeTypeChange = (value: string) => {
    setChangeType(value);
    
    // Auto-populate description for predefined types
    if (value && value !== 'other') {
      const selectedOption = CHANGE_TYPE_OPTIONS.find(opt => opt.value === value);
      setChangeDescription(selectedOption ? selectedOption.label : '');
    } else if (value === 'other') {
      setChangeDescription(''); // Clear for custom input
    } else {
      setChangeDescription(''); // Clear if no selection
    }
    
    setChangeDescriptionError(''); // Clear any previous errors
  };

  // Handle delete change type selection
  const handleDeleteChangeTypeChange = (value: string) => {
    setDeleteChangeType(value);
    
    // Auto-populate description for predefined types
    if (value && value !== 'other') {
      const selectedOption = CHANGE_TYPE_OPTIONS.find(opt => opt.value === value);
      setDeleteChangeDescription(selectedOption ? selectedOption.label : '');
    } else if (value === 'other') {
      setDeleteChangeDescription(''); // Clear for custom input
    } else {
      setDeleteChangeDescription(''); // Clear if no selection
    }
    
    setDeleteChangeDescriptionError(''); // Clear any previous errors
  };

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
      <Typography variant="h5" sx={{ mb: 2 }}>
        All Receipts
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Color Legend */}
      <Card sx={{ mb: 2, backgroundColor: '#f8f9fa' }}>
        <CardContent sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Color coding:</strong> Your receipts appear in white, others' receipts appear in gray. You can only edit and delete your own receipts.
          </Typography>
        </CardContent>
      </Card>

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
                  {uniqueBudgets.map(budgetId => (
                    <MenuItem key={budgetId} value={budgetId}>{getBudgetDisplayName(budgetId)}</MenuItem>
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
                  {getAllCategories().map(category => (
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
                  // Color coding based on ownership
                  backgroundColor: receipt.isOwnedByCurrentUser ? 'background.paper' : '#f8f9fa',
                  border: receipt.isOwnedByCurrentUser ? '1px solid #e0e0e0' : '1px solid #d0d0d0',
                  opacity: receipt.isOwnedByCurrentUser ? 1 : 0.8,
                  '&:hover': {
                    backgroundColor: receipt.isOwnedByCurrentUser ? 'background.paper' : '#f0f0f0',
                  }
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
                      {receipt.vendor || 'No vendor'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      <Chip label={getBudgetDisplayName(receipt.budgetId)} size="small" />
                      <Chip label={receipt.category || 'No category'} size="small" variant="outlined" />
                      <Chip label={receipt.card} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {format(new Date(receipt.date), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {receipt.isOwnedByCurrentUser ? 'Your receipt' : `Entered by ${receipt.userName || receipt.userEmail}`}
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
                    <IconButton 
                      size="small" 
                      onClick={() => handleEdit(receipt)} 
                      sx={{ mb: 0.5 }}
                      disabled={!receipt.isOwnedByCurrentUser}
                      title={receipt.isOwnedByCurrentUser ? 'Edit receipt' : 'You can only edit your own receipts'}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDelete(receipt.id)} 
                      color="error"
                      disabled={!receipt.isOwnedByCurrentUser}
                      title={receipt.isOwnedByCurrentUser ? 'Delete receipt' : 'You can only delete your own receipts'}
                    >
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
              disabled={savingEdit}
            />
            <FormControl fullWidth>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={editForm.vendor}
                onChange={(e) => handleVendorChange(e.target.value)}
                label="Vendor"
                disabled={savingEdit}
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
                disabled={savingEdit}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Budget</InputLabel>
              <Select
                value={editForm.budgetId}
                onChange={(e) => setEditForm(prev => ({ ...prev, budgetId: e.target.value }))}
                label="Budget"
                disabled={savingEdit}
              >
                {getAvailableBudgetOptions(editForm.budgetId).map(budgetOption => (
                  <MenuItem key={budgetOption.budgetId} value={budgetOption.budgetId}>
                    {budgetOption.fullDisplayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
                disabled={savingEdit}
              >
                {getAvailableCategoriesForEdit(editForm.budgetId, editForm.category).map(category => (
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
                disabled={savingEdit}
              >
                {cards.map(card => (
                  <MenuItem key={card.card} value={card.card}>{card.card}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>Change Reason</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="change-type-label">Change Type</InputLabel>
              <Select
                labelId="change-type-label"
                id="change-type-select"
                value={changeType}
                onChange={e => handleChangeTypeChange(e.target.value)}
                label="Change Type"
                disabled={savingEdit}
              >
                <MenuItem value="">Select a change type</MenuItem>
                {CHANGE_TYPE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Always show the description field, but make it read-only for predefined types */}
            <TextField
              id="change-description"
              name="changeDescription"
              type="text"
              label="Change Description"
              placeholder={changeType === 'other' ? "Please describe the change" : "Description will be auto-filled"}
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              multiline
              minRows={1}
              maxRows={6}
              fullWidth
              required
              error={!!changeDescriptionError}
              helperText={changeDescriptionError}
              disabled={(changeType !== 'other' && changeType !== '') || savingEdit}
              inputProps={{
                'aria-label': 'Change description',
                'data-testid': 'change-description-input'
              }}
              sx={{ 
                mb: 2,
                '& .MuiInputBase-inputMultiline': {
                  paddingTop: '12px'
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditingReceipt(null)}
            disabled={savingEdit}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={savingEdit}
            startIcon={savingEdit ? <CircularProgress size={16} /> : null}
          >
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingReceipt} onClose={() => setDeletingReceipt(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Receipt
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="warning">
              Are you sure you want to delete this receipt? This action cannot be undone.
            </Alert>
            
            {deletingReceipt && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {formatCurrency(deletingReceipt.amount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {deletingReceipt.vendor || 'No vendor'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  <Chip label={getBudgetDisplayName(deletingReceipt.budgetId)} size="small" />
                  <Chip label={deletingReceipt.category || 'No category'} size="small" variant="outlined" />
                  <Chip label={deletingReceipt.card} size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {format(new Date(deletingReceipt.date), 'MMM dd, yyyy')}
                </Typography>
              </Card>
            )}
            <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>Deletion Reason</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="delete-change-type-label">Change Type</InputLabel>
              <Select
                labelId="delete-change-type-label"
                id="delete-change-type-select"
                value={deleteChangeType}
                onChange={e => handleDeleteChangeTypeChange(e.target.value)}
                label="Change Type"
                disabled={confirmingDelete}
              >
                <MenuItem value="">Select a change type</MenuItem>
                {CHANGE_TYPE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Always show the description field, but make it read-only for predefined types */}
            <TextField
              id="delete-change-description"
              name="deleteChangeDescription"
              type="text"
              label="Deletion Reason"
              placeholder={deleteChangeType === 'other' ? "Please describe the reason for deletion" : "Description will be auto-filled"}
              value={deleteChangeDescription}
              onChange={e => setDeleteChangeDescription(e.target.value)}
              multiline
              minRows={1}
              maxRows={6}
              fullWidth
              required
              error={!!deleteChangeDescriptionError}
              helperText={deleteChangeDescriptionError}
              disabled={(deleteChangeType !== 'other' && deleteChangeType !== '') || confirmingDelete}
              inputProps={{
                'aria-label': 'Delete change description',
                'data-testid': 'delete-change-description-input'
              }}
              sx={{ 
                mb: 2,
                '& .MuiInputBase-inputMultiline': {
                  paddingTop: '12px'
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeletingReceipt(null)}
            disabled={confirmingDelete}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={confirmingDelete}
            startIcon={confirmingDelete ? <CircularProgress size={16} /> : null}
          >
            {confirmingDelete ? 'Deleting...' : 'Delete Receipt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditReceipts; 