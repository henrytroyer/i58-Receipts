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
  try {
    console.log('Received POST request');
    console.log('Post data type:', typeof e.postData.contents);
    console.log('Post data length:', e.postData.contents.length);
    
    let response;
    let data;
    try {
      // Handle form data
      const formData = e.parameter.data || e.postData.contents;
      console.log('Form data received:', formData);
      data = JSON.parse(formData);
      console.log('Parsed data keys:', Object.keys(data));
    } catch (parseError) {
      console.error('Error parsing POST data:', parseError);
      throw new Error('Invalid JSON data received');
    }
    
    // Only handle receipt submission
    if (!data.action) {
      // Handle receipt submission
      console.log('Processing receipt submission');
      const { amount, date, description, budget, category, pdf, vendor, card } = data;
      
      // Log received data (excluding pdf data for brevity)
      console.log('Received receipt data:', {
        amount,
        date,
        description,
        budget,
        category,
        hasPdf: !!pdf,
        vendor,
        card
      });
      
      // Validate required fields
      if (!amount || !date || !description || !budget || !category || !vendor || !card) {
        console.error('Missing required fields:', {
          hasAmount: !!amount,
          hasDate: !!date,
          hasDescription: !!description,
          hasBudget: !!budget,
          hasCategory: !!category,
          hasVendor: !!vendor,
          hasCard: !!card
        });
        throw new Error('Missing required fields');
      }

      // Handle PDF if provided
      let pdfUrl = '';
      if (pdf) {
        try {
          console.log('Processing PDF data...');
          pdfUrl = saveReceiptPDF(pdf, date, amount, budget, category, vendor, card, data.pdfIsNative);
          console.log('PDF saved successfully, URL:', pdfUrl);
        } catch (pdfError) {
          console.error('Error saving PDF:', pdfError);
          throw new Error('Failed to save PDF: ' + pdfError.message);
        }
      }

      // Log to sheet
      try {
        console.log('Logging to sheet...');
        logToSheet({
          date,
          amount,
          description,
          budget,
          category,
          photoUrl: pdfUrl,
          vendor,
          card
        });
        console.log('Successfully logged to sheet');
      } catch (sheetError) {
        console.error('Error logging to sheet:', sheetError);
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

    console.log('Sending response:', response);
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doPost:', error);
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
    console.log('Accessing shared drive...');
    const sharedDrive = DriveApp.getFolderById(SHARED_DRIVE_ID);
    console.log('Shared drive accessed successfully');
    return sharedDrive;
  } catch (error) {
    console.error('Error accessing shared drive:', error);
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
    console.log('Starting PDF save process...');
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
      console.log('PDF saved directly (native upload)');
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
      console.log('Job created successfully:', jobData.data.id);

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
        console.log('Job status:', statusData.data.status);
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
      console.log('Downloading converted PDF...');
      // Download the converted PDF
      const pdfResponse = UrlFetchApp.fetch(exportUrl, {
        muteHttpExceptions: true
      });
      if (pdfResponse.getResponseCode() !== 200) {
        throw new Error('Failed to download PDF: ' + pdfResponse.getContentText());
      }
      const pdfBlob = Utilities.newBlob(pdfResponse.getContent(), 'application/pdf', filename);
      const finalFile = receiptsFolder.createFile(pdfBlob);
      console.log('PDF saved successfully (converted)');
      return finalFile.getUrl();
    } catch (processError) {
      throw new Error('Failed to process file: ' + processError.message);
    }
  } catch (error) {
    console.error('Error in saveReceiptPDF:', error);
    throw new Error('Failed to save receipt PDF: ' + error.message);
  }
}

