import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api } from '../config';

interface FlexibleBudgetResult {
  original: {
    total: number;
    categories: Record<string, number>;
  };
  adjusted: {
    total: number;
    categories: Record<string, number>;
  };
  ytdSpending: {
    total: number;
    categories: Record<string, number>;
  };
  availableBudget: number;
  monthlyRedistribution: number;
  remainingMonths: number;
  monthsElapsed: number;
  totalBudgeted: number;
  totalBudgetYearMonths: number;
}

interface TestModeProps {
  testDate: string | null;
  setTestDate: (date: string | null) => void;
}

const TestMode: React.FC<TestModeProps> = ({ testDate, setTestDate }) => {
  const [flexibleBudgetResults, setFlexibleBudgetResults] = useState<Record<string, FlexibleBudgetResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFlexibleBudgetCalculation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('', {
        params: {
          action: 'getAllFlexibleBudgetCalculations',
          ...(testDate ? { date: testDate } : {})
        }
      });

      console.log('Flexible budget API response:', response.data);

      if (response.data.success) {
        setFlexibleBudgetResults(response.data.data.calculations);
        console.log('Flexible budget results set:', response.data.data.calculations);
      } else {
        setError(response.data.error || 'Failed to calculate flexible budgets');
      }
    } catch (err) {
      console.error('Error testing flexible budget calculation:', err);
      setError('Failed to test flexible budget calculation');
    } finally {
      setLoading(false);
    }
  };

  const processFlexibleBudgetSnapshot = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('', {
        params: {
          action: 'processFlexibleBudgetSnapshot'
        }
      });

      if (response.data.success) {
        alert('Flexible budget snapshot processed successfully!');
        // Refresh the calculations
        await testFlexibleBudgetCalculation();
      } else {
        setError(response.data.error || 'Failed to process flexible budget snapshot');
      }
    } catch (err) {
      console.error('Error processing flexible budget snapshot:', err);
      setError('Failed to process flexible budget snapshot');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Test Mode
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Date
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <TextField
                type="date"
                value={testDate || ''}
                onChange={(e) => setTestDate(e.target.value || null)}
                label="Test Date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item>
              <Button 
                variant="outlined" 
                onClick={() => setTestDate(null)}
                disabled={!testDate}
              >
                Clear Test Date
              </Button>
            </Grid>
          </Grid>
          {testDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Testing with date: {new Date(testDate).toLocaleDateString()}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Flexible Budget Testing
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={testFlexibleBudgetCalculation}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Test Flexible Budget Calculation'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={processFlexibleBudgetSnapshot}
              disabled={loading}
              color="warning"
            >
              Process Monthly Snapshot
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {flexibleBudgetResults && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Flexible Budget Results
              </Typography>
              
              {Object.entries(flexibleBudgetResults).map(([budgetName, result]) => {
                if (!result || typeof result === 'string') {
                  return (
                    <Accordion key={budgetName} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{budgetName}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography color="error">
                          Error: {typeof result === 'string' ? result : 'Invalid result structure'}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  );
                }

                return (
                  <Accordion key={budgetName} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6">{budgetName}</Typography>
                        <Chip 
                          label={`${result.remainingMonths || 0} months remaining`}
                          size="small"
                          color="primary"
                        />
                        <Chip 
                          label={`Available: ${formatCurrency(result.availableBudget || 0)}`}
                          size="small"
                          color={(result.availableBudget || 0) >= 0 ? "success" : "error"}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Original Limits
                          </Typography>
                          <Typography variant="body2">
                            Total: {formatCurrency(result.original?.total || 0)}
                          </Typography>
                          {result.original?.categories && Object.entries(result.original.categories).map(([category, limit]) => (
                            <Typography key={category} variant="body2">
                              {category}: {formatCurrency(limit || 0)}
                            </Typography>
                          ))}
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Adjusted Limits
                          </Typography>
                          <Typography variant="body2">
                            Total: {formatCurrency(result.adjusted?.total || 0)}
                          </Typography>
                          {result.adjusted?.categories && Object.entries(result.adjusted.categories).map(([category, limit]) => (
                            <Typography key={category} variant="body2">
                              {category}: {formatCurrency(limit || 0)}
                            </Typography>
                          ))}
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom>
                            YTD Spending
                          </Typography>
                          <Typography variant="body2">
                            Total: {formatCurrency(result.ytdSpending?.total || 0)}
                          </Typography>
                          {result.ytdSpending?.categories && Object.entries(result.ytdSpending.categories).map(([category, spent]) => (
                            <Typography key={category} variant="body2">
                              {category}: {formatCurrency(spent || 0)}
                            </Typography>
                          ))}
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom>
                            Calculation Details
                          </Typography>
                          <Typography variant="body2">
                            Total Budget Year Months: {result.totalBudgetYearMonths || 12}
                          </Typography>
                          <Typography variant="body2">
                            Months Elapsed: {result.monthsElapsed || 0}
                          </Typography>
                          <Typography variant="body2">
                            Remaining Months: {result.remainingMonths || 0}
                          </Typography>
                          <Typography variant="body2">
                            Total Budgeted YTD: {formatCurrency(result.totalBudgeted || 0)}
                          </Typography>
                          <Typography variant="body2">
                            Monthly Redistribution: {formatCurrency(result.monthlyRedistribution || 0)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestMode; 