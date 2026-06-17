/**
 * Google Apps Script for Nazcube Residences Management System (HMS)
 * Spreadsheet ID: 1tG_c4TRp2vBDlaiWLuMw9zYgeTcQA7qi_uBdk0cjNYE
 * 
 * Instructions:
 * 1. Open your Google Sheet (ID: 1tG_c4TRp2vBDlaiWLuMw9zYgeTcQA7qi_uBdk0cjNYE).
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this entire script.
 * 4. Click Save (disk icon).
 * 5. IMPORTANT: In the toolbar dropdown at the top, select "authorizeScript" and click "Run".
 * 6. A popup saying "Authorization Required" will appear.
 *    - Click "Review Permissions".
 *    - Select your Google Account.
 *    - Click "Advanced" (near the bottom-left).
 *    - Click "Go to Nazcube HMS API (unsafe)" (or your script name).
 *    - Click "Allow" to authorize access to both Google Sheets and Google Drive.
 * 7. Click Deploy > New deployment.
 * 8. Select type: Web app.
 * 9. Set Description: "Nazcube HMS API v2".
 * 10. Set Execute as: "Me" (your Google account).
 * 11. Set Who has access: "Anyone" (so the web portal can connect).
 * 12. Click Deploy, copy the Web App URL, and paste it into your Nazcube HMS Web Application settings.
 */

// Paste your Spreadsheet ID below or leave empty if running directly inside the spreadsheet's script
const SPREADSHEET_ID = "";

/**
 * Run this function ONCE in the Apps Script Editor toolbar to authorize both SpreadsheetApp and DriveApp services!
 * Running this will prompt you with the necessary consent popups.
 */
function authorizeScript() {
  try {
    var ss = getSpreadsheet();
    Logger.log("Authorized Sheets App access! Active Sheet Name: " + (ss ? ss.getName() : "None"));
    
    var rootFolder = DriveApp.getRootFolder();
    Logger.log("Authorized Drive App access! Root Folder Name: " + (rootFolder ? rootFolder.getName() : "None"));
    
    var dummyFolderName = "Nazcube Residences Uploads";
    var folders = DriveApp.getFoldersByName(dummyFolderName);
    var dummyFolder;
    if (folders.hasNext()) {
      dummyFolder = folders.next();
      Logger.log("Test: Found existing uploads folder: " + dummyFolder.getName());
    } else {
      dummyFolder = DriveApp.createFolder(dummyFolderName);
      try {
        dummyFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        Logger.log("Note: Could not set public sharing on folder: " + shareErr.toString());
      }
      Logger.log("Test: Created new folder: " + dummyFolderName);
    }
    
    return "SUCCESS: Authorization is fully completed for Sheets and Google Drive! You can now Deploy/Redeploy your Web App.";
  } catch (err) {
    Logger.log("Authorization Error: " + err.toString());
    throw new Error("Authorization Error: " + err.toString());
  }
}

