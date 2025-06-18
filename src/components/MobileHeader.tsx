import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  BugReport as TestIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SignInButton from './SignInButton';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/submit-receipt': 'Submit Receipt',
  '/edit-receipts': 'Edit Previous Receipts',
  '/admin-receipt': 'Admin Receipt Entry',
  '/test-mode': 'Test Mode',
  '/budgets': 'Budgets',
};

const MobileHeader: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Submit Receipt', icon: <AddIcon />, path: '/submit-receipt' },
    ...(user ? [{ text: 'Edit Previous Receipts', icon: <EditIcon />, path: '/edit-receipts' }] : []),
    { text: 'Admin Receipt Entry', icon: <AdminIcon />, path: '/admin-receipt' },
    { text: 'Test Mode', icon: <TestIcon />, path: '/test-mode' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  // Determine the page title based on the current route
  const pageTitle = PAGE_TITLES[location.pathname] || 'Receipts';

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: '#f0f8ff', color: '#1e4a7a', boxShadow: 'none', borderBottom: '1px solid #e0e8f0' }}>
        <Toolbar sx={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600, fontSize: '1.1rem', color: '#1e4a7a' }}
          >
            {pageTitle}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && (
              <Typography variant="caption" color="#1e4a7a" sx={{ mr: 0.5, display: { xs: 'none', sm: 'inline' } }}>
                {user.email}
              </Typography>
            )}
            <SignInButton />
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            bgcolor: '#f0f8ff',
            color: '#1e4a7a',
            borderRight: '1px solid #e0e8f0',
          },
        }}
      >
        <Box sx={{ pt: 8 }}>
          <List>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.text}>
                <ListItem
                  button
                  onClick={() => handleNavigation(item.path)}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: '#d4e6ff',
                      color: '#1e4a7a',
                      '&:hover': {
                        backgroundColor: '#e6f3ff',
                      },
                    },
                    '&:hover': {
                      backgroundColor: '#e6f3ff',
                      color: '#1e4a7a',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive(item.path) ? '#1e4a7a' : '#1e4a7a',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
                {index === 1 && user && <Divider />}
                {index === 2 && user && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileHeader; 