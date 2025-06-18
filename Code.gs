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
        default:
          throw new Error('Invalid action: ' + action);
      }
    } else {
      // Handle legacy receipt submission (no action specified)
      Logger.log('Processing receipt submission');
      const { amount, date, description, budget, category, pdf, vendor, card, startDate, endDate } = data;
      
      // Log received data (excluding pdf data for brevity)
      Logger.log('Received receipt data: ' + JSON.stringify({
        amount,
        date,
        description,
        budget,
        category,
        hasPdf: !!pdf,
        vendor,
        card
      }));
      
      Logger.log('About to validate required fields');
      if (!amount || !date || !budget || !category || !vendor) {
        Logger.log('Missing required fields: ' + JSON.stringify({
          hasAmount: !!amount,
          hasDate: !!date,
          hasBudget: !!budget,
          hasCategory: !!category,
          hasVendor: !!vendor
        }));
        throw new Error('Missing required fields: amount, date, budget, category, and vendor are required.');
      }
      Logger.log('All required fields present');

      // Handle file upload if provided
      let fileUrl = '';
      if (pdf) {
        try {
          Logger.log('Processing file data...');
          fileUrl = saveReceiptFile(pdf, date, amount, budget, category, vendor, card, data.pdfIsNative, data.fileType);
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
          budget,
          category,
          photoUrl: fileUrl,
          monthlyExpense: data.monthlyExpense || false,
          vendor,
          card: card || '',
          startDate: startDate || '',
          endDate: endDate || '',
          userEmail: data.userEmail || '',
          userName: data.userName || ''
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
          budget,
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

function saveReceiptFile(fileData, date, amount, budget, category, vendor, card, isNativeFile, fileType) {
  try {
    Logger.log('Starting file save process...');
    // Format: (category code) (vendor) (yyyy.MM.dd) (amount) (card).pdf
    const formattedDate = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy.MM.dd');
    const safeVendor = vendor ? String(vendor).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    const safeCard = card ? String(card).replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    const categoryCode = getCategoryCode(budget, category);
    const filename = `${categoryCode} ${safeVendor} ${formattedDate} ${amount} ${safeCard}.pdf`;

    const receiptsFolder = DriveApp.getFolderById('1UgxVCOo-IH50hJfTty5xiuJ-sj2zeWWP');

    // If the file is a native PDF, save it directly
    if (isNativeFile) {
      // fileData is base64-encoded file - save as PDF
      const fileBlob = Utilities.newBlob(Utilities.base64Decode(fileData), 'application/pdf', filename);
      const finalFile = receiptsFolder.createFile(fileBlob);
      Logger.log('File saved directly as PDF (native upload)');
      return finalFile.getUrl();
    }

    // Otherwise, use CloudConvert to convert image to PDF
    try {
      // Determine the appropriate file extension based on file type
      let fileExtension = '.jpg'; // default for images
      if (fileType) {
        if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xlsx') || fileType.includes('xls')) {
          fileExtension = '.xlsx';
        } else if (fileType.includes('word') || fileType.includes('document') || fileType.includes('docx') || fileType.includes('doc')) {
          fileExtension = '.docx';
        } else if (fileType.includes('image/')) {
          fileExtension = '.' + fileType.split('/')[1];
        }
      }
      
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
      const finalFile = receiptsFolder.createFile(pdfBlob);
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

function logToSheet(data) {
  try {
    Logger.log('Starting sheet logging process...');
    Logger.log('Data to log:', data);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      Logger.log('Receipt log sheet not found');
      throw new Error('Receipt log sheet not found');
    }
    Logger.log('Sheet accessed successfully');

    // Ensure all required columns exist
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let monthlyExpenseCol = headers.indexOf('Monthly Expense') + 1;
    if (monthlyExpenseCol === 0) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('Monthly Expense');
      monthlyExpenseCol = headers.length + 1;
    }
    let startDateCol = headers.indexOf('Start Date') + 1;
    if (startDateCol === 0) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('Start Date');
      startDateCol = headers.length + 1;
    }
    let endDateCol = headers.indexOf('End Date') + 1;
    if (endDateCol === 0) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('End Date');
      endDateCol = headers.length + 1;
    }
    let userEmailCol = headers.indexOf('User Email') + 1;
    if (userEmailCol === 0) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('User Email');
      userEmailCol = headers.length + 1;
    }
    let userNameCol = headers.indexOf('User Name') + 1;
    if (userNameCol === 0) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('User Name');
      userNameCol = headers.length + 1;
    }

    const row = [
      new Date(data.date),
      data.amount,
      data.description,
      data.budget,
      data.category,
      data.photoUrl || '',
      new Date(), // Timestamp
      data.monthlyExpense ? 'TRUE' : 'FALSE',
      data.vendor || '',
      data.card || '',
      data.startDate || '',
      data.endDate || '',
      data.userEmail || '',
      data.userName || ''
    ];
    // If the sheet has more columns, fill in empty values for missing columns
    while (row.length < sheet.getLastColumn()) {
      row.push('');
    }
    Logger.log('Row to append:', row);

    sheet.appendRow(row);
    Logger.log('Row appended successfully');
  } catch (error) {
    Logger.log('Error in logToSheet: ' + error);
    Logger.log('Error stack: ' + error.stack);
    throw new Error('Failed to log to sheet: ' + error.message);
  }
}

