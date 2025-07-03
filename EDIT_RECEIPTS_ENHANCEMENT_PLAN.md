# Edit Receipts Enhancement Plan

## Overview
Enhance the edit receipts functionality to include audit trails, soft deletes, and proper file management with automatic filename updates.

## Current System Analysis

### Current Sheet Structure (receipt_log)
```
A: Date, B: Amount, C: Description, D: Budget, E: Budget ID, F: Category, 
G: Photo URL, H: Timestamp, I: Monthly Expense, J: Vendor, K: Card, 
L: Start Date, M: End Date, N: User Name, O: User Email, P: Code
```

### Current Functions
- `getUserReceipts(userEmail)` - Fetches user receipts
- `updateReceipt(data)` - Updates receipt fields (basic)
- `deleteReceipt(data)` - Hard deletes receipts
- `saveReceiptFile()` - Saves new receipts
- `getCardFolderId()` - Gets card folder ID
- `getOrCreateMonthFolder()` - Creates month folders

## Enhancement Requirements

### 1. Audit Trail & Change Tracking
**New Columns:**
- **Q: Last Modified** - Timestamp of last change
- **R: Modified By** - User who made the change  
- **S: Change Description** - Required description of what was changed
- **T: Is Deleted** - Boolean flag for soft delete

### 2. Change Description System
- **Free-text field** for custom descriptions
- **Dropdown with common change types**:
  - "Corrected amount"
  - "Fixed vendor name"
  - "Moved to different budget"
  - "Updated category"
  - "Changed card"
  - "Corrected date"
  - "Other" (triggers free-text input)

### 3. File Management
- **Automatic filename updates** when any field changes
- **File movement** when budget/card/date changes
- **Soft delete**: Move to "Deleted" subfolder within original month folder
- **No restoration capability** for deleted receipts

## Implementation Phases

---

## Phase 1: Database Schema Updates ✅ COMPLETE

### 1.1 Update Sheet Structure ✅
**File:** `Code.gs`
**Function:** `initializeSheets()`

**Changes:**
- ✅ Added new columns to receipt_log sheet:
  - Column Q: "Last Modified" (timestamp)
  - Column R: "Modified By" (user email)
  - Column S: "Change Description" (text)
  - Column T: "Is Deleted" (boolean)

**Code Changes:**
```javascript
// ✅ Updated line 419 in initializeSheets()
receiptSheet.getRange('A1:T1').setValues([[
  'Date', 'Amount', 'Description', 'Budget', 'Budget ID', 'Category', 
  'Photo URL', 'Timestamp', 'Monthly Expense', 'Vendor', 'Card', 
  'Start Date', 'End Date', 'User Name', 'User Email', 'Code',
  'Last Modified', 'Modified By', 'Change Description', 'Is Deleted'
]]);
```

### 1.2 Update logToSheet Function ✅
**File:** `Code.gs`
**Function:** `logToSheet()`

**Changes:**
- ✅ Added default values for new audit columns when creating new receipts

**Code Changes:**
```javascript
// ✅ Added to newRow array in logToSheet()
const newRow = [
  // ... existing fields ...
  data.categoryCode || '', // Column P: Code
  new Date(), // Column Q: Last Modified (same as Timestamp for new receipts)
  data.userEmail || '', // Column R: Modified By
  'Initial submission', // Column S: Change Description
  false // Column T: Is Deleted
];
```

### 1.3 Test Phase 1 ✅
**Test Cases:**
- ✅ Initialize sheets with new columns
- ✅ Submit new receipt and verify audit fields are populated
- ✅ Verify existing receipts still work (backward compatibility)
- ✅ Added testPhase1AuditColumns() function for verification

---

## Phase 2: File Management Functions ✅ COMPLETE

### 2.1 Create moveReceiptFile Function ✅
**File:** `Code.gs`
**Function:** `moveReceiptFile()`

**Purpose:** Move receipt files when budget/card/date changes
**Features:**
- ✅ Extracts file ID from Google Drive URL
- ✅ Generates new filename with updated details
- ✅ Moves file to correct month folder in new card's folder
- ✅ Handles missing/invalid file URLs gracefully

**Code Changes:**
```javascript
// ✅ Added moveReceiptFile function
function moveReceiptFile(fileUrl, newBudgetId, newCard, newDate, newVendor, newAmount, category) {
  // Handles file movement when budget/card/date changes
  // Returns new file URL
}
```

### 2.2 Create renameReceiptFile Function ✅
**File:** `Code.gs`
**Function:** `renameReceiptFile()`

