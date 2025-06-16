const SPREADSHEET_ID = '192l2fCPoenlXkZhzrHDIgR4AGOsj3eCGZ7BO8v96BtQ'; // Replace with your actual spreadsheet ID
const SHARED_DRIVE_ID = '1Dwe_Yed_lYcBLROFjoRhtwhCBS_gN4AM';
const CLOUDCONVERT_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNmZjZDkxZDFlMzJiYTMzZTQ3NjEyYTM1ODYxMGI2OTlhNDU2MWI2NDBlZGUwNDk2NjE4N2Y2ZTE0ODhjOWQ3YjVmY2RhNGQzYmMyNDkzMWIiLCJpYXQiOjE3NDg0Mzc5NDkuMDk5ODk1LCJuYmYiOjE3NDg0Mzc5NDkuMDk5ODk2LCJleHAiOjQ5MDQxMTE1NDkuMDk1Mzg2LCJzdWIiOiI3MjA2MDAyMCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.EW6Hj_1Z70kuYAEC_8BJ04xgCk1oCELqCu5GVVRJLGW1CDwbbPCD7UroeQ5Ggt3MunYV40jFf4OCukUZY0PnDQtzW02IctQ-NF_WhlaZFeCjp1iw79C1iAB9MDfhYrmCIIgJpGeucgf3N1t3xwNZfg7zJTjhRRk--0Nh3BIhbzrrDFGOQfRMYf9s8w5KDj2_ui4qf_oR73BkBBBqIGKbunoaV12MxxWq85My_6QHZCir5qRxNxdcC0BzYpGjJcOCBeM1HQCQDhT_rzcU0-ZS45afpVnXnV3M-oKfU4NoGsnyI7Gvxk9hcU4hFPg2ZywH44xNK6Qkvg_nbX-2Zte0geLDgyqDEMkfOIytIFTld6HVaVE3uW9kN5UMUVYB3VjRorvvaO3cDRDn-s3-uUOnUsJ6II06czWDToygWsSnN1Koafku2IK2k4qZWMn2vwkOd2r4DyFtyxSFUexvOyKPmxfWwU5CGhEg7YbQkInAZ42VPrpaR9j8Qs_wW1uHgfY2RITKCCKlY1Wl-dbyLpLqlnd20EWqQLu6Ypzb68pwkHf-6f0YmHRex4nCf895V_Z0Ds5lQ8baZ35TruO8o3AFZwd6lOnDVyfVwM-3AnFLeLFowYcEYuRScLVMui_slC0iUWz80NQrK0TdVn8eTkuPaXyd9r1B-zhUXZc7wKoZhiM';

function updateBudget(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Budgets');
  const budgets = sheet.getDataRange().getValues();
  const headers = budgets.shift();
  
  // Find the budget to update
  const budgetIndex = budgets.findIndex(row => row[0] === data.name);
  if (budgetIndex === -1) {
    throw new Error('Budget not found');
  }
  
  // Update the budget
  const rowIndex = budgetIndex + 2; // +2 because we removed headers and arrays are 0-based
  sheet.getRange(rowIndex, 1, 1, 4).setValues([[
    data.name,
    data.code,
    data.monthlyLimit,
    data.active
  ]]);
  
  return { success: true, message: 'Budget updated successfully' };
}

function updateCategory(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Categories');
  const categories = sheet.getDataRange().getValues();
  const headers = categories.shift();
  
  // Find the category to update
  const categoryIndex = categories.findIndex(row => 
    row[0] === data.budgetName && row[1] === data.name
  );
  if (categoryIndex === -1) {
    throw new Error('Category not found');
  }
  
  // Update the category
  const rowIndex = categoryIndex + 2; // +2 because we removed headers and arrays are 0-based
  sheet.getRange(rowIndex, 1, 1, 5).setValues([[
    data.budgetName,
    data.name,
    data.code,
    data.monthlyLimit,
    data.active
  ]]);
  
  return { success: true, message: 'Category updated successfully' };
}

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
    
    // Only handle receipt submission
    if (!data.action) {
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

      // Handle PDF if provided
      let pdfUrl = '';
      if (pdf) {
        try {
          Logger.log('Processing PDF data...');
          pdfUrl = saveReceiptPDF(pdf, date, amount, budget, category, vendor, card, data.pdfIsNative);
          Logger.log('PDF saved successfully, URL: ' + pdfUrl);
        } catch (pdfError) {
          Logger.log('Error saving PDF: ' + pdfError);
          throw new Error('Failed to save PDF: ' + pdfError.message);
        }
      } else {
        Logger.log('No PDF provided, skipping PDF processing');
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
          photoUrl: pdfUrl,
          monthlyExpense: data.monthlyExpense || false,
          vendor,
          card: card || '',
          startDate: startDate || '',
          endDate: endDate || ''
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
          pdfUrl
        }
      };
    }

    Logger.log('Sending response: ' + JSON.stringify(response));
    return ContentService.createTextOutput(JSON.stringify(response))
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