function getSpreadsheet() {
  try {
    if (SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

// Enable CORS and helper to output JSON
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET Request
 * Fetches all historical data or checks connection
 */
function doGet(e) {
  const ss = getSpreadsheet();
  const action = e.parameter.action || "readAll";
  
  if (action === "test") {
    return jsonResponse({ status: "success", message: "Connection successful!" });
  }
  
  if (action === "readAll") {
    return jsonResponse(readAllSheetsData(ss));
  }
  
  return jsonResponse({ status: "error", message: "Unknown GET action: " + action });
}

/**
 * POST Request
 * Handles all writes, updates, deletions, and actions (like OTP request)
 */
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }
    
    const action = payload.action;
    if (!action) {
      return jsonResponse({ status: "error", message: "No action specified" });
    }
    
    const ss = getSpreadsheet();
    let result;
    
    switch (action) {
      case "addPayment":
        result = addRowToSheet(ss, "PAYMENT", payload.data);
        break;
      case "addPaymentsBatch":
        result = addPaymentsBatchToSheet(ss, "PAYMENT", payload.data);
        break;
      case "updatePayment":
        result = updateRowInSheet(ss, "PAYMENT", "RECORD ID", payload.recordId, payload.data);
        break;
      case "updatePaymentsBatch":
        result = updatePaymentsBatchInSheet(ss, "PAYMENT", "RECORD ID", payload.data);
        break;
      case "addResident":
        result = addRowToSheet(ss, "RESIDENT", payload.data);
        break;
      case "updateResident":
        result = updateRowInSheet(ss, "RESIDENT", "OWNER ID", payload.ownerId, payload.data);
        break;
      case "deleteResident":
        result = deleteRowFromSheet(ss, "RESIDENT", "OWNER ID", payload.ownerId);
        break;
      case "addExpense":
        result = addRowToSheet(ss, "EXPENSES", payload.data);
        break;
      case "updateExpense":
        result = updateRowInSheet(ss, "EXPENSES", "RECORD ID", payload.recordId, payload.data);
        break;
      case "deleteExpense":
        result = deleteRowFromSheet(ss, "EXPENSES", "RECORD ID", payload.recordId);
        break;
      case "addProduct":
        result = addRowToSheet(ss, "PRODUCT", payload.data);
        break;
      case "updateProduct":
        result = updateRowInSheet(ss, "PRODUCT", "ID", payload.id, payload.data);
        break;
      case "deleteProduct":
        result = deleteRowFromSheet(ss, "PRODUCT", "ID", payload.id);
        break;
      case "addUser":
        result = addRowToSheet(ss, "USERS", payload.data);
        break;
      case "updateUser":
        result = updateRowInSheet(ss, "USERS", "ID", payload.id, payload.data);
        break;
      case "deleteUser":
        result = deleteRowFromSheet(ss, "USERS", "ID", payload.id);
        break;
      case "updateSettings":
        result = updateSettingsSheet(ss, payload.data);
        break;
      case "uploadLogo":
        result = uploadLogoToDrive(ss, payload.base64Data, payload.fileName);
        break;
      case "uploadFile":
        result = uploadFileToFolder(ss, payload.base64Data, payload.fileName);
        break;
      case "sendOTP":
        result = sendOtpEmail(ss, payload.email, payload.otp);
        break;
      case "sendInvoiceEmail":
        result = sendInvoiceEmail(payload.email, payload.subject, payload.htmlBody);
        break;
      case "addComplaint":
        result = addRowToSheet(ss, "COMPLAINTS", payload.data);
        break;
      case "updateComplaintsBatch":
        result = overwriteSheetData(ss, "COMPLAINTS", payload.data);
        break;
      case "updateNoticesBatch":
        result = overwriteSheetData(ss, "NOTICES", payload.data);
        break;
      case "updateNewsBatch":
        result = overwriteSheetData(ss, "NEWS", payload.data);
        break;
      case "updateVisitorLogsBatch":
        result = overwriteSheetData(ss, "VISITOR_LOGS", payload.data);
        break;
      case "updateVisitorPassesBatch":
        result = overwriteSheetData(ss, "VISITOR_PASSES", payload.data);
        break;
      case "updateSecurityInstructionsBatch":
        result = overwriteSheetData(ss, "SECURITY_INSTRUCTIONS", payload.data);
        break;
      default:
        return jsonResponse({ status: "error", message: "Unknown Action: " + action });
    }
    
    // Return latest sheets data so frontend state stays synchronized in one roundtrip
    const freshData = readAllSheetsData(ss);
    return jsonResponse({
      status: "success",
      operation: action,
      result: result,
      database: freshData
    });
    
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString(), stack: err.stack });
  }
}

/**
 * Seeds default administrator, manager, and staff members if USERS sheet is empty.
 */
function seedUsersIfEmpty(ss) {
  var sheet = ss.getSheetByName("USERS");
  if (!sheet) {
    createSheetWithHeaders(ss, "USERS");
    sheet = ss.getSheetByName("USERS");
  }
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    var defaultUsers = [
      {
        ID: "U001",
        "Full Name": "Master Admin",
        Email: "admin@nazcube.com",
        Phone: "+6012-3456789",
        Password: "admin123",
        Role: "admin",
        Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
        "Is Active": "Active",
        "Created At": new Date().toISOString()
      },
      {
        ID: "U002",
        "Full Name": "Manager User",
        Email: "manager@nazcube.com",
        Phone: "+6013-9876543",
        Password: "manager123",
        Role: "manager",
        Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=manager",
        "Is Active": "Active",
        "Created At": new Date().toISOString()
      },
      {
        ID: "U003",
        "Full Name": "Staff Staff",
        Email: "staff@nazcube.com",
        Phone: "+6019-3334445",
        Password: "staff123",
        Role: "staff",
        Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=staff",
        "Is Active": "Active",
        "Created At": new Date().toISOString()
      }
    ];
    
    defaultUsers.forEach(function(u) {
      addRowToSheet(ss, "USERS", u);
    });
  }
}

