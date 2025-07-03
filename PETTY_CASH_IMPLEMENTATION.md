# Petty Cash Implementation Plan

## Overview
This document outlines the implementation plan for adding petty cash functionality to the i58-Receipts system, including user settings management and regional petty cash tracking.

## Core Architecture

### Data Structure
```
user_settings:
| Email | Region | SubRegions | PettyCashFunds | IsBanned | LastLogin | LastSync |
|-------|--------|------------|----------------|----------|-----------|----------|
| john@i58global.org | Greece | Lesvos,Athens | Petty Cash Lesvos,Petty Cash Athens | FALSE | 2025-01-15 | 2025-01-15 |

petty_receipts:
| Date | Type | Amount | Description | Location | Balance | User | Receipt URL | Fund |
|------|------|--------|-------------|----------|---------|------|-------------|------|
| 2025-01-15 | WITHDRAWAL | 500.00 | Bank withdrawal to petty cash | Athens | 500.00 | john@i58global.org | | Petty Cash Athens |
| 2025-01-16 | EXPENSE | -25.50 | Office supplies | Athens | 474.50 | mary@i58global.org | [PDF] | Petty Cash Athens |
```

### Budget ID System (NEW)
```
Budgets Sheet:
| Budget ID | Name | Code | Monthly Limit | Active | Region | SubRegion |
|-----------|------|------|---------------|--------|--------|-----------|
| 1 | Gießen | GIE | 1000 | TRUE | Germany | Gießen |
| 2 | Athens | ATH | 800 | TRUE | Greece | Athens |

Categories Sheet:
| Budget ID | Name | Code | Monthly Limit | Active | Budget Name |
|-----------|------|------|---------------|--------|-------------|
| 1 | Rent | 6220 | 500 | TRUE | Gießen |
| 1 | Meals | 6230 | 200 | TRUE | Gießen |
| 2 | Rent | 6220 | 400 | TRUE | Athens |

Enhanced Receipt Naming:
- Format: {BudgetName}_{RegionPrefix}_{SubRegionPrefix}
- Example: Gießen_GE_GI (Germany, Gießen)
- Example: Athens_GR_AT (Greece, Athens)
```

### Access Control
- **Petty Cash Access**: Only `@i58global.org` emails
- **User Banning**: `IsBanned` field in backend sheet
- **Admin Functions**: All admin functions in Google Sheets (no frontend admin UI)
- **Fund Creation**: Only via Google Sheets by admin

## Settings Page Design

### UI Structure
```
Settings Page
├── Region Selection (Single Select)
│   └── Greece
│   └── Germany
├── Sub-Region Selection (Expandable Checkboxes)
│   └── Greece
│       ├── [ ] Athens
│       ├── [ ] Lesvos
│       ├── [ ] Thessaloniki
│       └── [ ] Crete
│   └── Germany
│       ├── [ ] Berlin
│       ├── [ ] Munich
│       └── [ ] Hamburg
└── Petty Cash Funds (Expandable Checkboxes - i58global only)
    └── Greece
        ├── [ ] Petty Cash Athens
        ├── [ ] Petty Cash Lesvos
        └── [ ] Petty Cash Thessaloniki
    └── Germany
        ├── [ ] Petty Cash Berlin
        └── [ ] Petty Cash Munich
```

### Behavior
- **Sub-regions**: Only show when parent region is selected
- **Petty cash funds**: Only show when sub-region is selected
- **Petty cash section**: Only visible to `@i58global.org` users
- **Save button**: Updates user settings and syncs to backend

## Implementation Phases

### Phase 0: Budget ID System Migration (NEW)
**Goal**: Migrate from budget names to Budget ID system for better data integrity