function getOrCreateFolder() {
  try {
    Logger.log('Accessing shared drive...');
    const sharedDrive = DriveApp.getFolderById(SHARED_DRIVE_ID);
    Logger.log('Shared drive accessed successfully');
    return sharedDrive;
  } catch (error) {
    Logger.error('Error accessing shared drive:', error);
    throw new Error('Failed to access shared drive: ' + error.message);
  }
}

function getOrCreateBudgetFolder(budgetName) {
  const receiptsFolder = getOrCreateFolder();
  const budgetFolders = receiptsFolder.getFoldersByName(budgetName);
  
  if (budgetFolders.hasNext()) {
    return budgetFolders.next();
  }
  
  return receiptsFolder.createFolder(budgetName);
}

function getOrCreateYearFolder(budgetFolder, year) {
  const yearFolders = budgetFolder.getFoldersByName(year.toString());
  
  if (yearFolders.hasNext()) {
    return yearFolders.next();
  }
  
  return budgetFolder.createFolder(year.toString());
}

function getOrCreateMonthFolder(yearFolder, month) {
  // Format month as two digits
  const monthStr = month.toString().padStart(2, '0');
  const monthFolders = yearFolder.getFoldersByName(monthStr);
  
  if (monthFolders.hasNext()) {
    return monthFolders.next();
  }
  
  return yearFolder.createFolder(monthStr);
}

function getOrCreateCategoryFolder(monthFolder, categoryName) {
  const categoryFolders = monthFolder.getFoldersByName(categoryName);
  
  if (categoryFolders.hasNext()) {
    return categoryFolders.next();
  }
  
  return monthFolder.createFolder(categoryName);
}

function saveReceiptPDF(pdfData, date, amount, budget, category, vendor, card, pdfIsNative) {
  try {
    Logger.log('Starting PDF save process...');
    // Format: (category code) (vendor) (yyyy.MM.dd) (amount) (card).pdf
    const formattedDate = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy.MM.dd');
    const safeVendor = vendor ? vendor.replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    const safeCard = card ? card.replace(/[^a-zA-Z0-9 _.-]/g, '') : '';
    const categoryCode = getCategoryCode(budget, category);
    const filename = `${categoryCode} ${safeVendor} ${formattedDate} ${amount} ${safeCard}.pdf`;

    const receiptsFolder = DriveApp.getFolderById('1UgxVCOo-IH50hJfTty5xiuJ-sj2zeWWP');

    // If the file is a native PDF, save it directly
    if (pdfIsNative) {
      // pdfData is base64-encoded PDF
      const pdfBlob = Utilities.newBlob(Utilities.base64Decode(pdfData), 'application/pdf', filename);
      const finalFile = receiptsFolder.createFile(pdfBlob);
      Logger.log('PDF saved directly (native upload)');
      return finalFile.getUrl();
    }

    // Otherwise, use CloudConvert to convert image to PDF
    try {
      const jobResponse = UrlFetchApp.fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + CLOUDCONVERT_API_KEY,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          tasks: {
            'import-image': {
              operation: 'import/base64',
              file: pdfData,
              filename: filename.replace(/\.pdf$/, '.jpg')
            },
            'convert-to-pdf': {
              operation: 'convert',
              input: 'import-image',
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
    Logger.error('Error in saveReceiptPDF:', error);
    throw new Error('Failed to save receipt PDF: ' + error.message);
  }
}

function logToSheet(data) {
  try {
    Logger.log('Starting sheet logging process...');
    Logger.log('Data to log:', data);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      Logger.error('Receipt log sheet not found');
      throw new Error('Receipt log sheet not found');
    }
    Logger.log('Sheet accessed successfully');

    // Ensure the Monthly Expense, Start Date, and End Date columns exist
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
      data.endDate || ''
    ];
    // If the sheet has more columns, fill in empty values for missing columns
    while (row.length < sheet.getLastColumn()) {
      row.push('');
    }
    Logger.log('Row to append:', row);

    sheet.appendRow(row);
    Logger.log('Row appended successfully');
  } catch (error) {
    Logger.error('Error in logToSheet:', error);
    Logger.error('Error stack:', error.stack);
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
      receiptSheet.getRange('A1:J1').setValues([['Date', 'Amount', 'Description', 'Budget', 'Category', 'Photo URL', 'Timestamp', 'Monthly Expense', 'Vendor', 'Card']]);
    }

    return true;
  } catch (error) {
    Logger.error('Error initializing sheets:', error);
    throw error;
  }
}

function getBudgets() {
  try {
    Logger.log('Opening spreadsheet with ID:', SPREADSHEET_ID);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Getting Budgets sheet...');
    let sheet = spreadsheet.getSheetByName('Budgets');
    
    if (!sheet) {
      Logger.log('Budgets sheet not found, initializing sheets...');
      initializeSheets();
      sheet = spreadsheet.getSheetByName('Budgets');
    }
    
    Logger.log('Getting data range...');
    const data = sheet.getDataRange().getValues();
    Logger.log('Raw data from sheet:', data);
    
    const headers = data.shift(); // Remove header row
    Logger.log('Headers:', headers);
    
    // Transform the data into the expected format
    const budgets = data.map(row => ({
      name: row[0],
      code: Number(row[1]),
      monthlyLimit: Number(row[2]),
      active: row[3] === true || row[3] === 'TRUE' || row[3] === 'true'
    }));

    Logger.log('Processed budgets:', budgets);
    return budgets;
  } catch (error) {
    Logger.error('Error in getBudgets:', error);
    throw error;
  }
}