/**
 * Scans and reads all 6 tabs in Google Sheets
 */
function readAllSheetsData(ss) {
  // Safe auto seeding to guarantee default accounts exist in empty sheet templates
  seedUsersIfEmpty(ss);
  
  var payments = getSheetRows(ss, "PAYMENT") || [];
  
  // Safe backward compatibility check for the temporary PAYMENT-NR sheet
  var paymentsNr = [];
  var nrSheet = ss.getSheetByName("PAYMENT-NR");
  if (nrSheet) {
    paymentsNr = getSheetRows(ss, "PAYMENT-NR") || [];
  }
  var combinedPayments = payments.concat(paymentsNr);
  
  return {
    payments: combinedPayments,
    residents: getSheetRows(ss, "RESIDENT"),
    expenses: getSheetRows(ss, "EXPENSES"),
    products: getSheetRows(ss, "PRODUCT"),
    users: getSheetRows(ss, "USERS"),
    notices: getSheetRows(ss, "NOTICES"),
    news: getSheetRows(ss, "NEWS"),
    complaints: getSheetRows(ss, "COMPLAINTS"),
    visitorLogs: getSheetRows(ss, "VISITOR_LOGS"),
    visitorPasses: getSheetRows(ss, "VISITOR_PASSES"),
    securityInstructions: getSheetRows(ss, "SECURITY_INSTRUCTIONS"),
    settings: getSettingsRows(ss)
  };
}

/**
 * Read data from a standard sheet and return list of objects mapped to column headers
 */
function getSheetRows(ss, sheetName) {
  createSheetWithHeaders(ss, sheetName);
  const sheet = ss.getSheetByName(sheetName);
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // Only headers exist or empty
  
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) return [];
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  return values.map((row) => {
    const obj = {};
    headers.forEach((header, colIdx) => {
      if (header) {
        let val = row[colIdx];
        // Convert Date objects to timezone-aware date strings for standard consumption
        if (val instanceof Date) {
          try {
            var tz = ss.getSpreadsheetTimeZone();
            var hours = val.getHours();
            var minutes = val.getMinutes();
            var seconds = val.getSeconds();
            if (hours === 0 && minutes === 0 && seconds === 0) {
              val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
            } else {
              val = Utilities.formatDate(val, tz, "yyyy-MM-dd HH:mm:ss");
            }
          } catch(e) {
            val = val.toISOString();
          }
        }
        obj[header] = val;
      }
    });
    return obj;
  });
}

/**
 * Handle Settings tab. It can be a neat list of key-value records
 */
function getSettingsRows(ss) {
  const sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    createSheetWithHeaders(ss, "Settings", ["KEY", "VALUE"]);
    // Seed default settings
    const defaultSettings = [
      ["appName", "Nazcube HMS"],
      ["companyName", "Nazcube Solution"],
      ["companyPhone", "+60123456789"],
      ["companyEmail", "nazcube.digital@gmail.com"],
      ["companyAddress", "No. 12, Jalan Nazcube, 43000 Kajang, Selangor, Malaysia"],
      ["invoicePrefix", "INV-"],
      ["receiptPrefix", "REC-"],
      ["taxRate", "0"],
      ["themeColor", "indigo"]
    ];
    defaultSettings.forEach(pair => {
      ss.getSheetByName("Settings").appendRow(pair);
    });
    return {
      appName: "Nazcube HMS",
      companyName: "Nazcube Solution",
      companyPhone: "+60123456789",
      companyEmail: "nazcube.digital@gmail.com",
      companyAddress: "No. 12, Jalan Nazcube, 43000 Kajang, Selangor, Malaysia",
      invoicePrefix: "INV-",
      receiptPrefix: "REC-",
      taxRate: "0",
      themeColor: "indigo"
    };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return {};
  
  const values = sheet.getRange(1, 1, lastRow, 2).getValues();
  const settings = {};
  values.forEach(row => {
    const k = row[0];
    const v = row[1];
    if (k && k !== "KEY") {
      settings[k] = v;
    }
  });
  return settings;
}