#### 0.1 Backend Functions Updated ✅
- [x] `getStaticData()` - Updated to use Budget IDs and enhanced naming
- [x] `getBudgetSummary(budgetId)` - Updated to work with Budget IDs
- [x] `getOriginalBudgetLimits(budgetId)` - Updated to use Budget IDs
- [x] `getCategoryCode(budgetId, categoryName)` - Updated to use Budget IDs
- [x] `getYTDBudgetSpending(budgetId)` - Updated to use Budget IDs
- [x] `calculateFlexibleBudgetLimits(budgetId)` - Updated to use Budget IDs
- [x] `processFlexibleBudgetSnapshot()` - Updated to use Budget IDs
- [x] `getMonthlyCategoryLimit(budgetId)` - Updated to use Budget IDs
- [x] `getBudgetProgress(budgetId)` - Updated to use Budget IDs
- [x] `testFlexibleBudgetCalculation(budgetId)` - Updated to use Budget IDs
- [x] `getFlexibleBudgetCalculation(budgetId)` - Updated to use Budget IDs
- [x] `getAllFlexibleBudgetCalculations()` - Updated to use Budget IDs

#### 0.2 Sheet Structure Updates ✅
- [x] `Budgets` sheet - Added Budget ID column (A), Region (F), SubRegion (G)
- [x] `Categories` sheet - Added Budget ID column (A), Budget Name (F)
- [x] `MonthlyBudgetSnapshot` - Already supports region/sub-region columns

#### 0.3 Frontend Components (PENDING)
- [ ] `ReceiptForm.tsx` - Update budget selection and filtering logic
- [ ] `Dashboard.tsx` - Update budget display and filtering
- [ ] `Budgets.tsx` - Update budget management interface
- [ ] `BudgetDetail.tsx` - Update individual budget detail view
- [ ] `BudgetProgressBar.tsx` - Update budget progress display
- [ ] `EditReceipts.tsx` - Update receipt editing with budget selection
- [ ] `AdminReceiptForm.tsx` - Update admin receipt form

#### 0.4 Context Providers (PENDING)
- [ ] `BudgetContext.tsx` - Update budget state management
- [ ] `GlobalStateContext.tsx` - Update global state with budget data

#### 0.5 API Service Calls (PENDING)
- [ ] Update all API calls to pass `budgetId` instead of `budgetName`
- [ ] Update URL parameters in fetch requests
- [ ] Update request bodies to use Budget IDs

#### 0.6 Data Structures and Interfaces (PENDING)
- [ ] Update budget-related TypeScript interfaces
- [ ] Update API response interfaces
- [ ] Update state management interfaces

#### 0.7 Enhanced Receipt Naming (PENDING)
- [ ] Implement enhanced receipt naming system
- [ ] Update receipt file naming logic
- [ ] Update receipt display names
- [ ] Update receipt storage and retrieval

#### 0.8 Testing and Validation (PENDING)
- [ ] Test Budget ID validation
- [ ] Test region/sub-region validation
- [ ] Test enhanced naming validation
- [ ] Update documentation

### Phase 1: Backend Infrastructure
**Goal**: Set up data structures and core functions

#### 1.1 Create New Sheets
- [x] Create `user_settings` sheet with proper headers
- [x] Create `petty_receipts` sheet with proper headers
- [x] Add setup functions to initialize sheets

#### 1.2 Core Backend Functions
- [x] `getUserSettings(email)` - Get user's current settings
- [x] `updateUserSettings(email, settings)` - Update user settings
- [x] `checkUserAccess(email)` - Check if user is banned
- [x] `getAvailableSubRegions(region)` - Get sub-regions for a region
- [x] `getAvailablePettyCashFunds(subRegions)` - Get funds for selected sub-regions
- [x] `syncUserSettingsDaily()` - Daily trigger function

#### 1.3 Testing Phase 1
- [ ] Test sheet creation functions
- [ ] Test user settings CRUD operations
- [ ] Test access control functions
- [ ] Test daily sync trigger

### Phase 2: Petty Cash Backend
**Goal**: Implement petty cash tracking functionality

#### 2.1 Petty Cash Functions
- [x] `getPettyCashBalance(selectedFunds)` - Get balance for user's selected funds
- [x] `recordPettyCashWithdrawal(data)` - Record new withdrawal
- [x] `getPettyCashHistory(funds, dateRange)` - Get transaction history
- [x] `syncPettyCashFromReceipts()` - Sync receipts with petty cash cards to petty_receipts