function logToSheet(data) {
  try {
    console.log('Starting sheet logging process...');
    console.log('Data to log:', data);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('receipt_log');
    if (!sheet) {
      console.error('Receipt log sheet not found');
      throw new Error('Receipt log sheet not found');
    }
    console.log('Sheet accessed successfully');

    const row = [
      new Date(data.date),
      data.amount,
      data.description,
      data.budget,
      data.category,
      data.photoUrl || '',
      new Date(), // Timestamp
      data.vendor || '',
      data.card || ''
    ];
    // If the sheet has more columns, fill in empty values for missing columns
    while (row.length < sheet.getLastColumn()) {
      row.push('');
    }
    console.log('Row to append:', row);

    sheet.appendRow(row);
    console.log('Row appended successfully');
  } catch (error) {
    console.error('Error in logToSheet:', error);
    console.error('Error stack:', error.stack);
    throw new Error('Failed to log to sheet: ' + error.message);
  }
}

function initializeSheets() {
  try {
    console.log('Initializing sheets...');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Initialize Budgets sheet
    let budgetSheet = spreadsheet.getSheetByName('Budgets');
    if (!budgetSheet) {
      console.log('Creating Budgets sheet...');
      budgetSheet = spreadsheet.insertSheet('Budgets');
      budgetSheet.getRange('A1:D1').setValues([['Name', 'Code', 'Monthly Limit', 'Active']]);
      // Add a default budget
      budgetSheet.getRange('A2:D2').setValues([['Default', 'DEF', 1000, true]]);
    }

    // Initialize Categories sheet
    let categorySheet = spreadsheet.getSheetByName('Categories');
    if (!categorySheet) {
      console.log('Creating Categories sheet...');
      categorySheet = spreadsheet.insertSheet('Categories');
      categorySheet.getRange('A1:E1').setValues([['Budget Name', 'Name', 'Code', 'Monthly Limit', 'Active']]);
      // Add a default category
      categorySheet.getRange('A2:E2').setValues([['Default', 'General', 'GEN', 500, true]]);
    }

    // Initialize receipt_log sheet
    let receiptSheet = spreadsheet.getSheetByName('receipt_log');
    if (!receiptSheet) {
      console.log('Creating receipt_log sheet...');
      receiptSheet = spreadsheet.insertSheet('receipt_log');
      receiptSheet.getRange('A1:J1').setValues([['Date', 'Amount', 'Description', 'Budget', 'Category', 'Photo URL', 'Timestamp', 'Monthly Expense', 'Vendor', 'Card']]);
    }

    return true;
  } catch (error) {
    console.error('Error initializing sheets:', error);
    throw error;
  }
}

function getBudgets() {
  try {
    console.log('Opening spreadsheet with ID:', SPREADSHEET_ID);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Getting Budgets sheet...');
    let sheet = spreadsheet.getSheetByName('Budgets');
    
    if (!sheet) {
      console.log('Budgets sheet not found, initializing sheets...');
      initializeSheets();
      sheet = spreadsheet.getSheetByName('Budgets');
    }
    
    console.log('Getting data range...');
    const data = sheet.getDataRange().getValues();
    console.log('Raw data from sheet:', data);
    
    const headers = data.shift(); // Remove header row
    console.log('Headers:', headers);
    
    // Transform the data into the expected format
    const budgets = data.map(row => ({
      name: row[0],
      code: row[1],
      monthlyLimit: Number(row[2]),
      active: row[3] === true || row[3] === 'TRUE' || row[3] === 'true'
    }));

    console.log('Processed budgets:', budgets);
    return budgets;
  } catch (error) {
    console.error('Error in getBudgets:', error);
    throw error;
  }
}