/**
 * Create a missing tab and add default headers to avoid sheet crashes
 */
function createSheetWithHeaders(ss, sheetName, defaultHeaders) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  let headers = defaultHeaders;
  if (!headers) {
    if (sheetName === "PAYMENT") {
      headers = ["RECORD ID", "TYPE", "OWNER ID", "NAME", "PHONE", "EMAIL", "PRODUCT", "INCOME CATEGORY", "QUANTITY", "AMOUNT", "TAX", "DISCOUNT", "PAYMENT TYPE", "TIMESTAMP", "RECEIPT NO.", "SUBMIT BY"];
    } else if (sheetName === "PAYMENT-NR") {
      headers = ["RECORD ID", "TYPE", "NAME", "PHONE", "EMAIL", "PRODUCT", "INCOME CATEGORY", "QUANTITY", "AMOUNT", "TAX", "DISCOUNT", "PAYMENT TYPE", "TIMESTAMP", "RECEIPT NO.", "SUBMIT BY"];
    } else if (sheetName === "RESIDENT") {
      headers = ["OWNER ID", "OWNER NAME", "PHONE 1", "PHONE 2", "HOUSE STATUS", "EMAIL", "CARD 1", "CARD 2", "CARD 3", "CARD 4", "CARD 5", "CARD 6", "CARD 7", "CARD 8", "CARD 9", "CARD 10", "REMARK", "LAST UPDATE", "TENANT_NAME", "TENANT_PHONE", "TENANT_AGREEMENT_NAME", "TENANT_AGREEMENT_URL"];
    } else if (sheetName === "EXPENSES") {
      headers = ["RECORD ID", "DATE", "CATEGORY", "DETAILS", "AMOUNT", "TYPE OF PAYMENT", "REFERENCE", "PAY TO", "CONTACT NO.", "UPDATE DATE", "SEARCH KEY", "SUBMIT DATE", "DATE_D", "MONTH", "YEAR", "SUBMIT BY"];
    } else if (sheetName === "PRODUCT") {
      headers = ["TIMESTAMP", "ID", "DESCIPTION", "AMOUNT", "STATUS"];
    } else if (sheetName === "USERS") {
      headers = ["ID", "Full Name", "Email", "Phone", "Password", "Role", "Avatar", "Is Active", "Created At", "Updated At", "OTP", "OTP Expires"];
    } else if (sheetName === "Settings") {
      headers = ["KEY", "VALUE"];
    } else if (sheetName === "COMPLAINTS") {
      headers = ["ID", "OWNER ID", "RESIDENT NAME", "TITLE", "DESCRIPTION", "CATEGORY", "DATE", "STATUS", "REPLY", "ATTACHMENTS"];
    } else if (sheetName === "NOTICES") {
      headers = ["ID", "TITLE", "CONTENT", "DATE", "CATEGORY", "CREATED_BY", "TARGET_TYPE", "TARGET_RESIDENTS", "ATTACHMENTS"];
    } else if (sheetName === "NEWS") {
      headers = ["ID", "TITLE", "CONTENT", "DATE", "IMAGE_URL", "SUMMARY", "HIDDEN"];
    } else if (sheetName === "VISITOR_LOGS") {
      headers = ["ID", "HOUSE_UNIT", "VISITOR_TYPE", "VISITOR_NAME", "PURPOSE", "VEHICLE_PLATE", "DRIVING_LICENSE", "VEHICLE_PHOTO", "PASS_NUMBER", "CHECK_IN_TIME", "CHECK_OUT_TIME", "PRE_AUTH_PASS_ID", "CREATED_BY", "REMARKS"];
    } else if (sheetName === "VISITOR_PASSES") {
      headers = ["ID", "HOUSE_UNIT", "VISITOR_NAME", "VISITOR_TYPE", "VEHICLE_PLATE", "START_DATE", "END_DATE", "TIME_RANGE", "STATUS", "CREATED_AT", "QR_CODE_DATA", "CHECK_OUT_TIME"];
    } else if (sheetName === "SECURITY_INSTRUCTIONS") {
      headers = ["ID", "TITLE", "DETAILS", "DATE", "POSTED_BY", "URGENCY", "ACKNOWLEDGED_BY"];
    }
  }
  
  if (headers && headers.length > 0) {
    let lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      let existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return (h || "").toString().trim().toUpperCase();
      });
      let missingHeaders = [];
      headers.forEach(function(h) {
        if (existingHeaders.indexOf(h.trim().toUpperCase()) === -1) {
          missingHeaders.push(h);
        }
      });
      if (missingHeaders.length > 0) {
        sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    } else {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
}

