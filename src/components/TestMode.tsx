import React, { useState } from 'react';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { Box, Button, TextField, Typography } from '@mui/material';

const TestMode: React.FC = () => {
  const { testDate, dispatch } = useGlobalState();
  const [input, setInput] = useState(testDate || '2025-07-01');

  const handleSet = () => {
    dispatch({ type: 'SET_TEST_DATE', payload: input });
  };
  const handleClear = () => {
    dispatch({ type: 'SET_TEST_DATE', payload: null });
    setInput('');
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 6, p: 3, background: 'white', borderRadius: 2, boxShadow: 2 }}>
      <Typography variant="h6" mb={2}>Test Mode: Set Mock Date</Typography>
      <TextField
        label="Test Date (YYYY-MM-DD)"
        value={input}
        onChange={e => setInput(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="contained" color="primary" onClick={handleSet} sx={{ mr: 2 }}>Set Test Date</Button>
      <Button variant="outlined" color="secondary" onClick={handleClear}>Clear</Button>
      <Typography variant="body2" color="text.secondary" mt={2}>
        {testDate ? `Test date is active: ${testDate}` : 'Test date is not set. Using real current date.'}
      </Typography>
    </Box>
  );
};

export default TestMode; 