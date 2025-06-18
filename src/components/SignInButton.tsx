import React from 'react';
import { Button, Avatar, Box, Typography, Menu, MenuItem, IconButton } from '@mui/material';
import { Google as GoogleIcon, AccountCircle } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const SignInButton: React.FC = () => {
  const { user, loading, signIn, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      handleMenuClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <Button
        variant="outlined"
        disabled
        sx={{ minWidth: 120 }}
      >
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          onClick={handleMenuOpen}
          sx={{ p: 0, mr: 1 }}
        >
          {user.photoURL ? (
            <Avatar
              src={user.photoURL}
              alt={user.displayName || 'User'}
              sx={{ width: 32, height: 32 }}
            />
          ) : (
            <AccountCircle sx={{ fontSize: 32 }} />
          )}
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            Sign Out
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Button
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={signIn}
      sx={{
        minWidth: 120,
        borderColor: '#4285f4',
        color: '#4285f4',
        '&:hover': {
          borderColor: '#3367d6',
          backgroundColor: 'rgba(66, 133, 244, 0.04)',
        },
      }}
    >
      Sign In
    </Button>
  );
};

export default SignInButton; 