function getCategories() {
  try {
    Logger.log('Opening spreadsheet with ID:', SPREADSHEET_ID);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Getting Categories sheet...');
    let sheet = spreadsheet.getSheetByName('Categories');
    
    if (!sheet) {
      Logger.log('Categories sheet not found, initializing sheets...');
      initializeSheets();
      sheet = spreadsheet.getSheetByName('Categories');
    }
    
    Logger.log('Getting data range...');
    const data = sheet.getDataRange().getValues();
    Logger.log('Raw data from sheet:', data);
    
    const headers = data.shift(); // Remove header row
    Logger.log('Headers:', headers);
    
    // Transform the data into the expected format
    const categories = data.map(row => ({
      budgetName: row[0],
      name: row[1],
      code: row[2],
      monthlyLimit: Number(row[3]),
      active: row[4] === true || row[4] === 'TRUE' || row[4] === 'true'
    }));

    Logger.log('Processed categories:', categories);
    return categories;
  } catch (error) {
    Logger.error('Error in getCategories:', error);
    throw error;
  }
}

function getCards() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Cards');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => ({
    card: row[0],
    assignee: row[1],
    location: row[2],
  }));
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
    Logger.error('Error in getBudgetProgress: ' + error.message);
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
    return null; // Not started yet
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

function getGlobalSummary(now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  const receiptSheet = ss.getSheetByName('receipt_log');
  
  if (!snapSheet || !receiptSheet) {
    throw new Error('Required sheets not found');
  }

  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  Logger.log('Getting global summary for month: ' + monthStr);
  
  // Get data from MonthlyBudgetSnapshot
  const snapData = snapSheet.getDataRange().getValues();
  // snapData.shift(); // remove header (commented out because there is no header row)
  
  // Get current month's data
  const currentMonthData = snapData.filter(row => {
    // Convert the cell value to a date (if it's not already)
    const cellDate = new Date(row[0]);
    // Format it to 'yyyy-MM' for comparison
    const cellMonthStr = Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM');
    return cellMonthStr === monthStr;
  });
  
  // Calculate totals from snapshot
  const budgetLimits = {};
  let totalBudgeted = 0;
  
  currentMonthData.forEach(row => {
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

  // Get actual spending from receipt_log
  const receipts = receiptSheet.getDataRange().getValues();
  receipts.shift(); // remove header
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  let totalSpent = 0;
  let receiptsCount = 0;
  const spending = {};
  
  receipts.forEach(row => {
    const date = new Date(row[0]);
    const amount = Number(row[1]) || 0;
    const budget = row[3];
    const category = row[4];
    const monthlyExpense = String(row[7]).toUpperCase() === 'TRUE';
    const vendor = row[8];
    const card = row[9];
    const startDateStr = row[10] || '';
    const endDateStr = row[11] || '';
    let include = false;
    if (monthlyExpense) {
      // Parse start and end dates
      const startDate = startDateStr ? new Date(startDateStr) : date;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      // Get the first day of the current month
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // Get the last day of the current month
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      // If the recurring transaction covers the current month
      if (startDate <= currentMonthEnd && (!endDate || endDate >= currentMonthStart)) {
        include = true;
      }
    } else {
      // Only include if the transaction date is in the current month
      if (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      ) {
        include = true;
      }
    }
    if (include) {
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
    }
  });

  return {
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
  Logger.log('Received request:', e.parameter);
  let response;
  
  try {
    switch (e.parameter.action) {
      case 'getGlobalSummary':
        Logger.log('Getting global summary');
        const date = e.parameter.date ? new Date(e.parameter.date) : new Date();
        response = getGlobalSummary(date);
        break;
      case 'getBudgetSummary':
        Logger.log('Getting budget summary for:', e.parameter.budget);
        const budgetDate = e.parameter.date ? new Date(e.parameter.date) : new Date();
        response = getBudgetSummary(e.parameter.budget, budgetDate);
        break;
      case 'getBudgets':
        Logger.log('Getting budgets');
        response = getBudgets();
        break;
      case 'getCategories':
        Logger.log('Getting categories');
        response = getCategories();
        break;
      case 'getCards':
        response = getCards();
        break;
      case 'getBudgetProgress':
        Logger.log('Getting budget progress');
        response = getBudgetProgress(e);
        break;
      case 'getYearlySummary':
        Logger.log('Getting yearly summary');
        response = getYearlySummary();
        break;
      default:
        Logger.log('Invalid action:', e.parameter.action);
        throw new Error('Invalid action');
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: response
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
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