**Purpose:** Rename files when only amount/vendor/category changes (no movement)
**Features:**
- ✅ Renames file in same location
- ✅ Updates filename with new details
- ✅ Handles missing/invalid file URLs gracefully

**Code Changes:**
```javascript
// ✅ Added renameReceiptFile function
function renameReceiptFile(fileUrl, budgetId, card, date, newVendor, newAmount, newCategory) {
  // Handles file renaming when only details change
  // Returns same URL (location unchanged)
}
```

### 2.3 Create softDeleteReceiptFile Function ✅
**File:** `Code.gs`
**Function:** `softDeleteReceiptFile()`

**Purpose:** Move files to "Deleted" folder within same month folder
**Features:**
- ✅ Creates "Deleted" folder if it doesn't exist
- ✅ Adds timestamp prefix to filename
- ✅ Moves file to deleted folder within same month
- ✅ Handles missing/invalid file URLs gracefully

**Code Changes:**
```javascript
// ✅ Added softDeleteReceiptFile function
function softDeleteReceiptFile(fileUrl, userEmail) {
  // Handles soft delete by moving to Deleted folder
  // Returns new file URL in deleted folder
}
```

### 2.4 Test Phase 2 ✅
**Test Cases:**
- ✅ Verify all functions exist
- ✅ Test with invalid/missing file URLs (graceful handling)
- ✅ Test helper functions (getCategoryCode, getCardFolderId)
- ✅ Added testPhase2FileManagement() function

---

## Phase 3: Enhanced Update Function ✅ COMPLETE

### 3.1 Modify updateReceipt Function ✅
**File:** `Code.gs`
**Function:** `updateReceipt()`

**Enhancements:**
- ✅ Added required change description validation
- ✅ Added audit trail updates (Last Modified, Modified By, Change Description)
- ✅ Added file management integration (move/rename based on changes)
- ✅ Added change detection logic
- ✅ Added support for budgetId field
- ✅ Enhanced error handling and logging

**New Parameters:**
- `changeDescription` - Required description of changes
- `changeType` - Optional change type (e.g., "Amount Correction", "Vendor Update")
- `budgetId` - Budget ID for proper file naming
- `date` - Date for file organization

**Code Changes:**
```javascript
// ✅ Enhanced updateReceipt function
function updateReceipt(data) {
  // Validates change description
  // Detects what fields changed
  // Manages files (move/rename) based on changes
  // Updates audit trail
  // Returns detailed change information
}
```

### 3.2 Modify deleteReceipt Function ✅
**File:** `Code.gs`
**Function:** `deleteReceipt()`

**Enhancements:**
- ✅ Implemented soft delete (marks as deleted instead of removing row)
- ✅ Added required change description validation
- ✅ Added audit trail updates
- ✅ Added file soft delete (moves to Deleted folder)
- ✅ Prevents double deletion

**Code Changes:**
```javascript
// ✅ Enhanced deleteReceipt function (soft delete)
function deleteReceipt(data) {
  // Validates change description
  // Marks receipt as deleted (Is Deleted = true)
  // Moves file to Deleted folder
  // Updates audit trail
  // Prevents duplicate deletions
}
```

### 3.3 Update getUserReceipts Function ✅
**File:** `Code.gs`
**Function:** `getUserReceipts()`

**Enhancements:**
- ✅ Added soft delete filtering (excludes deleted receipts)
- ✅ Enhanced logging for debugging

**Code Changes:**
```javascript
// ✅ Enhanced getUserReceipts function
function getUserReceipts(userEmail) {
  // Filters out soft-deleted receipts
  // Only returns active receipts
}
```

### 3.4 Test Phase 3 ✅
**Test Cases:**
- ✅ Verify all enhanced functions exist
- ✅ Test change description validation (should reject missing descriptions)
- ✅ Test soft delete filtering
- ✅ Added testPhase3EnhancedFunctions() function

---

## Phase 4: Client-Side UI Updates ✅ COMPLETE

### 4.1 Update EditReceipts Component ✅
**File:** `src/components/EditReceipts.tsx`

**Enhancements:**
- ✅ Added change description validation (required field)
- ✅ Added change type dropdown with common options
- ✅ Enhanced edit dialog with change description section
- ✅ Added delete confirmation dialog with change description requirement
- ✅ Improved user experience with clear validation messages
- ✅ Added visual separation between receipt fields and change description

**New UI Elements:**
- ✅ Change Type dropdown (Amount Correction, Vendor Update, Budget Reassignment, etc.)
- ✅ Required Change Description text field with validation
- ✅ Delete confirmation dialog with receipt preview
- ✅ Error handling for missing change descriptions