#### 2.2 Receipt Integration
- [x] Modify `logToSheet()` to detect petty cash cards
- [x] Auto-create negative entries in `petty_receipts` when petty cash card is used
- [x] Ensure balance calculations work correctly

#### 2.3 Testing Phase 2
- [ ] Test petty cash withdrawal recording
- [ ] Test receipt integration with petty cash
- [ ] Test balance calculations
- [ ] Test transaction history retrieval

### Phase 3: Frontend Settings Page
**Goal**: Build the settings management interface

#### 3.1 Settings Components
- [ ] `SettingsPage.tsx` - Main settings page
- [ ] `RegionSelector.tsx` - Region selection component
- [ ] `SubRegionSelector.tsx` - Expandable sub-region selector
- [ ] `PettyCashFundSelector.tsx` - Petty cash fund selector
- [ ] `UserSettingsContext.tsx` - Settings state management

#### 3.2 Settings Logic
- [ ] Implement expandable checkbox lists
- [ ] Implement conditional rendering (sub-regions only show when region selected)
- [ ] Implement save functionality
- [ ] Implement loading states and error handling

#### 3.3 Testing Phase 3
- [ ] Test settings page rendering
- [ ] Test expandable lists functionality
- [ ] Test save/load operations
- [ ] Test conditional rendering

### Phase 4: Frontend Petty Cash Page
**Goal**: Build petty cash management interface

#### 4.1 Petty Cash Components
- [ ] `PettyCashPage.tsx` - Main petty cash page
- [ ] `PettyCashBalance.tsx` - Balance display component
- [ ] `PettyCashWithdrawalForm.tsx` - Withdrawal recording form
- [ ] `PettyCashHistory.tsx` - Transaction history component
- [ ] `PettyCashContext.tsx` - Petty cash state management

#### 4.2 Petty Cash Logic
- [ ] Implement balance display for selected funds
- [ ] Implement withdrawal recording form
- [ ] Implement transaction history display
- [ ] Implement fund selection dropdown

#### 4.3 Testing Phase 4
- [ ] Test petty cash page rendering
- [ ] Test balance display
- [ ] Test withdrawal form submission
- [ ] Test transaction history display

### Phase 5: Integration & Polish
**Goal**: Integrate all components and add final touches

#### 5.1 Integration
- [ ] Add settings route to router
- [ ] Add petty cash route to router
- [ ] Integrate settings with main app navigation
- [ ] Add access control to routes

#### 5.2 QuickBooks Integration
- [ ] Configure QuickBooks email in backend
- [ ] Test email sending for petty cash receipts
- [ ] Verify email format and content

#### 5.3 Final Testing
- [ ] End-to-end testing of complete flow
- [ ] Test user banning functionality
- [ ] Test daily sync functionality
- [ ] Test cross-device settings persistence

## API Endpoints

### Settings Management
```
GET /api?action=getUserSettings&email=user@example.com
POST /api?action=updateUserSettings
  Body: { email, region, subRegions, pettyCashFunds }
GET /api?action=checkUserAccess&email=user@example.com
GET /api?action=getAvailableSubRegions&region=Greece
GET /api?action=getAvailablePettyCashFunds&subRegions=Lesvos,Athens
```

### Petty Cash Management
```
GET /api?action=getPettyCashBalance&funds=Petty Cash Lesvos,Petty Cash Athens
POST /api?action=recordPettyCashWithdrawal
  Body: { amount, description, fund, userEmail }
GET /api?action=getPettyCashHistory&funds=Petty Cash Lesvos&startDate=2025-01-01&endDate=2025-01-31
```

### Budget Management (Updated for Budget IDs)
```
GET /api?action=getStaticData
GET /api?action=getBudgetSummary&budget={budgetId}
GET /api?action=getBudgetProgress&budget={budgetId}&category={categoryName}
GET /api?action=getFlexibleBudgetCalculation&budget={budgetId}
GET /api?action=getAllFlexibleBudgetCalculations
```