function initializeSheets() {
  try {
    Logger.log('Initializing sheets...');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Initialize Budgets sheet
    let budgetSheet = spreadsheet.getSheetByName('Budgets');
    if (!budgetSheet) {
      Logger.log('Creating Budgets sheet...');
      budgetSheet = spreadsheet.insertSheet('Budgets');
      budgetSheet.getRange('A1:D1').setValues([['Name', 'Code', 'Monthly Limit', 'Active']]);
      // Add a default budget
      budgetSheet.getRange('A2:D2').setValues([['Default', 'DEF', 1000, true]]);
    }

    // Initialize Categories sheet
    let categorySheet = spreadsheet.getSheetByName('Categories');
    if (!categorySheet) {
      Logger.log('Creating Categories sheet...');
      categorySheet = spreadsheet.insertSheet('Categories');
      categorySheet.getRange('A1:E1').setValues([['Budget Name', 'Name', 'Code', 'Monthly Limit', 'Active']]);
      // Add a default category
      categorySheet.getRange('A2:E2').setValues([['Default', 'General', 'GEN', 500, true]]);
    }

    // Initialize receipt_log sheet
    let receiptSheet = spreadsheet.getSheetByName('receipt_log');
    if (!receiptSheet) {
      Logger.log('Creating receipt_log sheet...');
      receiptSheet = spreadsheet.insertSheet('receipt_log');
      receiptSheet.getRange('A1:N1').setValues([['Date', 'Amount', 'Description', 'Budget', 'Category', 'Photo URL', 'Timestamp', 'Monthly Expense', 'Vendor', 'Card', 'Start Date', 'End Date', 'User Email', 'User Name']]);
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
    
    const data = sheet.getRange(1, 1, lastRow, 3).getValues();
    const headers = data.shift();
    const result = data.map(row => ({
      card: row[0],
      assignee: row[1],
      location: row[2],
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
        budgetNames: staticDataCache.budgetNames
      }
    };
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
    
    if (!snapSheet) {
      throw new Error('MonthlyBudgetSnapshot sheet not found');
    }

    const now = new Date();
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    Logger.log('Getting static data for month: ' + monthStr);
    
    // Get data from MonthlyBudgetSnapshot for current month
    const currentMonthData = snapSheet.getRange(1, 1, snapSheet.getLastRow(), 4).getValues();
    const filteredSnapData = currentMonthData.filter(row => {
      const cellDate = new Date(row[0]);
      const cellMonthStr = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM');
      return cellMonthStr === monthStr;
    });
    
    // Calculate totals from snapshot
    const budgetLimits = {};
    const allCategories = [];
    const budgetNames = [];
    
    filteredSnapData.forEach(row => {
      const budget = String(row[1]).trim();
      const category = String(row[2]).trim();
      const amount = Number(String(row[3]).replace(/[€,]/g, '').trim()) || 0;

      if (!budgetLimits[budget]) {
        budgetLimits[budget] = { total: 0, categories: {} };
        budgetNames.push(budget);
      }

      if (!category) { // Budget level (total)
        budgetLimits[budget].total = amount;
      } else { // Category level
        budgetLimits[budget].categories[category] = amount;
        allCategories.push({
          budgetName: budget,
          name: category,
          code: category.substring(0, 3).toUpperCase(),
          monthlyLimit: amount,
          active: true
        });
      }
    });

    const result = {
      success: true,
      data: {
        budgetLimits,
        categories: allCategories,
        budgetNames: budgetNames.map(name => ({ name }))
      }
    };
    
    // Cache the result
    staticDataCache.budgetLimits = budgetLimits;
    staticDataCache.categories = allCategories;
    staticDataCache.budgetNames = budgetNames.map(name => ({ name }));
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
    const budget = e.parameter.budget;
    const category = e.parameter.category;
    
    if (!budget || !category) {
      throw new Error('Budget and category are required');
    }
    Logger.log('Processing for budget: ' + budget + ' category: ' + category);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receiptSheet = spreadsheet.getSheetByName('receipt_log');
    const snapshotSheet = spreadsheet.getSheetByName('MonthlyBudgetSnapshot');

    if (!receiptSheet || !snapshotSheet) {
      throw new Error('Required sheets not found');
    }

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
      if (row[1] === budget) {
        monthlyLimit = Number(row[2]) || 0;
        Logger.log('Found monthly limit: ' + monthlyLimit);
      } else if (row[2] === category) {
        categoryLimit = Number(row[3]) || 0;
        Logger.log('Found category limit: ' + categoryLimit);
      }
    }
    Logger.log('Final limits - Monthly: ' + monthlyLimit + ' Category: ' + categoryLimit);

    // Get all receipts for the current month
    const receipts = receiptSheet.getDataRange().getValues();
    const headers = receipts.shift();

    // Calculate total spent for the budget
    const totalSpent = receipts.reduce((sum, row) => {
      const date = new Date(row[0]);
      if (row[3] === budget && date >= startOfMonth && date <= endOfMonth) {
        return sum + Number(row[1]);
      }
      return sum;
    }, 0);

    // Calculate category spent
    const categorySpent = receipts.reduce((sum, row) => {
      const date = new Date(row[0]);
      if (row[3] === budget && row[4] === category && date >= startOfMonth && date <= endOfMonth) {
        return sum + Number(row[1]);
      }
      return sum;
    }, 0);

    return {
      success: true,
      data: {
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
function getCategoryCode(budgetName, categoryName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Categories');
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header
  const row = data.find(row => row[0] === budgetName && row[1] === categoryName);
  return row ? row[2] : '';
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
    
    // Filter for current month receipts
    currentMonthReceipts = currentMonthReceipts.filter(row => {
      const date = new Date(row[0]);
      const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
      const startDateStr = row[10] || '';
      const endDateStr = row[11] || '';
      
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
    
    currentMonthReceipts = receipts.filter(row => {
      const date = new Date(row[0]);
      const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
      const startDateStr = row[10] || '';
      const endDateStr = row[11] || '';
      
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
    const budget = row[3];
    const category = row[4];
    
    totalSpent += amount;
    receiptsCount++;
    if (!spending[budget]) {
      spending[budget] = {
        total: 0,
        categories: {}
      };
    }
    spending[budget].total += amount;
    if (!spending[budget].categories[category]) {
      spending[budget].categories[category] = 0;
    }
    spending[budget].categories[category] += amount;
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

function getBudgetSummary(budgetName, e) {
  Logger.log('Starting getBudgetSummary for budget: ' + budgetName);
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
  const snapshotSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MonthlyBudgetSnapshot');
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header

  const now = parseDateParam(e);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const budgetYearStart = getBudgetYearStart(now);
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  Logger.log('Processing snapshot for month: ' + monthStr);

  // Get snapshot data for this budget
  const snapshotData = snapshotSheet.getDataRange().getValues();
  // snapshotData.shift(); // remove header (commented out because there is no header row)
  const categoryLimits = {};
  let totalBudgeted = 0;

  // Process snapshot data
  Logger.log('Processing snapshot data for budget: ' + budgetName);
  snapshotData.forEach(row => {
    if (row[0] === monthStr && row[1] === budgetName) {
      if (row[2] === '') { // Budget level
        totalBudgeted = Number(row[3]) || 0;
        Logger.log('Found total budgeted amount: ' + totalBudgeted);
      } else { // Category level
        categoryLimits[row[2]] = Number(row[3]) || 0;
        Logger.log('Found category limit: ' + row[2] + ' = ' + (Number(row[3]) || 0));
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
  data.shift(); // remove header

  const now = new Date();
  const year = now.getFullYear();
  const daysElapsed = Math.floor((now - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;

  // Monthly spend for each month (Jan=0)
  const monthlySpend = Array(12).fill(0);
  let totalSpent = 0;

  data.forEach(row => {
    const date = new Date(row[0]);
    const amount = Number(row[1]);
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
  Logger.log('=== doGet called ===');
  Logger.log('Request parameters:', JSON.stringify(e.parameter));
  
  try {
    const action = e.parameter.action;
    Logger.log('Action requested:', action);
    
    let response;
    switch (action) {
      case 'getGlobalSummary':
        Logger.log('Calling getGlobalSummary...');
        const date = e.parameter.date ? new Date(e.parameter.date) : new Date();
        response = getGlobalSummary(date);
        Logger.log('getGlobalSummary completed');
        break;
      case 'getStaticData':
        Logger.log('Calling getStaticData...');
        response = getStaticData();
        Logger.log('getStaticData completed');
        break;
      case 'getCurrentSpending':
        Logger.log('Calling getCurrentSpending...');
        const spendingDate = e.parameter.date ? new Date(e.parameter.date) : new Date();
        response = getCurrentSpending(spendingDate);
        Logger.log('getCurrentSpending completed');
        break;
      case 'getCards':
        Logger.log('Calling getCards...');
        response = getCards();
        Logger.log('getCards completed');
        break;
      case 'getBudgetSummary':
        Logger.log('Getting budget summary for:', e.parameter.budget);
        response = getBudgetSummary(e.parameter.budget, e);
        break;
      case 'getBudgetProgress':
        Logger.log('Getting budget progress');
        response = getBudgetProgress(e);
        break;
      case 'getYearlySummary':
        Logger.log('Getting yearly summary');
        response = getYearlySummary();
        break;
      case 'invalidateCache':
        Logger.log('Invalidating cache...');
        invalidateAllCaches();
        response = { success: true, message: 'Cache invalidated successfully' };
        break;
      case 'getUserReceipts':
        Logger.log('Getting user receipts for:', e.parameter.userEmail);
        response = getUserReceipts(e.parameter.userEmail);
        break;
      case 'getFlexibleBudgetCalculation':
        response = getFlexibleBudgetCalculation(e);
        break;
      case 'processFlexibleBudgetSnapshot':
        response = processFlexibleBudgetSnapshotAPI(e);
        break;
      case 'testFlexibleBudgetCalculation':
        response = testFlexibleBudgetCalculationAPI(e);
        break;
      case 'getAllFlexibleBudgetCalculations':
        response = getAllFlexibleBudgetCalculations(e);
        break;
      default:
        Logger.log('Invalid action:', e.parameter.action);
        throw new Error('Invalid action: ' + action);
    }
    
    Logger.log('Response prepared:', JSON.stringify(response).substring(0, 200) + '...');
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
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
function snapshotMonthlyBudgets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const catSheet = ss.getSheetByName('Categories');
  const budSheet = ss.getSheetByName('Budgets');
  let snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  if (!snapSheet) {
    snapSheet = ss.insertSheet('MonthlyBudgetSnapshot');
    snapSheet.hideSheet();
    snapSheet.appendRow(['Month', 'Budget', 'Category', 'Limit']);
  }
  const now = new Date();
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  const catData = catSheet.getDataRange().getValues();
  catData.shift(); // remove header
  catData.forEach(row => {
    const budget = row[0];
    const category = row[1];
    const limit = Number(row[3]) || 0;
    snapSheet.appendRow([monthStr, budget, category, limit]);
  });
  // Optionally snapshot budget-level limits too
  const budData = budSheet.getDataRange().getValues();
  budData.shift();
  budData.forEach(row => {
    const budget = row[0];
    const limit = Number(row[2]) || 0;
    snapSheet.appendRow([monthStr, budget, '', limit]);
  });
}

function getMonthlyCategoryLimit(budget, category, now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  if (!snapSheet) return null;
  
  // Ensure now is a Date object
  const date = now instanceof Date ? now : new Date(now);
  const monthStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
  
  Logger.log('Getting monthly category limit for budget: ' + budget + ' category: ' + category + ' month: ' + monthStr);
  
  const data = snapSheet.getDataRange().getValues();
  // data.shift(); // remove header (commented out because there is no header row)
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (row[0] === monthStr && row[1] === budget && row[2] === category) {
      const limit = Number(row[3]) || 0;
      Logger.log('Found category limit: ' + limit);
      return limit;
    }
  }
  Logger.log('No category limit found');
  return null;
}

// OLD VERSION - NO LONGER USED
// function getMonthlyBudgetLimit(budgetName, now) {
//   const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Budgets');
//   const data = sheet.getDataRange().getValues();
//   const headers = data.shift();
//   const budgetRow = data.find(row => row[0] === budgetName);
//   if (budgetRow) {
//     const monthlyLimit = Number(budgetRow[2]);
//     return monthlyLimit;
//   }
//   return 0;
// } 

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
    
    const currentMonthReceipts = receipts.filter(row => {
      const date = new Date(row[0]);
      const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
      const startDateStr = row[10] || '';
      const endDateStr = row[11] || '';
      
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
      const amount = Number(row[1]) || 0;
      const budget = row[3];
      const category = row[4];
      
      totalSpent += amount;
      receiptsCount++;
      if (!spending[budget]) {
        spending[budget] = {
          total: 0,
          categories: {}
        };
      }
      spending[budget].total += amount;
      if (!spending[budget].categories[category]) {
        spending[budget].categories[category] = 0;
      }
      spending[budget].categories[category] += amount;
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
  staticDataCache.timestamp = 0;
  globalSummaryCache.data = null;
  globalSummaryCache.timestamp = 0;
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
    
    Logger.log('Column positions found:', {
      dateCol,
      amountCol,
      vendorCol,
      budgetCol,
      categoryCol,
      cardCol,
      userEmailCol,
      userNameCol
    });
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found in receipt log');
    }
    
    // Filter receipts for the specific user - check both columns
    const userReceipts = data
      .map((row, originalIndex) => {
        const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
        const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
        
        Logger.log(`Checking row ${originalIndex + 2} - User Email: "${rowUserEmail}", User Name: "${rowUserName}" against: "${userEmail}"`);
        
        // Check if the email matches in either column
        const isUserReceipt = rowUserEmail === userEmail || rowUserName === userEmail;
        
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
    
    Logger.log(`Found ${userReceipts.length} receipts for user ${userEmail}`);
    
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

function updateReceipt(data) {
  try {
    Logger.log('Updating receipt:', data);
    
    const { receiptId, amount, vendor, budget, category, card, userEmail } = data;
    
    if (!receiptId || !userEmail) {
      throw new Error('Receipt ID and user email are required');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData.shift();
    
    // Find column indices dynamically
    const amountCol = headers.indexOf('Amount');
    const vendorCol = headers.indexOf('Vendor');
    const budgetCol = headers.indexOf('Budget');
    const categoryCol = headers.indexOf('Category');
    const cardCol = headers.indexOf('Card');
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found');
    }
    
    // Find the receipt to update (by receiptId and userEmail in either column)
    const receiptIndex = sheetData.findIndex((row, index) => {
      const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
      const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
      
      // Check if the email matches in either column
      const emailMatches = rowUserEmail === userEmail || rowUserName === userEmail;
      
      return emailMatches && `receipt_${index + 2}` === receiptId;
    });
    
    if (receiptIndex === -1) {
      throw new Error('Receipt not found or access denied');
    }
    
    // Update the receipt data
    const rowIndex = receiptIndex + 2; // +2 because we removed header and arrays are 0-indexed
    if (amount !== undefined) sheet.getRange(rowIndex, amountCol + 1).setValue(amount);
    if (vendor !== undefined) sheet.getRange(rowIndex, vendorCol + 1).setValue(vendor);
    if (budget !== undefined) sheet.getRange(rowIndex, budgetCol + 1).setValue(budget);
    if (category !== undefined) sheet.getRange(rowIndex, categoryCol + 1).setValue(category);
    if (card !== undefined) sheet.getRange(rowIndex, cardCol + 1).setValue(card);
    
    Logger.log('Receipt updated successfully');
    
    return {
      success: true,
      message: 'Receipt updated successfully'
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
    Logger.log('Deleting receipt:', data);
    
    const { receiptId, userEmail } = data;
    
    if (!receiptId || !userEmail) {
      throw new Error('Receipt ID and user email are required');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      throw new Error('Receipt log sheet not found');
    }
    
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData.shift();
    
    // Find column indices dynamically
    const userEmailCol = headers.indexOf('User Email');
    const userNameCol = headers.indexOf('User Name');
    
    if (userEmailCol === -1 && userNameCol === -1) {
      throw new Error('Neither User Email nor User Name column found');
    }
    
    // Find the receipt to delete (by receiptId and userEmail in either column)
    const receiptIndex = sheetData.findIndex((row, index) => {
      const rowUserEmail = userEmailCol !== -1 ? row[userEmailCol] : '';
      const rowUserName = userNameCol !== -1 ? row[userNameCol] : '';
      
      // Check if the email matches in either column
      const emailMatches = rowUserEmail === userEmail || rowUserName === userEmail;
      
      return emailMatches && `receipt_${index + 2}` === receiptId;
    });
    
    if (receiptIndex === -1) {
      throw new Error('Receipt not found or access denied');
    }
    
    // Delete the row (add 2 because we removed header and arrays are 0-indexed)
    const rowIndex = receiptIndex + 2;
    sheet.deleteRow(rowIndex);
    
    Logger.log('Receipt deleted successfully');
    
    return {
      success: true,
      message: 'Receipt deleted successfully'
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
function calculateFlexibleBudgetLimits(budgetName, currentDate) {
  try {
    Logger.log('Starting flexible budget calculation for: ' + budgetName);
    
    const budgetYearStart = getBudgetYearStart(currentDate);
    const currentMonth = currentDate.getMonth();
    const budgetYearStartMonth = budgetYearStart.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate months elapsed and total budget year months
    let monthsElapsed, totalBudgetYearMonths;
    
    if (currentYear === 2025) {
      // 2025: Fiscal year is July 1 - December 31 (6 months)
      if (currentMonth < 6) { // Before July (month 6)
        // Before fiscal year starts, no months elapsed
        monthsElapsed = 0;
        totalBudgetYearMonths = 6; // July through December
      } else {
        monthsElapsed = currentMonth - budgetYearStartMonth;
        totalBudgetYearMonths = 6; // July through December
      }
    } else {
      // 2026+: Fiscal year is January 1 - December 31 (12 months)
      monthsElapsed = currentMonth - budgetYearStartMonth;
      totalBudgetYearMonths = 12;
    }
    
    const remainingMonths = totalBudgetYearMonths - monthsElapsed;
    
    Logger.log('Budget year start: ' + budgetYearStart);
    Logger.log('Current month: ' + currentMonth + ', Budget year start month: ' + budgetYearStartMonth);
    Logger.log('Total budget year months: ' + totalBudgetYearMonths);
    Logger.log('Months elapsed: ' + monthsElapsed + ', Remaining months: ' + remainingMonths);
    
    // Get original budget limits
    const originalLimits = getOriginalBudgetLimits(budgetName);
    Logger.log('Original budget limits: ' + JSON.stringify(originalLimits));
    
    // Calculate YTD spending
    const ytdSpending = getYTDBudgetSpending(budgetName, budgetYearStart, currentDate);
    Logger.log('YTD spending: ' + JSON.stringify(ytdSpending));
    
    // Calculate available budget
    const totalBudgeted = originalLimits.total * monthsElapsed;
    const availableBudget = totalBudgeted - ytdSpending.total;
    
    Logger.log('Total budgeted YTD: ' + totalBudgeted);
    Logger.log('Available budget: ' + availableBudget);
    
    // Calculate redistribution per month
    const monthlyRedistribution = remainingMonths > 0 ? availableBudget / remainingMonths : 0;
    Logger.log('Monthly redistribution: ' + monthlyRedistribution);
    
    // Apply proportional redistribution to categories
    const newLimits = {};
    Object.entries(originalLimits.categories).forEach(([category, originalLimit]) => {
      const categoryWeight = originalLimit / originalLimits.total;
      const categoryRedistribution = monthlyRedistribution * categoryWeight;
      newLimits[category] = Math.max(0, originalLimit + categoryRedistribution);
      
      Logger.log('Category ' + category + ': Original=' + originalLimit + 
                ', Weight=' + categoryWeight.toFixed(3) + 
                ', Redistribution=' + categoryRedistribution.toFixed(2) + 
                ', New=' + newLimits[category]);
    });
    
    // Calculate new total budget limit
    const newTotalLimit = Object.values(newLimits).reduce((sum, limit) => sum + limit, 0);
    
    const result = {
      original: originalLimits,
      adjusted: {
        total: newTotalLimit,
        categories: newLimits
      },
      ytdSpending,
      availableBudget,
      monthlyRedistribution,
      remainingMonths,
      monthsElapsed,
      totalBudgeted,
      totalBudgetYearMonths
    };
    
    Logger.log('Flexible budget calculation result: ' + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log('Error in calculateFlexibleBudgetLimits: ' + error);
    throw error;
  }
}

/**
 * Get original budget limits from the Budgets and Categories sheets
 * @param {string} budgetName - Name of the budget
 * @returns {Object} Original budget limits
 */
function getOriginalBudgetLimits(budgetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const budSheet = ss.getSheetByName('Budgets');
  const catSheet = ss.getSheetByName('Categories');
  
  // Get budget total limit
  const budData = budSheet.getDataRange().getValues();
  const headers = budData.shift();
  const budgetRow = budData.find(row => row[0] === budgetName);
  const totalLimit = budgetRow ? Number(budgetRow[2]) || 0 : 0;
  
  // Get category limits
  const catData = catSheet.getDataRange().getValues();
  const catHeaders = catData.shift();
  const categoryLimits = {};
  
  catData.forEach(row => {
    if (row[0] === budgetName) {
      const category = row[1];
      const limit = Number(row[3]) || 0;
      categoryLimits[category] = limit;
    }
  });
  
  return {
    total: totalLimit,
    categories: categoryLimits
  };
}

/**
 * Get year-to-date spending for a budget from the start of budget year to current date
 * @param {string} budgetName - Name of the budget
 * @param {Date} budgetYearStart - Start of budget year
 * @param {Date} currentDate - Current date
 * @returns {Object} YTD spending data
 */
function getYTDBudgetSpending(budgetName, budgetYearStart, currentDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const receiptSheet = ss.getSheetByName('receipt_log');
  
  if (!receiptSheet) {
    throw new Error('Receipt log sheet not found');
  }
  
  const receipts = receiptSheet.getDataRange().getValues();
  const headers = receipts.shift();
  
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
      snapSheet.appendRow(['Month', 'Budget', 'Category', 'Limit']);
    }
    
    const now = new Date();
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    
    // Get all budgets
    const budData = budSheet.getDataRange().getValues();
    const headers = budData.shift();
    const budgets = budData.map(row => row[0]).filter(Boolean);
    
    Logger.log('Processing flexible budget snapshot for month: ' + monthStr);
    Logger.log('Budgets to process: ' + budgets.join(', '));
    
    // Process each budget
    budgets.forEach(budgetName => {
      try {
        Logger.log('Processing budget: ' + budgetName);
        
        // Calculate flexible budget limits
        const flexibleLimits = calculateFlexibleBudgetLimits(budgetName, now);
        
        // Add budget-level limit to snapshot
        snapSheet.appendRow([monthStr, budgetName, '', flexibleLimits.adjusted.total]);
        
        // Add category-level limits to snapshot
        Object.entries(flexibleLimits.adjusted.categories).forEach(([category, limit]) => {
          snapSheet.appendRow([monthStr, budgetName, category, limit]);
        });
        
        Logger.log('Added snapshot data for budget: ' + budgetName);
        
      } catch (error) {
        Logger.log('Error processing budget ' + budgetName + ': ' + error);
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
 * @param {string} budgetName - Budget to test (optional, tests all if not provided)
 */
function testFlexibleBudgetCalculation(budgetName = null) {
  try {
    const now = new Date();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    const budData = budSheet.getDataRange().getValues();
    const headers = budData.shift();
    const budgets = budData.map(row => row[0]).filter(Boolean);
    
    const testBudgets = budgetName ? [budgetName] : budgets;
    
    testBudgets.forEach(budget => {
      Logger.log('=== Testing Flexible Budget Calculation for: ' + budget + ' ===');
      const result = calculateFlexibleBudgetLimits(budget, now);
      Logger.log('Test result: ' + JSON.stringify(result, null, 2));
    });
    
  } catch (error) {
    Logger.log('Error in testFlexibleBudgetCalculation: ' + error);
    throw error;
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
    const budgetName = e.parameter.budget || null;
    const dateParam = e.parameter.date;
    
    const currentDate = parseDateParam(e);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    const budData = budSheet.getDataRange().getValues();
    const headers = budData.shift();
    const budgets = budData.map(row => row[0]).filter(Boolean);
    
    const testBudgets = budgetName ? [budgetName] : budgets;
    const results = {};
    
    testBudgets.forEach(budget => {
      try {
        results[budget] = calculateFlexibleBudgetLimits(budget, currentDate);
      } catch (error) {
        results[budget] = { error: error.toString() };
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
    const currentDate = parseDateParam(e);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const budSheet = ss.getSheetByName('Budgets');
    
    const budData = budSheet.getDataRange().getValues();
    const headers = budData.shift();
    const budgets = budData.map(row => row[0]).filter(Boolean);
    
    const results = {};
    
    budgets.forEach(budgetName => {
      try {
        results[budgetName] = calculateFlexibleBudgetLimits(budgetName, currentDate);
      } catch (error) {
        results[budgetName] = { error: error.toString() };
      }
    });
    
    return {
      success: true,
      data: {
        currentDate: currentDate,
        calculations: results
      }
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
    // Always use column A (0) for name, C (2) for monthly, D (3) for active
    const budgetsAnnual = {};
    budData.slice(1).forEach(row => { // skip header row
      const name = row[0];
      const monthly = parseFloat(String(row[2]).replace(/[^\d.\-]/g, '')) || 0;
      const active = String(row[3]).toLowerCase() === 'true';
      if (name && monthly && active) {
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