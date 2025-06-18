import { NavLink } from 'react-router-dom';
import { ListItem, ListItemIcon, ListItemText, Box, Avatar, Typography, Tooltip } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Add as AddIcon, 
  AdminPanelSettings as AdminIcon, 
  BugReport as TestIcon,
  Edit as EditIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import styles from '../styles/Sidebar.module.css';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuth } from '../contexts/AuthContext';
import SignInButton from './SignInButton';

const Sidebar = () => {
  const isDesktop = useMediaQuery('(min-width:900px)');
  const { user, signOut } = useAuth();
  
  // Check if user has access to admin features
  const hasAdminAccess = user && user.email && user.email.endsWith('@i58global.org');
  const hasTestModeAccess = user && user.email === 'henry@i58global.org';
  
  if (!isDesktop) return null;
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  
  return (
    <nav className={styles.sidebar}>
      {/* User Profile Section at Top */}
      <Box sx={{ 
        p: 2, 
        mb: 2, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1
      }}>
        {user ? (
          <>
            <Tooltip title="Click to sign out" placement="right">
              <Avatar 
                src={user.photoURL || undefined}
                onClick={handleSignOut}
                sx={{ 
                  width: 48, 
                  height: 48, 
                  border: '2px solid rgba(0, 0, 0, 0.2)',
                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    border: '2px solid rgba(0, 0, 0, 0.4)',
                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                {!user.photoURL && <AccountIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />}
              </Avatar>
            </Tooltip>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.87)', 
                textAlign: 'center',
                fontWeight: 500,
                fontSize: '0.875rem'
              }}
            >
              {user.displayName || user.email}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.6)', 
                textAlign: 'center',
                fontSize: '0.75rem'
              }}
            >
              {user.email}
            </Typography>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.6)', 
                mb: 2,
                fontSize: '0.875rem'
              }}
            >
              Sign in to access all features
            </Typography>
            <SignInButton />
          </Box>
        )}
      </Box>
      
      <ul className={styles.navList}>
        <li>
          <NavLink to="/dashboard" className={({isActive}) => isActive ? styles.active : ''}>
            <ListItem component="div" sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              background: 'none',
              '&:hover': {
                bgcolor: 'transparent'
              }
            }}>
              <ListItemIcon sx={{ color: 'rgba(0, 0, 0, 0.7)', minWidth: 40 }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Dashboard" 
                sx={{ 
                  '& .MuiListItemText-primary': { 
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontWeight: 500
                  } 
                }} 
              />
            </ListItem>
          </NavLink>
        </li>
        <li>
          <NavLink to="/submit-receipt" className={({isActive}) => isActive ? styles.active : ''}>
            <ListItem component="div" sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              background: 'none',
              '&:hover': {
                bgcolor: 'transparent'
              }
            }}>
              <ListItemIcon sx={{ color: 'rgba(0, 0, 0, 0.7)', minWidth: 40 }}>
                <AddIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Submit Receipt" 
                sx={{ 
                  '& .MuiListItemText-primary': { 
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontWeight: 500
                  } 
                }} 
              />
            </ListItem>
          </NavLink>
        </li>
        {user && (
          <li>
            <NavLink to="/edit-receipts" className={({isActive}) => isActive ? styles.active : ''}>
              <ListItem component="div" sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                background: 'none',
                '&:hover': {
                  bgcolor: 'transparent'
                }
              }}>
                <ListItemIcon sx={{ color: 'rgba(0, 0, 0, 0.7)', minWidth: 40 }}>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Edit Previous Receipts" 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500
                    } 
                  }} 
                />
              </ListItem>
            </NavLink>
          </li>
        )}
        {hasAdminAccess && (
          <li>
            <NavLink to="/admin-receipt" className={({isActive}) => isActive ? styles.active : ''}>
              <ListItem component="div" sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                background: 'none',
                '&:hover': {
                  bgcolor: 'transparent'
                }
              }}>
                <ListItemIcon sx={{ color: 'rgba(0, 0, 0, 0.7)', minWidth: 40 }}>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Admin Receipt Entry" 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500
                    } 
                  }} 
                />
              </ListItem>
            </NavLink>
          </li>
        )}
        {hasTestModeAccess && (
          <li>
            <NavLink to="/test-mode" className={({isActive}) => isActive ? styles.active : ''}>
              <ListItem component="div" sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                background: 'none',
                '&:hover': {
                  bgcolor: 'transparent'
                }
              }}>
                <ListItemIcon sx={{ color: 'rgba(0, 0, 0, 0.7)', minWidth: 40 }}>
                  <TestIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Test Mode" 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 500
                    } 
                  }} 
                />
              </ListItem>
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Sidebar; 