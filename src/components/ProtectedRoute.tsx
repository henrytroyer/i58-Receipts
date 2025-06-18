import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { BLUE } from '../theme';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredDomain?: string;
  requiredEmail?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredDomain, 
  requiredEmail, 
  fallbackPath = "/" 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check email restriction
  if (requiredEmail && user.email !== requiredEmail) {
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
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom color={BLUE}>
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              This page is restricted to {requiredEmail} only.
            </Typography>
            <Button variant="contained" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Check domain restriction
  if (requiredDomain && user.email) {
    const userDomain = user.email.split('@')[1];
    if (userDomain !== requiredDomain) {
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
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom color={BLUE}>
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                This page is restricted to @{requiredDomain} users only.
              </Typography>
              <Button variant="contained" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </Paper>
          </Container>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 