function getCategories() {
  try {
    console.log('Opening spreadsheet with ID:', SPREADSHEET_ID);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Getting Categories sheet...');
    let sheet = spreadsheet.getSheetByName('Categories');
    
    if (!sheet) {
      console.log('Categories sheet not found, initializing sheets...');
      initializeSheets();
      sheet = spreadsheet.getSheetByName('Categories');
    }
    
    console.log('Getting data range...');
    const data = sheet.getDataRange().getValues();
    console.log('Raw data from sheet:', data);
    
    const headers = data.shift(); // Remove header row
    console.log('Headers:', headers);
    
    // Transform the data into the expected format
    const categories = data.map(row => ({
      budgetName: row[0],
      name: row[1],
      code: row[2],
      monthlyLimit: Number(row[3]),
      active: row[4] === true || row[4] === 'TRUE' || row[4] === 'true'
    }));

    console.log('Processed categories:', categories);
    return categories;
  } catch (error) {
    console.error('Error in getCategories:', error);
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
    const budget = e.parameter.budget;
    const category = e.parameter.category;
    
    if (!budget || !category) {
      throw new Error('Budget and category are required');
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receiptSheet = spreadsheet.getSheetByName('receipt_log');
    const budgetSheet = spreadsheet.getSheetByName('Budgets');
    const categorySheet = spreadsheet.getSheetByName('Categories');

    if (!receiptSheet || !budgetSheet || !categorySheet) {
      throw new Error('Required sheets not found');
    }

    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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

    // Get budget limit
    const budgets = budgetSheet.getDataRange().getValues();
    const budgetHeaders = budgets.shift();
    const budgetRow = budgets.find(row => row[0] === budget);
    const monthlyLimit = budgetRow ? Number(budgetRow[2]) : 0;

    // Get category limit
    const categories = categorySheet.getDataRange().getValues();
    const categoryHeaders = categories.shift();
    const categoryRow = categories.find(row => row[0] === budget && row[1] === category);
    const categoryLimit = categoryRow ? Number(categoryRow[3]) : 0;

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
    console.error('Error in getBudgetProgress:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// === Helper: Get start of current budget year (July 1, 2025+) ===
function getBudgetYearStart(now) {
  // Budget year starts July 1, 2025
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (year < 2025 || (year === 2025 && month < 7)) {
    return null; // Not started yet
  }
  // If month >= 7, budget year started this July; else, last January
  const startYear = month >= 7 ? year : year - 1;
  const startMonth = month >= 7 ? 6 : 0; // JS months are 0-based, so 6 = July, 0 = January
  return new Date(startYear, startMonth, 1);
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

function getGlobalSummary(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
    const receiptSheet = ss.getSheetByName('receipt_log');
    
    if (!snapSheet || !receiptSheet) {
      throw new Error('Required sheets not found');
    }

  const now = parseDateParam(e);
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    
    // Get data from MonthlyBudgetSnapshot
    const snapData = snapSheet.getDataRange().getValues();
    snapData.shift(); // remove header
    
    // Get current month's data
    const currentMonthData = snapData.filter(row => row[0] === monthStr);
    
    // Calculate totals from snapshot
  const budgetTotals = {};
  const categoryTotals = {};
  const budgetCategoryTotals = {};
    let totalBudgeted = 0;
    const budgetLimits = {};
    
    currentMonthData.forEach(row => {
      const budget = row[1];
      const category = row[2];
      const amount = parseFloat(row[3].toString().replace(/[^0-9.-]+/g, '')) || 0;
      
      if (category === 'TOTAL') {
        budgetTotals[budget] = amount;
        totalBudgeted += amount;
        budgetLimits[budget] = amount;
      } else {
        if (!budgetCategoryTotals[budget]) {
          budgetCategoryTotals[budget] = {};
        }
        budgetCategoryTotals[budget][category] = amount;
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += amount;
      }
    });

    // Get actual spending from receipt_log
    const receipts = receiptSheet.getDataRange().getValues();
    receipts.shift(); // remove header
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    let totalSpent = 0;
    let receiptsCount = 0;
    const actualBudgetTotals = {};
    const actualCategoryTotals = {};
    const actualBudgetCategoryTotals = {};
    
    receipts.forEach(row => {
    const date = new Date(row[0]);
      if (date >= startOfMonth && date <= endOfMonth) {
        const amount = Number(row[1]) || 0;
    const budget = row[3];
    const category = row[4];

      totalSpent += amount;
        receiptsCount++;
        
        if (!actualBudgetTotals[budget]) {
          actualBudgetTotals[budget] = 0;
        }
        actualBudgetTotals[budget] += amount;
        
        if (!actualCategoryTotals[category]) {
          actualCategoryTotals[category] = 0;
        }
        actualCategoryTotals[category] += amount;
        
        if (!actualBudgetCategoryTotals[budget]) {
          actualBudgetCategoryTotals[budget] = {};
        }
        if (!actualBudgetCategoryTotals[budget][category]) {
          actualBudgetCategoryTotals[budget][category] = 0;
        }
        actualBudgetCategoryTotals[budget][category] += amount;
    }
  });

  return {
    success: true,
    data: {
      totalSpent,
      receiptsCount,
      budgetTotals,
      categoryTotals,
      budgetCategoryTotals,
        actualBudgetTotals,
        actualCategoryTotals,
        actualBudgetCategoryTotals,
        totalBudgeted,
        remaining: totalBudgeted - totalSpent,
        budgetLimits
    }
  };
  } catch (error) {
    console.error('Error in getGlobalSummary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getBudgetSummary(budgetName, e) {
  try {
    if (!budgetName) {
      console.error('No budget name provided');
      throw new Error('Budget name is required');
    }
    
    console.log('Getting budget summary for:', budgetName);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
    const receiptSheet = ss.getSheetByName('receipt_log');
    
    if (!snapSheet || !receiptSheet) {
      console.error('Required sheets not found');
      throw new Error('Required sheets not found');
    }

  const now = parseDateParam(e);
    const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    console.log('Looking for month:', monthStr);
    
    // Get data from MonthlyBudgetSnapshot
    const snapData = snapSheet.getDataRange().getValues();
    console.log('Raw snapshot data:', snapData);
    snapData.shift(); // remove header
    
    // Get current month's data for this budget
    const budgetData = snapData.filter(row => {
      const rowDate = new Date(row[0]);
      const rowMonthStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM');
      return rowMonthStr === monthStr && row[1] === budgetName;
    });
    console.log('Filtered budget data:', budgetData);

    // Calculate totals from snapshot
    const categoryTotals = {};
    const categoryLimits = {};
    let totalBudgeted = 0;
    
    budgetData.forEach(row => {
      const category = row[2];
      const amount = parseFloat(row[3].toString().replace(/[^0-9.-]+/g, '')) || 0;
      console.log('Processing row:', { category, amount });
      
      if (category === 'TOTAL') {
        totalBudgeted = amount;
        console.log('Found total budget:', totalBudgeted);
      } else {
        categoryTotals[category] = amount;
        categoryLimits[category] = amount;
      }
    });
    console.log('Category totals:', categoryTotals);
    console.log('Category limits:', categoryLimits);

    // Get actual spending from receipt_log
    const receipts = receiptSheet.getDataRange().getValues();
    receipts.shift(); // remove header
    
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let totalSpent = 0;
  let receiptsCount = 0;
    const actualCategoryTotals = {};

    receipts.forEach(row => {
    const date = new Date(row[0]);
      if (row[3] === budgetName && date >= startOfMonth && date <= endOfMonth) {
        const amount = Number(row[1]) || 0;
    const category = row[4];

      totalSpent += amount;
        receiptsCount++;
        
        if (!actualCategoryTotals[category]) {
          actualCategoryTotals[category] = 0;
      }
        actualCategoryTotals[category] += amount;
    }
    });
    console.log('Actual spending:', {
      totalSpent,
      receiptsCount,
      actualCategoryTotals
    });

    const response = {
    success: true,
    data: {
      totalSpent,
      receiptsCount,
      categoryTotals,
        actualCategoryTotals,
        totalBudgeted,
        remaining: totalBudgeted - totalSpent,
        categoryLimits
    }
  };
    console.log('Final response:', response);
    return response;
  } catch (error) {
    console.error('Error in getBudgetSummary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getTotalBudgetedFromSnapshot(now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  if (!snapSheet) return 0;
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  const data = snapSheet.getDataRange().getValues();
  data.shift();
  let total = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (row[0] === monthStr && !row[2]) { // Budget-level limit
      total += Number(row[3]) || 0;
    }
  }
  return total;
}

function getMonthlyBudgetLimit(budgetName, now) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Budgets');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const budgetRow = data.find(row => row[0] === budgetName);
  if (budgetRow) {
    const monthlyLimit = Number(budgetRow[2]);
    return monthlyLimit;
  }
  return 0;
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
  // Helper function to create CORS-enabled response
  const createCorsResponse = (content, mimeType) => {
    const output = ContentService.createTextOutput(content);
    output.setMimeType(mimeType);
    return output;
  };

    // Handle preflight requests
    if (e.parameter && e.parameter.action === 'OPTIONS') {
    return createCorsResponse('', ContentService.MimeType.TEXT);
    }

  try {
    if (!e) {
      console.log('No event object provided');
      return createCorsResponse(JSON.stringify({
        success: true,
        message: 'App is running',
        version: '1.0'
      }), ContentService.MimeType.JSON);
    }

    console.log('doGet called with parameters:', e.parameter);
    if (!e.parameter || !e.parameter.action) {
      console.log('No parameters provided');
      return createCorsResponse(JSON.stringify({
        success: true,
        message: 'App is running',
        version: '1.0'
      }), ContentService.MimeType.JSON);
    }

    let response;
    try {
      // Initialize sheets if needed
      initializeSheets();

      switch (e.parameter.action) {
        case 'getBudgets':
          console.log('Getting budgets');
          response = getBudgets();
          break;
        case 'getCategories':
          console.log('Getting categories');
          response = getCategories();
          break;
        case 'getCards':
          response = getCards();
          break;
        case 'getBudgetProgress':
          console.log('Getting budget progress');
          response = getBudgetProgress(e);
          break;
        case 'getGlobalSummary':
          console.log('Getting global summary');
          response = getGlobalSummary(e);
          break;
        case 'getBudgetSummary':
          if (!e.parameter.budget) {
            throw new Error('Missing budget parameter');
          }
          console.log('Getting budget summary for', e.parameter.budget);
          response = getBudgetSummary(e.parameter.budget, e);
          break;
        case 'getYearlySummary':
          console.log('Getting yearly summary');
          response = getYearlySummary();
          break;
        default:
          console.log('Invalid action:', e.parameter.action);
          throw new Error('Invalid action');
      }
    } catch (dataError) {
      console.error('Error processing data:', dataError);
      throw new Error(`Error processing ${e.parameter.action}: ${dataError.message}`);
    }

    return createCorsResponse(JSON.stringify(response), ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doGet:', error);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message
    }), ContentService.MimeType.JSON);
  }
}

// === Monthly Budget Snapshot Functions ===
function snapshotMonthlyBudgets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const catSheet = ss.getSheetByName('Categories');
  const budSheet = ss.getSheetByName('Budgets');
  const receiptSheet = ss.getSheetByName('receipt_log');
  let snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  
  // Initialize sheet if it doesn't exist
  if (!snapSheet) {
    snapSheet = ss.insertSheet('MonthlyBudgetSnapshot');
    snapSheet.hideSheet();
    snapSheet.appendRow(['Month', 'Budget', 'Category', 'Limit']);
  } else {
    // Clear the entire sheet except header
    const lastRow = snapSheet.getLastRow();
    if (lastRow > 1) {
      snapSheet.getRange(2, 1, lastRow - 1, 4).clear();
    }
  }

  const now = new Date();
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  
  // Check if we're in the first month of the fiscal year
  // For 2025: July (month 6) is first month
  // For all other years: January (month 0) is first month
  const isFirstMonth = (now.getFullYear() === 2025 && now.getMonth() === 6) || 
                      (now.getFullYear() !== 2025 && now.getMonth() === 0);
  
  // Check if we're before fiscal year start (before July 2025)
  const isPreFiscalYear = now.getFullYear() === 2025 && now.getMonth() < 6;
  
  // Get all receipts for the current month
  const receipts = receiptSheet.getDataRange().getValues();
  receipts.shift(); // remove header
  
  // Calculate spent amounts for each budget/category
  const spentAmounts = {};
  receipts.forEach(row => {
    const date = new Date(row[0]);
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      const budget = row[3];
      const category = row[4];
      const amount = Number(row[1]) || 0;
      
      if (!spentAmounts[budget]) {
        spentAmounts[budget] = { total: 0, categories: {} };
      }
      spentAmounts[budget].total += amount;
      
      if (category) {
        if (!spentAmounts[budget].categories[category]) {
          spentAmounts[budget].categories[category] = 0;
        }
        spentAmounts[budget].categories[category] += amount;
      }
    }
  });

  // Get category data and calculate adjusted limits
  const catData = catSheet.getDataRange().getValues();
  catData.shift(); // remove header
  
  // Group categories by budget and calculate adjustments
  const budgetCategories = {};
  const budgetTotals = {};
  
  catData.forEach(row => {
    const budget = row[0];
    const category = row[1];
    const baseLimit = Number(row[3]) || 0;
    const spent = spentAmounts[budget]?.categories[category] || 0;
    const overUnder = spent - baseLimit;
    
    if (!budgetCategories[budget]) {
      budgetCategories[budget] = [];
    }
    
    // Calculate adjustment for under-spent categories
    let adjustedLimit = baseLimit;
    // Only calculate adjustments if we're not in pre-fiscal year and not in first month
    if (!isPreFiscalYear && !isFirstMonth && overUnder < 0) {
      const remainingMonths = 12 - now.getMonth();
      const redistributionPerMonth = Math.abs(overUnder) / remainingMonths;
      adjustedLimit = baseLimit + redistributionPerMonth;
    }
    
    budgetCategories[budget].push({ 
      category, 
      baseLimit,
      spent,
      overUnder,
      adjustedLimit 
    });
    
    // Track budget totals
    if (!budgetTotals[budget]) {
      budgetTotals[budget] = {
        baseTotal: 0,
        spentTotal: 0,
        adjustedTotal: 0
      };
    }
    budgetTotals[budget].baseTotal += baseLimit;
    budgetTotals[budget].spentTotal += spent;
    budgetTotals[budget].adjustedTotal += adjustedLimit;
  });

  // Add category entries with adjusted limits
  Object.entries(budgetCategories).forEach(([budget, categories]) => {
    categories.forEach(({ category, adjustedLimit }) => {
      snapSheet.appendRow([monthStr, budget, category, adjustedLimit]);
    });
    
    // Add budget-level entry with adjusted total
    snapSheet.appendRow([monthStr, budget, '', budgetTotals[budget].adjustedTotal]);
  });
}

function getMonthlyCategoryLimit(budget, category, now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  if (!snapSheet) return null;
  
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  const data = snapSheet.getDataRange().getValues();
  data.shift(); // remove header
  
  // Find the most recent entry for this budget/category
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (row[0] === monthStr && row[1] === budget && row[2] === category) {
      return Number(row[3]) || 0;
    }
  }
  return null;
}

function getMonthlyBudgetLimit(budget, now) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const snapSheet = ss.getSheetByName('MonthlyBudgetSnapshot');
  if (!snapSheet) return null;
  
  const monthStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  const data = snapSheet.getDataRange().getValues();
  data.shift(); // remove header
  
  // Find the most recent entry for this budget (empty category)
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (row[0] === monthStr && row[1] === budget && !row[2]) {
      return Number(row[3]) || 0;
    }
  }
  return null;
} 