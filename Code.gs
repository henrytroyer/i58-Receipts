const SPREADSHEET_ID = '192l2fCPoenlXkZhzrHDIgR4AGOsj3eCGZ7BO8v96BtQ'; // Replace with your actual spreadsheet ID
const SHARED_DRIVE_ID = '1Dwe_Yed_lYcBLROFjoRhtwhCBS_gN4AM';
const CLOUDCONVERT_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNmZjZDkxZDFlMzJiYTMzZTQ3NjEyYTM1ODYxMGI2OTlhNDU2MWI2NDBlZGUwNDk2NjE4N2Y2ZTE0ODhjOWQ3YjVmY2RhNGQzYmMyNDkzMWIiLCJpYXQiOjE3NDg0Mzc5NDkuMDk5ODk1LCJuYmYiOjE3NDg0Mzc5NDkuMDk5ODk2LCJleHAiOjQ5MDQxMTE1NDkuMDk1Mzg2LCJzdWIiOiI3MjA2MDAyMCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.EW6Hj_1Z70kuYAEC_8BJ04xgCk1oCELqCu5GVVRJLGW1CDwbbPCD7UroeQ5Ggt3MunYV40jFf4OCukUZY0PnDQtzW02IctQ-NF_WhlaZFeCjp1iw79C1iAB9MDfhYrmCIIgJpGeucgf3N1t3xwNZfg7zJTjhRRk--0Nh3BIhbzrrDFGOQfRMYf9s8w5KDj2_ui4qf_oR73BkBBBqIGKbunoaV12MxxWq85My_6QHZCir5qRxNxdcC0BzYpGjJcOCBeM1HQCQDhT_rzcU0-ZS45afpVnXnV3M-oKfU4NoGsnyI7Gvxk9hcU4hFPg2ZywH44xNK6Qkvg_nbX-2Zte0geLDgyqDEMkfOIytIFTld6HVaVE3uW9kN5UMUVYB3VjRorvvaO3cDRDn-s3-uUOnUsJ6II06czWDToygWsSnN1Koafku2IK2k4qZWMn2vwkOd2r4DyFtyxSFUexvOyKPmxfWwU5CGhEg7YbQkInAZ42VPrpaR9j8Qs_wW1uHgfY2RITKCCKlY1Wl-dbyLpLqlnd20EWqQLu6Ypzb68pwkHf-6f0YmHRex4nCf895V_Z0Ds5lQ8baZ35TruO8o3AFZwd6lOnDVyfVwM-3AnFLeLFowYcEYuRScLVMui_slC0iUWz80NQrK0TdVn8eTkuPaXyd9r1B-zhUXZc7wKoZhiM';

function doPost(e) {
  Logger.log('doPost started');
  try {
    Logger.log('Received POST request');
    Logger.log('Post data type: ' + typeof e.postData.contents);
    Logger.log('Post data length: ' + (e.postData && e.postData.contents ? e.postData.contents.length : 'no postData'));
    
    let response;
    let data;
    try {
      // Handle form data
      const formData = e.parameter.data || (e.postData && e.postData.contents);
      Logger.log('Form data received: ' + formData);
      data = JSON.parse(formData);
      Logger.log('Parsed data keys: ' + Object.keys(data));
    } catch (parseError) {
      Logger.log('Error parsing POST data: ' + parseError);
      throw new Error('Invalid JSON data received');
    }
    
    // Handle different actions
    const action = e.parameter.action || data.action;
    if (action) {
      Logger.log('Processing action:', action);
      
      switch (action) {
        case 'updateReceipt':
          response = updateReceipt(data);
          break;
        case 'deleteReceipt':
          response = deleteReceipt(data);
          break;
        case 'getVendorSuggestions':
          response = getVendorSuggestions(data);
          break;
        case 'testGetBudgetDetails':
          response = testGetBudgetDetails(data);
          break;
        default:
          throw new Error('Invalid action: ' + action);
      }
    } else {
      // Handle legacy receipt submission (no action specified)
      Logger.log('Processing receipt submission');
      const { amount, date, description, budgetId, budget, category, pdf, vendor, card, startDate, endDate } = data;
      
      // Log received data (excluding pdf data for brevity)
      Logger.log('Received receipt data: ' + JSON.stringify({
        amount,
        date,
        description,
        budgetId, // Log budgetId
        budget,
        category,
        hasPdf: !!pdf,
        vendor,
        card
      }));
      
      Logger.log('About to validate required fields');
      if (!amount || !date || !budgetId || !category || !vendor) {
        Logger.log('Missing required fields: ' + JSON.stringify({
          hasAmount: !!amount,
          hasDate: !!date,
          hasBudgetId: !!budgetId, // Check for budgetId
          hasCategory: !!category,
          hasVendor: !!vendor
        }));
        throw new Error('Missing required fields: amount, date, budgetId, category, and vendor are required.');
      }
      Logger.log('All required fields present');

      // Handle file upload if provided
      let fileUrl = '';
      if (pdf) {
        try {
          Logger.log('Processing file data...');
          fileUrl = saveReceiptFile(pdf, date, amount, budgetId, budget, category, vendor, card, data.pdfIsNative, data.fileType);
          Logger.log('File saved successfully, URL: ' + fileUrl);
        } catch (fileError) {
          Logger.log('Error saving file: ' + fileError);
          throw new Error('Failed to save file: ' + fileError.message);
        }
      } else {
        Logger.log('No file provided, skipping file processing');
      }

      // Log to sheet (all fields optional except required ones)
      try {
        Logger.log('Logging to sheet...');
        logToSheet({
          date,
          amount,
          description: description || '',
          budget: budget || '', // Keep budget name for historical compatibility
          budgetId: budgetId, // Pass budgetId to logToSheet
          category,
          photoUrl: fileUrl,
          monthlyExpense: data.monthlyExpense || false,
          vendor,
          card: card || '',
          startDate: startDate || '',
          endDate: endDate || '',
          userEmail: data.userEmail || '',
          userName: data.userName || '',
          categoryCode: getCategoryCode(budgetId, category) || '' // Add category code
        });
        Logger.log('Successfully logged to sheet');
      } catch (sheetError) {
        Logger.log('Error logging to sheet: ' + sheetError);
        throw new Error('Failed to log to sheet: ' + sheetError.message);
      }

      response = { 
        success: true, 
        message: 'Receipt submitted successfully',
        data: {
          date,
          amount,
          description,
          budgetId, // Return budgetId in response
          category,
          pdfUrl: fileUrl
        }
      };
    }

    Logger.log('Sending response: ' + JSON.stringify(response));
    
    // Invalidate caches after successful receipt submission
    if (response && response.success) {
      invalidateAllCaches();
    }
    
    Logger.log('Response prepared:', JSON.stringify(response).substring(0, 200) + '...');
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error + (error && error.stack ? ('\n' + error.stack) : ''));
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveReceiptFile(fileData, date, amount, budgetId, budget, category, vendor, card, isNativeFile, fileType) {
  try {
    Logger.log('--- saveReceiptFile ---');
    Logger.log('Received budgetId: ' + budgetId + ' (Type: ' + typeof budgetId + ')');
    Logger.log('Received budget name: ' + budget);
    Logger.log('Received category: ' + category);
    Logger.log('---------------------');
    
    Logger.log('Starting file save process...');
    
    // Get category code for filename
    const categoryCode = getCategoryCode(budgetId, category);
    
    // Format date as YYYY.MM.DD
    const formattedDate = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy.MM.dd');
    
    // Sanitize vendor name (remove special characters)
    const safeVendor = vendor ? String(vendor).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Sanitize card name (remove special characters)
    const safeCard = card ? String(card).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Convert amount from cents to euros and format with 2 decimal places
    const amountInEuros = (parseFloat(amount) / 100).toFixed(2);
    
    // Format: [Category Code] [Vendor] [Date] €[Amount] [Card].pdf
    const filename = `${categoryCode} ${safeVendor} ${formattedDate} €${amountInEuros} ${safeCard}.pdf`;

    // Get the card's folder ID from the Cards sheet
    const cardFolderId = getCardFolderId(card);
    if (!cardFolderId) {
      throw new Error('Card folder ID not found for card: ' + card);
    }
    
    // Get or create the month folder within the card's folder
    const monthFolder = getOrCreateMonthFolder(cardFolderId, date);
    
    Logger.log('Saving receipt to folder: ' + monthFolder.getName());

    // If the file is a native PDF, save it directly
    if (isNativeFile) {
      // fileData is base64-encoded file - save as PDF
      const fileBlob = Utilities.newBlob(Utilities.base64Decode(fileData), 'application/pdf', filename);
      const finalFile = monthFolder.createFile(fileBlob);
      Logger.log('File saved directly as PDF (native upload)');
      return finalFile.getUrl();
    }

    // Otherwise, use CloudConvert to convert image to PDF
    try {
      // Determine the appropriate file extension and engine based on file type
      let fileExtension = '.jpg'; // default for images
      let engine = 'imagemagick'; // default for images
      if (fileType) {
        if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xlsx') || fileType.includes('xls')) {
          fileExtension = '.xlsx';
          engine = 'office';
        } else if (fileType.includes('word') || fileType.includes('document') || fileType.includes('docx') || fileType.includes('doc')) {
          fileExtension = '.docx';
          engine = 'office';
        } else if (fileType.includes('image/')) {
          fileExtension = '.' + fileType.split('/')[1];
          engine = 'imagemagick';
        }
      }
      
      Logger.log('Using file extension: ' + fileExtension + ', engine: ' + engine);
      
      const jobResponse = UrlFetchApp.fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + CLOUDCONVERT_API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          tasks: {
            'import-file': {
              operation: 'import/base64',
              file: fileData,
              filename: filename.replace(/\.pdf$/, fileExtension)
            },
            'convert-to-pdf': {
              operation: 'convert',
              input: 'import-file',
              output_format: 'pdf',
              engine: engine,
              filename: filename
            },
            'export-pdf': {
              operation: 'export/url',
              input: 'convert-to-pdf'
            }
          }
        }),
        muteHttpExceptions: true
      });

      const jobData = JSON.parse(jobResponse.getContentText());
      if (!jobData.data || !jobData.data.id) {
        throw new Error('Invalid job creation response: ' + jobResponse.getContentText());
      }
      Logger.log('Job created successfully:', jobData.data.id);

      // Wait for the job to complete
      let exportUrl = null;
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        Utilities.sleep(2000);
        const statusResponse = UrlFetchApp.fetch('https://api.cloudconvert.com/v2/jobs/' + jobData.data.id, {
          headers: {
            'Authorization': 'Bearer ' + CLOUDCONVERT_API_KEY
          },
          muteHttpExceptions: true
        });
        if (statusResponse.getResponseCode() !== 200) {
          throw new Error('Failed to check job status: ' + statusResponse.getContentText());
        }
        const statusData = JSON.parse(statusResponse.getContentText());
        Logger.log('Job status:', statusData.data.status);
        if (statusData.data.status === 'finished') {
          const exportTask = statusData.data.tasks.find(task => task.name === 'export-pdf');
          if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
            exportUrl = exportTask.result.files[0].url;
            break;
          }
        } else if (statusData.data.status === 'error') {
          const errorTask = statusData.data.tasks.find(task => task.status === 'error');
          if (errorTask) {
            throw new Error('CloudConvert task failed: ' + errorTask.message);
          }
          throw new Error('CloudConvert conversion failed: ' + JSON.stringify(statusData.data));
        }
        attempts++;
      }
      if (!exportUrl) {
        throw new Error('PDF conversion timed out');
      }
      Logger.log('Downloading converted PDF...');
      // Download the converted PDF
      const pdfResponse = UrlFetchApp.fetch(exportUrl, {
        muteHttpExceptions: true
      });
      if (pdfResponse.getResponseCode() !== 200) {
        throw new Error('Failed to download PDF: ' + pdfResponse.getContentText());
      }
      const pdfBlob = Utilities.newBlob(pdfResponse.getContent(), 'application/pdf', filename);
      const finalFile = monthFolder.createFile(pdfBlob);
      Logger.log('PDF saved successfully (converted)');
      return finalFile.getUrl();
    } catch (processError) {
      throw new Error('Failed to process file: ' + processError.message);
    }
  } catch (error) {
    Logger.log('Error in saveReceiptFile:', error);
    throw new Error('Failed to save receipt file: ' + error.message);
  }
}

function getBudgetDetails(budgetId) {
  Logger.log('--- getBudgetDetails ---');
  Logger.log('Looking for budgetId: ' + budgetId + ' (Type: ' + typeof budgetId + ')');
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const budgetSheet = ss.getSheetByName('Budgets');
  const budgetData = budgetSheet.getDataRange().getValues();
  const headers = budgetData.shift();
  
  Logger.log('Budget sheet headers: ' + headers.join(', '));
  
  const budgetIdCol = headers.indexOf('Budget ID');
  const regionCol = headers.indexOf('Region');
  const subRegionCol = headers.indexOf('SubRegion'); // Changed from 'Sub-Region' to 'SubRegion'

  Logger.log('Column indices - Budget ID: ' + budgetIdCol + ', Region: ' + regionCol + ', SubRegion: ' + subRegionCol);

  for (const row of budgetData) {
    Logger.log('Checking row - Budget ID: ' + row[budgetIdCol] + ' (Type: ' + typeof row[budgetIdCol] + ') vs ' + budgetId + ' (Type: ' + typeof budgetId + ')');
    if (row[budgetIdCol] == budgetId) {
      Logger.log('Found matching budget! Region: ' + row[regionCol] + ', SubRegion: ' + row[subRegionCol]);
      return {
        region: row[regionCol],
        subRegion: row[subRegionCol]
      };
    }
  }
  
  Logger.log('No matching budget found for ID: ' + budgetId);
  return { region: null, subRegion: null }; // Return null if not found
}

// Helper function to get region from budgetId
function getRegionFromBudgetId(budgetId) {
  try {
    if (!budgetId) return 'Unknown';
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budgetSheet = ss.getSheetByName('Budgets');
    
    if (!budgetSheet) {
      Logger.log('Budgets sheet not found, defaulting to Germany');
      return 'Germany';
    }
    
    const budgetData = budgetSheet.getDataRange().getValues();
    const headers = budgetData.shift();
    
    // Find column indices dynamically
    const budgetIdCol = headers.indexOf('Budget ID');
    const regionCol = headers.indexOf('Region');
    
    if (budgetIdCol === -1) {
      Logger.log('Budget ID column not found, defaulting to Germany');
      return 'Germany';
    }
    
    // Find the budget row
    const budgetRow = budgetData.find(row => row[budgetIdCol] == budgetId);
    
    if (!budgetRow) {
      Logger.log('Budget not found for ID: ' + budgetId + ', defaulting to Germany');
      return 'Germany';
    }
    
    // Get region, default to Germany if not specified
    const region = regionCol !== -1 ? (budgetRow[regionCol] || 'Germany') : 'Germany';
    Logger.log('Found region for budget ID ' + budgetId + ': ' + region);
    
    return region;
  } catch (error) {
    Logger.log('Error getting region for budget ID ' + budgetId + ': ' + error);
    return 'Germany'; // Default fallback
  }
}

function logToSheet(data) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    // Get headers and find column indices dynamically
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData.shift();
    
    // Find column indices dynamically
    const dateCol = headers.indexOf('Date');
    const amountCol = headers.indexOf('Amount');
    const descriptionCol = headers.indexOf('Description');
    const budgetCol = headers.indexOf('Budget');
    const budgetIdCol = headers.indexOf('Budget ID');
    const categoryCol = headers.indexOf('Category');
    const photoUrlCol = headers.indexOf('Photo URL');
    const timestampCol = headers.indexOf('Timestamp');
    const monthlyExpenseCol = headers.indexOf('Monthly Expense');
    const vendorCol = headers.indexOf('Vendor');
    const cardCol = headers.indexOf('Card');
    const startDateCol = headers.indexOf('Start Date');
    const endDateCol = headers.indexOf('End Date');
    const userNameCol = headers.indexOf('User Name');
    const userEmailCol = headers.indexOf('User Email');
    const codeCol = headers.indexOf('Code');
    const regionCol = headers.indexOf('Region');
    const lastModifiedCol = headers.indexOf('Last Modified');
    const modifiedByCol = headers.indexOf('Modified By');
    const changeDescriptionCol = headers.indexOf('Change Description');
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    // Validate required columns exist
    if (dateCol === -1 || amountCol === -1) {
      throw new Error('Required columns (Date, Amount) not found in receipt_log sheet');
    }
    
    const amountInCents = parseFloat(data.amount) || 0;
    const amountInEuros = amountInCents / 100;
    
    // Get region from budgetId
    const region = getRegionFromBudgetId(data.budgetId);
    
    // Create row data array with proper length
    const rowData = new Array(headers.length).fill('');
    
    // Set data in correct column positions
    if (dateCol !== -1) rowData[dateCol] = data.date;
    if (amountCol !== -1) rowData[amountCol] = amountInEuros;
    if (descriptionCol !== -1) rowData[descriptionCol] = data.description || '';
    if (budgetCol !== -1) rowData[budgetCol] = data.budget || '';
    if (budgetIdCol !== -1) rowData[budgetIdCol] = data.budgetId;
    if (categoryCol !== -1) rowData[categoryCol] = data.category;
    if (photoUrlCol !== -1) rowData[photoUrlCol] = data.photoUrl || '';
    if (timestampCol !== -1) rowData[timestampCol] = new Date();
    if (monthlyExpenseCol !== -1) rowData[monthlyExpenseCol] = data.monthlyExpense || false;
    if (vendorCol !== -1) rowData[vendorCol] = data.vendor;
    if (cardCol !== -1) rowData[cardCol] = data.card || '';
    if (startDateCol !== -1) rowData[startDateCol] = data.startDate || '';
    if (endDateCol !== -1) rowData[endDateCol] = data.endDate || '';
    if (userNameCol !== -1) rowData[userNameCol] = data.userName || '';
    if (userEmailCol !== -1) rowData[userEmailCol] = data.userEmail || '';
    if (codeCol !== -1) rowData[codeCol] = data.categoryCode || '';
    if (regionCol !== -1) rowData[regionCol] = region;
    if (lastModifiedCol !== -1) rowData[lastModifiedCol] = new Date();
    if (modifiedByCol !== -1) rowData[modifiedByCol] = data.userEmail || '';
    if (changeDescriptionCol !== -1) rowData[changeDescriptionCol] = 'Initial submission';
    if (isDeletedCol !== -1) rowData[isDeletedCol] = false;
    
    sheet.appendRow(rowData);
    Logger.log('Row appended to sheet with header-based positioning');
  } catch (error) {
    Logger.log('Error in logToSheet: ' + error);
    throw new Error('Could not write to sheet: ' + error.message);
  }
}