## Testing Strategy

### Manual Testing (No Test Functions in Apps Script)
- **Phase 0**: Test Budget ID system migration and enhanced naming
- **Phase 1**: Manually run setup functions and test CRUD operations
- [ ] Test sheet creation functions
- [ ] Test user settings CRUD operations
- [ ] Test access control functions
- [ ] Test daily sync trigger
- **Phase 2**: Manually test petty cash operations and receipt integration
- [ ] Test petty cash withdrawal recording
- [ ] Test receipt integration with petty cash
- [ ] Test balance calculations
- [ ] Test transaction history retrieval
- **Phase 3**: Test settings page in browser with different user scenarios
- [ ] Test settings page rendering
- [ ] Test expandable lists functionality
- [ ] Test save/load operations
- [ ] Test conditional rendering
- **Phase 4**: Test petty cash page with various fund combinations
- [ ] Test petty cash page rendering
- [ ] Test balance display
- [ ] Test withdrawal form submission
- [ ] Test transaction history display
- **Phase 5**: End-to-end testing with real data
- [ ] Test user banning functionality
- [ ] Test daily sync functionality
- [ ] Test cross-device settings persistence
- [ ] Test QuickBooks email integration
- [ ] Verify Budget ID system works correctly
- [ ] Test enhanced receipt naming

### Test Scenarios
1. **Budget ID Migration**: Test all functions work with Budget IDs
2. **Enhanced Naming**: Test receipt naming with region/sub-region prefixes
3. **New user setup**: Test settings page for first-time user
4. **Existing user**: Test loading existing settings
5. **i58global user**: Test petty cash access and functionality
6. **Non-i58global user**: Test that petty cash is hidden
7. **Banned user**: Test complete lockout
8. **Multiple funds**: Test managing multiple petty cash funds
9. **Daily sync**: Test settings synchronization
10. **Receipt integration**: Test petty cash card usage in receipts

## Security Considerations

### Access Control
- All petty cash functions check for `@i58global.org` email
- User banning is enforced at API level
- Settings updates validate user permissions

### Data Validation
- All input data is validated before processing
- Amount fields are checked for valid numbers
- Date fields are validated for proper format
- Budget IDs are validated against existing budgets

### Error Handling
- Graceful error handling for all API calls
- User-friendly error messages
- Logging of all errors for debugging

## Deployment Checklist

### Pre-Deployment
- [ ] All backend functions tested manually
- [ ] All frontend components tested in development
- [ ] User settings sheet created and populated with test data
- [ ] Petty cash receipts sheet created
- [ ] Daily sync trigger configured
- [ ] Budget ID system migration completed
- [ ] Enhanced receipt naming system tested

### Post-Deployment
- [ ] Verify settings page works for existing users
- [ ] Verify petty cash page works for i58global users
- [ ] Test user banning functionality
- [ ] Verify daily sync is working
- [ ] Test QuickBooks email integration
- [ ] Verify Budget ID system works correctly
- [ ] Test enhanced receipt naming

## Future Enhancements

### Potential Additions
- **Receipt templates**: Custom templates for different regions
- **Advanced reporting**: Detailed petty cash reports
- **Multi-currency support**: Support for different currencies
- **Mobile optimization**: Better mobile experience
- **Offline support**: Basic offline functionality

### Scalability Considerations
- **Performance**: Monitor API response times
- **Storage**: Monitor Google Sheets usage
- **Users**: Plan for user growth
- **Regions**: Plan for additional regions

## Notes

- All admin functions remain in Google Sheets for security
- No test functions in Apps Script - manual testing only
- Daily sync ensures consistency across all users
- Petty cash funds are admin-controlled only
- User settings persist across devices via daily sync
- Budget ID system provides better data integrity and uniqueness
- Enhanced receipt naming includes region/sub-region prefixes for clarity 