**Code Changes:**
```typescript
// ✅ Added change description state
const [changeType, setChangeType] = useState('');
const [changeDescription, setChangeDescription] = useState('');
const [changeDescriptionError, setChangeDescriptionError] = useState('');

// ✅ Added delete confirmation state
const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null);
const [deleteChangeType, setDeleteChangeType] = useState('');
const [deleteChangeDescription, setDeleteChangeDescription] = useState('');

// ✅ Enhanced API calls with change description
handleSaveEdit() // Now includes changeDescription and changeType
handleConfirmDelete() // New function for delete confirmation
```

### 4.2 Update Receipt Interface ✅
**File:** `src/components/EditReceipts.tsx`

**Enhancements:**
- ✅ Receipt interface already supports budgetId field
- ✅ Enhanced error handling for API responses
- ✅ Improved validation feedback

### 4.3 Add Change Description UI ✅
**New UI Elements:**
- ✅ **Change Type Dropdown:** 7 common change types (Amount Correction, Vendor Update, etc.)
- ✅ **Required Change Description Field:** Multiline text area with validation
- ✅ **Delete Confirmation Dialog:** Shows receipt details and requires deletion reason
- ✅ **Visual Indicators:** Clear separation, error states, and helper text

**User Experience:**
- ✅ Clear validation messages for missing descriptions
- ✅ Helpful placeholder text with examples
- ✅ Visual feedback for required fields
- ✅ Confirmation dialogs prevent accidental actions

### 4.4 Test Phase 4 ✅
**Test Cases:**
- ✅ Change description validation in edit dialog
- ✅ Change description validation in delete dialog
- ✅ Change type dropdown functionality
- ✅ Error handling for missing descriptions
- ✅ UI responsiveness and accessibility

---

## Phase 5: Integration Testing 🔄 IN PROGRESS

### 5.1 End-to-End Testing
**Test Scenarios:**
1. **New Receipt Submission**
   - Submit new receipt
   - Verify audit fields are populated correctly

2. **Receipt Update - Amount Change**
   - Update receipt amount
   - Verify file is renamed
   - Verify audit trail is updated

3. **Receipt Update - Budget Change**
   - Update receipt budget
   - Verify file is moved to new location
   - Verify audit trail is updated

4. **Receipt Update - Card Change**
   - Update receipt card
   - Verify file is moved to new location
   - Verify audit trail is updated

5. **Receipt Soft Delete**
   - Delete receipt with change description
   - Verify file is moved to deleted folder
   - Verify receipt no longer appears in list
   - Verify audit trail is updated

### 5.2 Error Handling Testing
**Test Cases:**
1. Update without change description (should fail)
2. Delete without change description (should fail)
3. Update non-existent receipt (should fail)
4. Update receipt without permission (should fail)
5. File operations with invalid URLs (should handle gracefully)

### 5.3 Performance Testing
**Test Cases:**
1. Large number of receipts
2. File operations with large files
3. Concurrent updates
4. Network timeouts during file operations

---

## Testing Checklist

### Phase 1 Testing
- [ ] New columns added to sheet
- [ ] New receipts populate audit fields
- [ ] Existing receipts still work
- [ ] Backward compatibility maintained

### Phase 2 Testing
- [ ] File movement works correctly
- [ ] File renaming works correctly
- [ ] Deleted folder creation works
- [ ] Filename format is correct

### Phase 3 Testing
- [ ] Change description is required
- [ ] File operations trigger correctly
- [ ] Audit fields update correctly
- [ ] Soft-deleted receipts are filtered out
- [ ] All field updates work

### Phase 4 Testing
- [ ] Soft delete works correctly
- [ ] Files move to deleted folder
- [ ] Audit trail is updated
- [ ] Receipts disappear from list

### Phase 5 Testing
- [ ] UI requires change description
- [ ] Dropdown and free-text work
- [ ] Audit information displays
- [ ] All new fields work in UI

### Phase 6 Testing
- [ ] End-to-end scenarios work
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] No data loss occurs

---

## Rollback Plan

If issues arise during implementation:

1. **Database Changes**: Can be reverted by removing new columns (data will be lost)
2. **Function Changes**: Can be reverted to previous versions
3. **File Operations**: Original files remain in place until moved
4. **UI Changes**: Can be reverted to previous version

## Success Criteria

- [ ] All receipts have audit trails
- [ ] File management works correctly
- [ ] Soft deletes work without data loss
- [ ] Change descriptions are required and meaningful
- [ ] No performance degradation
- [ ] Backward compatibility maintained
- [ ] All existing functionality preserved 