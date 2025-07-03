import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Chip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  LocationOn as LocationIcon,
  AccountBalance as AccountBalanceIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { useGlobalState } from '../contexts/GlobalStateContext';

interface UserSettings {
  email: string;
  region: string;
  subRegions: string[];
  pettyCashFunds: string[];
  isBanned: boolean;
  lastLogin: Date;
  lastSync: Date;
}

interface AccessInfo {
  hasAccess: boolean;
  isBanned: boolean;
  hasPettyCashAccess: boolean;
  region: string;
  subRegions: string[];
  pettyCashFunds: string[];
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { userSettings, setUserSettings, cache: globalCache, budgets } = useGlobalState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Settings state
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegions, setSelectedSubRegions] = useState<string[]>([]);
  const [selectedPettyCashFunds, setSelectedPettyCashFunds] = useState<string[]>([]);
  
  // Available options
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableSubRegions, setAvailableSubRegions] = useState<string[]>([]);
  const [availablePettyCashFunds, setAvailablePettyCashFunds] = useState<string[]>([]);
  
  // Access control
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [hasPettyCashAccess, setHasPettyCashAccess] = useState(false);

  // Loading states for better UX
  const [loadingSubRegions, setLoadingSubRegions] = useState(false);
  const [loadingPettyCashFunds, setLoadingPettyCashFunds] = useState(false);
  const [refreshingInBackground, setRefreshingInBackground] = useState(false);

  // Local cache for sub-regions and petty cash funds (since these aren't in global cache)
  const [localCache, setLocalCache] = useState<{
    subRegions: Record<string, string[]>;
    pettyCashFunds: Record<string, string[]>;
  }>({
    subRegions: {},
    pettyCashFunds: {}
  });

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user?.email) {
      // If we already have user settings in global state, use them immediately
      if (userSettings && userSettings.email === user.email) {
        console.log('Using cached user settings from global state');
        setSelectedRegion(userSettings.region || '');
        setSelectedSubRegions(userSettings.subRegions || []);
        setSelectedPettyCashFunds(userSettings.pettyCashFunds || []);
        setHasPettyCashAccess(user.email.endsWith('@i58global.org'));
        
        // Load available options based on cached settings
        if (userSettings.region) {
          handleRegionChange(userSettings.region, false);
        }
        if (userSettings.subRegions && userSettings.subRegions.length > 0) {
          handleSubRegionChange(userSettings.subRegions, false);
        }
        
        // Don't automatically refresh in background - let user choose when to refresh
        setLoading(false);
      } else {
        // No cached settings, load them
        loadUserSettings();
      }
    }
  }, [user?.email]);

  // Extract regions from global cached static data
  useEffect(() => {
    if (globalCache.staticData?.data?.regions) {
      setAvailableRegions(globalCache.staticData.data.regions);
    } else if (globalCache.staticData === null && !loading) {
      // If global cache is null and we're not loading, set fallback regions
      setAvailableRegions(['Greece', 'Germany']);
    }
  }, [globalCache.staticData, loading]);

  const loadUserSettings = async () => {
    try {
      if (!refreshingInBackground) {
        setLoading(true);
      }
      setError(null);

      // Use regions from global cache if available
      if (globalCache.staticData?.data?.regions) {
        setAvailableRegions(globalCache.staticData.data.regions);
      }

      // Only make API calls for user-specific data (not static data)
      const apiCalls = [
        fetch(`${API_BASE_URL}?action=checkUserAccess&email=${encodeURIComponent(user!.email || '')}`),
        fetch(`${API_BASE_URL}?action=getUserSettings&email=${encodeURIComponent(user!.email || '')}`)
      ];

      const responses = await Promise.all(apiCalls);
      
      // Parse responses safely
      const parsePromises = responses.map(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch(e) {
          console.error("Failed to parse JSON from settings, received text:", text);
          return { success: false, error: "Invalid JSON response" };
        }
      });

      const [accessData, settingsData] = await Promise.all(parsePromises);

      // Process access data
      if (!accessData.success) {
        throw new Error(accessData.error || 'Failed to check user access');
      }

      setAccessInfo(accessData);
      setHasPettyCashAccess(accessData.hasPettyCashAccess);

      if (accessData.isBanned) {
        setError('Your account has been banned. Please contact an administrator.');
        setLoading(false);
        setRefreshingInBackground(false);
        return;
      }

      // Process user settings
      if (settingsData.success) {
        const settings: UserSettings = settingsData.data;
        console.log('Received user settings from API:', settings);
        
        // Only update state if we don't already have these settings loaded
        if (!userSettings || userSettings.email !== user!.email) {
          setSelectedRegion(settings.region);
          setSelectedSubRegions(settings.subRegions || []);
          setSelectedPettyCashFunds(settings.pettyCashFunds || []);
          
          // Update global state
          setUserSettings(settings);
          
          // Load available options based on saved settings without resetting the selections
          if (settings.region) {
            await handleRegionChange(settings.region, false);
          }
          if (settings.subRegions && settings.subRegions.length > 0) {
            await handleSubRegionChange(settings.subRegions, false);
          }
        }
      } else {
        // User doesn't exist yet, start with defaults
        console.log('No user settings found, starting with defaults');
        if (!userSettings || userSettings.email !== user!.email) {
          setSelectedRegion('');
          setSelectedSubRegions([]);
          setSelectedPettyCashFunds([]);
          setHasPettyCashAccess(user?.email?.endsWith('@i58global.org') || false);
        }
      }

    } catch (err) {
      console.error('Error loading user settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user settings');
    } finally {
      setLoading(false);
      setRefreshingInBackground(false);
    }
  };

  const handleRegionChange = async (region: string, resetSelection = true) => {
    setSelectedRegion(region);
    if (resetSelection) {
      setSelectedSubRegions([]);
      setSelectedPettyCashFunds([]);
    }

    if (region) {
      // Check local cache first
      if (localCache.subRegions[region]) {
        setAvailableSubRegions(localCache.subRegions[region]);
        return;
      }

      // Try to extract sub-regions from global budget data first
      if (budgets && budgets.length > 0) {
        const subRegionsFromBudgets = [...new Set(
          budgets
            .filter((budget: any) => budget.region === region)
            .map((budget: any) => budget.subRegion)
            .filter(Boolean)
        )].sort();

        if (subRegionsFromBudgets.length > 0) {
          setAvailableSubRegions(subRegionsFromBudgets);
          
          // Cache the result
          setLocalCache(prev => ({
            ...prev,
            subRegions: {
              ...prev.subRegions,
              [region]: subRegionsFromBudgets
            }
          }));
          return;
        }
      }

      // Fallback to API call if budget data doesn't have the information
      try {
        setLoadingSubRegions(true);
        const response = await fetch(`${API_BASE_URL}?action=getAvailableSubRegions&region=${encodeURIComponent(region)}`);
        const data = await response.json();

        if (data.success) {
          const subRegions = data.data.subRegions;
          setAvailableSubRegions(subRegions);
          
          // Cache the result
          setLocalCache(prev => ({
            ...prev,
            subRegions: {
              ...prev.subRegions,
              [region]: subRegions
            }
          }));
        } else {
          setError('Failed to load sub-regions');
        }
      } catch (err) {
        console.error('Error loading sub-regions:', err);
        setError('Failed to load sub-regions');
      } finally {
        setLoadingSubRegions(false);
      }
    } else {
      setAvailableSubRegions([]);
    }
  };

  const handleSubRegionChange = async (subRegions: string[], resetSelection = true) => {
    setSelectedSubRegions(subRegions);
    if (resetSelection) {
      setSelectedPettyCashFunds([]);
    }

    if (subRegions.length > 0) {
      // Create a cache key from sorted sub-regions
      const cacheKey = subRegions.sort().join(',');
      
      // Check cache first
      if (localCache.pettyCashFunds[cacheKey]) {
        setAvailablePettyCashFunds(localCache.pettyCashFunds[cacheKey]);
        return;
      }

      try {
        setLoadingPettyCashFunds(true);
        // Get available petty cash funds for these sub-regions
        const response = await fetch(`${API_BASE_URL}?action=getAvailablePettyCashFunds&subRegions=${encodeURIComponent(subRegions.join(','))}`);
        const data = await response.json();

        if (data.success) {
          const pettyCashFunds = data.data.pettyCashFunds;
          setAvailablePettyCashFunds(pettyCashFunds);
          
          // Cache the result
          setLocalCache(prev => ({
            ...prev,
            pettyCashFunds: {
              ...prev.pettyCashFunds,
              [cacheKey]: pettyCashFunds
            }
          }));
        } else {
          setError('Failed to load petty cash funds');
        }
      } catch (err) {
        console.error('Error loading petty cash funds:', err);
        setError('Failed to load petty cash funds');
      } finally {
        setLoadingPettyCashFunds(false);
      }
    } else {
      setAvailablePettyCashFunds([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const settings = {
        region: selectedRegion,
        subRegions: selectedSubRegions,
        pettyCashFunds: selectedPettyCashFunds
      };

      const response = await fetch(`${API_BASE_URL}?action=updateUserSettings&email=${encodeURIComponent(user!.email || '')}&settings=${encodeURIComponent(JSON.stringify(settings))}`);
      const data = await response.json();

      if (data.success) {
        // Update global state with new settings
        const updatedUserSettings = {
          email: user!.email || '',
          region: selectedRegion,
          subRegions: selectedSubRegions,
          pettyCashFunds: selectedPettyCashFunds,
          isBanned: false,
          lastLogin: new Date().toISOString(),
          lastSync: new Date().toISOString()
        };
        setUserSettings(updatedUserSettings);
        
        setSuccess('Settings saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }

    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshingInBackground(true);
      await loadUserSettings();
      setSuccess('Settings refreshed successfully!');
    } catch (err) {
      console.error('Error refreshing settings:', err);
      setError('Failed to refresh settings');
    } finally {
      setRefreshingInBackground(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Loading settings...</Typography>
        </Box>
      </Box>
    );
  }

  if (accessInfo?.isBanned) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" sx={{ mb: 1 }}>
            Account Banned
          </Typography>
          <Typography>
            Your account has been banned. Please contact an administrator for assistance.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h5" component="h1">
            Settings
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {refreshingInBackground && (
            <Chip label="Refreshing..." size="small" color="info" />
          )}
          {userSettings && userSettings.email === user?.email && !refreshingInBackground && (
            <Chip label="✓ Cached" size="small" color="success" />
          )}
          {!userSettings && !loading && !refreshingInBackground && (
            <Chip label="No cached data" size="small" color="warning" />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefresh}
            disabled={refreshingInBackground}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {userSettings && userSettings.email === user?.email && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Settings loaded from cache. Use "Refresh" to get latest data.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Main Content Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        
        {/* Left Column - Region & Sub-Region */}
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="h6">Region & Sub-Region</Typography>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                disabled={!globalCache.staticData}
                label="Region"
                size="small"
              >
                <MenuItem value="">Select a region</MenuItem>
                {availableRegions.length > 0 ? (
                  availableRegions.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {globalCache.staticData ? 'Loading regions...' : 'No regions available'}
                  </MenuItem>
                )}
              </Select>
              {!globalCache.staticData && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Loading regions from cache...
                </Typography>
              )}
            </FormControl>

            {selectedRegion && (
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2">Sub-Regions</Typography>
                  {loadingSubRegions && <CircularProgress size={14} />}
                </Box>
                {loadingSubRegions ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Loading...</Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0.5 }}>
                      {availableSubRegions.map((subRegion) => (
                        <FormControlLabel
                          key={subRegion}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedSubRegions.includes(subRegion)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSubRegionChange([...selectedSubRegions, subRegion]);
                                } else {
                                  handleSubRegionChange(selectedSubRegions.filter(sr => sr !== subRegion));
                                }
                              }}
                            />
                          }
                          label={<Typography variant="body2">{subRegion}</Typography>}
                        />
                      ))}
                    </Box>
                    {localCache.subRegions[selectedRegion] && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                        ✓ Loaded from cache
                      </Typography>
                    )}
                  </>
                )}
              </FormControl>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Petty Cash & Summary */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* Petty Cash Funds */}
          {hasPettyCashAccess && selectedSubRegions.length > 0 && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalanceIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="h6">Petty Cash Funds</Typography>
                  <Chip label="i58 Staff Only" size="small" color="secondary" />
                  {loadingPettyCashFunds && <CircularProgress size={14} />}
                </Box>

                {loadingPettyCashFunds ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Loading...</Typography>
                  </Box>
                ) : availablePettyCashFunds.length > 0 ? (
                  <FormControl fullWidth>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Select the petty cash funds you have access to:
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0.5 }}>
                      {availablePettyCashFunds.map((fund) => (
                        <FormControlLabel
                          key={fund}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedPettyCashFunds.includes(fund)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPettyCashFunds([...selectedPettyCashFunds, fund]);
                                } else {
                                  setSelectedPettyCashFunds(selectedPettyCashFunds.filter(f => f !== fund));
                                }
                              }}
                            />
                          }
                          label={<Typography variant="body2">{fund}</Typography>}
                        />
                      ))}
                    </Box>
                    {localCache.pettyCashFunds[selectedSubRegions.sort().join(',')] && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                        ✓ Loaded from cache
                      </Typography>
                    )}
                  </FormControl>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No petty cash funds available for the selected sub-regions.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Settings Summary */}
          {(selectedRegion || selectedSubRegions.length > 0 || selectedPettyCashFunds.length > 0) && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Current Settings
                </Typography>
                
                {selectedRegion && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Region
                    </Typography>
                    <Chip label={selectedRegion} color="primary" size="small" />
                  </Box>
                )}

                {selectedSubRegions.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Sub-Regions
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedSubRegions.map((subRegion) => (
                        <Chip key={subRegion} label={subRegion} color="primary" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedPettyCashFunds.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Petty Cash Funds
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedPettyCashFunds.map((fund) => (
                        <Chip key={fund} label={fund} color="secondary" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