/**
 * Adds a new row based on JSON object mapping to column headers
 */
function addRowToSheet(ss, sheetName, data) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    createSheetWithHeaders(ss, sheetName);
    sheet = ss.getSheetByName(sheetName);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRowValues = [];
  
  headers.forEach((header) => {
    if (header) {
      let val = data[header] !== undefined ? data[header] : "";
      // Autocomplete timestamp if header requires it and missing
      if ((header === "TIMESTAMP" || header === "Created At" || header === "SUBMIT DATE") && !val) {
        val = new Date().toISOString();
      }
      if (val !== undefined && val !== null && val !== "") {
        var strVal = val.toString().trim();
        if (strVal.indexOf("+") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
          val = "'" + strVal;
        }
      }
      newRowValues.push(val);
    }
  });
  
  sheet.appendRow(newRowValues);
  
  // Explicitly apply "@" (Plain Text) number format to all phone/contact cells of appended row
  var lastRow = sheet.getLastRow();
  headers.forEach((header, colIdx) => {
    if (header) {
      var val = newRowValues[colIdx];
      if (val !== undefined && val !== null && val !== "") {
        var strVal = val.toString().trim();
        if (strVal.indexOf("+") === 0 || strVal.indexOf("'") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
          var cell = sheet.getRange(lastRow, colIdx + 1);
          cell.setNumberFormat("@");
          var cleanVal = strVal;
          if (cleanVal.indexOf("'") === 0) {
            cleanVal = cleanVal.slice(1);
          }
          cell.setValue(cleanVal);
        }
      }
    }
  });

  return { status: "success", message: "Row added to " + sheetName };
}

/**
 * Updates a row in standard sheets matching an ID
 */
function updateRowInSheet(ss, sheetName, keyColumnName, keyValue, updatedData) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found: " + sheetName };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "No rows to update in " + sheetName };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColIdx = headers.indexOf(keyColumnName);
  if (keyColIdx === -1) return { status: "error", message: "Key column " + keyColumnName + " not found" };
  
  const keyValues = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues().map(row => row[0].toString());
  const rowIdx = keyValues.indexOf(keyValue.toString());
  
  if (rowIdx === -1) {
    // Falls back to adding row if it doesn't exist
    return addRowToSheet(ss, sheetName, updatedData);
  }
  
  const sheetRowIdx = rowIdx + 2; // +2 offset for headers (1-indexed mapping to 2nd row)
  
  headers.forEach((header, idx) => {
    if (header && updatedData[header] !== undefined) {
      var val = updatedData[header];
      var cell = sheet.getRange(sheetRowIdx, idx + 1);
      if (val !== undefined && val !== null && val !== "") {
        var strVal = val.toString().trim();
        if (strVal.indexOf("+") === 0 || strVal.indexOf("'") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
          cell.setNumberFormat("@");
          var cleanVal = strVal;
          if (cleanVal.indexOf("'") === 0) {
            cleanVal = cleanVal.slice(1);
          }
          cell.setValue(cleanVal);
        } else {
          cell.setValue(val);
        }
      } else {
        cell.setValue(val);
      }
    }
  });
  
  // Update timestamp/update column
  const updateHeaders = ["LAST UPDATE", "Updated At", "UPDATE DATE"];
  updateHeaders.forEach(uh => {
    const uIdx = headers.indexOf(uh);
    if (uIdx !== -1) {
      sheet.getRange(sheetRowIdx, uIdx + 1).setValue(new Date().toISOString());
    }
  });
  
  return { status: "success", message: "Row updated in " + sheetName };
}

/**
 * Deletes a row matching an ID keys
 */
