/**
 * Shared Type Definitions for Nazcube HMS
 */

export interface Payment {
  "RECORD ID": string;
  TYPE: "Resident" | "Non-Resident";
  "OWNER ID": string; // If Resident, references RESIDENT OWNER ID. If Non-Resident, store custom identifier or 'N/A'
  PRODUCT: string;
  QUANTITY: number;
  AMOUNT: number;
  TAX: number;
  DISCOUNT: number;
  "PAYMENT TYPE": string; // e.g. "Cash", "Card", "Online Transfer", "Cheque"
  TIMESTAMP: string;
  "RECEIPT NO.": string;
  "SUBMIT BY": string;
  REFERENCE?: string; // Reference number / Cheque No. (Optional)
  // Extra fields for non-resident dynamic contacts inside sheets or local
  "NON-RESIDENT NAME"?: string;
  "NON-RESIDENT PHONE"?: string;
  "NON-RESIDENT EMAIL"?: string;
  // Support direct names for PAYMENT-NR tab compatibility
  NAME?: string;
  PHONE?: string;
  EMAIL?: string;
  "INCOME CATEGORY"?: string;
}

export interface Resident {
  "OWNER ID": string;
  "OWNER NAME": string;
  "PHONE 1": string;
  "PHONE 2": string;
  "HOUSE STATUS": "Occupied" | "Vacant" | "Rented" | "Inactive";
  EMAIL: string;
  "CARD 1": string;
  "CARD 2": string;
  "CARD 3": string;
  "CARD 4": string;
  "CARD 5": string;
  "CARD 6": string;
  "CARD 7": string;
  "CARD 8": string;
  "CARD 9": string;
  "CARD 10": string;
  REMARK: string;
  "LAST UPDATE"?: string;
  TENANT_NAME?: string;
  TENANT_PHONE?: string;
  TENANT_AGREEMENT_NAME?: string;
  TENANT_AGREEMENT_URL?: string;
}

export interface Expense {
  "RECORD ID": string;
  DATE: string; // YYYY-MM-DD
  CATEGORY: string; // e.g. "Payment to Security Company", "Stationery", etc.
  DETAILS: string;
  AMOUNT: number;
  "TYPE OF PAYMENT": string; // "Bank", "Cash", etc.
  REFERENCE: string;
  "PAY TO": string;
  "CONTACT NO.": string;
  "UPDATE DATE"?: string;
  "SEARCH KEY"?: string;
  "SUBMIT DATE"?: string;
  "SUBMIT BY": string;
  // Breakdown columns supporting sheets format
  MONTH?: number; // 1-12
  YEAR?: number; // e.g., 2026
}

export interface Product {
  TIMESTAMP?: string;
  ID: string;
  DESCIPTION: string; // Note: sheet header has "DESCIPTION" typo. Let's support both but read "DESCIPTION"
  AMOUNT: number;
  STATUS: "Active" | "Inactive";
  CATEGORY?: string; // Links product to cashbook ledger income source
}

export interface User {
  ID: string;
  "Full Name": string;
  Email: string;
  Phone: string;
  Password?: string;
  Role: "admin" | "manager" | "staff" | "security";
  Avatar: string; // avatar style / image URL
  "Is Active": boolean | string; // Sheet might store true/false or "true"/"false"
  "Created At"?: string;
  "Updated At"?: string;
  OTP?: string;
  OTPExpires?: string;
}

export interface AppSettings {
  appName: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  invoicePrefix: string;
  receiptPrefix: string;
  taxRate: string; // stored as string e.g., "0" or "6"
  themeColor: string; // e.g. "indigo", "slate", "emerald", "blue"
  startingBalance: string; // starting cash balance B/F for Jan, e.g. "16812.11"
  monthlySecurityFeeRate: string; // RM50
  annualMembershipFeeRate: string; // RM120
  logoUrl?: string; // added field for company logo stored in Drive
  driveFolderUrl?: string; // added field for Google Drive upload folder link
  incomeCategories?: string; // Comma separated list of income categories/sources
  expenseCategories?: string; // Comma separated list of expense categories
  phoneCountryCode?: string; // e.g., "+60"
  currencySymbol?: string; // e.g., "RM" or "$"
  defaultEmailSubject?: string;
  defaultEmailBody?: string;
}

export interface DatabaseState {
  payments: Payment[];
  residents: Resident[];
  expenses: Expense[];
  products: Product[];
  users: User[];
  settings: AppSettings;
  notices?: Notice[];
  news?: News[];
  complaints?: Complaint[];
  visitorLogs?: VisitorLog[];
  visitorPasses?: VisitorPass[];
  securityInstructions?: SecurityInstruction[];
}

export interface VisitorLog {
  ID: string;
  HOUSE_UNIT: string;
  VISITOR_TYPE: "visitor" | "contractor" | "delivery" | "others";
  VISITOR_NAME: string;
  PURPOSE: string;
  VEHICLE_PLATE: string;
  DRIVING_LICENSE: string;
  VEHICLE_PHOTO?: string; // Base64 of vehicle snapshot with number plate
  PASS_NUMBER: string;
  CHECK_IN_TIME: string; // YYYY-MM-DD HH:mm:ss
  CHECK_OUT_TIME?: string | null; // YYYY-MM-DD HH:mm:ss
  PRE_AUTH_PASS_ID?: string | null; // ID of pre-authorized pass if used
  CREATED_BY: string; // Guard or staff
  REMARKS?: string;
}

export interface VisitorPass {
  ID: string;
  HOUSE_UNIT: string;
  VISITOR_NAME: string;
  VISITOR_TYPE: "visitor" | "contractor" | "delivery";
  VEHICLE_PLATE: string;
  START_DATE: string; // YYYY-MM-DD
  END_DATE: string; // YYYY-MM-DD
  TIME_RANGE: string; // e.g. "08:00 - 22:00"
  STATUS: "Active" | "Expired" | "Used";
  CREATED_AT: string;
  QR_CODE_DATA?: string; // QR token data string
  CHECK_OUT_TIME?: string | null; // YYYY-MM-DD HH:mm:ss
}

export interface SecurityInstruction {
  ID: string;
  TITLE: string;
  DETAILS: string;
  DATE: string; // YYYY-MM-DD
  POSTED_BY: string; // Posted by management staff
  URGENCY: "Normal" | "High" | "Critical";
  ACKNOWLEDGED_BY?: string; // Comma separated list of users who acknowledged
}

export interface Notice {
  ID: string;
  TITLE: string;
  CONTENT: string;
  DATE: string; // YYYY-MM-DD
  CATEGORY: "Urgent" | "General" | "Maintenance";
  CREATED_BY: string;
  TARGET_TYPE?: "All" | "Selective";
  TARGET_RESIDENTS?: string; // Comma-separated list of resident ID values e.g. "R102, R103"
  ATTACHMENTS?: string; // Comma-separated Google Drive links
}

export interface News {
  ID: string;
  TITLE: string;
  CONTENT: string;
  DATE: string; // YYYY-MM-DD
  IMAGE_URL?: string;
  SUMMARY: string;
  HIDDEN?: boolean | string; // Boolean or "TRUE"/"FALSE" from sheet
}

export interface Complaint {
  ID: string;
  "OWNER ID": string;
  "RESIDENT NAME": string;
  TITLE: string;
  DESCRIPTION: string;
  CATEGORY: "Security" | "Maintenance" | "Billing" | "Others";
  DATE: string;
  STATUS: "Pending" | "In Progress" | "Resolved";
  REPLY?: string;
  ATTACHMENTS?: string; // Comma-separated Google Drive links
}