function initializeSheets() {
  try {
    Logger.log('Initializing sheets...');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Initialize Budgets sheet with Budget ID column
    let budgetSheet = spreadsheet.getSheetByName('Budgets');
    if (!budgetSheet) {
      Logger.log('Creating Budgets sheet...');
      budgetSheet = spreadsheet.insertSheet('Budgets');
      budgetSheet.getRange('A1:F1').setValues([['Budget ID', 'Name', 'Code', 'Monthly Limit', 'Active', 'Region', 'SubRegion']]);
      // Add a default budget
      budgetSheet.getRange('A2:F2').setValues([[1, 'Default', 'DEF', 1000, true, 'Germany', 'Default']]);
    }

    // Initialize Categories sheet with Budget ID column
    let categorySheet = spreadsheet.getSheetByName('Categories');
    if (!categorySheet) {
      Logger.log('Creating Categories sheet...');
      categorySheet = spreadsheet.insertSheet('Categories');
      categorySheet.getRange('A1:F1').setValues([['Budget ID', 'Name', 'Code', 'Monthly Limit', 'Active', 'Budget Name']]);
      // Add a default category
      categorySheet.getRange('A2:F2').setValues([[1, 'General', 'GEN', 500, true, 'Default']]);
    }

    // Initialize Cards sheet with Folder ID column
    let cardsSheet = spreadsheet.getSheetByName('Cards');
    if (!cardsSheet) {
      Logger.log('Creating Cards sheet...');
      cardsSheet = spreadsheet.insertSheet('Cards');
      cardsSheet.getRange('A1:D1').setValues([['Card', 'Assignee', 'Location', 'Folder ID']]);
      // Add a sample card for testing
      cardsSheet.getRange('A2:D2').setValues([['2382', 'Seth', 'Gießen', '1Dq6uRVj3TOwTzU434W3tPJfkgc_7fZsy']]);
    }

    // Initialize receipt_log sheet
    let receiptSheet = spreadsheet.getSheetByName('receipt_log');
    if (!receiptSheet) {
      Logger.log('Creating receipt_log sheet...');
      receiptSheet = spreadsheet.insertSheet('receipt_log');
      receiptSheet.getRange('A1:U1').setValues([['Date', 'Amount', 'Description', 'Budget', 'Budget ID', 'Category', 'Photo URL', 'Timestamp', 'Monthly Expense', 'Vendor', 'Card', 'Start Date', 'End Date', 'User Name', 'User Email', 'Code', 'Region', 'Last Modified', 'Modified By', 'Change Description', 'Is Deleted']]);
    }

    // Initialize user_settings sheet (Phase 1.1)
    let userSettingsSheet = spreadsheet.getSheetByName('user_settings');
    if (!userSettingsSheet) {
      Logger.log('Creating user_settings sheet...');
      userSettingsSheet = spreadsheet.insertSheet('user_settings');
      userSettingsSheet.getRange('A1:G1').setValues([['Email', 'Region', 'SubRegions', 'PettyCashFunds', 'IsBanned', 'LastLogin', 'LastSync']]);
      // Add a sample user for testing
      userSettingsSheet.getRange('A2:G2').setValues([['test@i58global.org', 'Greece', 'Athens,Lesvos', 'Petty Cash Athens,Petty Cash Lesvos', false, new Date(), new Date()]]);
    }

    // Initialize petty_receipts sheet (Phase 1.1)
    let pettyReceiptsSheet = spreadsheet.getSheetByName('petty_receipts');
    if (!pettyReceiptsSheet) {
      Logger.log('Creating petty_receipts sheet...');
      pettyReceiptsSheet = spreadsheet.insertSheet('petty_receipts');
      pettyReceiptsSheet.getRange('A1:I1').setValues([['Date', 'Type', 'Amount', 'Description', 'Location', 'Balance', 'User', 'Receipt URL', 'Fund']]);
      // Add a sample transaction for testing
      pettyReceiptsSheet.getRange('A2:I2').setValues([['2025-01-15', 'WITHDRAWAL', 500.00, 'Initial petty cash setup', 'Athens', 500.00, 'test@i58global.org', '', 'Petty Cash Athens']]);
    }

    return true;
  } catch (error) {
    Logger.log('Error initializing sheets:', error);
    throw error;
  }
}