function deleteRowFromSheet(ss, sheetName, keyColumnName, keyValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found: " + sheetName };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "No data rows in " + sheetName };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColIdx = headers.indexOf(keyColumnName);
  if (keyColIdx === -1) return { status: "error", message: "Key column " + keyColumnName + " not found" };
  
  const keyValues = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues().map(row => row[0].toString());
  const rowIdx = keyValues.indexOf(keyValue.toString());
  
  if (rowIdx === -1) {
    return { status: "error", message: "Row matching " + keyValue + " not found in " + sheetName };
  }
  
  sheet.deleteRow(rowIdx + 2);
  return { status: "success", message: "Row deleted from " + sheetName };
}

/**
 * Save settings to settings tab key-val rows
 */
function updateSettingsSheet(ss, settingsData) {
  let sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    createSheetWithHeaders(ss, "Settings", ["KEY", "VALUE"]);
    sheet = ss.getSheetByName("Settings");
  }
  
  // Clear setting sheet and rewrite
  sheet.clear();
  sheet.getRange(1, 1).setValue("KEY");
  sheet.getRange(1, 2).setValue("VALUE");
  
  let row = 2;
  for (const key in settingsData) {
    var val = settingsData[key];
    if (val === undefined || val === null) {
      val = "";
    }
    sheet.getRange(row, 1).setValue(key);
    sheet.getRange(row, 2).setValue(val.toString());
    row++;
  }
  
  return { status: "success", message: "Settings updated successfully" };
}

/**
 * Function to send email for OTP using Google's MailApp
 */
function sendOtpEmail(ss, email, otp) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: "[Nazcube HMS] Password Reset OTP Code",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #eaeaea; borderRadius: 8px;">
          <h2 style="color: #4f46e5; borderBottom: 1px solid #eaeaea; paddingBottom: 10px;">Nazcube Residences Management System</h2>
          <p>We received a request to reset your password. Use the following OTP code to proceed:</p>
          <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 28px; font-weight: bold; border-radius: 6px; letter-spacing: 4px; margin: 20px 0; color: #111827;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email or contact support.</p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 10px; text-align: center;">NAZCUBE SOLUTION &copy; 2026</p>
        </div>
      `
    });
    return { status: "success", message: "OTP Email sent successfully to " + email };
  } catch (err) {
    // If mail fails, return success with a warning so the web app can fall back to displaying the code directly in UI
    Logger.log("Email failed: " + err.toString());
    return { status: "warning", message: "Email delivery failed: " + err.toString(), otp: otp };
  }
}

/**
 * Upload Base64 image directly to Google Drive, share public-viewable, and save in Settings tab
 */
function uploadLogoToDrive(ss, base64Data, fileName) {
  try {
    var parts = base64Data.split(",");
    var contentType = "image/png";
    var rawBase64 = base64Data;
    if (parts.length > 1) {
      contentType = parts[0].split(";")[0].split(":")[1];
      rawBase64 = parts[1];
    }
    
    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, fileName || "logo.png");
    
    var folder;
    try {
      var folders = DriveApp.getFoldersByName("Nazcube Residences Uploads");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Nazcube Residences Uploads");
        try {
          folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          // Folder sharing restricted by policy, continue anyway
        }
      }
    } catch (fErr) {
      // Fallback
    }

    var file;
    if (folder) {
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
    
    // Set permission so that anyone with the link can view it (critical for embed)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Direct file sharing restricted by policy, continue anyway
    }
    
    var fileId = file.getId();
    // Use the direct embed download link format:
    var hostedUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    // Update Settings tab spreadsheet row to map "logoUrl" -> hostedUrl
    var currentSettings = getSettingsRows(ss);
    currentSettings.logoUrl = hostedUrl;
    updateSettingsSheet(ss, currentSettings);
    
    return {
      status: "success",
      message: "Logo saved to Google Drive and shared successfully",
      fileId: fileId,
      logoUrl: hostedUrl
    };
  } catch (err) {
    throw new Error("Failed to save logo to Google Drive: " + err.toString());
  }
}

/**
 * Adds a batch of rows to a sheet
 */
function addPaymentsBatchToSheet(ss, sheetName, dataArray) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    createSheetWithHeaders(ss, sheetName);
    sheet = ss.getSheetByName(sheetName);
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var allNewRowValues = [];
  
  dataArray.forEach(function(data) {
    var newRowValues = [];
    headers.forEach(function(header) {
      if (header) {
        var val = data[header] !== undefined ? data[header] : "";
        if ((header === "TIMESTAMP" || header === "Created At" || header === "SUBMIT DATE") && !val) {
          val = new Date().toISOString();
        }
        if (val !== undefined && val !== null && val !== "") {
          var strVal = val.toString().trim();
          if (strVal.indexOf("+") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
            val = "'" + strVal;
          }
        }
        newRowValues.push(val);
      }
    });
    allNewRowValues.push(newRowValues);
  });
  
  if (allNewRowValues.length > 0) {
    allNewRowValues.forEach(function(row) {
      sheet.appendRow(row);
      
      // Explicitly apply "@" (Plain Text) number format to all phone/contact cells of appended row
      var lastRow = sheet.getLastRow();
      headers.forEach(function(header, colIdx) {
        if (header) {
          var val = row[colIdx];
          if (val !== undefined && val !== null && val !== "") {
            var strVal = val.toString().trim();
            if (strVal.indexOf("+") === 0 || strVal.indexOf("'") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
              var cell = sheet.getRange(lastRow, colIdx + 1);
              cell.setNumberFormat("@");
              var cleanVal = strVal;
              if (cleanVal.indexOf("'") === 0) {
                cleanVal = cleanVal.slice(1);
              }
              cell.setValue(cleanVal);
            }
          }
        }
      });
    });
  }
  return { status: "success", message: "Batch of " + dataArray.length + " rows added to " + sheetName };
}

/**
 * Updates a batch of rows in a sheet
 */
function updatePaymentsBatchInSheet(ss, sheetName, keyColumnName, dataArray) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found: " + sheetName };
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "No rows to update in " + sheetName };
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyColIdx = headers.indexOf(keyColumnName);
  if (keyColIdx === -1) return { status: "error", message: "Key column " + keyColumnName + " not found" };
  
  var keyValues = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues().map(function(row) {
    return row[0].toString();
  });
  
  dataArray.forEach(function(payloadItem) {
    var keyValue = payloadItem.recordId;
    var updatedData = payloadItem.data;
    var rowIdx = keyValues.indexOf(keyValue.toString());
    
    if (rowIdx === -1) {
      var newRowValues = [];
      headers.forEach(function(header) {
        if (header) {
          var val = updatedData[header] !== undefined ? updatedData[header] : "";
          if ((header === "TIMESTAMP" || header === "Created At" || header === "SUBMIT DATE") && !val) {
            val = new Date().toISOString();
          }
          if (val !== undefined && val !== null && val !== "") {
            var strVal = val.toString().trim();
            if (strVal.indexOf("+") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
              val = "'" + strVal;
            }
          }
          newRowValues.push(val);
        }
      });
      sheet.appendRow(newRowValues);
      
      // Explicitly apply "@" (Plain Text) number format to all phone/contact cells of appended row
      var lastRow = sheet.getLastRow();
      headers.forEach(function(header, colIdx) {
        if (header) {
          var val = newRowValues[colIdx];
          if (val !== undefined && val !== null && val !== "") {
            var strVal = val.toString().trim();
            if (strVal.indexOf("+") === 0 || strVal.indexOf("'") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
              var cell = sheet.getRange(lastRow, colIdx + 1);
              cell.setNumberFormat("@");
              var cleanVal = strVal;
              if (cleanVal.indexOf("'") === 0) {
                cleanVal = cleanVal.slice(1);
              }
              cell.setValue(cleanVal);
            }
          }
        }
      });
    } else {
      var sheetRowIdx = rowIdx + 2;
      headers.forEach(function(header, idx) {
        if (header && updatedData[header] !== undefined) {
          var val = updatedData[header];
          var cell = sheet.getRange(sheetRowIdx, idx + 1);
          if (val !== undefined && val !== null && val !== "") {
            var strVal = val.toString().trim();
            if (strVal.indexOf("+") === 0 || strVal.indexOf("'") === 0 || header.indexOf("PHONE") !== -1 || header.indexOf("CONTACT") !== -1) {
              cell.setNumberFormat("@");
              var cleanVal = strVal;
              if (cleanVal.indexOf("'") === 0) {
                cleanVal = cleanVal.slice(1);
              }
              cell.setValue(cleanVal);
            } else {
              cell.setValue(val);
            }
          } else {
            cell.setValue(val);
          }
        }
      });
      
      var updateHeaders = ["LAST UPDATE", "Updated At", "UPDATE DATE"];
      updateHeaders.forEach(function(uh) {
        var uIdx = headers.indexOf(uh);
        if (uIdx !== -1) {
          sheet.getRange(sheetRowIdx, uIdx + 1).setValue(new Date().toISOString());
        }
      });
    }
  });
  
  return { status: "success", message: "Batch of " + dataArray.length + " rows updated/added in " + sheetName };
}

/**
 * Function to send an email with the invoice/receipt content to a resident or customer
 */
function sendInvoiceEmail(email, subject, htmlBody) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    return { status: "success", message: "Invoice / Receipt emailed successfully to " + email };
  } catch (err) {
    try {
      // Fallback using GmailApp
      GmailApp.sendEmail(email, subject, "", { htmlBody: htmlBody });
      return { status: "success", message: "Invoice / Receipt emailed successfully to " + email + " via Gmail" };
    } catch (gerr) {
      Logger.log("Email failed: " + gerr.toString());
      return { status: "error", message: "Failed to send email: " + gerr.toString() };
    }
  }
}

/**
 * Clears sheet data beneath headers and writes the input array
 */
function overwriteSheetData(ss, sheetName, dataArray) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    createSheetWithHeaders(ss, sheetName);
    sheet = ss.getSheetByName(sheetName);
  }
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  
  if (!dataArray || dataArray.length === 0) {
    return { status: "success", message: "Sheet " + sheetName + " cleared" };
  }
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var allRows = [];
  
  dataArray.forEach(function(item) {
    var rowValues = [];
    headers.forEach(function(header) {
      if (header) {
        var val = item[header] !== undefined ? item[header] : "";
        rowValues.push(val);
      }
    });
    allRows.push(rowValues);
  });
  
  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, headers.length).setValues(allRows);
  }
  
  return { status: "success", message: "Batch of " + dataArray.length + " rows synchronized to " + sheetName };
}

/**
 * Upload a Base64-encoded file directly to configured folder in Google Drive and return direct URL.
 */
function uploadFileToFolder(ss, base64Data, fileName) {
  try {
    var parts = base64Data.split(",");
    var contentType = "image/png";
    var rawBase64 = base64Data;
    if (parts.length > 1) {
      contentType = parts[0].split(";")[0].split(":")[1];
      rawBase64 = parts[1];
    }
    
    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, fileName || "upload_file");
    
    // Attempt to get configured folder ID from settings
    var settings = getSettingsRows(ss);
    var folderUrl = settings.driveFolderUrl || "";
    var folderId = "";
    if (folderUrl) {
      var folderMatch = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch && folderMatch[1]) {
        folderId = folderMatch[1];
      }
    }
    
    var folder;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (e) {
        // Fallback if folder access is restricted
      }
    }
    
    // Fallback: If configured folder is missing/restricted, auto-create a folder in our own Google Drive space
    if (!folder) {
      try {
        var folders = DriveApp.getFoldersByName("Nazcube Residences Uploads");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Nazcube Residences Uploads");
          try {
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shareErr) {
            // Folder sharing restricted by policy, continue anyway
          }
        }
      } catch (fErr) {
        // Ultimate fallback to root drive if folder creation also blocks
      }
    }
    
    var file;
    if (folder) {
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
    
    // Set view permissions
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // File sharing restricted by policy, continue anyway
    }
    
    var fileId = file.getId();
    var isImage = contentType && contentType.indexOf("image/") === 0;
    var hostedUrl = isImage 
      ? "https://lh3.googleusercontent.com/d/" + fileId 
      : "https://drive.google.com/file/d/" + fileId + "/view?usp=drivesdk";
    
    return {
      status: "success",
      message: "File uploaded successfully to Google Drive",
      fileId: fileId,
      fileUrl: hostedUrl
    };
  } catch (err) {
    return {
      status: "error",
      message: "Failed to upload file to Google Drive: " + err.toString()
    };
  }
}