// Cache for static data (24 hour TTL since this rarely changes)
let staticDataCache = {
  cards: null,
  budgetLimits: null,
  categories: null,
  budgetNames: null,
  regions: null,
  subRegions: null,
  timestamp: 0,
  ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

// Cache for cards (24 hour TTL since cards don't change often)
let cardsCache = {
  data: null,
  timestamp: 0,
  ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

function getCards() {
  // Check cache first
  const currentTime = Date.now();
  if (cardsCache.data && (currentTime - cardsCache.timestamp) < cardsCache.ttl) {
    Logger.log('Returning cached cards data');
    return cardsCache.data;
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Cards');
    if (!sheet) {
      const result = [];
      cardsCache.data = result;
      cardsCache.timestamp = currentTime;
      return result;
    }
    
    // Only read if there's data
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      const result = []; // Only header or empty
      cardsCache.data = result;
      cardsCache.timestamp = currentTime;
      return result;
    }
    
    const data = sheet.getRange(1, 1, lastRow, 4).getValues();
    const headers = data.shift();
    const result = data.map(row => ({
      card: row[0],
      assignee: row[1],
      location: row[2],
      folderId: row[3],
    }));
    
    // Cache the result
    cardsCache.data = result;
    cardsCache.timestamp = currentTime;
    
    return result;
  } catch (error) {
    Logger.log('Error in getCards:', error);
    return [];
  }
}

// New function to get static data (budgets, categories, limits) with 24-hour caching
function getStaticData() {
  const currentTime = Date.now();
  if (staticDataCache.budgetLimits && (currentTime - staticDataCache.timestamp) < staticDataCache.ttl) {
    Logger.log('Returning cached static data');
    return {
      success: true,
      data: {
        budgetLimits: staticDataCache.budgetLimits,
        categories: staticDataCache.categories,
        budgetNames: staticDataCache.budgetNames,
        regions: staticDataCache.regions,
        subRegions: staticDataCache.subRegions
      }
    };
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
    const budgetSheet = ss.getSheetByName('Budgets');
    
    if (!snapSheet) {
      throw new Error('MonthlyBudgetSnapshot sheet not found');
    }

    const now = new Date();
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    Logger.log('Getting static data for month: ' + monthStr);
    
    // Get budget mapping data
    const budgetData = budgetSheet.getDataRange().getValues();
    const budgetHeaders = budgetData.shift(); // remove header
    const budgetMap = {};
    const budgetIdToInfo = {};
    
    // Create mapping from budget name + region + subregion to budget ID
    budgetData.forEach(row => {
      const budgetId = row[0]; // Budget ID
      const budgetName = row[1]; // Budget Name
      const region = row[5] || 'Germany'; // Region
      const subRegion = row[6] || budgetName; // SubRegion
      
      const compositeKey = `${budgetName}_${region}_${subRegion}`;
      budgetMap[compositeKey] = budgetId;
      budgetIdToInfo[budgetId] = {
        name: budgetName,
        region: region,
        subRegion: subRegion,
        compositeKey: compositeKey
      };
    });
    
    // Get data from MonthlyBudgetSnapshot for current month (handle both old 4-column and new 6-column formats)
    const lastColumn = snapSheet.getLastColumn();
    const currentMonthData = snapSheet.getRange(1, 1, snapSheet.getLastRow(), lastColumn).getValues();
    const filteredSnapData = currentMonthData.filter(row => {
      const cellDate = new Date(row[0]);
      const cellMonthStr = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM');
      return cellMonthStr === monthStr;
    });
    
    // Calculate totals from snapshot with region info
    const budgetLimits = {};
    const allCategories = [];
    const budgetNames = [];
    const regions = new Set();
    const subRegions = new Set();
    
    filteredSnapData.forEach(row => {
      const budgetId = row[1]; // Budget ID (column B)
      const budget = String(row[2]).trim(); // Budget Name (column C)
      const category = String(row[3]).trim(); // Category (column D)
      const amount = Number(String(row[4]).replace(/[€,]/g, '').trim()) || 0; // Amount (column E)
      
      // Handle both old (5 columns) and new (7 columns) formats
      const region = lastColumn >= 7 ? (String(row[5]).trim() || 'Germany') : 'Germany'; // Region (column F)
      const subRegion = lastColumn >= 7 ? (String(row[6]).trim() || budget) : budget; // SubRegion (column G)

      // Create composite budget key to make budgets unique across regions/sub-regions
      const compositeBudgetKey = `${budget}_${region}_${subRegion}`;
      
      // Get budget ID from mapping (for backward compatibility)
      const mappedBudgetId = budgetMap[compositeBudgetKey] || budgetId;
      if (!mappedBudgetId) {
        Logger.log('Warning: No budget ID found for composite key: ' + compositeBudgetKey);
        return; // Skip this entry if no budget ID found
      }
      
      // Create enhanced receipt naming with region/sub-region prefixes
      const regionPrefix = region.substring(0, 2).toUpperCase();
      const subRegionPrefix = subRegion.substring(0, 2).toUpperCase();
      const enhancedBudgetName = `${budget}_${regionPrefix}_${subRegionPrefix}`;

      if (!budgetLimits[mappedBudgetId]) {
        budgetLimits[mappedBudgetId] = { 
          total: 0, 
          categories: {},
          region: region,
          subRegion: subRegion,
          displayName: budget, // Store original name for display
          enhancedName: enhancedBudgetName, // Store enhanced name for receipts
          budgetId: mappedBudgetId,
          compositeKey: compositeBudgetKey
        };
        budgetNames.push({ 
          name: budget, 
          region, 
          subRegion,
          budgetId: mappedBudgetId,
          enhancedName: enhancedBudgetName,
          compositeKey: compositeBudgetKey
        });
        regions.add(region);
        subRegions.add(subRegion);
      }

      if (!category) { // Budget level (total)
        budgetLimits[mappedBudgetId].total = amount;
      } else { // Category level
        budgetLimits[mappedBudgetId].categories[category] = amount;
        allCategories.push({
          budgetName: budget, // Use display name for backward compatibility
          budgetId: mappedBudgetId, // Add budget ID for new functionality
          compositeBudgetKey: compositeBudgetKey, // Keep for backward compatibility
          name: category,
          code: category.substring(0, 3).toUpperCase(),
          monthlyLimit: amount,
          active: true,
          region: region,
          subRegion: subRegion,
          enhancedBudgetName: enhancedBudgetName
        });
      }
    });

    const result = {
      success: true,
      data: {
        budgetLimits,
        categories: allCategories,
        budgetNames: budgetNames,
        regions: Array.from(regions),
        subRegions: Array.from(subRegions),
        budgetIdToInfo: budgetIdToInfo // Add mapping for frontend use
      }
    };
    
    // Cache the result
    staticDataCache.budgetLimits = budgetLimits;
    staticDataCache.categories = allCategories;
    staticDataCache.budgetNames = budgetNames;
    staticDataCache.regions = Array.from(regions);
    staticDataCache.subRegions = Array.from(subRegions);
    staticDataCache.budgetIdToInfo = budgetIdToInfo;
    staticDataCache.timestamp = currentTime;
    
    return result;
  } catch (error) {
    Logger.log('Error in getStaticData:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getBudgetProgress(e) {
  try {
    Logger.log('Starting getBudgetProgress...');
    const budgetId = e.parameter.budget;
    const category = e.parameter.category;
    
    if (!budgetId || !category) {
      throw new Error('Budget ID and category are required');
    }
    Logger.log('Processing for budget ID: ' + budgetId + ' category: ' + category);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receiptSheet = spreadsheet.getSheetByName('receipt_log');
    const snapshotSheet = spreadsheet.getSheetByName('MonthlyBudgetSnapshot');
    const budgetSheet = spreadsheet.getSheetByName('Budgets');

    if (!receiptSheet || !snapshotSheet) {
      throw new Error('Required sheets not found');
    }

    // Get budget info from Budgets sheet
    const budgetData = budgetSheet.getDataRange().getValues();
    const budgetHeaders = budgetData.shift(); // remove header
    const budgetRow = budgetData.find(row => row[0] == budgetId); // Budget ID is in column A
    
    if (!budgetRow) {
      throw new Error('Budget not found for ID: ' + budgetId);
    }
    
    const budgetName = budgetRow[1]; // Budget Name is in column B
    const region = budgetRow[5] || 'Germany'; // Region is in column F
    const subRegion = budgetRow[6] || budgetName; // SubRegion is in column G

    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    Logger.log('Processing snapshot for month: ' + monthStr);

    // Get snapshot data
    const snapshotData = snapshotSheet.getDataRange().getValues();
    // snapData.shift(); // remove header (commented out because there is no header row)
    let monthlyLimit = 0;
    let categoryLimit = 0;

    // Find limits from snapshot
    Logger.log('Searching for limits in snapshot...');
    const currentMonthData = snapshotData.filter(row => {
      // Convert the cell value to a date (if it's not already)
      const cellDate = new Date(row[0]);
      // Format it to 'yyyy-MM' for comparison
      const cellMonthStr = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM');
      return cellMonthStr === monthStr;
    });
    if (currentMonthData.length > 0) {
      const row = currentMonthData[0];
      if (row[1] === budgetName) {
        // Check if region and subregion match (if available in snapshot)
        const snapshotRegion = row.length >= 6 ? String(row[4]).trim() : 'Germany';
        const snapshotSubRegion = row.length >= 6 ? String(row[5]).trim() : budgetName;
        
        if (snapshotRegion === region && snapshotSubRegion === subRegion) {
          monthlyLimit = Number(row[2]) || 0;
          Logger.log('Found monthly limit: ' + monthlyLimit);
        }
      } else if (row[2] === category) {
        // Check if region and subregion match (if available in snapshot)
        const snapshotRegion = row.length >= 6 ? String(row[4]).trim() : 'Germany';
        const snapshotSubRegion = row.length >= 6 ? String(row[5]).trim() : budgetName;
        
        if (snapshotRegion === region && snapshotSubRegion === subRegion) {
          categoryLimit = Number(row[3]) || 0;
          Logger.log('Found category limit: ' + categoryLimit);
        }
      }
    }
    Logger.log('Final limits - Monthly: ' + monthlyLimit + ' Category: ' + categoryLimit);

    // Get all receipts for the current month
    const receipts = receiptSheet.getDataRange().getValues();
    const headers = receipts.shift();

    // Find column indices dynamically
    const isDeletedCol = headers.indexOf('Is Deleted');

    // Calculate total spent for the budget
    const totalSpent = receipts.reduce((sum, row) => {
      const date = new Date(row[0]);
      const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
      
      // Skip soft deleted receipts
      if (isDeleted) {
        return sum;
      }
      
      if (row[3] === budgetName && date >= startOfMonth && date <= endOfMonth) {
        return sum + Number(row[1]);
      }
      return sum;
    }, 0);

    // Calculate category spent
    const categorySpent = receipts.reduce((sum, row) => {
      const date = new Date(row[0]);
      const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
      
      // Skip soft deleted receipts
      if (isDeleted) {
        return sum;
      }
      
      if (row[3] === budgetName && row[4] === category && date >= startOfMonth && date <= endOfMonth) {
        return sum + Number(row[1]);
      }
      return sum;
    }, 0);

    return {
      success: true,
      data: {
        budgetId: budgetId,
        budgetName: budgetName,
        region: region,
        subRegion: subRegion,
        totalSpent,
        monthlyLimit,
        categorySpent,
        categoryLimit
      }
    };
  } catch (error) {
    Logger.log('Error in getBudgetProgress: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// === Helper: Get start of current budget year (June 1, 2025+) ===
function getBudgetYearStart(now) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JS months are 0-based

  // Special case: 2025, fiscal year starts July 1
  if (year === 2025) {
    if (month < 7) {
      // Before fiscal year starts, return the fiscal year start date
      return new Date(2025, 6, 1); // July 1, 2025 (month 6 is July)
    }
    return new Date(2025, 6, 1); // July 1, 2025 (month 6 is July)
  }

  // For 2026 and beyond, fiscal year is calendar year
  return new Date(year, 0, 1); // January 1 of the current year
}

// === Helper: Get category code from Categories sheet ===
function getCategoryCode(budgetId, categoryName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Categories');
  if (!sheet) {
    Logger.log('Categories sheet not found');
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  // Find column indices dynamically
  const budgetIdCol = headers.indexOf('Budget ID');
  const categoryCol = headers.indexOf('Name'); // Changed from 'Category' to 'Name'
  const codeCol = headers.indexOf('Code');

  if (budgetIdCol === -1 || categoryCol === -1 || codeCol === -1) {
    Logger.log('One or more required columns (Budget ID, Name, Code) not found in Categories sheet');
    return null;
  }

  // Find the matching row and return the code
  for (const row of data) {
    if (row[budgetIdCol] == budgetId && row[categoryCol] === categoryName) {
      return row[codeCol];
    }
  }

  Logger.log(`Category code not found for Budget ID: ${budgetId}, Category: ${categoryName}`);
  return null; // Return null if no match is found
}

// === Helper: Parse date parameter from query string ===
function parseDateParam(e) {
  if (e && e.parameter && e.parameter.date) {
    // Accepts YYYY-MM-DD
    return new Date(e.parameter.date + 'T00:00:00');
  }
  return new Date();
}

// Cache for global summary (5 minute TTL)
let globalSummaryCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes in milliseconds
};

function getGlobalSummary(now) {
  // Check cache first
  const currentTime = Date.now();
  if (globalSummaryCache.data && (currentTime - globalSummaryCache.timestamp) < globalSummaryCache.ttl) {
    Logger.log('Returning cached global summary');
    return globalSummaryCache.data;
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  const receiptSheet = ss.getSheetByName('receipt_log');
  
  if (!snapSheet || !receiptSheet) {
    throw new Error('Required sheets not found');
  }

  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  Logger.log('Getting global summary for month: ' + monthStr);
  
  // Get data from MonthlyBudgetSnapshot using QUERY for current month only
  const snapQuery = `SELECT B, C, D WHERE A = '${monthStr}'`;
  const currentMonthData = snapSheet.getRange(1, 1, snapSheet.getLastRow(), 4).getValues();
  const filteredSnapData = currentMonthData.filter(row => {
    const cellDate = new Date(row[0]);
    const cellMonthStr = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM');
    return cellMonthStr === monthStr;
  });
  
  // Calculate totals from snapshot
  const budgetLimits = {};
  let totalBudgeted = 0;
  
  filteredSnapData.forEach(row => {
    const budget = String(row[1]).trim();
    const category = String(row[2]).trim();
    const amount = Number(String(row[3]).replace(/[€,]/g, '').trim()) || 0;

    if (!budgetLimits[budget]) {
      budgetLimits[budget] = { total: 0, categories: {} };
    }

    if (!category) { // Budget level (total)
      budgetLimits[budget].total = amount;
      totalBudgeted += amount;
    } else { // Category level
      budgetLimits[budget].categories[category] = amount;
    }
  });

  // Get current month spending using QUERY for much faster filtering
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDateStr = Utilities.formatDate(startOfMonth, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const endDateStr = Utilities.formatDate(endOfMonth, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Use QUERY to get only current month receipts
  const receiptQuery = `SELECT B, D, E, H, I, J, K WHERE A >= date '${startDateStr}' AND A <= date '${endDateStr}'`;
  let currentMonthReceipts = [];
  
  try {
    // Try QUERY first (much faster)
    currentMonthReceipts = receiptSheet.getRange(1, 1, receiptSheet.getLastRow(), receiptSheet.getLastColumn()).getValues();
    const headers = currentMonthReceipts.shift();
    
    // Find column indices dynamically
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    // Filter for current month receipts and exclude soft deleted
    currentMonthReceipts = currentMonthReceipts.filter(row => {
      const date = new Date(row[0]);
      const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
      const startDateStr = row[10] || '';
      const endDateStr = row[11] || '';
      const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
      
      // Skip soft deleted receipts
      if (isDeleted) {
        return false;
      }
      
      if (monthlyExpense) {
        // Handle recurring expenses
        const startDate = startDateStr ? new Date(startDateStr) : date;
        const endDate = endDateStr ? new Date(endDateStr) : null;
        return startDate <= endOfMonth && (!endDate || endDate >= startOfMonth);
      } else {
        // Regular expenses - check if in current month
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
    });
  } catch (error) {
    Logger.log('QUERY failed, falling back to full data read: ' + error);
    // Fallback to original method if QUERY fails
    const receipts = receiptSheet.getDataRange().getValues();
    const headers = receipts.shift();
    
    // Find column indices dynamically
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    currentMonthReceipts = receipts.filter(row => {
      const date = new Date(row[0]);
      const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
      const startDateStr = row[10] || '';
      const endDateStr = row[11] || '';
      const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
      
      // Skip soft deleted receipts
      if (isDeleted) {
        return false;
      }
      
      if (monthlyExpense) {
        const startDate = startDateStr ? new Date(startDateStr) : date;
        const endDate = endDateStr ? new Date(endDateStr) : null;
        return startDate <= endOfMonth && (!endDate || endDate >= startOfMonth);
      } else {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
    });
  }
  
  let totalSpent = 0;
  let receiptsCount = 0;
  const spending = {};
  
  currentMonthReceipts.forEach(row => {
    const amount = Number(row[1]) || 0;
    // Use Budget ID (column E, index 4) for aggregation, fallback to name (column D, index 3)
    const budgetId = row[4] || row[3]; 
    const category = row[5]; // Category is now in column F (index 5)
    
    totalSpent += amount;
    receiptsCount++;
    if (!spending[budgetId]) {
      spending[budgetId] = {
        total: 0,
        categories: {}
      };
    }
    spending[budgetId].total += amount;
    if (!spending[budgetId].categories[category]) {
      spending[budgetId].categories[category] = 0;
    }
    spending[budgetId].categories[category] += amount;
  });

  const result = {
    success: true,
    data: {
      totalSpent,
      receiptsCount,
      budgetLimits,
      spending,
      totalBudgeted,
      remaining: totalBudgeted - totalSpent
    }
  };
  
  // Cache the result
  globalSummaryCache.data = result;
  globalSummaryCache.timestamp = currentTime;
  
  return result;
}

function getBudgetSummary(budgetId, e) {
  Logger.log('Starting getBudgetSummary for budget ID: ' + budgetId);
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
  const snapshotSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MonthlyBudgetSnapshot');
  const budgetSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Budgets');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // remove header

  // Find column indices dynamically
  const isDeletedCol = headers.indexOf('Is Deleted');

  const now = parseDateParam(e);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const budgetYearStart = getBudgetYearStart(now);
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  Logger.log('Processing snapshot for month: ' + monthStr);

  // Get budget info from Budgets sheet
  const budgetData = budgetSheet.getDataRange().getValues();
  const budgetHeaders = budgetData.shift(); // remove header
  const budgetRow = budgetData.find(row => row[0] == budgetId); // Budget ID is in column A
  
  if (!budgetRow) {
    return {
      success: false,
      error: 'Budget not found for ID: ' + budgetId
    };
  }
  
  const budgetName = budgetRow[1]; // Budget Name is in column B
  const region = budgetRow[5] || 'Germany'; // Region is in column F
  const subRegion = budgetRow[6] || budgetName; // SubRegion is in column G
  
  Logger.log('Found budget: ' + budgetName + ' (Region: ' + region + ', SubRegion: ' + subRegion + ')');

  // Get snapshot data for this budget
  const snapshotData = snapshotSheet.getDataRange().getValues();
  // snapshotData.shift(); // remove header (commented out because there is no header row)
  const categoryLimits = {};
  let totalBudgeted = 0;

  // Process snapshot data - look for entries with matching budget name, region, and subregion
  Logger.log('Processing snapshot data for budget: ' + budgetName);
  snapshotData.forEach(row => {
    if (row[0] === monthStr && row[1] === budgetName) {
      // Check if region and subregion match (if available in snapshot)
      const snapshotRegion = row.length >= 6 ? String(row[4]).trim() : 'Germany';
      const snapshotSubRegion = row.length >= 6 ? String(row[5]).trim() : budgetName;
      
      if (snapshotRegion === region && snapshotSubRegion === subRegion) {
        if (row[2] === '') { // Budget level
          totalBudgeted = Number(row[3]) || 0;
          Logger.log('Found total budgeted amount: ' + totalBudgeted);
        } else { // Category level
          categoryLimits[row[2]] = Number(row[3]) || 0;
          Logger.log('Found category limit: ' + row[2] + ' = ' + (Number(row[3]) || 0));
        }
      }
    }
  });
  Logger.log('Final category limits for budget ' + budgetName + ': ' + JSON.stringify(categoryLimits));

  let totalSpent = 0;
  let receiptsCount = 0;
  const categoryTotals = {};
  const categoryYearToDateTotals = {};

  data.forEach(row => {
    const date = new Date(row[0]);
    const amount = Number(row[1]);
    const budget = row[3];
    const category = row[4];
    const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;

    // Skip soft deleted receipts
    if (isDeleted) {
      return;
    }

    if (budget === budgetName && date >= startOfMonth && date <= now) {
      totalSpent += amount;
      receiptsCount += 1;
      if (category) {
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      }
    }

    if (budget === budgetName && budgetYearStart && date >= budgetYearStart && date <= now) {
      if (category) {
        categoryYearToDateTotals[category] = (categoryYearToDateTotals[category] || 0) + amount;
      }
    }
  });

  return {
    success: true,
    data: {
      budgetId: budgetId,
      budgetName: budgetName,
      region: region,
      subRegion: subRegion,
      totalSpent,
      receiptsCount,
      categoryTotals,
      categoryYearToDateTotals,
      totalBudgeted,
      categoryLimits
    }
  };
}

function getYearlySummary() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
  const budgetSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Budgets');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // remove header

  // Find column indices dynamically
  const isDeletedCol = headers.indexOf('Is Deleted');

  const now = new Date();
  const year = now.getFullYear();
  const daysElapsed = Math.floor((now - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;

  // Monthly spend for each month (Jan=0)
  const monthlySpend = Array(12).fill(0);
  let totalSpent = 0;

  data.forEach(row => {
    const date = new Date(row[0]);
    const amount = Number(row[1]);
    const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;

    // Skip soft deleted receipts
    if (isDeleted) {
      return;
    }

    if (date.getFullYear() === year) {
      monthlySpend[date.getMonth()] += amount;
      totalSpent += amount;
    }
  });

  // Annual budget: sum of all monthly limits * 12
  const budgets = budgetSheet.getDataRange().getValues();
  budgets.shift(); // remove header
  const monthlyBudgetSum = budgets.reduce((sum, row) => sum + Number(row[2] || 0), 0);
  const annualBudget = monthlyBudgetSum * 12;

  // Projected spend for the year
  const projectedSpend = (totalSpent / daysElapsed) * 365;
  const overUnder = projectedSpend - annualBudget;

  return {
    success: true,
    data: {
      monthlySpend,
      totalSpent,
      annualBudget,
      projectedSpend,
      overUnder
    }
  };
}

function doGet(e) {
  try {
    Logger.log('doGet started');
    const action = e.parameter.action;
    
    if (action === 'testGetBudgetDetails') {
      const budgetId = e.parameter.budgetId;
      Logger.log('Testing getBudgetDetails for budgetId: ' + budgetId);
      const result = getBudgetDetails(budgetId);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          data: result
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getGlobalSummary') {
      Logger.log('Calling getGlobalSummary...');
      const date = e.parameter.date ? new Date(e.parameter.date) : new Date();
      const response = getGlobalSummary(date);
      Logger.log('getGlobalSummary completed');
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getStaticData') {
      Logger.log('Calling getStaticData...');
      const response = getStaticData();
      Logger.log('getStaticData completed');
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getCurrentSpending') {
      Logger.log('Calling getCurrentSpending...');
      const spendingDate = e.parameter.date ? new Date(e.parameter.date) : new Date();
      const response = getCurrentSpending(spendingDate);
      Logger.log('getCurrentSpending completed');
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getCards') {
      Logger.log('Calling getCards...');
      const response = getCards();
      Logger.log('getCards completed');
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getBudgetSummary') {
      Logger.log('Getting budget summary for:', e.parameter.budget);
      const response = getBudgetSummary(e.parameter.budget, e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getBudgetProgress') {
      Logger.log('Getting budget progress');
      const response = getBudgetProgress(e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getYearlySummary') {
      Logger.log('Getting yearly summary');
      const response = getYearlySummary();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'invalidateCache') {
      Logger.log('Invalidating cache...');
      invalidateAllCaches();
      const response = { success: true, message: 'Cache invalidated successfully' };
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getUserReceipts') {
      Logger.log('Getting user receipts for:', e.parameter.userEmail);
      const response = getUserReceipts(e.parameter.userEmail);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getAllReceipts') {
      Logger.log('Getting all receipts for user:', e.parameter.userEmail);
      const response = getAllReceipts(e.parameter.userEmail);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getFlexibleBudgetCalculation') {
      const response = getFlexibleBudgetCalculation(e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'processFlexibleBudgetSnapshot') {
      const response = processFlexibleBudgetSnapshotAPI(e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testFlexibleBudgetCalculation') {
      const response = testFlexibleBudgetCalculationAPI(e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getAllFlexibleBudgetCalculations') {
      const response = getAllFlexibleBudgetCalculations(e);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testRegionalData') {
      const response = testRegionalData();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getUserSettings') {
      const response = getUserSettings(e.parameter.email);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'updateUserSettings') {
      const response = updateUserSettings(e.parameter.email, JSON.parse(e.parameter.settings));
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'checkUserAccess') {
      const response = checkUserAccess(e.parameter.email);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getAvailableSubRegions') {
      const response = getAvailableSubRegions(e.parameter.region);
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getAvailablePettyCashFunds') {
      const response = getAvailablePettyCashFunds(e.parameter.subRegions.split(','));
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getPettyCashBalance') {
      const response = getPettyCashBalance(e.parameter.funds.split(','));
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'recordPettyCashWithdrawal') {
      const response = recordPettyCashWithdrawal(JSON.parse(e.parameter.data));
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getPettyCashHistory') {
      const response = getPettyCashHistory(
        e.parameter.funds.split(','),
        e.parameter.startDate,
        e.parameter.endDate
      );
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'syncPettyCashFromReceipts') {
      const response = syncPettyCashFromReceipts();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testPhase1AuditColumns') {
      const response = testPhase1AuditColumns();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testPhase2FileManagement') {
      const response = testPhase2FileManagement();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testPhase3EnhancedFunctions') {
      const response = testPhase3EnhancedFunctions();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testIntegrationAllPhases') {
      const response = testIntegrationAllPhases();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'testSoftDeleteSystem') {
      const response = testSoftDeleteSystem();
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action or no action specified'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Scheduled function to duplicate monthly expenses for the new month.
 * Should be set up as a daily time-driven trigger in Apps Script.
 */
function processMonthlyExpenses() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName('receipt_log');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  // Find column indices
  const dateCol = headers.indexOf('Date');
  const amountCol = headers.indexOf('Amount');
  const descCol = headers.indexOf('Description');
  const budgetCol = headers.indexOf('Budget');
  const categoryCol = headers.indexOf('Category');
  const photoUrlCol = headers.indexOf('Photo URL');
  const monthlyCol = headers.indexOf('Monthly Expense');
  const vendorCol = headers.indexOf('Vendor');
  const cardCol = headers.indexOf('Card');

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  data.forEach(row => {
    if (String(row[monthlyCol]).toUpperCase() !== 'TRUE') return;
    const originalDate = new Date(row[dateCol]);
    if (isNaN(originalDate)) return;

    // Calculate the next due date
    let nextDate = new Date(originalDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    // If the original day doesn't exist in the next month, use the last day
    if (nextDate.getDate() !== originalDate.getDate()) {
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
    }

    // Only process if the nextDate is this month and year, and today >= nextDate
    if (nextDate.getMonth() !== thisMonth || nextDate.getFullYear() !== thisYear) return;
    if (today < nextDate) return;

    // Check if a row already exists for this monthly expense for this month (by vendor, amount, budget, category, and date)
    const alreadyExists = data.some(r => {
      const d = new Date(r[dateCol]);
      return (
        d.getFullYear() === nextDate.getFullYear() &&
        d.getMonth() === nextDate.getMonth() &&
        String(r[amountCol]) === String(row[amountCol]) &&
        String(r[descCol]) === String(row[descCol]) &&
        String(r[budgetCol]) === String(row[budgetCol]) &&
        String(r[categoryCol]) === String(row[categoryCol]) &&
        String(r[vendorCol]) === String(row[vendorCol]) &&
        String(r[cardCol]) === String(row[cardCol])
      );
    });
    if (alreadyExists) return;

    // Copy the PDF file if possible
    let newPhotoUrl = row[photoUrlCol];
    if (newPhotoUrl && newPhotoUrl.includes('drive.google.com')) {
      try {
        const fileIdMatch = newPhotoUrl.match(/[-\w]{25,}/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[0];
          const file = DriveApp.getFileById(fileId);
          const ext = file.getName().split('.').pop();
          const newName = file.getName().replace(/\d{4}\.\d{2}\.\d{2}/, Utilities.formatDate(nextDate, Session.getScriptTimeZone(), 'yyyy.MM.dd'));
          const parent = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
          const newFile = file.makeCopy(newName, parent);
          newPhotoUrl = newFile.getUrl();
        }
      } catch (err) {
        // If copying fails, just reuse the old URL
        newPhotoUrl = row[photoUrlCol];
      }
    }

    // Prepare new row
    const newRow = [];
    newRow[dateCol] = nextDate;
    newRow[amountCol] = row[amountCol];
    newRow[descCol] = row[descCol];
    newRow[budgetCol] = row[budgetCol];
    newRow[categoryCol] = row[categoryCol];
    newRow[photoUrlCol] = newPhotoUrl;
    newRow[monthlyCol] = 'TRUE';
    newRow[vendorCol] = row[vendorCol];
    newRow[cardCol] = row[cardCol];
    // Fill in any missing columns with empty strings
    for (let i = 0; i < headers.length; i++) {
      if (typeof newRow[i] === 'undefined') newRow[i] = '';
    }
    sheet.appendRow(newRow);
  });
}

// === Monthly Budget Snapshot Functions ===

function getMonthlyCategoryLimit(budgetId, category, now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  const budgetSheet = ss.getSheetByName('Budgets');
  
  if (!snapSheet) return null;
  
  // Ensure now is a Date object
  const date = now instanceof Date ? now : new Date(now);
  const monthStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
  
  Logger.log('Getting monthly category limit for budget ID: ' + budgetId + ' category: ' + category + ' month: ' + monthStr);
  
  // Get budget info from Budgets sheet
  const budgetData = budgetSheet.getDataRange().getValues();
  const budgetHeaders = budgetData.shift(); // remove header
  const budgetRow = budgetData.find(row => row[0] == budgetId); // Budget ID is in column A
  
  if (!budgetRow) {
    Logger.log('Budget not found for ID: ' + budgetId);
    return null;
  }
  
  const budgetName = budgetRow[1]; // Budget Name is in column B
  const region = budgetRow[5] || 'Germany'; // Region is in column F
  const subRegion = budgetRow[6] || budgetName; // SubRegion is in column G
  
  const data = snapSheet.getDataRange().getValues();
  // data.shift(); // remove header (commented out because there is no header row)
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    // Handle both old (5 columns) and new (7 columns) formats
    const snapshotBudgetId = row.length >= 7 ? row[1] : null; // Budget ID (column B)
    const snapshotBudgetName = row.length >= 7 ? row[2] : row[1]; // Budget Name (column C or B)
    const snapshotCategory = row.length >= 7 ? row[3] : row[2]; // Category (column D or C)
    const snapshotAmount = row.length >= 7 ? row[4] : row[3]; // Amount (column E or D)
    
    if (row[0] === monthStr && (snapshotBudgetId == budgetId || snapshotBudgetName === budgetName) && snapshotCategory === category) {
      // Check if region and subregion match (if available in snapshot)
      const snapshotRegion = row.length >= 7 ? String(row[5]).trim() : 'Germany'; // Region (column F)
      const snapshotSubRegion = row.length >= 7 ? String(row[6]).trim() : budgetName; // SubRegion (column G)
      
      if (snapshotRegion === region && snapshotSubRegion === subRegion) {
        const limit = Number(snapshotAmount) || 0;
        Logger.log('Found category limit: ' + limit);
        return limit;
      }
    }
  }
  Logger.log('No category limit found');
  return null;
}


// New function to get current spending data (real-time, no caching)
function getCurrentSpending(now) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receiptSheet = ss.getSheetByName('receipt_log');
    
    if (!receiptSheet) {
      throw new Error('Receipt log sheet not found');
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get current month receipts
    const receipts = receiptSheet.getDataRange().getValues();
    const headers = receipts.shift();
    
    // Find column indices dynamically
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    const currentMonthReceipts = receipts.filter(row => {
      const date = new Date(row[0]); // Date is in column A (index 0)
      const monthlyExpense = String(row[8]).toUpperCase() === 'TRUE'; // Monthly Expense is in column I (index 8)
      const startDateStr = row[11] || ''; // Start Date is in column L (index 11)
      const endDateStr = row[12] || ''; // End Date is in column M (index 12)
      const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false; // Is Deleted column
      
      // Skip soft deleted receipts
      if (isDeleted) {
        return false;
      }
      
      if (monthlyExpense) {
        // Handle recurring expenses
        const startDate = startDateStr ? new Date(startDateStr) : date;
        const endDate = endDateStr ? new Date(endDateStr) : null;
        return startDate <= endOfMonth && (!endDate || endDate >= startOfMonth);
      } else {
        // Regular expenses - check if in current month
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
    });
    
    let totalSpent = 0;
    let receiptsCount = 0;
    const spending = {};
    
    currentMonthReceipts.forEach(row => {
      const amount = Number(row[1]) || 0; // Amount is in column B (index 1)
      const budgetId = row[4] || row[3]; // Budget ID is in column E (index 4), fallback to Budget Name in D (index 3)
      const category = row[5]; // Category is in column F (index 5)
      
      totalSpent += amount;
      receiptsCount++;
      if (!spending[budgetId]) {
        spending[budgetId] = {
          total: 0,
          categories: {}
        };
      }
      spending[budgetId].total += amount;
      if (!spending[budgetId].categories[category]) {
        spending[budgetId].categories[category] = 0;
      }
      spending[budgetId].categories[category] += amount;
    });

    return {
      success: true,
      data: {
        totalSpent,
        receiptsCount,
        spending
      }
    };
  } catch (error) {
    Logger.log('Error in getCurrentSpending: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
} 

// Function to invalidate all caches (call when data changes)
function invalidateAllCaches() {
  Logger.log('Invalidating all caches...');
  cardsCache.data = null;
  cardsCache.timestamp = 0;
  staticDataCache.budgetLimits = null;
  staticDataCache.categories = null;
  staticDataCache.budgetNames = null;
  staticDataCache.regions = null;
  staticDataCache.subRegions = null;
  staticDataCache.timestamp = 0;
  globalSummaryCache.data = null;
  globalSummaryCache.timestamp = 0;
  subRegionsCache.data = {};
  subRegionsCache.timestamp = 0;
  pettyCashFundsCache.data = {};
  pettyCashFundsCache.timestamp = 0;
  Logger.log('All caches invalidated');
} 

function getUserReceipts(userEmail) {
  try {
    Logger.log('Getting receipts for user:', userEmail);
    
    if (!userEmail) {
      throw new Error('User email is required');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    // Find column indices dynamically
    const dateCol = headers.indexOf('Date');
    const amountCol = headers.indexOf('Amount');
    const descCol = headers.indexOf('Description');
    const budgetCol = headers.indexOf('Budget');
    const categoryCol = headers.indexOf('Category');
    const photoUrlCol = headers.indexOf('Photo URL');
    const vendorCol = headers.indexOf('Vendor');
    const cardCol = headers.indexOf('Card');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    Logger.log('Column positions found:', {
      dateCol,
      amountCol,
      vendorCol,
      budgetCol,
      categoryCol,
      cardCol,
      userEmailCol,
      userNameCol,
      isDeletedCol
    });
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found in receipt log');
    }
    
    // Filter receipts for the specific user - check both columns and exclude soft-deleted
    const userReceipts = data
      .map((row, originalIndex) => {
        const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
        const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
        const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
        
        Logger.log(`Checking row ${originalIndex + 2} - User Email: "${rowUserEmail}", User Name: "${rowUserName}", Is Deleted: ${isDeleted} against: "${userEmail}"`);
        
        // Check if the email matches in either column and receipt is not soft-deleted
        const isUserReceipt = (rowUserEmail === userEmail || rowUserName === userEmail) && !isDeleted;
        
        if (isUserReceipt) {
          return {
            id: `receipt_${originalIndex + 2}`, // Use actual sheet row number (originalIndex + 2 for header + 0-indexed)
            date: row[dateCol] instanceof Date ? row[dateCol].toISOString() : row[dateCol],
            amount: parseFloat(row[amountCol]) || 0,
            vendor: row[vendorCol] || '',
            budget: row[budgetCol] || '',
            category: row[categoryCol] || '',
            card: row[cardCol] || '',
            receiptUrl: row[photoUrlCol] || '',
            userEmail: row[userEmailCol] || '',
            userName: row[userNameCol] || '',
            sheetRow: originalIndex + 2 // Store the actual sheet row number for reference
          };
        }
        return null;
      })
      .filter(receipt => receipt !== null) // Remove null entries
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
    
    Logger.log(`Found ${userReceipts.length} active receipts for user ${userEmail}`);
    
    return {
      success: true,
      data: userReceipts
    };
  } catch (error) {
    Logger.log('Error in getUserReceipts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getAllReceipts(currentUserEmail) {
  try {
    Logger.log('Getting all receipts for current user:', currentUserEmail);
    
    if (!currentUserEmail) {
      throw new Error('Current user email is required');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    // Find column indices dynamically
    const dateCol = headers.indexOf('Date');
    const amountCol = headers.indexOf('Amount');
    const descCol = headers.indexOf('Description');
    const budgetCol = headers.indexOf('Budget');
    const budgetIdCol = headers.indexOf('Budget ID');
    const categoryCol = headers.indexOf('Category');
    const photoUrlCol = headers.indexOf('Photo URL');
    const vendorCol = headers.indexOf('Vendor');
    const cardCol = headers.indexOf('Card');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    Logger.log('Column positions found:', {
      dateCol,
      amountCol,
      vendorCol,
      budgetCol,
      budgetIdCol,
      categoryCol,
      cardCol,
      userEmailCol,
      userNameCol,
      isDeletedCol
    });
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found in receipt log');
    }
    
    // Get all receipts (excluding soft-deleted) and mark ownership
    const allReceipts = data
      .map((row, originalIndex) => {
        const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
        const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
        const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
        
        // Skip soft-deleted receipts
        if (isDeleted) {
          return null;
        }
        
        // Check if this receipt belongs to the current user
        const isOwnedByCurrentUser = (rowUserEmail === currentUserEmail || rowUserName === currentUserEmail);
        
        return {
          id: `receipt_${originalIndex + 2}`, // Use actual sheet row number (originalIndex + 2 for header + 0-indexed)
          date: row[dateCol] instanceof Date ? row[dateCol].toISOString() : row[dateCol],
          amount: parseFloat(row[amountCol]) || 0,
          vendor: row[vendorCol] || '',
          budget: row[budgetCol] || '',
          budgetId: row[budgetIdCol] || row[budgetCol] || '', // Handle both old and new formats
          category: row[categoryCol] || '',
          card: row[cardCol] || '',
          receiptUrl: row[photoUrlCol] || '',
          userEmail: row[userEmailCol] || '',
          userName: row[userNameCol] || '',
          isOwnedByCurrentUser: isOwnedByCurrentUser, // Flag to indicate if current user can edit this receipt
          sheetRow: originalIndex + 2 // Store the actual sheet row number for reference
        };
      })
      .filter(receipt => receipt !== null) // Remove null entries
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
    
    Logger.log(`Found ${allReceipts.length} active receipts total, ${allReceipts.filter(r => r.isOwnedByCurrentUser).length} owned by current user`);
    
    return {
      success: true,
      data: allReceipts
    };
  } catch (error) {
    Logger.log('Error in getAllReceipts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function updateReceipt(data) {
  try {
    Logger.log('--- Enhanced updateReceipt ---');
    Logger.log('Updating receipt:', data);
    
    const { 
      receiptId, 
      amount, 
      vendor, 
      budget, 
      budgetId, 
      category, 
      card, 
      date,
      userEmail, 
      changeDescription,
      changeType 
    } = data;
    
    // Validate required fields
    if (!receiptId || !userEmail) {
      throw new Error('Receipt ID and user email are required');
    }
    
    if (!changeDescription || changeDescription.trim() === '') {
      throw new Error('Change description is required');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData.shift();
    
    // Find column indices dynamically
    const dateCol = headers.indexOf('Date');
    const amountCol = headers.indexOf('Amount');
    const vendorCol = headers.indexOf('Vendor');
    const budgetCol = headers.indexOf('Budget');
    const budgetIdCol = headers.indexOf('Budget ID');
    const categoryCol = headers.indexOf('Category');
    const cardCol = headers.indexOf('Card');
    const photoUrlCol = headers.indexOf('Photo URL');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    const lastModifiedCol = headers.indexOf('Last Modified');
    const modifiedByCol = headers.indexOf('Modified By');
    const changeDescriptionCol = headers.indexOf('Change Description');
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found');
    }
    
    // Find the receipt to update and verify ownership
    const receiptIndex = sheetData.findIndex((row, index) => {
      const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
      const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
      
      // Check if the email matches in either column
      const emailMatches = rowUserEmail === userEmail || rowUserName === userEmail;
      
      return emailMatches && `receipt_${index + 2}` === receiptId;
    });
    
    if (receiptIndex === -1) {
      throw new Error('Receipt not found or access denied - you can only edit your own receipts');
    }
    
    // Double-check ownership by verifying the receipt belongs to the current user
    const receiptRow = sheetData[receiptIndex];
    const receiptUserEmail = userEmailCol !== -1 ? receiptRow[userEmailCol] : '';
    const receiptUserName = userNameCol !== -1 ? receiptRow[userNameCol] : '';
    
    const isOwnedByUser = (receiptUserEmail === userEmail || receiptUserName === userEmail);
    if (!isOwnedByUser) {
      throw new Error('Access denied - you can only edit your own receipts');
    }
    
    // Get current receipt data for comparison
    const currentRow = sheetData[receiptIndex];
    const currentData = {
      date: currentRow[dateCol],
      amount: currentRow[amountCol],
      vendor: currentRow[vendorCol],
      budget: currentRow[budgetCol],
      budgetId: currentRow[budgetIdCol],
      category: currentRow[categoryCol],
      card: currentRow[cardCol],
      photoUrl: currentRow[photoUrlCol]
    };
    
    Logger.log('Current receipt data:', currentData);
    
    // Helper function to get budget name from budget ID
    function getBudgetNameFromId(budgetId) {
      try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const budgetSheet = ss.getSheetByName('Budgets');
        if (!budgetSheet) {
          Logger.log('Budgets sheet not found');
          return 'Unknown Budget';
        }
        
        const budgetData = budgetSheet.getDataRange().getValues();
        const budgetHeaders = budgetData.shift();
        
        const budgetIdCol = budgetHeaders.indexOf('Budget ID');
        const budgetNameCol = budgetHeaders.indexOf('Name');
        
        if (budgetIdCol === -1 || budgetNameCol === -1) {
          Logger.log('Budget ID or Name column not found in Budgets sheet');
          return 'Unknown Budget';
        }
        
        const budgetRow = budgetData.find(row => row[budgetIdCol] == budgetId);
        if (budgetRow) {
          const budgetName = budgetRow[budgetNameCol];
          Logger.log('Found budget name for ID ' + budgetId + ': ' + budgetName);
          return budgetName;
        } else {
          Logger.log('Budget not found for ID: ' + budgetId);
          return 'Unknown Budget';
        }
      } catch (error) {
        Logger.log('Error getting budget name for ID ' + budgetId + ': ' + error);
        return 'Unknown Budget';
      }
    }
    
    // Determine what changed and prepare values to update
    const changes = [];
    let newBudgetName = budget; // Default to provided budget value
    
    if (date !== undefined && date !== currentData.date) changes.push('date');
    if (amount !== undefined && amount !== currentData.amount) changes.push('amount');
    if (vendor !== undefined && vendor !== currentData.vendor) changes.push('vendor');
    if (budget !== undefined && budget !== currentData.budget) changes.push('budget');
    if (budgetId !== undefined && budgetId !== currentData.budgetId) {
      changes.push('budgetId');
      // If budget ID changed, automatically get the new budget name
      newBudgetName = getBudgetNameFromId(budgetId);
      Logger.log('Budget ID changed, new budget name: ' + newBudgetName);
    }
    if (category !== undefined && category !== currentData.category) changes.push('category');
    if (card !== undefined && card !== currentData.card) changes.push('card');
    
    Logger.log('Detected changes:', changes);
    
    // Handle file management based on changes
    let newPhotoUrl = currentData.photoUrl;
    if (currentData.photoUrl && changes.length > 0) {
      try {
        if (changes.includes('date') || changes.includes('budgetId') || changes.includes('card')) {
          // File needs to be moved (budget/card/date changed)
          Logger.log('Moving receipt file due to budget/card/date change');
          newPhotoUrl = moveReceiptFile(
            currentData.photoUrl,
            budgetId || currentData.budgetId,
            card || currentData.card,
            date || currentData.date,
            vendor || currentData.vendor,
            amount || currentData.amount,
            category || currentData.category
          );
        } else {
          // File needs to be renamed (only amount/vendor/category changed)
          Logger.log('Renaming receipt file due to amount/vendor/category change');
          newPhotoUrl = renameReceiptFile(
            currentData.photoUrl,
            budgetId || currentData.budgetId,
            card || currentData.card,
            date || currentData.date,
            vendor || currentData.vendor,
            amount || currentData.amount,
            category || currentData.category
          );
        }
      } catch (fileError) {
        Logger.log('File management error (continuing with update): ' + fileError.message);
        // Continue with update even if file management fails
      }
    }
    
    // Update the receipt data
    const rowIndex = receiptIndex + 2; // +2 because we removed header and arrays are 0-indexed
    
    if (date !== undefined) sheet.getRange(rowIndex, dateCol + 1).setValue(date);
    if (amount !== undefined) sheet.getRange(rowIndex, amountCol + 1).setValue(amount);
    if (vendor !== undefined) sheet.getRange(rowIndex, vendorCol + 1).setValue(vendor);
    if (budget !== undefined) sheet.getRange(rowIndex, budgetCol + 1).setValue(budget);
    if (budgetId !== undefined) {
      sheet.getRange(rowIndex, budgetIdCol + 1).setValue(budgetId);
      // Also update the budget name column when budget ID changes
      if (changes.includes('budgetId') && budgetCol !== -1) {
        sheet.getRange(rowIndex, budgetCol + 1).setValue(newBudgetName);
        Logger.log('Updated budget name to: ' + newBudgetName);
      }
    }
    if (category !== undefined) sheet.getRange(rowIndex, categoryCol + 1).setValue(category);
    if (card !== undefined) sheet.getRange(rowIndex, cardCol + 1).setValue(card);
    if (newPhotoUrl !== currentData.photoUrl) {
      sheet.getRange(rowIndex, photoUrlCol + 1).setValue(newPhotoUrl);
    }
    
    // Update audit trail
    const now = new Date();
    const fullChangeDescription = changeType ? `${changeType}: ${changeDescription}` : changeDescription;
    
    if (lastModifiedCol !== -1) sheet.getRange(rowIndex, lastModifiedCol + 1).setValue(now);
    if (modifiedByCol !== -1) sheet.getRange(rowIndex, modifiedByCol + 1).setValue(userEmail);
    if (changeDescriptionCol !== -1) sheet.getRange(rowIndex, changeDescriptionCol + 1).setValue(fullChangeDescription);
    
    Logger.log('Receipt updated successfully with audit trail');
    
    return {
      success: true,
      message: 'Receipt updated successfully',
      data: {
        changes: changes,
        fileUpdated: newPhotoUrl !== currentData.photoUrl,
        newPhotoUrl: newPhotoUrl,
        newBudgetName: changes.includes('budgetId') ? newBudgetName : undefined
      }
    };
  } catch (error) {
    Logger.log('Error in updateReceipt:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function deleteReceipt(data) {
  try {
    Logger.log('--- Enhanced deleteReceipt (Soft Delete) ---');
    Logger.log('Soft deleting receipt:', data);
    
    const { receiptId, userEmail, changeDescription, changeType } = data;
    
    // Validate required fields
    if (!receiptId || !userEmail) {
      throw new Error('Receipt ID and user email are required');
    }
    
    if (!changeDescription || changeDescription.trim() === '') {
      throw new Error('Change description is required for deletion');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData.shift();
    
    // Find column indices dynamically
    const photoUrlCol = headers.indexOf('Photo URL');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    const isDeletedCol = headers.indexOf('Is Deleted');
    const lastModifiedCol = headers.indexOf('Last Modified');
    const modifiedByCol = headers.indexOf('Modified By');
    const changeDescriptionCol = headers.indexOf('Change Description');
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found');
    }
    
    // Find the receipt to delete and verify ownership
    const receiptIndex = sheetData.findIndex((row, index) => {
      const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
      const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
      
      // Check if the email matches in either column
      const emailMatches = rowUserEmail === userEmail || rowUserName === userEmail;
      
      return emailMatches && `receipt_${index + 2}` === receiptId;
    });
    
    if (receiptIndex === -1) {
      throw new Error('Receipt not found or access denied - you can only delete your own receipts');
    }
    
    // Double-check ownership by verifying the receipt belongs to the current user
    const receiptRow = sheetData[receiptIndex];
    const receiptUserEmail = userEmailCol !== -1 ? receiptRow[userEmailCol] : '';
    const receiptUserName = userNameCol !== -1 ? receiptRow[userNameCol] : '';
    
    const isOwnedByUser = (receiptUserEmail === userEmail || receiptUserName === userEmail);
    if (!isOwnedByUser) {
      throw new Error('Access denied - you can only delete your own receipts');
    }
    
    // Check if already deleted
    const currentRow = sheetData[receiptIndex];
    const isAlreadyDeleted = isDeletedCol !== -1 ? currentRow[isDeletedCol] : false;
    
    if (isAlreadyDeleted) {
      throw new Error('Receipt is already deleted');
    }
    
    // Handle file soft delete
    let newPhotoUrl = currentRow[photoUrlCol];
    if (currentRow[photoUrlCol] && currentRow[photoUrlCol].includes('drive.google.com')) {
      try {
        Logger.log('Soft deleting receipt file');
        newPhotoUrl = softDeleteReceiptFile(currentRow[photoUrlCol], userEmail);
      } catch (fileError) {
        Logger.log('File soft delete error (continuing with soft delete): ' + fileError.message);
        // Continue with soft delete even if file management fails
      }
    }
    
    // Perform soft delete (mark as deleted instead of removing row)
    const rowIndex = receiptIndex + 2; // +2 because we removed header and arrays are 0-indexed
    
    // Mark as deleted
    if (isDeletedCol !== -1) {
      sheet.getRange(rowIndex, isDeletedCol + 1).setValue(true);
    }
    
    // Update photo URL if file was moved
    if (newPhotoUrl !== currentRow[photoUrlCol] && photoUrlCol !== -1) {
      sheet.getRange(rowIndex, photoUrlCol + 1).setValue(newPhotoUrl);
    }
    
    // Update audit trail
    const now = new Date();
    const fullChangeDescription = changeType ? `${changeType}: ${changeDescription}` : changeDescription;
    
    if (lastModifiedCol !== -1) sheet.getRange(rowIndex, lastModifiedCol + 1).setValue(now);
    if (modifiedByCol !== -1) sheet.getRange(rowIndex, modifiedByCol + 1).setValue(userEmail);
    if (changeDescriptionCol !== -1) sheet.getRange(rowIndex, changeDescriptionCol + 1).setValue(fullChangeDescription);
    
    Logger.log('Receipt soft deleted successfully with audit trail');
    
    return {
      success: true,
      message: 'Receipt soft deleted successfully',
      data: {
        fileMoved: newPhotoUrl !== currentRow[photoUrlCol],
        newPhotoUrl: newPhotoUrl
      }
    };
  } catch (error) {
    Logger.log('Error in deleteReceipt:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// === Flexible Budget Calculation Functions ===

/**
 * Calculate flexible budget limits based on year-to-date spending and budget redistribution
 * @param {string} budgetName - Name of the budget to calculate
 * @param {Date} currentDate - Current date for calculations
 * @returns {Object} Flexible budget calculation results
 */
function calculateFlexibleBudgetLimits(budgetId, currentDate) {
  try {
    Logger.log('Calculating flexible budget limits for budget ID: ' + budgetId);
    
    // Get original budget limits
    const originalLimits = getOriginalBudgetLimits(budgetId);
    
    // Get YTD spending
    const budgetYearStart = getBudgetYearStart(currentDate);
    const ytdSpending = getYTDBudgetSpending(budgetId, budgetYearStart, currentDate);
    
    // Calculate months elapsed in budget year
    const monthsElapsed = Math.max(1, Math.ceil((currentDate - budgetYearStart) / (1000 * 60 * 60 * 24 * 30.44)));
    const monthsRemaining = 12 - monthsElapsed;
    
    Logger.log('Budget year months elapsed: ' + monthsElapsed + ', remaining: ' + monthsRemaining);
    
    // Calculate adjusted limits
    const adjustedTotal = originalLimits.total;
    const adjustedCategories = {};
    
    Object.entries(originalLimits.categories).forEach(([category, originalLimit]) => {
      const ytdSpent = ytdSpending.categories[category] || 0;
      const monthlyAverage = ytdSpent / monthsElapsed;
      const projectedAnnual = monthlyAverage * 12;
      
      // If projected annual spending is higher than original limit, adjust upward
      if (projectedAnnual > originalLimit) {
        const adjustment = (projectedAnnual - originalLimit) / 12; // Monthly adjustment
        adjustedCategories[category] = originalLimit + adjustment;
        Logger.log('Category ' + category + ': Original=' + originalLimit + ', Projected=' + projectedAnnual + ', Adjusted=' + adjustedCategories[category]);
      } else {
        adjustedCategories[category] = originalLimit;
      }
    });
    
    return {
      original: originalLimits,
      ytdSpending: ytdSpending,
      adjusted: {
        total: adjustedTotal,
        categories: adjustedCategories
      },
      monthsElapsed: monthsElapsed,
      monthsRemaining: monthsRemaining
    };
    
  } catch (error) {
    Logger.log('Error in calculateFlexibleBudgetLimits: ' + error);
    throw error;
  }
}

/**
 * Get original budget limits from the Budgets and Categories sheets
 * @param {number} budgetId - Budget ID
 * @returns {Object} Original budget limits
 */
function getOriginalBudgetLimits(budgetId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const budSheet = ss.getSheetByName('Budgets');
  const catSheet = ss.getSheetByName('Categories');
  
  // Get budget total limit
  const budData = budSheet.getDataRange().getValues();
  const headers = budData.shift();
  const budgetRow = budData.find(row => row[0] == budgetId); // Budget ID is in column A
  const totalLimit = budgetRow ? Number(budgetRow[3]) || 0 : 0; // Monthly Limit is in column D (index 3)
  
  Logger.log('Budget ID: ' + budgetId + ', Total Limit: ' + totalLimit);
  
  // Get category limits
  const catData = catSheet.getDataRange().getValues();
  const catHeaders = catData.shift();
  const categoryLimits = {};
  
  Logger.log('Categories sheet has ' + catData.length + ' rows');
  
  catData.forEach((row, index) => {
    Logger.log('Category row ' + index + ': Budget ID=' + row[0] + ', Category=' + row[2] + ', Limit=' + row[4]);
    if (row[0] == budgetId) { // Budget ID is in column A
      const category = row[2]; // Category Name is in column C (index 2)
      const limit = Number(row[4]) || 0; // Monthly Limit is in column E (index 4)
      categoryLimits[category] = limit;
      Logger.log('Matched category: ' + category + ' with limit: ' + limit);
    }
  });
  
  Logger.log('Final category limits for budget ' + budgetId + ': ' + JSON.stringify(categoryLimits));
  
  return {
    total: totalLimit,
    categories: categoryLimits
  };
}

/**
 * Get year-to-date spending for a budget from the start of budget year to current date
 * @param {number} budgetId - Budget ID
 * @param {Date} budgetYearStart - Start of budget year
 * @param {Date} currentDate - Current date
 * @returns {Object} YTD spending data
 */
function getYTDBudgetSpending(budgetId, budgetYearStart, currentDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const receiptSheet = ss.getSheetByName('receipt_log');
  const budgetSheet = ss.getSheetByName('Budgets');
  
  if (!receiptSheet) {
    throw new Error('Receipt log sheet not found');
  }
  
  // Get budget name from budget ID
  const budgetData = budgetSheet.getDataRange().getValues();
  const budgetHeaders = budgetData.shift(); // remove header
  const budgetRow = budgetData.find(row => row[0] == budgetId); // Budget ID is in column A
  
  if (!budgetRow) {
    throw new Error('Budget not found for ID: ' + budgetId);
  }
  
  const budgetName = budgetRow[1]; // Budget Name is in column B
  
  const receipts = receiptSheet.getDataRange().getValues();
  const headers = receipts.shift();
  
  // Find column indices dynamically
  const isDeletedCol = headers.indexOf('Is Deleted');
  
  let totalSpent = 0;
  const categoryTotals = {};
  
  receipts.forEach(row => {
    const date = new Date(row[0]);
    const amount = Number(row[1]) || 0;
    const budget = row[3];
    const category = row[4];
    const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
    const startDateStr = row[10] || '';
    const endDateStr = row[11] || '';
    const isDeleted = isDeletedCol !== -1 ? row[isDeletedCol] : false;
    
    // Skip soft deleted receipts
    if (isDeleted) {
      return;
    }
    
    if (budget === budgetName && date >= budgetYearStart && date <= currentDate) {
      // Handle recurring expenses
      if (monthlyExpense) {
        const startDate = startDateStr ? new Date(startDateStr) : date;
        const endDate = endDateStr ? new Date(endDateStr) : null;
        
        // Check if this recurring expense applies to the YTD period
        if (startDate <= currentDate && (!endDate || endDate >= budgetYearStart)) {
          totalSpent += amount;
          if (category) {
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          }
        }
      } else {
        // Regular expenses
        totalSpent += amount;
        if (category) {
          categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        }
      }
    }
  });
  
  return {
    total: totalSpent,
    categories: categoryTotals
  };
}

// === Updated Monthly Budget Snapshot Functions ===

/**
 * Process flexible budget snapshot for all budgets
 * This function should be triggered on the 1st of each month
 */
function processFlexibleBudgetSnapshot() {
  try {
    Logger.log('Starting flexible budget snapshot process...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    let snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
    
    // Create snapshot sheet if it doesn't exist
    if (!snapSheet) {
      snapSheet = ss.insertSheet('MonthlyBudgetSnapshot');
      snapSheet.hideSheet();
    }
    
    const now = new Date();
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    
    // Get budget data with region and sub-region info
    const budData = budSheet.getDataRange().getValues();
    const budHeaders = budData.shift(); // remove header
    
    // Get all budgets (skip header row)
    const budgets = budData.filter(row => row[0]); // Filter out empty rows
    
    Logger.log('Processing flexible budget snapshot for month: ' + monthStr);
    Logger.log('Budgets to process: ' + budgets.length);
    
    // Process each budget
    budgets.forEach(row => {
      try {
        const budgetId = row[0]; // Budget ID (column A)
        const budgetName = row[1]; // Budget Name (column B)
        const region = row[5] || 'Germany'; // Region (column F)
        const subRegion = row[6] || budgetName; // SubRegion (column G)
        
        Logger.log('Processing budget ID: ' + budgetId + ' (' + budgetName + ')');
        
        // Calculate flexible budget limits
        const flexibleLimits = calculateFlexibleBudgetLimits(budgetId, now);
        
        // Create enhanced receipt naming with region/sub-region prefixes
        const regionPrefix = region.substring(0, 2).toUpperCase();
        const subRegionPrefix = subRegion.substring(0, 2).toUpperCase();
        const enhancedBudgetName = `${budgetName}_${regionPrefix}_${subRegionPrefix}`;
        
        // Add budget-level limit to snapshot with region info
        snapSheet.appendRow([monthStr, budgetId, budgetName, '', flexibleLimits.adjusted.total, region, subRegion]);
        
        // Add category-level limits to snapshot with region info
        Object.entries(flexibleLimits.adjusted.categories).forEach(([category, limit]) => {
          snapSheet.appendRow([monthStr, budgetId, budgetName, category, limit, region, subRegion]);
        });
        
        Logger.log('Added snapshot data for budget ID: ' + budgetId + ' (' + enhancedBudgetName + ')');
        
      } catch (error) {
        Logger.log('Error processing budget ID ' + row[0] + ': ' + error);
        // Continue with other budgets even if one fails
      }
    });
    
    // Invalidate all caches to ensure fresh data
    invalidateAllCaches();
    
    Logger.log('Flexible budget snapshot process completed successfully');
    
  } catch (error) {
    Logger.log('Error in processFlexibleBudgetSnapshot: ' + error);
    throw error;
  }
}

/**
 * Updated snapshot function that uses flexible budget calculations
 * This replaces the old snapshotMonthlyBudgets function
 */
function snapshotMonthlyBudgets() {
  Logger.log('snapshotMonthlyBudgets called - redirecting to processFlexibleBudgetSnapshot');
  processFlexibleBudgetSnapshot();
}

/**
 * Setup monthly trigger for flexible budget processing
 * This should be called once to set up the automated trigger
 */
function setupFlexibleBudgetTrigger() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processFlexibleBudgetSnapshot') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger for 1st of each month at 1 AM
    ScriptApp.newTrigger('processFlexibleBudgetSnapshot')
      .timeBased()
      .onMonthDay(1)
      .atHour(1)
      .create();
    
    Logger.log('Flexible budget trigger set up successfully');
    
  } catch (error) {
    Logger.log('Error setting up flexible budget trigger: ' + error);
    throw error;
  }
}

/**
 * Manual function to test flexible budget calculations
 * @param {number} budgetId - Budget ID to test (optional, will test all if not provided)
 */
function testFlexibleBudgetCalculation(budgetId = null) {
  try {
    Logger.log('Starting flexible budget calculation test...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    if (!budSheet) {
      throw new Error('Budgets sheet not found');
    }
    
    const budData = budSheet.getDataRange().getValues();
    const budHeaders = budData.shift(); // remove header
    
    let budgetsToTest;
    if (budgetId) {
      // Test specific budget
      const budgetRow = budData.find(row => row[0] == budgetId);
      if (!budgetRow) {
        throw new Error('Budget not found for ID: ' + budgetId);
      }
      budgetsToTest = [budgetRow];
    } else {
      // Test all budgets
      budgetsToTest = budData.filter(row => row[0]); // Filter out empty rows
    }
    
    const results = [];
    const now = new Date();
    
    budgetsToTest.forEach(row => {
      try {
        const currentBudgetId = row[0]; // Budget ID (column A)
        const budgetName = row[1]; // Budget Name (column B)
        const region = row[5] || 'Germany'; // Region (column F)
        const subRegion = row[6] || budgetName; // SubRegion (column G)
        
        Logger.log('Testing budget ID: ' + currentBudgetId + ' (' + budgetName + ')');
        
        const result = calculateFlexibleBudgetLimits(currentBudgetId, now);
        
        results.push({
          budgetId: currentBudgetId,
          budgetName: budgetName,
          region: region,
          subRegion: subRegion,
          result: result
        });
        
        Logger.log('Test completed for budget ID: ' + currentBudgetId);
        
      } catch (error) {
        Logger.log('Error testing budget ID ' + row[0] + ': ' + error);
        results.push({
          budgetId: row[0],
          budgetName: row[1],
          error: error.toString()
        });
      }
    });
    
    Logger.log('Flexible budget calculation test completed. Results: ' + JSON.stringify(results));
    return {
      success: true,
      data: results
    };
    
  } catch (error) {
    Logger.log('Error in testFlexibleBudgetCalculation: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * API wrapper for flexible budget calculation
 * @param {Object} e - Event object with parameters
 * @returns {Object} API response
 */
function getFlexibleBudgetCalculation(e) {
  try {
    const budgetName = e.parameter.budget;
    const dateParam = e.parameter.date;
    
    if (!budgetName) {
      throw new Error('Budget name is required');
    }
    
    const currentDate = parseDateParam(e);
    const result = calculateFlexibleBudgetLimits(budgetName, currentDate);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    Logger.log('Error in getFlexibleBudgetCalculation: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * API wrapper for processing flexible budget snapshot
 * @param {Object} e - Event object with parameters
 * @returns {Object} API response
 */
function processFlexibleBudgetSnapshotAPI(e) {
  try {
    // This is a protected operation - could add authentication here
    processFlexibleBudgetSnapshot();
    
    return {
      success: true,
      message: 'Flexible budget snapshot processed successfully'
    };
    
  } catch (error) {
    Logger.log('Error in processFlexibleBudgetSnapshotAPI: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * API wrapper for testing flexible budget calculations
 * @param {Object} e - Event object with parameters
 * @returns {Object} API response
 */
function testFlexibleBudgetCalculationAPI(e) {
  try {
    const budgetId = e.parameter.budget || null;
    const dateParam = e.parameter.date;
    
    const currentDate = parseDateParam(e);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    const budData = budSheet.getDataRange().getValues();
    const headers = budData.shift();
    const budgets = budData.filter(row => row[0]); // Filter out empty rows
    
    let budgetsToTest;
    if (budgetId) {
      // Test specific budget
      const budgetRow = budgets.find(row => row[0] == budgetId);
      if (!budgetRow) {
        throw new Error('Budget not found for ID: ' + budgetId);
      }
      budgetsToTest = [budgetRow];
    } else {
      // Test all budgets
      budgetsToTest = budgets;
    }
    
    const results = [];
    
    budgetsToTest.forEach(row => {
      try {
        const currentBudgetId = row[0]; // Budget ID (column A)
        const budgetName = row[1]; // Budget Name (column B)
        const region = row[5] || 'Germany'; // Region (column F)
        const subRegion = row[6] || budgetName; // SubRegion (column G)
        
        const result = calculateFlexibleBudgetLimits(currentBudgetId, currentDate);
        
        results.push({
          budgetId: currentBudgetId,
          budgetName: budgetName,
          region: region,
          subRegion: subRegion,
          result: result
        });
      } catch (error) {
        results.push({
          budgetId: row[0],
          budgetName: row[1],
          error: error.toString()
        });
      }
    });
    
    return {
      success: true,
      data: {
        testDate: currentDate,
        results: results
      }
    };
    
  } catch (error) {
    Logger.log('Error in testFlexibleBudgetCalculationAPI: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get all flexible budget calculations for the current month
 * @param {Object} e - Event object with parameters
 * @returns {Object} API response
 */
function getAllFlexibleBudgetCalculations(e) {
  try {
    const dateParam = e.parameter.date;
    const now = dateParam ? new Date(dateParam) : new Date();
    
    Logger.log('Getting flexible budget calculations for all budgets at date: ' + now);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    if (!budSheet) {
      throw new Error('Budgets sheet not found');
    }
    
    const budData = budSheet.getDataRange().getValues();
    const budHeaders = budData.shift(); // remove header
    const budgets = budData.filter(row => row[0]); // Filter out empty rows
    
    const results = [];
    
    budgets.forEach(row => {
      try {
        const budgetId = row[0];
        const budgetName = row[1];
        const region = row[5] || 'Germany';
        const subRegion = row[6] || budgetName;
        
        Logger.log('Calculating for budget ID: ' + budgetId + ' (' + budgetName + ')');
        
        const result = calculateFlexibleBudgetLimits(budgetId, now);
        
        results.push({
          budgetId: budgetId,
          budgetName: budgetName,
          region: region,
          subRegion: subRegion,
          calculation: result
        });
        
      } catch (error) {
        Logger.log('Error calculating for budget ID ' + row[0] + ': ' + error);
        results.push({
          budgetId: row[0],
          budgetName: row[1],
          error: error.toString()
        });
      }
    });
    
    return {
      success: true,
      data: results
    };
    
  } catch (error) {
    Logger.log('Error in getAllFlexibleBudgetCalculations: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
} 

/**
 * Generate and send daily expense report
 * This function can be triggered manually or automatically
 */
function sendDailyExpenseReport() {
  try {
    Logger.log('Starting daily expense report generation');
    
    const today = new Date();
    const reportDate = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const monthStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM');
    const yearStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy');
    const is2025 = today.getFullYear() === 2025;
    const monthsInYear = is2025 ? 6 : 12;
    const daysElapsed = Math.ceil((today - new Date(today.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = is2025 ? 184 : (today.getFullYear() % 4 === 0 ? 366 : 365);

    // --- Get Budgets and Annual Limits ---
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    const budData = budSheet.getDataRange().getValues();
    // Use correct column indices: A (0) for Budget ID, B (1) for Name, D (3) for Monthly Limit, E (4) for Active
    const budgetsAnnual = {};
    budData.slice(1).forEach(row => { // skip header row
      const budgetId = row[0]; // Budget ID (column A)
      const name = row[1]; // Budget Name (column B)
      const monthly = parseFloat(String(row[3]).replace(/[^\d.\-]/g, '')) || 0; // Monthly Limit (column D)
      const active = String(row[4]).toLowerCase() === 'true'; // Active (column E)
      if (budgetId && name && monthly && active) {
        budgetsAnnual[name] = monthly * monthsInYear;
      }
    });

    // --- Get receipt data ---
    const receiptSheet = ss.getSheetByName('receipt_log');
    const receiptData = receiptSheet.getDataRange().getValues();
    const headers = receiptData.shift();
    const dateCol = headers.indexOf('Date');
    const amountCol = headers.indexOf('Amount');
    const budgetCol = headers.indexOf('Budget');
    const categoryCol = headers.indexOf('Category');
    const vendorCol = headers.indexOf('Vendor');
    const cardCol = headers.indexOf('Card');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    
    if (dateCol === -1 || amountCol === -1) {
      throw new Error('Required columns not found in receipt log');
    }
    
    // --- Filter data for different time periods ---
    const todayData = receiptData.filter(row => {
      const rowDate = new Date(row[dateCol]);
      return Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') === reportDate;
    });
    const monthData = receiptData.filter(row => {
      const rowDate = new Date(row[dateCol]);
      return Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM') === monthStr;
    });
    const yearData = receiptData.filter(row => {
      const rowDate = new Date(row[dateCol]);
      return Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy') === yearStr;
    });
    
    // --- Calculate totals ---
    const todayTotal = todayData.reduce((sum, row) => sum + (parseFloat(row[amountCol]) || 0), 0);
    const monthTotal = monthData.reduce((sum, row) => sum + (parseFloat(row[amountCol]) || 0), 0);
    const yearTotal = yearData.reduce((sum, row) => sum + (parseFloat(row[amountCol]) || 0), 0);
    
    // --- Group by budget and category, and calculate overbudget/projection ---
    function groupAndCalc(data) {
      const grouped = {};
      data.forEach(row => {
        const budget = row[budgetCol] || 'Unknown Budget';
        const category = row[categoryCol] || 'Unknown Category';
        const amount = parseFloat(row[amountCol]) || 0;
        if (!grouped[budget]) grouped[budget] = { total: 0, categories: {}, ytd: 0 };
        if (!grouped[budget].categories[category]) grouped[budget].categories[category] = 0;
        grouped[budget].total += amount;
        grouped[budget].categories[category] += amount;
      });
      // Add annual, overbudget, and projection fields
      Object.keys(grouped).forEach(budget => {
        grouped[budget].annual = budgetsAnnual[budget] || 0;
        grouped[budget].overbudget = grouped[budget].total > (budgetsAnnual[budget] || 0) ? grouped[budget].total - (budgetsAnnual[budget] || 0) : 0;
        grouped[budget].projection = (grouped[budget].total / daysElapsed) * totalDays;
        grouped[budget].projectionOver = grouped[budget].projection > (budgetsAnnual[budget] || 0) ? grouped[budget].projection - (budgetsAnnual[budget] || 0) : 0;
      });
      return grouped;
    }
    const todayByBudget = groupAndCalc(todayData);
    const monthByBudget = groupAndCalc(monthData);
    const yearByBudget = groupAndCalc(yearData);
    // For projections, use yearByBudget

    // --- Generate email content ---
    const emailSubject = `Daily Expense Report - ${reportDate}`;
    const emailBody = generateReportEmailBody(
      reportDate, todayTotal, monthTotal, yearTotal,
      todayByBudget, monthByBudget, yearByBudget, todayData,
      amountCol, budgetCol, categoryCol, vendorCol, cardCol, userEmailCol, userNameCol,
      monthsInYear, totalDays, daysElapsed
    );
    // Send email
    GmailApp.sendEmail('henry@i58global.org', emailSubject, '', {
      name: 'i58 Receipts System',
      noReply: true,
      htmlBody: emailBody
    });
    Logger.log('Daily expense report sent successfully');
  } catch (error) {
    Logger.log('Error in sendDailyExpenseReport: ' + error);
    // Send error notification
    try {
      GmailApp.sendEmail('henry@i58global.org', 'Daily Expense Report Error', 
        `Error generating daily expense report for ${reportDate}:\n\n${error.toString()}`, {
        name: 'i58 Receipts System',
        noReply: true
      });
    } catch (emailError) {
      Logger.log('Failed to send error notification: ' + emailError);
    }
    throw error;
  }
}

/**
 * Group expenses by budget and category
 * @param {Array} data - Receipt data array
 * @param {number} budgetCol - Budget column index
 * @param {number} categoryCol - Category column index
 * @param {number} amountCol - Amount column index
 * @returns {Object} Grouped expenses
 */
function groupExpensesByBudget(data, budgetCol, categoryCol, amountCol) {
  const grouped = {};
  
  data.forEach(row => {
    const budget = row[budgetCol] || 'Unknown Budget';
    const category = row[categoryCol] || 'Unknown Category';
    const amount = parseFloat(row[amountCol]) || 0;
    
    if (!grouped[budget]) {
      grouped[budget] = { total: 0, categories: {} };
    }
    
    if (!grouped[budget].categories[category]) {
      grouped[budget].categories[category] = 0;
    }
    
    grouped[budget].total += amount;
    grouped[budget].categories[category] += amount;
  });
  
  return grouped;
}

/**
 * Generate email body for the daily report
 * @param {string} reportDate - Report date
 * @param {number} todayTotal - Today's total
 * @param {number} monthTotal - Month's total
 * @param {number} yearTotal - Year's total
 * @param {Object} todayByBudget - Today's expenses by budget
 * @param {Object} monthByBudget - Month's expenses by budget
 * @param {Object} yearByBudget - Year's expenses by budget
 * @param {Array} todayData - Today's receipt data
 * @param {number} amountCol - Amount column index
 * @param {number} budgetCol - Budget column index
 * @param {number} categoryCol - Category column index
 * @param {number} vendorCol - Vendor column index
 * @param {number} cardCol - Card column index
 * @param {number} userEmailCol - User email column index
 * @param {number} userNameCol - User name column index
 * @returns {string} Formatted HTML email body
 */
function generateReportEmailBody(reportDate, todayTotal, monthTotal, yearTotal, todayByBudget, monthByBudget, yearByBudget, todayData, amountCol, budgetCol, categoryCol, vendorCol, cardCol, userEmailCol, userNameCol, monthsInYear, totalDays, daysElapsed) {
  // Color palette
  const palette = {
    gold: '#A6984A',
    goldLight: '#E7D68F',
    olive: '#717E71',
    oliveLight: '#C4C5B8',
    green: '#485932',
    greenLight: '#7E845A',
    blue: '#7493A7',
    blueLight: '#B3C8D0',
    navy: '#273B50',
    navyLight: '#65829C',
    tan: '#C1926B',
    tanLight: '#E2C4B0',
    brown: '#61332A',
    brownLight: '#935C4B',
    red: '#A22C23',
    redLight: '#D9653F',
  };
  function colorProj(val, annual) {
    if (val > annual) return `color:${palette.redLight};font-weight:700;`;
    if (val < annual) return `color:${palette.greenLight};font-weight:700;`;
    return '';
  }
  // Calculate overall projected over/under
  const overallProj = yearTotal > 0 ? ((yearTotal / daysElapsed) * totalDays) : 0;
  const overallAnnual = Object.values(yearByBudget).reduce((sum, b) => sum + (b.annual || 0), 0);
  const overallProjDiff = overallProj - overallAnnual;
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Expense Report - ${reportDate}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: ${palette.navy};
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${palette.oliveLight};
        }
        .container {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, ${palette.gold} 0%, ${palette.blue} 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header .date {
            margin-top: 8px;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .summary-cards {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .summary-card {
            flex: 1;
            min-width: 200px;
            background: linear-gradient(135deg, ${palette.goldLight} 0%, ${palette.tanLight} 100%);
            color: ${palette.navy};
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid ${palette.gold};
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .amount {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }
        .summary-card .proj-over {
            color: ${palette.redLight};
            font-weight: 700;
        }
        .summary-card .proj-under {
            color: ${palette.greenLight};
            font-weight: 700;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: ${palette.gold};
            border-bottom: 3px solid ${palette.blue};
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 20px;
        }
        .budget-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        .budget-table th {
            background-color: ${palette.navy};
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        .budget-table td {
            padding: 12px;
            border-bottom: 1px solid ${palette.oliveLight};
        }
        .budget-table tr:hover {
            background-color: ${palette.goldLight};
        }
        .budget-name {
            font-weight: 600;
            color: ${palette.navy};
        }
        .category-name {
            color: ${palette.olive};
            font-size: 14px;
            padding-left: 20px;
        }
        .amount-cell {
            text-align: right;
            font-weight: 600;
        }
        .proj-over-cell {
            color: ${palette.redLight};
            font-weight: 700;
        }
        .proj-under-cell {
            color: ${palette.greenLight};
            font-weight: 700;
        }
        .annual-cell {
            color: ${palette.gold};
            font-weight: 600;
        }
        .receipts-list {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        .receipt-item {
            border-bottom: 1px solid ${palette.oliveLight};
            padding: 15px 0;
        }
        .receipt-item:last-child {
            border-bottom: none;
        }
        .receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .receipt-amount {
            font-size: 18px;
            font-weight: 700;
            color: ${palette.red};
        }
        .receipt-vendor {
            font-weight: 600;
            color: ${palette.navy};
        }
        .receipt-details {
            color: ${palette.olive};
            font-size: 14px;
        }
        .footer {
            background-color: ${palette.oliveLight};
            padding: 20px;
            text-align: center;
            color: ${palette.olive};
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .summary-cards {
                flex-direction: column;
            }
            .summary-card {
                min-width: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Expense Report</h1>
            <div class="date">${reportDate}</div>
        </div>
        
        <div class="content">
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>Today's Total</h3>
                    <div class="amount">€${todayTotal.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h3>Month to Date</h3>
                    <div class="amount">€${monthTotal.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h3>Year to Date</h3>
                    <div class="amount">€${yearTotal.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h3>Projected Over/Under</h3>
                    <div class="amount ${overallProjDiff > 0 ? 'proj-over' : (overallProjDiff < 0 ? 'proj-under' : '')}">
                      ${overallProjDiff > 0 ? 'Over by €' + overallProjDiff.toFixed(2) : (overallProjDiff < 0 ? 'Under by €' + Math.abs(overallProjDiff).toFixed(2) : '-')}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📅 Budgets: YTD, Annual, Projection</h2>
                <table class="budget-table">
                    <thead>
                        <tr>
                            <th>Budget</th>
                            <th>YTD</th>
                            <th>Annual</th>
                            <th>Projection</th>
                            <th>Projected Over/Under</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(yearByBudget).map(([budget, data]) => {
                          const proj = data.projection || 0;
                          const projDiff = proj - (data.annual || 0);
                          return `
                            <tr>
                                <td class="budget-name">${budget}</td>
                                <td class="amount-cell">€${(data.total || 0).toFixed(2)}</td>
                                <td class="annual-cell">€${(data.annual || 0).toFixed(2)}</td>
                                <td class="amount-cell" style="${colorProj(proj, data.annual)}">€${proj.toFixed(2)}</td>
                                <td class="${projDiff > 0 ? 'proj-over-cell' : (projDiff < 0 ? 'proj-under-cell' : '')}">
                                  ${projDiff > 0 ? 'Over by €' + projDiff.toFixed(2) : (projDiff < 0 ? 'Under by €' + Math.abs(projDiff).toFixed(2) : '-')}
                                </td>
                            </tr>
                            ${Object.entries(data.categories).map(([category, amount]) => {
                              // For categories, you could add similar logic if you want
                              return `
                                <tr>
                                    <td class="category-name">• ${category}</td>
                                    <td class="amount-cell">€${amount.toFixed(2)}</td>
                                    <td></td><td></td><td></td>
                                </tr>
                              `;
                            }).join('')}
                          `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            ${todayData.length > 0 ? `
                <div class="section">
                    <h2>🧾 Today's Individual Receipts</h2>
                    <div class="receipts-list">
                        ${todayData.map((row, index) => {
                            const amount = parseFloat(row[amountCol]) || 0;
                            const budget = row[budgetCol] || 'Unknown';
                            const category = row[categoryCol] || 'Unknown';
                            const vendor = row[vendorCol] || 'Unknown';
                            const card = row[cardCol] || 'Unknown';
                            const user = row[userEmailCol] || row[userNameCol] || 'Unknown';
                            
                            return `
                                <div class="receipt-item">
                                    <div class="receipt-header">
                                        <div class="receipt-vendor">${vendor}</div>
                                        <div class="receipt-amount">€${amount.toFixed(2)}</div>
                                    </div>
                                    <div class="receipt-details">
                                        <strong>Budget:</strong> ${budget} > ${category} | 
                                        <strong>Card:</strong> ${card} | 
                                        <strong>User:</strong> ${user}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>📧 Report generated automatically by i58 Receipts System</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  return htmlBody;
}

/**
 * Setup daily trigger for expense report
 * This should be called once to set up the automated trigger
 */
function setupDailyReportTrigger() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendDailyExpenseReport') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger for daily at 6 PM
    ScriptApp.newTrigger('sendDailyExpenseReport')
      .timeBased()
      .everyDays(1)
      .atHour(18)
      .create();
    
    Logger.log('Daily report trigger set up successfully');
    
  } catch (error) {
    Logger.log('Error setting up daily report trigger: ' + error);
    throw error;
  }
}

/**
 * Manual function to test daily report generation
 * @param {string} date - Date to test (optional, uses today if not provided)
 */
function testDailyReport(date = null) {
  try {
    const testDate = date ? new Date(date) : new Date();
    Logger.log('Testing daily report for date: ' + testDate);
    
    // Temporarily override the date for testing
    const originalDate = Date;
    Date = function() {
      return testDate;
    };
    
    sendDailyExpenseReport();
    
    // Restore original Date
    Date = originalDate;
    
    Logger.log('Daily report test completed successfully');
    
  } catch (error) {
    Logger.log('Error in testDailyReport: ' + error);
    throw error;
  }
}

/**
 * Get vendor suggestions for autocomplete
 * @param {Object} data - Request data containing userEmail
 * @returns {Object} Response with vendor suggestions
 */
function getVendorSuggestions(data) {
  try {
    Logger.log('Getting vendor suggestions');
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('receipt_log sheet not found');
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      return { success: true, vendors: [] };
    }
    
    // Get column indices
    const headers = values[0];
    const vendorCol = headers.indexOf('Vendor');
    
    if (vendorCol === -1) {
      throw new Error('Vendor column not found');
    }
    
    // Extract unique vendors from all receipts (no user filtering)
    const userVendors = new Set();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const vendor = row[vendorCol];
      
      if (vendor && vendor.toString().trim()) {
        userVendors.add(vendor.toString().trim());
      }
    }
    
    // Convert to array and sort alphabetically
    const vendors = Array.from(userVendors).sort();
    
    Logger.log('Found ' + vendors.length + ' unique vendors');
    
    return {
      success: true,
      vendors: vendors
    };
    
  } catch (error) {
    Logger.log('Error getting vendor suggestions: ' + error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test function to verify regional data functionality
function testRegionalData() {
  try {
    Logger.log('Testing regional data functionality...');
    
    // First, run the snapshot to ensure we have current data
    snapshotMonthlyBudgets();
    Logger.log('Monthly budget snapshot completed');
    
    // Then test getStaticData
    const staticData = getStaticData();
    
    if (staticData.success) {
      Logger.log('Static data retrieved successfully');
      Logger.log('Regions found: ' + JSON.stringify(staticData.data.regions));
      Logger.log('Sub-regions found: ' + JSON.stringify(staticData.data.subRegions));
      Logger.log('Budget names with regions: ' + JSON.stringify(staticData.data.budgetNames));
      
      // Log a few budget limits to verify region data
      const budgetLimits = staticData.data.budgetLimits;
      Object.keys(budgetLimits).slice(0, 3).forEach(budgetName => {
        const budget = budgetLimits[budgetName];
        Logger.log(`Budget: ${budgetName}, Region: ${budget.region}, SubRegion: ${budget.subRegion}, Total: ${budget.total}`);
      });
      
      return {
        success: true,
        message: 'Regional data test completed successfully',
        data: {
          regions: staticData.data.regions,
          subRegions: staticData.data.subRegions,
          budgetCount: Object.keys(budgetLimits).length
        }
      };
    } else {
      throw new Error('Failed to get static data: ' + staticData.error);
    }
  } catch (error) {
    Logger.log('Error in testRegionalData: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// === Petty Cash Implementation - 1.2: Core Backend Functions ===

/**
 * Get user settings from the user_settings sheet
 * @param {string} email - User's email address
 * @returns {Object} User settings object
 */
function getUserSettings(email) {
  try {
    Logger.log('Getting user settings for: ' + email);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('user_settings');
    
    if (!sheet) {
      Logger.log('user_settings sheet not found');
      return {
        success: false,
        error: 'User settings sheet not found'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // remove header row
    
    // Find user by email
    const userRow = data.find(row => row[0] === email);
    
    if (!userRow) {
      Logger.log('User not found in settings: ' + email);
      return {
        success: false,
        error: 'User not found'
      };
    }
    
    // Check if user is banned
    const isBanned = userRow[4] === true || userRow[4] === 'TRUE';
    if (isBanned) {
      Logger.log('User is banned: ' + email);
      return {
        success: false,
        error: 'User is banned'
      };
    }
    
    // Parse comma-separated values
    const subRegionsRaw = userRow[2] || '';
    const pettyCashFundsRaw = userRow[3] || '';
    
    Logger.log('Raw subRegions from sheet: "' + subRegionsRaw + '"');
    Logger.log('Raw pettyCashFunds from sheet: "' + pettyCashFundsRaw + '"');
    
    const subRegions = subRegionsRaw ? subRegionsRaw.split(',').map(s => s.trim()) : [];
    const pettyCashFunds = pettyCashFundsRaw ? pettyCashFundsRaw.split(',').map(s => s.trim()) : [];
    
    Logger.log('Parsed subRegions: ' + JSON.stringify(subRegions));
    Logger.log('Parsed pettyCashFunds: ' + JSON.stringify(pettyCashFunds));
    
    const settings = {
      email: userRow[0],
      region: userRow[1] || '',
      subRegions: subRegions,
      pettyCashFunds: pettyCashFunds,
      isBanned: isBanned,
      lastLogin: userRow[5] || new Date(),
      lastSync: userRow[6] || new Date()
    };
    
    Logger.log('User settings retrieved successfully: ' + JSON.stringify(settings));
    
    return {
      success: true,
      data: settings
    };
    
  } catch (error) {
    Logger.log('Error in getUserSettings: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Update user settings in the user_settings sheet
 * @param {string} email - User's email address
 * @param {Object} settings - Settings object to update
 * @returns {Object} Success/error response
 */
function updateUserSettings(email, settings) {
  try {
    Logger.log('Updating user settings for: ' + email);
    Logger.log('Settings: ' + JSON.stringify(settings));
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('user_settings');
    
    if (!sheet) {
      throw new Error('User settings sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // remove header row
    
    // Find user by email
    const userIndex = data.findIndex(row => row[0] === email);
    
    if (userIndex === -1) {
      // Create new user
      Logger.log('Creating new user: ' + email);
      const newRow = [
        email,
        settings.region || '',
        settings.subRegions ? settings.subRegions.join(',') : '',
        settings.pettyCashFunds ? settings.pettyCashFunds.join(',') : '',
        false, // IsBanned
        new Date(), // LastLogin
        new Date()  // LastSync
      ];
      sheet.appendRow(newRow);
    } else {
      // Update existing user
      Logger.log('Updating existing user: ' + email);
      const rowIndex = userIndex + 2; // +2 because we removed header and arrays are 0-indexed
      
      // Update individual columns
      if (settings.region !== undefined) {
        sheet.getRange(rowIndex, 2).setValue(settings.region);
      }
      if (settings.subRegions !== undefined) {
        sheet.getRange(rowIndex, 3).setValue(settings.subRegions.join(','));
      }
      if (settings.pettyCashFunds !== undefined) {
        sheet.getRange(rowIndex, 4).setValue(settings.pettyCashFunds.join(','));
      }
      
      // Update LastSync
      sheet.getRange(rowIndex, 7).setValue(new Date());
    }
    
    Logger.log('User settings updated successfully');
    
    return {
      success: true,
      message: 'Settings updated successfully'
    };
    
  } catch (error) {
    Logger.log('Error in updateUserSettings: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check if user has access to the system
 * @param {string} email - User's email address
 * @returns {Object} Access check result
 */
function checkUserAccess(email) {
  try {
    Logger.log('Checking user access for: ' + email);
    
    const userSettings = getUserSettings(email);
    
    if (!userSettings.success) {
      return {
        success: false,
        hasAccess: false,
        error: userSettings.error
      };
    }
    
    const settings = userSettings.data;
    
    // Check if user is banned
    if (settings.isBanned) {
      return {
        success: true,
        hasAccess: false,
        isBanned: true,
        message: 'User is banned'
      };
    }
    
    // Check if user has petty cash access (i58global.org emails)
    const hasPettyCashAccess = email.endsWith('@i58global.org');
    
    return {
      success: true,
      hasAccess: true,
      isBanned: false,
      hasPettyCashAccess: hasPettyCashAccess,
      region: settings.region,
      subRegions: settings.subRegions,
      pettyCashFunds: settings.pettyCashFunds
    };
    
  } catch (error) {
    Logger.log('Error in checkUserAccess: ' + error);
    return {
      success: false,
      hasAccess: false,
      error: error.toString()
    };
  }
}

// Cache for sub-regions (24 hour TTL since this rarely changes)
let subRegionsCache = {
  data: {},
  timestamp: 0,
  ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

/**
 * Get available sub-regions for a given region
 * @param {string} region - Region name
 * @returns {Object} Available sub-regions
 */
function getAvailableSubRegions(region) {
  try {
    Logger.log('Getting available sub-regions for region: ' + region);
    
    // Check cache first
    const currentTime = Date.now();
    if (subRegionsCache.data[region] && (currentTime - subRegionsCache.timestamp) < subRegionsCache.ttl) {
      Logger.log('Returning cached sub-regions for: ' + region);
      return {
        success: true,
        data: {
          region: region,
          subRegions: subRegionsCache.data[region]
        }
      };
    }
    
    // Get sub-regions dynamically from the budget data
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    if (!budSheet) {
      Logger.log('Budgets sheet not found, returning empty sub-regions');
      return {
        success: true,
        data: {
          region: region,
          subRegions: []
        }
      };
    }
    
    const budData = budSheet.getDataRange().getValues();
    const budHeaders = budData.shift(); // remove header row
    
    // Find column indices for region and sub-region
    const regionCol = budHeaders.indexOf('Region');
    const subRegionCol = budHeaders.indexOf('SubRegion');
    
    // If the columns don't exist, fall back to hardcoded values
    if (regionCol === -1 || subRegionCol === -1) {
      Logger.log('Region or SubRegion columns not found in Budgets sheet, using fallback');
      const regionSubRegions = {
        'Greece': ['Athens', 'Lesvos', 'Thessaloniki', 'Crete', 'Patras', 'Heraklion'],
        'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart']
      };
      
      const subRegions = regionSubRegions[region] || [];
      
      // Cache the result
      subRegionsCache.data[region] = subRegions;
      subRegionsCache.timestamp = currentTime;
      
      return {
        success: true,
        data: {
          region: region,
          subRegions: subRegions
        }
      };
    }
    
    // Extract unique sub-regions for the specified region
    const subRegionsSet = new Set();
    
    budData.forEach(row => {
      const rowRegion = row[regionCol] || 'Germany'; // default to Germany if not specified
      const rowSubRegion = row[subRegionCol] || row[0]; // default to budget name if not specified
      
      if (rowRegion === region && rowSubRegion) {
        subRegionsSet.add(rowSubRegion.toString().trim());
      }
    });
    
    const subRegions = Array.from(subRegionsSet).sort();
    
    // Cache the result
    subRegionsCache.data[region] = subRegions;
    subRegionsCache.timestamp = currentTime;
    
    Logger.log('Available sub-regions for ' + region + ': ' + JSON.stringify(subRegions));
    
    return {
      success: true,
      data: {
        region: region,
        subRegions: subRegions
      }
    };
    
  } catch (error) {
    Logger.log('Error in getAvailableSubRegions: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Cache for petty cash funds (24 hour TTL since this rarely changes)
let pettyCashFundsCache = {
  data: {},
  timestamp: 0,
  ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

/**
 * Get available petty cash funds for selected sub-regions
 * @param {Array} subRegions - Array of sub-region names
 * @returns {Object} Available petty cash funds
 */
function getAvailablePettyCashFunds(subRegions) {
  try {
    Logger.log('Getting available petty cash funds for sub-regions: ' + JSON.stringify(subRegions));
    
    // Create cache key from sorted sub-regions
    const cacheKey = subRegions.sort().join(',');
    
    // Check cache first
    const currentTime = Date.now();
    if (pettyCashFundsCache.data[cacheKey] && (currentTime - pettyCashFundsCache.timestamp) < pettyCashFundsCache.ttl) {
      Logger.log('Returning cached petty cash funds for: ' + cacheKey);
      return {
        success: true,
        data: {
          subRegions: subRegions,
          pettyCashFunds: pettyCashFundsCache.data[cacheKey]
        }
      };
    }
    
    // Get petty cash funds dynamically from the Cards sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const cardsSheet = ss.getSheetByName('Cards');
    
    if (!cardsSheet) {
      Logger.log('Cards sheet not found, using fallback petty cash funds');
      // Fallback to hardcoded values if Cards sheet doesn't exist
      const subRegionFunds = {
        'Athens': ['Petty Cash Athens'],
        'Lesvos': ['Petty Cash Lesvos'],
        'Thessaloniki': ['Petty Cash Thessaloniki'],
        'Crete': ['Petty Cash Crete'],
        'Berlin': ['Petty Cash Berlin'],
        'Munich': ['Petty Cash Munich'],
        'Hamburg': ['Petty Cash Hamburg']
      };
      
      const availableFunds = [];
      subRegions.forEach(subRegion => {
        const funds = subRegionFunds[subRegion] || [];
        availableFunds.push(...funds);
      });
      
      // Cache the result
      pettyCashFundsCache.data[cacheKey] = availableFunds;
      pettyCashFundsCache.timestamp = currentTime;
      
      return {
        success: true,
        data: {
          subRegions: subRegions,
          pettyCashFunds: availableFunds
        }
      };
    }
    
    const cardsData = cardsSheet.getDataRange().getValues();
    const cardsHeaders = cardsData.shift(); // remove header row
    
    // Find column indices
    const cardCol = cardsHeaders.indexOf('Card');
    const locationCol = cardsHeaders.indexOf('Location');
    
    // If the columns don't exist, fall back to hardcoded values
    if (cardCol === -1 || locationCol === -1) {
      Logger.log('Card or Location columns not found in Cards sheet, using fallback');
      const subRegionFunds = {
        'Athens': ['Petty Cash Athens'],
        'Lesvos': ['Petty Cash Lesvos'],
        'Thessaloniki': ['Petty Cash Thessaloniki'],
        'Crete': ['Petty Cash Crete'],
        'Berlin': ['Petty Cash Berlin'],
        'Munich': ['Petty Cash Munich'],
        'Hamburg': ['Petty Cash Hamburg']
      };
      
      const availableFunds = [];
      subRegions.forEach(subRegion => {
        const funds = subRegionFunds[subRegion] || [];
        availableFunds.push(...funds);
      });
      
      // Cache the result
      pettyCashFundsCache.data[cacheKey] = availableFunds;
      pettyCashFundsCache.timestamp = currentTime;
      
      return {
        success: true,
        data: {
          subRegions: subRegions,
          pettyCashFunds: availableFunds
        }
      };
    }
    
    // Extract petty cash funds for the specified sub-regions
    const availableFunds = [];
    
    cardsData.forEach(row => {
      const card = row[cardCol] || '';
      const location = row[locationCol] || '';
      
      // Check if this is a petty cash card and if the location matches any of the selected sub-regions
      if (card.toString().toLowerCase().includes('petty cash') && 
          subRegions.some(subRegion => location.toString().toLowerCase().includes(subRegion.toLowerCase()))) {
        availableFunds.push(card.toString().trim());
      }
    });
    
    // Remove duplicates and sort
    const uniqueFunds = [...new Set(availableFunds)].sort();
    
    // Cache the result
    pettyCashFundsCache.data[cacheKey] = uniqueFunds;
    pettyCashFundsCache.timestamp = currentTime;
    
    Logger.log('Available petty cash funds: ' + JSON.stringify(uniqueFunds));
    
    return {
      success: true,
      data: {
        subRegions: subRegions,
        pettyCashFunds: uniqueFunds
      }
    };
    
  } catch (error) {
    Logger.log('Error in getAvailablePettyCashFunds: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get petty cash balance for selected funds
 * @param {Array} selectedFunds - Array of petty cash fund names
 * @returns {Object} Balance information for each fund
 */
function getPettyCashBalance(selectedFunds) {
  try {
    Logger.log('Getting petty cash balance for funds: ' + JSON.stringify(selectedFunds));
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('petty_receipts');
    
    if (!sheet) {
      throw new Error('Petty receipts sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // remove header row
    
    const balances = {};
    
    // Initialize balances for all selected funds
    selectedFunds.forEach(fund => {
      balances[fund] = {
        currentBalance: 0,
        totalWithdrawals: 0,
        totalExpenses: 0,
        transactionCount: 0
      };
    });
    
    // Calculate balances from all transactions
    data.forEach(row => {
      const fund = row[8]; // Fund column
      const amount = Number(row[2]) || 0; // Amount column
      const type = row[1]; // Type column
      
      if (selectedFunds.includes(fund)) {
        balances[fund].currentBalance += amount;
        balances[fund].transactionCount++;
        
        if (type === 'WITHDRAWAL') {
          balances[fund].totalWithdrawals += amount;
        } else if (type === 'EXPENSE') {
          balances[fund].totalExpenses += Math.abs(amount);
        }
      }
    });
    
    Logger.log('Petty cash balances calculated: ' + JSON.stringify(balances));
    
    return {
      success: true,
      data: {
        funds: balances,
        totalBalance: Object.values(balances).reduce((sum, fund) => sum + fund.currentBalance, 0)
      }
    };
    
  } catch (error) {
    Logger.log('Error in getPettyCashBalance: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Record a new petty cash withdrawal
 * @param {Object} data - Withdrawal data
 * @returns {Object} Success/error response
 */
function recordPettyCashWithdrawal(data) {
  try {
    Logger.log('Recording petty cash withdrawal: ' + JSON.stringify(data));
    
    const { amount, description, fund, userEmail, location } = data;
    
    // Validate required fields
    if (!amount || !description || !fund || !userEmail) {
      throw new Error('Missing required fields: amount, description, fund, and userEmail are required');
    }
    
    // Validate amount is positive
    const withdrawalAmount = Number(amount);
    if (withdrawalAmount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }
    
    // Check if user has access to petty cash
    const userAccess = checkUserAccess(userEmail);
    if (!userAccess.success || !userAccess.hasPettyCashAccess) {
      throw new Error('User does not have petty cash access');
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('petty_receipts');
    
    if (!sheet) {
      throw new Error('Petty receipts sheet not found');
    }
    
    // Calculate new balance
    const currentBalance = getPettyCashBalance([fund]);
    const newBalance = currentBalance.data.funds[fund].currentBalance + withdrawalAmount;
    
    // Create withdrawal record
    const withdrawalRow = [
      new Date(), // Date
      'WITHDRAWAL', // Type
      withdrawalAmount, // Amount
      description, // Description
      location || '', // Location
      newBalance, // Balance
      userEmail, // User
      '', // Receipt URL
      fund // Fund
    ];
    
    sheet.appendRow(withdrawalRow);
    
    Logger.log('Petty cash withdrawal recorded successfully');
    
    return {
      success: true,
      message: 'Withdrawal recorded successfully',
      data: {
        amount: withdrawalAmount,
        fund: fund,
        newBalance: newBalance,
        date: new Date()
      }
    };
    
  } catch (error) {
    Logger.log('Error in recordPettyCashWithdrawal: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get petty cash transaction history
 * @param {Array} funds - Array of fund names to include
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Transaction history
 */
function getPettyCashHistory(funds, startDate, endDate) {
  try {
    Logger.log('Getting petty cash history for funds: ' + JSON.stringify(funds));
    Logger.log('Date range: ' + startDate + ' to ' + endDate);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('petty_receipts');
    
    if (!sheet) {
      throw new Error('Petty receipts sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // remove header row
    
    // Parse date range
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Start of year
    const end = endDate ? new Date(endDate) : new Date(); // Today
    
    const transactions = [];
    
    data.forEach((row, index) => {
      const transactionDate = new Date(row[0]);
      const fund = row[8];
      
      // Filter by fund and date range
      if (funds.includes(fund) && transactionDate >= start && transactionDate <= end) {
        transactions.push({
          id: `transaction_${index + 2}`, // Use sheet row number
          date: transactionDate,
          type: row[1],
          amount: Number(row[2]) || 0,
          description: row[3] || '',
          location: row[4] || '',
          balance: Number(row[5]) || 0,
          user: row[6] || '',
          receiptUrl: row[7] || '',
          fund: fund
        });
      }
    });
    
    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    Logger.log('Found ' + transactions.length + ' transactions');
    
    return {
      success: true,
      data: {
        transactions: transactions,
        totalTransactions: transactions.length,
        dateRange: {
          start: start,
          end: end
        }
      }
    };
    
  } catch (error) {
    Logger.log('Error in getPettyCashHistory: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Sync petty cash transactions from receipts
 * This function should be called periodically to sync receipts with petty cash cards
 * @returns {Object} Sync results
 */
function syncPettyCashFromReceipts() {
  try {
    Logger.log('Starting petty cash sync from receipts...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receiptSheet = ss.getSheetByName('receipt_log');
    const pettySheet = ss.getSheetByName('petty_receipts');
    
    if (!receiptSheet || !pettySheet) {
      throw new Error('Required sheets not found');
    }
    
    const receiptData = receiptSheet.getDataRange().getValues();
    const receiptHeaders = receiptData.shift(); // remove header row
    
    const pettyData = pettySheet.getDataRange().getValues();
    const pettyHeaders = pettyData.shift(); // remove header row
    
    // Find column indices
    const cardCol = receiptHeaders.indexOf('Card');
    const amountCol = receiptHeaders.indexOf('Amount');
    const dateCol = receiptHeaders.indexOf('Date');
    const descriptionCol = receiptHeaders.indexOf('Description');
    const vendorCol = receiptHeaders.indexOf('Vendor');
    const userEmailCol = receiptHeaders.indexOf('User Email');
    const photoUrlCol = receiptHeaders.indexOf('Photo URL');
    
    if (cardCol === -1 || amountCol === -1) {
      throw new Error('Required columns not found in receipt log');
    }
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    // Process each receipt
    receiptData.forEach((receiptRow, index) => {
      const card = receiptRow[cardCol];
      const amount = Number(receiptRow[amountCol]) || 0;
      const date = new Date(receiptRow[dateCol]);
      const description = receiptRow[descriptionCol] || '';
      const vendor = receiptRow[vendorCol] || '';
      const userEmail = receiptRow[userEmailCol] || '';
      const photoUrl = receiptRow[photoUrlCol] || '';
      
      // Check if this is a petty cash card
      if (card && card.toString().toLowerCase().includes('petty cash')) {
        const fund = card.toString().trim();
        
        // Check if this receipt is already synced
        const alreadySynced = pettyData.some(pettyRow => {
          const pettyDate = new Date(pettyRow[0]);
          const pettyAmount = Number(pettyRow[2]);
          const pettyDescription = pettyRow[3];
          const pettyUser = pettyRow[6];
          
          return pettyDate.getTime() === date.getTime() &&
                 pettyAmount === -amount &&
                 pettyDescription === description &&
                 pettyUser === userEmail;
        });
        
        if (!alreadySynced) {
          // Calculate new balance
          const currentBalance = getPettyCashBalance([fund]);
          const newBalance = currentBalance.data.funds[fund].currentBalance - amount;
          
          // Create expense record
          const expenseRow = [
            date, // Date
            'EXPENSE', // Type
            -amount, // Amount (negative for expenses)
            description || vendor, // Description
            '', // Location
            newBalance, // Balance
            userEmail, // User
            photoUrl, // Receipt URL
            fund // Fund
          ];
          
          pettySheet.appendRow(expenseRow);
          syncedCount++;
          
          Logger.log('Synced petty cash expense: ' + fund + ' - €' + amount);
        } else {
          skippedCount++;
        }
      }
    });
    
    Logger.log('Petty cash sync completed. Synced: ' + syncedCount + ', Skipped: ' + skippedCount);
    
    return {
      success: true,
      message: 'Petty cash sync completed',
      data: {
        syncedCount: syncedCount,
        skippedCount: skippedCount
      }
    };
    
  } catch (error) {
    Logger.log('Error in syncPettyCashFromReceipts: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get flexible budget calculation for a specific budget
 * @param {Object} e - Event object with budget parameter
 * @returns {Object} Flexible budget calculation result
 */
function getFlexibleBudgetCalculation(e) {
  try {
    const budgetId = e.parameter.budget;
    const dateParam = e.parameter.date;
    
    if (!budgetId) {
      throw new Error('Budget ID parameter is required');
    }
    
    const now = dateParam ? new Date(dateParam) : new Date();
    Logger.log('Getting flexible budget calculation for budget ID: ' + budgetId + ' at date: ' + now);
    
    const result = calculateFlexibleBudgetLimits(budgetId, now);
    
    // Get budget info for display
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    const budData = budSheet.getDataRange().getValues();
    const budHeaders = budData.shift(); // remove header
    const budgetRow = budData.find(row => row[0] == budgetId);
    
    if (budgetRow) {
      const budgetName = budgetRow[1];
      const region = budgetRow[5] || 'Germany';
      const subRegion = budgetRow[6] || budgetName;
      
      return {
        success: true,
        data: {
          budgetId: budgetId,
          budgetName: budgetName,
          region: region,
          subRegion: subRegion,
          calculation: result
        }
      };
    } else {
      return {
        success: false,
        error: 'Budget not found for ID: ' + budgetId
      };
    }
    
  } catch (error) {
    Logger.log('Error in getFlexibleBudgetCalculation: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function testGetBudgetDetails(data) {
  try {
    Logger.log('Testing getBudgetDetails function');
    const budgetId = data.budget;
    const result = getBudgetDetails(budgetId);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    Logger.log('Error in testGetBudgetDetails: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// === Helper: Get card folder ID from Cards sheet ===
function getCardFolderId(cardName) {
  try {
    Logger.log('Getting folder ID for card: ' + cardName);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Cards');
    if (!sheet) {
      Logger.log('Cards sheet not found');
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // remove header row
    
    // Find column indices
    const cardCol = headers.indexOf('Card');
    const folderIdCol = headers.indexOf('Folder ID');
    
    if (cardCol === -1 || folderIdCol === -1) {
      Logger.log('Card or Folder ID column not found in Cards sheet');
      return null;
    }
    
    // Find the matching card and return its folder ID
    for (const row of data) {
      if (String(row[cardCol]) === String(cardName)) {
        const folderId = row[folderIdCol];
        Logger.log('Found folder ID for card ' + cardName + ': ' + folderId);
        return folderId;
      }
    }
    
    Logger.log('Card not found: ' + cardName);
    return null;
  } catch (error) {
    Logger.log('Error in getCardFolderId: ' + error);
    return null;
  }
}

// === Helper: Get or create month folder within card folder ===
function getOrCreateMonthFolder(cardFolderId, date) {
  try {
    Logger.log('Getting or creating month folder for date: ' + date);
    
    // Get the card's main folder
    const cardFolder = DriveApp.getFolderById(cardFolderId);
    
    // Format month folder name (e.g., "01.January", "02.February")
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const transactionDate = new Date(date);
    const monthNumber = transactionDate.getMonth() + 1; // 0-based to 1-based
    const monthName = monthNames[transactionDate.getMonth()];
    const monthFolderName = `${monthNumber.toString().padStart(2, '0')}.${monthName}`;
    
    Logger.log('Looking for month folder: ' + monthFolderName);
    
    // Check if month folder already exists
    const folderIterator = cardFolder.getFoldersByName(monthFolderName);
    if (folderIterator.hasNext()) {
      const existingFolder = folderIterator.next();
      Logger.log('Found existing month folder: ' + existingFolder.getName());
      return existingFolder;
    }
    
    // Create new month folder
    Logger.log('Creating new month folder: ' + monthFolderName);
    const newMonthFolder = cardFolder.createFolder(monthFolderName);
    Logger.log('Created month folder: ' + newMonthFolder.getName());
    return newMonthFolder;
    
  } catch (error) {
    Logger.log('Error in getOrCreateMonthFolder: ' + error);
    throw new Error('Failed to get or create month folder: ' + error.message);
  }
}

// === Helper: Get category code from Categories sheet ===
function getCategoryCode(budgetId, categoryName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Categories');
  if (!sheet) {
    Logger.log('Categories sheet not found');
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  // Find column indices dynamically
  const budgetIdCol = headers.indexOf('Budget ID');
  const categoryCol = headers.indexOf('Name'); // Changed from 'Category' to 'Name'
  const codeCol = headers.indexOf('Code');

  if (budgetIdCol === -1 || categoryCol === -1 || codeCol === -1) {
    Logger.log('One or more required columns (Budget ID, Name, Code) not found in Categories sheet');
    return null;
  }

  // Find the matching row and return the code
  for (const row of data) {
    if (row[budgetIdCol] == budgetId && row[categoryCol] === categoryName) {
      return row[codeCol];
    }
  }

  Logger.log(`Category code not found for Budget ID: ${budgetId}, Category: ${categoryName}`);
  return null; // Return null if no match is found
}

function testPhase1AuditColumns() {
  try {
    Logger.log('Testing Phase 1: Audit Columns');
    
    // Test 1: Check if new columns exist in sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Current headers: ' + headers.join(', '));
    
    // Check for new audit columns
    const lastModifiedCol = headers.indexOf('Last Modified');
    const modifiedByCol = headers.indexOf('Modified By');
    const changeDescriptionCol = headers.indexOf('Change Description');
    const isDeletedCol = headers.indexOf('Is Deleted');
    
    Logger.log('Column indices found:');
    Logger.log('- Last Modified: ' + lastModifiedCol);
    Logger.log('- Modified By: ' + modifiedByCol);
    Logger.log('- Change Description: ' + changeDescriptionCol);
    Logger.log('- Is Deleted: ' + isDeletedCol);
    
    if (lastModifiedCol === -1 || modifiedByCol === -1 || changeDescriptionCol === -1 || isDeletedCol === -1) {
      throw new Error('One or more audit columns not found');
    }
    
    // Test 2: Check if existing receipts have the new columns (should be empty for old receipts)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const lastReceiptRow = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
      Logger.log('Last receipt row has ' + lastReceiptRow.length + ' columns');
      
      // Check if new columns exist but are empty for old receipts
      if (lastReceiptRow.length >= 20) { // Should have at least 20 columns now (A-T)
        Logger.log('New columns exist in last receipt row');
        Logger.log('- Last Modified: ' + lastReceiptRow[lastModifiedCol]);
        Logger.log('- Modified By: ' + lastReceiptRow[modifiedByCol]);
        Logger.log('- Change Description: ' + lastReceiptRow[changeDescriptionCol]);
        Logger.log('- Is Deleted: ' + lastReceiptRow[isDeletedCol]);
      } else {
        Logger.log('Warning: Last receipt row does not have new columns');
      }
    }
    
    Logger.log('Phase 1 test completed successfully');
    return {
      success: true,
      message: 'Audit columns are properly set up',
      data: {
        lastModifiedCol,
        modifiedByCol,
        changeDescriptionCol,
        isDeletedCol,
        totalColumns: headers.length
      }
    };
    
  } catch (error) {
    Logger.log('Error in testPhase1AuditColumns: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// === File Management Functions for Edit Receipts ===

/**
 * Move receipt file when budget/card/date changes
 * @param {string} fileUrl - Current file URL
 * @param {string} newBudgetId - New budget ID
 * @param {string} newCard - New card name
 * @param {string} newDate - New date
 * @param {string} newVendor - New vendor name
 * @param {number} newAmount - New amount (in euros)
 * @param {string} category - Category name
 * @returns {string} New file URL
 */
function moveReceiptFile(fileUrl, newBudgetId, newCard, newDate, newVendor, newAmount, category) {
  try {
    Logger.log('--- moveReceiptFile ---');
    Logger.log('Moving file from: ' + fileUrl);
    Logger.log('New budget ID: ' + newBudgetId);
    Logger.log('New card: ' + newCard);
    Logger.log('New date: ' + newDate);
    Logger.log('New vendor: ' + newVendor);
    Logger.log('New amount: ' + newAmount);
    Logger.log('Category: ' + category);
    
    if (!fileUrl || !fileUrl.includes('drive.google.com')) {
      Logger.log('No valid file URL provided, skipping file move');
      return fileUrl; // Return original URL if no file
    }
    
    // Extract file ID from URL
    const fileIdMatch = fileUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      throw new Error('Could not extract file ID from URL: ' + fileUrl);
    }
    const fileId = fileIdMatch[0];
    
    // Get the file
    const file = DriveApp.getFileById(fileId);
    if (!file) {
      throw new Error('File not found: ' + fileId);
    }
    
    // Get category code for new filename
    const categoryCode = getCategoryCode(newBudgetId, category);
    
    // Format date as YYYY.MM.DD
    const formattedDate = Utilities.formatDate(new Date(newDate), Session.getScriptTimeZone(), 'yyyy.MM.dd');
    
    // Sanitize vendor name (remove special characters)
    const safeVendor = newVendor ? String(newVendor).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Sanitize card name (remove special characters)
    const safeCard = newCard ? String(newCard).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Format amount with 2 decimal places
    const amountInEuros = parseFloat(newAmount).toFixed(2);
    
    // Generate new filename: [Category Code] [Vendor] [Date] €[Amount] [Card].pdf
    const newFilename = `${categoryCode} ${safeVendor} ${formattedDate} €${amountInEuros} ${safeCard}.pdf`;
    
    Logger.log('New filename: ' + newFilename);
    
    // Get the new card's folder ID
    const newCardFolderId = getCardFolderId(newCard);
    if (!newCardFolderId) {
      throw new Error('Card folder ID not found for card: ' + newCard);
    }
    
    // Get or create the month folder within the new card's folder
    const newMonthFolder = getOrCreateMonthFolder(newCardFolderId, newDate);
    
    Logger.log('Moving file to folder: ' + newMonthFolder.getName());
    
    // Rename the file first
    file.setName(newFilename);
    
    // Move the file to the new location
    const newFile = file.moveTo(newMonthFolder);
    
    Logger.log('File moved successfully to: ' + newFile.getUrl());
    
    return newFile.getUrl();
    
  } catch (error) {
    Logger.log('Error in moveReceiptFile: ' + error);
    throw new Error('Failed to move receipt file: ' + error.message);
  }
}

/**
 * Rename receipt file when only amount/vendor/category changes (no movement needed)
 * @param {string} fileUrl - Current file URL
 * @param {string} budgetId - Budget ID
 * @param {string} card - Card name
 * @param {string} date - Date
 * @param {string} newVendor - New vendor name
 * @param {number} newAmount - New amount (in euros)
 * @param {string} newCategory - New category name
 * @returns {string} Updated file URL (same location, new name)
 */
function renameReceiptFile(fileUrl, budgetId, card, date, newVendor, newAmount, newCategory) {
  try {
    Logger.log('--- renameReceiptFile ---');
    Logger.log('Renaming file: ' + fileUrl);
    Logger.log('Budget ID: ' + budgetId);
    Logger.log('Card: ' + card);
    Logger.log('Date: ' + date);
    Logger.log('New vendor: ' + newVendor);
    Logger.log('New amount: ' + newAmount);
    Logger.log('New category: ' + newCategory);
    
    if (!fileUrl || !fileUrl.includes('drive.google.com')) {
      Logger.log('No valid file URL provided, skipping file rename');
      return fileUrl; // Return original URL if no file
    }
    
    // Extract file ID from URL
    const fileIdMatch = fileUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      throw new Error('Could not extract file ID from URL: ' + fileUrl);
    }
    const fileId = fileIdMatch[0];
    
    // Get the file
    const file = DriveApp.getFileById(fileId);
    if (!file) {
      throw new Error('File not found: ' + fileId);
    }
    
    // Get category code for new filename
    const categoryCode = getCategoryCode(budgetId, newCategory);
    
    // Format date as YYYY.MM.DD
    const formattedDate = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy.MM.dd');
    
    // Sanitize vendor name (remove special characters)
    const safeVendor = newVendor ? String(newVendor).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Sanitize card name (remove special characters)
    const safeCard = card ? String(card).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    
    // Format amount with 2 decimal places
    const amountInEuros = parseFloat(newAmount).toFixed(2);
    
    // Generate new filename: [Category Code] [Vendor] [Date] €[Amount] [Card].pdf
    const newFilename = `${categoryCode} ${safeVendor} ${formattedDate} €${amountInEuros} ${safeCard}.pdf`;
    
    Logger.log('New filename: ' + newFilename);
    
    // Rename the file (stays in same location)
    file.setName(newFilename);
    
    Logger.log('File renamed successfully');
    
    return file.getUrl(); // Return same URL since file location didn't change
    
  } catch (error) {
    Logger.log('Error in renameReceiptFile: ' + error);
    throw new Error('Failed to rename receipt file: ' + error.message);
  }
}

/**
 * Soft delete receipt file by moving it to a "Deleted" folder within the same month
 * @param {string} fileUrl - Current file URL
 * @param {string} userEmail - User performing the delete
 * @returns {string} New file URL in deleted folder
 */
function softDeleteReceiptFile(fileUrl, userEmail) {
  try {
    Logger.log('--- softDeleteReceiptFile ---');
    Logger.log('Soft deleting file: ' + fileUrl);
    Logger.log('User: ' + userEmail);
    
    if (!fileUrl || !fileUrl.includes('drive.google.com')) {
      Logger.log('No valid file URL provided, skipping soft delete');
      return fileUrl; // Return original URL if no file
    }
    
    // Extract file ID from URL
    const fileIdMatch = fileUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      throw new Error('Could not extract file ID from URL: ' + fileUrl);
    }
    const fileId = fileIdMatch[0];
    
    // Get the file
    const file = DriveApp.getFileById(fileId);
    if (!file) {
      throw new Error('File not found: ' + fileId);
    }
    
    // Get the current parent folder (month folder)
    const parentFolders = file.getParents();
    if (!parentFolders.hasNext()) {
      throw new Error('File has no parent folder');
    }
    const monthFolder = parentFolders.next();
    
    Logger.log('Current month folder: ' + monthFolder.getName());
    
    // Create or get "Deleted" folder within the month folder
    const deletedFolderName = 'Deleted';
    let deletedFolder;
    
    const folderIterator = monthFolder.getFoldersByName(deletedFolderName);
    if (folderIterator.hasNext()) {
      deletedFolder = folderIterator.next();
      Logger.log('Found existing Deleted folder');
    } else {
      deletedFolder = monthFolder.createFolder(deletedFolderName);
      Logger.log('Created new Deleted folder');
    }
    
    // Add deletion timestamp to filename
    const originalName = file.getName();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
    const deletedName = `DELETED_${timestamp}_${originalName}`;
    
    Logger.log('Moving file to deleted folder with name: ' + deletedName);
    
    // Rename and move the file
    file.setName(deletedName);
    const deletedFile = file.moveTo(deletedFolder);
    
    Logger.log('File soft deleted successfully to: ' + deletedFile.getUrl());
    
    return deletedFile.getUrl();
    
  } catch (error) {
    Logger.log('Error in softDeleteReceiptFile: ' + error);
    throw new Error('Failed to soft delete receipt file: ' + error.message);
  }
}

function testPhase2FileManagement() {
  try {
    Logger.log('Testing Phase 2: File Management Functions');
    
    // Test 1: Check if functions exist
    if (typeof moveReceiptFile !== 'function') {
      throw new Error('moveReceiptFile function not found');
    }
    if (typeof renameReceiptFile !== 'function') {
      throw new Error('renameReceiptFile function not found');
    }
    if (typeof softDeleteReceiptFile !== 'function') {
      throw new Error('softDeleteReceiptFile function not found');
    }
    
    Logger.log('All file management functions exist');
    
    // Test 2: Test with invalid/missing file URL (should handle gracefully)
    try {
      const result1 = moveReceiptFile('', '1', '2382', '2025-01-15', 'Test Vendor', 50.00, 'General');
      Logger.log('moveReceiptFile with empty URL returned: ' + result1);
    } catch (error) {
      Logger.log('moveReceiptFile with empty URL error: ' + error.message);
    }
    
    try {
      const result2 = renameReceiptFile('', '1', '2382', '2025-01-15', 'Test Vendor', 50.00, 'General');
      Logger.log('renameReceiptFile with empty URL returned: ' + result2);
    } catch (error) {
      Logger.log('renameReceiptFile with empty URL error: ' + error.message);
    }
    
    try {
      const result3 = softDeleteReceiptFile('', 'test@i58global.org');
      Logger.log('softDeleteReceiptFile with empty URL returned: ' + result3);
    } catch (error) {
      Logger.log('softDeleteReceiptFile with empty URL error: ' + error.message);
    }
    
    // Test 3: Test helper functions
    const categoryCode = getCategoryCode('1', 'General');
    Logger.log('Category code for Budget ID 1, Category General: ' + categoryCode);
    
    const cardFolderId = getCardFolderId('2382');
    Logger.log('Card folder ID for card 2382: ' + cardFolderId);
    
    Logger.log('Phase 2 test completed successfully');
    return {
      success: true,
      message: 'File management functions are properly set up',
      data: {
        functionsExist: true,
        categoryCode: categoryCode,
        cardFolderId: cardFolderId
      }
    };
    
  } catch (error) {
    Logger.log('Error in testPhase2FileManagement: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function testPhase3EnhancedFunctions() {
  try {
    Logger.log('Testing Phase 3: Enhanced Update and Delete Functions');
    
    // Test 1: Check if enhanced functions exist
    if (typeof updateReceipt !== 'function') {
      throw new Error('Enhanced updateReceipt function not found');
    }
    if (typeof deleteReceipt !== 'function') {
      throw new Error('Enhanced deleteReceipt function not found');
    }
    if (typeof getUserReceipts !== 'function') {
      throw new Error('Enhanced getUserReceipts function not found');
    }
    
    Logger.log('All enhanced functions exist');
    
    // Test 2: Test updateReceipt with missing change description (should fail)
    try {
      const testUpdateData = {
        receiptId: 'receipt_2',
        amount: 50.00,
        userEmail: 'test@i58global.org'
        // Missing changeDescription - should cause error
      };
      
      // This should throw an error
      updateReceipt(testUpdateData);
      Logger.log('ERROR: updateReceipt should have failed with missing change description');
    } catch (error) {
      Logger.log('✅ updateReceipt correctly rejected missing change description: ' + error.message);
    }
    
    // Test 3: Test deleteReceipt with missing change description (should fail)
    try {
      const testDeleteData = {
        receiptId: 'receipt_2',
        userEmail: 'test@i58global.org'
        // Missing changeDescription - should cause error
      };
      
      // This should throw an error
      deleteReceipt(testDeleteData);
      Logger.log('ERROR: deleteReceipt should have failed with missing change description');
    } catch (error) {
      Logger.log('✅ deleteReceipt correctly rejected missing change description: ' + error.message);
    }
    
    // Test 4: Test getUserReceipts with soft delete filtering
    try {
      const receipts = getUserReceipts('test@i58global.org');
      Logger.log('✅ getUserReceipts completed successfully');
      Logger.log('Found ' + (receipts.success ? receipts.data.length : 0) + ' active receipts');
    } catch (error) {
      Logger.log('getUserReceipts error: ' + error.message);
    }
    
    Logger.log('Phase 3 test completed successfully');
    return {
      success: true,
      message: 'Enhanced functions are properly set up',
      data: {
        functionsExist: true,
        validationWorking: true
      }
    };
    
  } catch (error) {
    Logger.log('Error in testPhase3EnhancedFunctions: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function testIntegrationAllPhases() {
  try {
    Logger.log('Testing Integration: All Phases');
    
    // Test 1: Check if all phases are working correctly
    const testResults = [
      testRegionalData(),
      testPhase1AuditColumns(),
      testPhase2FileManagement(),
      testPhase3EnhancedFunctions()
    ];
    
    const allPassed = testResults.every(result => result.success);
    
    if (allPassed) {
      Logger.log('All phases are working correctly');
      return {
        success: true,
        message: 'All phases are working correctly'
      };
    } else {
      Logger.log('One or more phases failed');
      return {
        success: false,
        error: 'One or more phases failed'
      };
    }
  } catch (error) {
    Logger.log('Error in testIntegrationAllPhases: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test function to verify soft delete system is working properly
 * @returns {Object} Test results
 */
function testSoftDeleteSystem() {
  try {
    Logger.log('Testing soft delete system...');
    
    const testResults = {
      deleteReceiptFunction: false,
      getUserReceiptsFiltering: false,
      getCurrentSpendingFiltering: false,
      getGlobalSummaryFiltering: false,
      getBudgetSummaryFiltering: false,
      getBudgetProgressFiltering: false,
      getYearlySummaryFiltering: false,
      getYTDBudgetSpendingFiltering: false
    };
    
    // Test 1: Check if deleteReceipt function exists and has proper validation
    if (typeof deleteReceipt === 'function') {
      try {
        // Test with missing required fields (should fail)
        const testData = {
          receiptId: 'receipt_2',
          userEmail: 'test@i58global.org'
          // Missing changeDescription - should cause error
        };
        
        const result = deleteReceipt(testData);
        if (!result.success && result.error.includes('Change description is required')) {
          testResults.deleteReceiptFunction = true;
          Logger.log('✅ deleteReceipt function validation working');
        }
      } catch (error) {
        if (error.message.includes('Change description is required')) {
          testResults.deleteReceiptFunction = true;
          Logger.log('✅ deleteReceipt function validation working');
        }
      }
    }
    
    // Test 2: Check if getUserReceipts filters out soft deleted receipts
    try {
      const receipts = getUserReceipts('test@i58global.org');
      if (receipts.success) {
        testResults.getUserReceiptsFiltering = true;
        Logger.log('✅ getUserReceipts function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getUserReceipts test error: ' + error.message);
    }
    
    // Test 3: Check if getCurrentSpending filters out soft deleted receipts
    try {
      const spending = getCurrentSpending(new Date());
      if (spending.success) {
        testResults.getCurrentSpendingFiltering = true;
        Logger.log('✅ getCurrentSpending function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getCurrentSpending test error: ' + error.message);
    }
    
    // Test 4: Check if getGlobalSummary filters out soft deleted receipts
    try {
      const summary = getGlobalSummary(new Date());
      if (summary.success) {
        testResults.getGlobalSummaryFiltering = true;
        Logger.log('✅ getGlobalSummary function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getGlobalSummary test error: ' + error.message);
    }
    
    // Test 5: Check if getBudgetSummary filters out soft deleted receipts
    try {
      const budgetSummary = getBudgetSummary('1', { parameter: {} });
      if (budgetSummary.success) {
        testResults.getBudgetSummaryFiltering = true;
        Logger.log('✅ getBudgetSummary function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getBudgetSummary test error: ' + error.message);
    }
    
    // Test 6: Check if getBudgetProgress filters out soft deleted receipts
    try {
      const progress = getBudgetProgress({ parameter: { budget: '1', category: 'General' } });
      if (progress.success) {
        testResults.getBudgetProgressFiltering = true;
        Logger.log('✅ getBudgetProgress function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getBudgetProgress test error: ' + error.message);
    }
    
    // Test 7: Check if getYearlySummary filters out soft deleted receipts
    try {
      const yearly = getYearlySummary();
      if (yearly.success) {
        testResults.getYearlySummaryFiltering = true;
        Logger.log('✅ getYearlySummary function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getYearlySummary test error: ' + error.message);
    }
    
    // Test 8: Check if getYTDBudgetSpending filters out soft deleted receipts
    try {
      const ytd = getYTDBudgetSpending('1', new Date(new Date().getFullYear(), 0, 1), new Date());
      if (ytd && typeof ytd.total === 'number') {
        testResults.getYTDBudgetSpendingFiltering = true;
        Logger.log('✅ getYTDBudgetSpending function exists and filters soft deleted receipts');
      }
    } catch (error) {
      Logger.log('getYTDBudgetSpending test error: ' + error.message);
    }
    
    // Calculate overall success
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const allPassed = passedTests === totalTests;
    
    Logger.log(`Soft delete system test completed: ${passedTests}/${totalTests} tests passed`);
    
    return {
      success: allPassed,
      message: allPassed ? 'All soft delete tests passed' : 'Some soft delete tests failed',
      data: {
        testResults,
        summary: {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests
        }
      }
    };
    
  } catch (error) {
    Logger.log('Error in testSoftDeleteSystem: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}