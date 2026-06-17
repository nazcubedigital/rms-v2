import { DatabaseState, Resident, Payment, Expense, Product, User } from "./types";

// Seeding standard Products
export const DEFAULT_PRODUCTS: Product[] = [
  { ID: "P001", DESCIPTION: "Monthly Security Fee", AMOUNT: 50.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Monthly Security Fee" },
  { ID: "P002", DESCIPTION: "Annual Membership Fee", AMOUNT: 120.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Annual Membership Fee" },
  { ID: "P003", DESCIPTION: "Additional Access Card", AMOUNT: 50.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Additional Access Card" },
  { ID: "P004", DESCIPTION: "Card Replacement", AMOUNT: 30.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Card Replacement" },
  { ID: "P005", DESCIPTION: "Maintenance", AMOUNT: 100.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Maintenance" },
  { ID: "P006", DESCIPTION: "Others", AMOUNT: 10.0, STATUS: "Active", TIMESTAMP: "2026-01-01T00:00:00Z", CATEGORY: "Others" }
];

// Seeding real-looking Residents
export const DEFAULT_RESIDENTS: Resident[] = [
  {
    "OWNER ID": "R101",
    "OWNER NAME": "Nazri Abdullah",
    "PHONE 1": "+6012-3456789",
    "PHONE 2": "+6011-9876543",
    "HOUSE STATUS": "Occupied",
    EMAIL: "nazri@example.com",
    "CARD 1": "AC-9081",
    "CARD 2": "AC-9082",
    "CARD 3": "",
    "CARD 4": "",
    "CARD 5": "",
    "CARD 6": "",
    "CARD 7": "",
    "CARD 8": "",
    "CARD 9": "",
    "CARD 10": "",
    REMARK: "Committee Member. Paid in full for annual.",
    "LAST UPDATE": "2026-05-15T08:30:00Z"
  },
  {
    "OWNER ID": "R102",
    "OWNER NAME": "Sophia Tan",
    "PHONE 1": "+6017-2223344",
    "PHONE 2": "",
    "HOUSE STATUS": "Rented",
    EMAIL: "sophia.tan@example.com",
    "CARD 1": "AC-3451",
    "CARD 2": "AC-3452",
    "CARD 3": "AC-3453",
    "CARD 4": "",
    "CARD 5": "",
    "CARD 6": "",
    "CARD 7": "",
    "CARD 8": "",
    "CARD 9": "",
    "CARD 10": "",
    REMARK: "Tenant. Needs card deactivated if overdue.",
    "LAST UPDATE": "2026-05-18T10:12:00Z",
    TENANT_NAME: "Marcus Lim",
    TENANT_PHONE: "+6019-8765432",
    TENANT_AGREEMENT_NAME: "Tenancy_Agreement_R102_Sophia.pdf",
    TENANT_AGREEMENT_URL: "data:application/pdf;base64,JVBERi0xLjQKJYo="
  },
  {
    "OWNER ID": "R103",
    "OWNER NAME": "Ramasamy Kumar",
    "PHONE 1": "+6013-1114455",
    "PHONE 2": "+6013-1114456",
    "HOUSE STATUS": "Occupied",
    EMAIL: "ramasamy.k@example.com",
    "CARD 1": "AC-5612",
    "CARD 2": "",
    "CARD 3": "",
    "CARD 4": "",
    "CARD 5": "",
    "CARD 6": "",
    "CARD 7": "",
    "CARD 8": "",
    "CARD 9": "",
    "CARD 10": "",
    REMARK: "Requested card replacement in April.",
    "LAST UPDATE": "2026-04-22T14:45:00Z"
  },
  {
    "OWNER ID": "R104",
    "OWNER NAME": "Ahmad Farhan",
    "PHONE 1": "+6016-5556677",
    "PHONE 2": "",
    "HOUSE STATUS": "Vacant",
    EMAIL: "farhan.ahmad@example.com",
    "CARD 1": "",
    "CARD 2": "",
    "CARD 3": "",
    "CARD 4": "",
    "CARD 5": "",
    "CARD 6": "",
    "CARD 7": "",
    "CARD 8": "",
    "CARD 9": "",
    "CARD 10": "",
    REMARK: "Owner overseas status. Fees pending.",
    "LAST UPDATE": "2026-01-10T09:00:00Z"
  },
  {
    "OWNER ID": "R105",
    "OWNER NAME": "Clara Wong",
    "PHONE 1": "+6012-8889900",
    "PHONE 2": "+6012-7772211",
    "HOUSE STATUS": "Occupied",
    EMAIL: "clara.wong@example.com",
    "CARD 1": "AC-7781",
    "CARD 2": "AC-7782",
    "CARD 3": "AC-7783",
    "CARD 4": "AC-7784",
    "CARD 5": "",
    "CARD 6": "",
    "CARD 7": "",
    "CARD 8": "",
    "CARD 9": "",
    "CARD 10": "",
    REMARK: "New access card order in April.",
    "LAST UPDATE": "2026-04-20T11:22:00Z"
  }
];

// Seeding Payments that match the spreadsheet CASHBOOK totals exactly:
// Total Income Month Breakdown:
// Jan: RM 100 (Additional Access Card RM100)
// Feb: RM 15,055 (Monthly Security Fee RM14,995, Additional Access Card RM50, Others RM10)
// Mar: RM 1,730 (Monthly Security Fee RM1,730)
// Apr: RM 24,352.30 (Monthly Security Fee RM20,370, Additional Access Card RM250, Others RM3,702.30, Card Replacement RM30)
// May: RM 420 (Monthly Security Fee RM420)
export const DEFAULT_PAYMENTS: Payment[] = [
  // --- JANUARY 2026 ---
  {
    "RECORD ID": "PMT-260101-01",
    TYPE: "Resident",
    "OWNER ID": "R101",
    PRODUCT: "Additional Access Card",
    QUANTITY: 2,
    AMOUNT: 100.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-01-15T10:00:00Z",
    "RECEIPT NO.": "REC-260001",
    "SUBMIT BY": "admin@nazcube.com"
  },

  // --- FEBRUARY 2026 ---
  {
    "RECORD ID": "PMT-260201-01",
    TYPE: "Resident",
    "OWNER ID": "R102",
    PRODUCT: "Monthly Security Fee", // We sum this into MONTHLY SECURITY FEE
    QUANTITY: 1, // aggregate swipe covering Monthly Security Fees totaling RM 14,995.00
    AMOUNT: 14995.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Bank Feed Batch Sweep",
    TIMESTAMP: "2026-02-28T17:00:00Z",
    "RECEIPT NO.": "REC-260002",
    "SUBMIT BY": "system@nazcube.com"
  },
  {
    "RECORD ID": "PMT-260215-01",
    TYPE: "Resident",
    "OWNER ID": "R103",
    PRODUCT: "Additional Access Card",
    QUANTITY: 1,
    AMOUNT: 50.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Cash",
    TIMESTAMP: "2026-02-15T12:00:00Z",
    "RECEIPT NO.": "REC-260003",
    "SUBMIT BY": "staff@nazcube.com"
  },
  {
    "RECORD ID": "PMT-260215-02",
    TYPE: "Non-Resident",
    "OWNER ID": "N/A",
    PRODUCT: "Others",
    QUANTITY: 1,
    AMOUNT: 10.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Cash",
    TIMESTAMP: "2026-02-20T14:30:00Z",
    "RECEIPT NO.": "REC-260004",
    "SUBMIT BY": "staff@nazcube.com"
  },

  // --- MARCH 2026 ---
  {
    "RECORD ID": "PMT-260301-01",
    TYPE: "Resident",
    "OWNER ID": "R105",
    PRODUCT: "Monthly Security Fee",
    QUANTITY: 1,
    AMOUNT: 1730.0, // Batch payment
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-03-10T11:00:00Z",
    "RECEIPT NO.": "REC-260005",
    "SUBMIT BY": "manager@nazcube.com"
  },

  // --- APRIL 2026 ---
  {
    "RECORD ID": "PMT-260401-01",
    TYPE: "Resident",
    "OWNER ID": "R101",
    PRODUCT: "Monthly Security Fee",
    QUANTITY: 1,
    AMOUNT: 20370.0, // Full sweep April
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-04-12T09:00:00Z",
    "RECEIPT NO.": "REC-260006",
    "SUBMIT BY": "admin@nazcube.com"
  },
  {
    "RECORD ID": "PMT-260415-01",
    TYPE: "Resident",
    "OWNER ID": "R105",
    PRODUCT: "Additional Access Card",
    QUANTITY: 5,
    AMOUNT: 250.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-04-15T15:20:00Z",
    "RECEIPT NO.": "REC-260007",
    "SUBMIT BY": "manager@nazcube.com"
  },
  {
    "RECORD ID": "PMT-260420-01",
    TYPE: "Non-Resident",
    "OWNER ID": "N/A",
    PRODUCT: "Others",
    QUANTITY: 1,
    AMOUNT: 3702.30, // Developer deposit or contractor pass
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-04-20T16:45:00Z",
    "RECEIPT NO.": "REC-260008",
    "SUBMIT BY": "admin@nazcube.com"
  },
  {
    "RECORD ID": "PMT-260422-01",
    TYPE: "Resident",
    "OWNER ID": "R103",
    PRODUCT: "Card Replacement",
    QUANTITY: 1,
    AMOUNT: 30.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Cash",
    TIMESTAMP: "2026-04-22T14:45:00Z",
    "RECEIPT NO.": "REC-260009",
    "SUBMIT BY": "staff@nazcube.com"
  },

  // --- MAY 2026 ---
  {
    "RECORD ID": "PMT-260501-01",
    TYPE: "Resident",
    "OWNER ID": "R102",
    PRODUCT: "Monthly Security Fee",
    QUANTITY: 1,
    AMOUNT: 420.0,
    TAX: 0,
    DISCOUNT: 0,
    "PAYMENT TYPE": "Online Transfer",
    TIMESTAMP: "2026-05-10T11:55:00Z",
    "RECEIPT NO.": "REC-260010",
    "SUBMIT BY": "staff@nazcube.com"
  }
];

// Seeding Expense that match the sheet CASHBOOK exactly:
// Total Expenditures:
// Jan: RM 0
// Feb: RM 16,751.76 (Payment to Security Company RM16,601.76, Other (Specify) RM150)
// Mar: RM 0
// Apr: RM 16,601.76 (Payment to Security Company RM16,601.76)
// May: RM 0
export const DEFAULT_EXPENSES: Expense[] = [
  // --- FEBRUARY 2026 ---
  {
    "RECORD ID": "EXP-260228-01",
    DATE: "2026-02-28",
    CATEGORY: "Payment to Security Company",
    DETAILS: "Security service charges for Feb 2026",
    AMOUNT: 16601.76,
    "TYPE OF PAYMENT": "Bank Transfer",
    REFERENCE: "TX-9081230",
    "PAY TO": "Securitas Malaysia Sdn Bhd",
    "CONTACT NO.": "+603-99881122",
    "UPDATE DATE": "2026-02-28T17:30:00Z",
    "SEARCH KEY": "SECURITAS FEB 2026",
    "SUBMIT DATE": "2026-02-28T17:30:00Z",
    "SUBMIT BY": "admin@nazcube.com",
    MONTH: 2,
    YEAR: 2026
  },
  {
    "RECORD ID": "EXP-260228-02",
    DATE: "2026-02-28",
    CATEGORY: "Other (Specify)",
    DETAILS: "Refreshments for Annual General Meeting",
    AMOUNT: 150.0,
    "TYPE OF PAYMENT": "Cash",
    REFERENCE: "CHQ-001928",
    "PAY TO": "Dapur Kak Siti Catering",
    "CONTACT NO.": "+6019-2233990",
    "UPDATE DATE": "2026-02-28T17:35:00Z",
    "SEARCH KEY": "AGM REFRESHMENTS",
    "SUBMIT DATE": "2026-02-28T17:35:00Z",
    "SUBMIT BY": "admin@nazcube.com",
    MONTH: 2,
    YEAR: 2026
  },

  // --- APRIL 2026 ---
  {
    "RECORD ID": "EXP-260430-01",
    DATE: "2026-04-30",
    CATEGORY: "Payment to Security Company",
    DETAILS: "Security service charges for Apr 2026",
    AMOUNT: 16601.76,
    "TYPE OF PAYMENT": "Bank Transfer",
    REFERENCE: "TX-9081971",
    "PAY TO": "Securitas Malaysia Sdn Bhd",
    "CONTACT NO.": "+603-99881122",
    "UPDATE DATE": "2026-04-30T17:30:00Z",
    "SEARCH KEY": "SECURITAS APR 2026",
    "SUBMIT DATE": "2026-04-30T17:30:00Z",
    "SUBMIT BY": "admin@nazcube.com",
    MONTH: 4,
    YEAR: 2026
  }
];

// Seeding Default Users
export const DEFAULT_USERS: User[] = [
  {
    ID: "U001",
    "Full Name": "Master Admin",
    Email: "admin@nazcube.com",
    Phone: "+6012-3456789",
    Password: "admin123", // Match plain passwords since we have plain auth for Google Sheet template as requested
    Role: "admin",
    Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    "Is Active": true,
    "Created At": "2026-01-01T00:00:00Z"
  },
  {
    ID: "U002",
    "Full Name": "Manager User",
    Email: "manager@nazcube.com",
    Phone: "+6013-9876543",
    Password: "manager123",
    Role: "manager",
    Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=manager",
    "Is Active": true,
    "Created At": "2026-01-02T00:00:00Z"
  },
  {
    ID: "U003",
    "Full Name": "Staff Staff",
    Email: "staff@nazcube.com",
    Phone: "+6019-3334445",
    Password: "staff123",
    Role: "staff",
    Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=staff",
    "Is Active": true,
    "Created At": "2026-01-03T00:00:00Z"
  },
  {
    ID: "U004",
    "Full Name": "On-Duty Guard",
    Email: "security@nazcube.com",
    Phone: "+6018-8776655",
    Password: "security123",
    Role: "security",
    Avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=guard",
    "Is Active": true,
    "Created At": "2026-01-04T00:00:00Z"
  }
];

export const DEFAULT_NOTICES = [
  {
    ID: "N001",
    TITLE: "Water Supply Disruption Notice",
    CONTENT: "Please be informed that Syarikat Air Selangor will be carrying out scheduled piping maintenance on 15th June 2026. Water supply will be fully disrupted from 9:00 AM to 5:00 PM affecting all blocks. Please store sufficient water.",
    DATE: "2026-06-12",
    CATEGORY: "Urgent",
    CREATED_BY: "Master Admin"
  } as const,
  {
    ID: "N002",
    TITLE: "Replacement of Access Card system",
    CONTENT: "Starting July 1st, 2026, the main guardhouse entrance will upgrade to the high-frequency RFID card readers. All physical cards with code PM-X must be registered or swapped at the management office before June 25th.",
    DATE: "2026-06-08",
    CATEGORY: "Maintenance",
    CREATED_BY: "Manager User"
  } as const,
  {
    ID: "N003",
    TITLE: "Annual General Meeting (AGM)",
    CONTENT: "The Annual General Meeting of Nazcube Residences will be held on Saturday, 28th June 2026, at the community clubhouse hall at 10:00 AM. Agenda papers and financial reports have been emailed to all registered owners.",
    DATE: "2026-06-05",
    CATEGORY: "General",
    CREATED_BY: "Master Admin"
  } as const
];

export const DEFAULT_NEWS = [
  {
    ID: "NW001",
    TITLE: "Nazcube Eco-Garden Inauguration Ceremony",
    SUMMARY: "Our community garden is officially open! Residents gathered to celebrate the grand launch of our organic community garden.",
    CONTENT: "Last weekend, the Nazcube Resident Association officially launched our Eco-Garden behind Block C. Managed entirely by passionate resident volunteers, the garden features fresh leafy vegetables, kitchen herbs, and organic compost units. We are proud of this green milestone. Anyone interested in reserving a planting bed should reach out to the management desk.",
    DATE: "2026-06-10",
    IMAGE_URL: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=400"
  },
  {
    ID: "NW002",
    TITLE: "Nazcube Security & CCTV Upgrade Completed",
    SUMMARY: "24 new high-definition IP cameras have been installed across perimeter fences and lift lobbies.",
    CONTENT: "As part of our commitment to safety, the management has completed the full security system overhaul. A total of 24 brand new high-definition IP cameras with infrared night-vision and cloud recording lines have been successfully commissioned. Additionally, guard patrols have been increased during late-night hours.",
    DATE: "2026-05-28",
    IMAGE_URL: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=400"
  }
];

export const DEFAULT_COMPLAINTS = [
  {
    ID: "C001",
    "OWNER ID": "R101",
    "RESIDENT NAME": "Nazri Abdullah",
    TITLE: "Street lamp out near Gate B",
    DESCRIPTION: "The third street lamp pole near Gate B has been flickering and is now completely black. It is very dark at night and raises security risks.",
    CATEGORY: "Maintenance",
    DATE: "2026-06-09",
    STATUS: "Resolved",
    REPLY: "Bulb changed on June 10, street lamp is now fully functional. Thank you for reporting!"
  } as const,
  {
    ID: "C002",
    "OWNER ID": "R102",
    "RESIDENT NAME": "Sophia Tan",
    TITLE: "Overdue garbage collection in Block B chute",
    DESCRIPTION: "Garbage chute in Block B Level 4 is blocked and rubbish has accumulated causing bad smell in the lift lobby since yesterday.",
    CATEGORY: "Others",
    DATE: "2026-06-11",
    STATUS: "In Progress",
    REPLY: "Our cleaning supervisor is currently investigating the blockage and will clear it today."
  } as const,
  {
    ID: "C003",
    "OWNER ID": "R102",
    "RESIDENT NAME": "Sophia Tan",
    TITLE: "Visitor parking block access barrier malfunctioning",
    DESCRIPTION: "The visitor parking gate barrier does not lift automatically after scanning visitor QR codes. It is causing tailbacks at the main gate.",
    CATEGORY: "Security",
    DATE: "2026-06-11",
    STATUS: "Pending"
  } as const
];

export const DEFAULT_VISITOR_LOGS = [
  {
    ID: "VL-001",
    HOUSE_UNIT: "R101",
    VISITOR_TYPE: "visitor" as const,
    VISITOR_NAME: "Ahmad Jalal",
    PURPOSE: "Family gathering visit",
    VEHICLE_PLATE: "WND 8812",
    DRIVING_LICENSE: "DL8890211-M",
    VEHICLE_PHOTO: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=300",
    PASS_NUMBER: "VP-401",
    CHECK_IN_TIME: "2026-06-12 09:15:32",
    CHECK_OUT_TIME: null,
    PRE_AUTH_PASS_ID: "PASS-R101-01",
    CREATED_BY: "Ahmad (Security Guard)",
    REMARKS: "Checked-in with Pre-Authorized QR Code"
  },
  {
    ID: "VL-002",
    HOUSE_UNIT: "R102",
    VISITOR_TYPE: "contractor" as const,
    VISITOR_NAME: "Jason Tan",
    PURPOSE: "Air conditioner repairing Block B level 4",
    VEHICLE_PLATE: "JQX 4321",
    DRIVING_LICENSE: "DL45129990",
    VEHICLE_PHOTO: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&q=80&w=300",
    PASS_NUMBER: "CP-102",
    CHECK_IN_TIME: "2026-06-12 10:30:00",
    CHECK_OUT_TIME: "2026-06-12 12:15:22",
    PRE_AUTH_PASS_ID: null,
    CREATED_BY: "Maniam (Security Guard)",
    REMARKS: "Completed repair, pass returned"
  },
  {
    ID: "VL-003",
    HOUSE_UNIT: "R103",
    VISITOR_TYPE: "delivery" as const,
    VISITOR_NAME: "Courier DHL Express",
    PURPOSE: "Parcel drop-off lobby",
    VEHICLE_PLATE: "BPH 9081",
    DRIVING_LICENSE: "DL322101",
    VEHICLE_PHOTO: "https://images.unsplash.com/photo-1516576885502-d4995b4523d4?auto=format&fit=crop&q=80&w=300",
    PASS_NUMBER: "DP-333",
    CHECK_IN_TIME: "2026-06-12 11:22:10",
    CHECK_OUT_TIME: null,
    PRE_AUTH_PASS_ID: null,
    CREATED_BY: "Ahmad (Security Guard)",
    REMARKS: "Lobby locker delivery"
  }
];

export const DEFAULT_VISITOR_PASSES = [
  {
    ID: "PASS-R101-01",
    HOUSE_UNIT: "R101",
    VISITOR_NAME: "Ahmad Jalal",
    VISITOR_TYPE: "visitor" as const,
    VEHICLE_PLATE: "WND 8812",
    START_DATE: "2026-06-12",
    END_DATE: "2026-06-15",
    TIME_RANGE: "08:00 - 22:00",
    STATUS: "Active" as const,
    CREATED_AT: "2026-06-12 08:00:00",
    QR_CODE_DATA: "PASS-R101-01"
  },
  {
    ID: "PASS-R102-01",
    HOUSE_UNIT: "R102",
    VISITOR_NAME: "Seng Electrical Services",
    VISITOR_TYPE: "contractor" as const,
    VEHICLE_PLATE: "VCH 4455",
    START_DATE: "2026-06-10",
    END_DATE: "2026-06-10",
    TIME_RANGE: "09:00 - 18:00",
    STATUS: "Expired" as const,
    CREATED_AT: "2026-06-09 17:30:00",
    QR_CODE_DATA: "PASS-R102-01"
  }
];

export const DEFAULT_SECURITY_INSTRUCTIONS = [
  {
    ID: "SI-001",
    TITLE: "Strict checking on Block B Lift contractor badges",
    DETAILS: "Management has received reports of unauthorized personnel posing as lifts repair operators. Ensure all contractors present written company approval letters and put on contractor badges before heading past the lobby barriers.",
    DATE: "2026-06-11",
    POSTED_BY: "Committee Chairperson",
    URGENCY: "High" as const,
    ACKNOWLEDGED_BY: "Ahmad (Security Guard)"
  },
  {
    ID: "SI-002",
    TITLE: "Main water pipe repair - contractor entry allowance",
    DETAILS: "Syabas Water contractors are scheduled to enter the water storage room near Gate C at 14:00 today. Please assist by opening Gate C and guiding their lorry (Plate: WXY 909) back to the reservoir pump.",
    DATE: "2026-06-12",
    POSTED_BY: "Estate Manager",
    URGENCY: "Critical" as const,
    ACKNOWLEDGED_BY: ""
  }
];

// Initial App State fallback
export const DEFAULT_STATE: DatabaseState = {
  payments: DEFAULT_PAYMENTS,
  residents: DEFAULT_RESIDENTS,
  expenses: DEFAULT_EXPENSES,
  products: DEFAULT_PRODUCTS,
  users: DEFAULT_USERS,
  notices: DEFAULT_NOTICES as any[],
  news: DEFAULT_NEWS,
  complaints: DEFAULT_COMPLAINTS as any[],
  visitorLogs: DEFAULT_VISITOR_LOGS,
  visitorPasses: DEFAULT_VISITOR_PASSES,
  securityInstructions: DEFAULT_SECURITY_INSTRUCTIONS,
  settings: {
    appName: "Nazcube HMS",
    companyName: "Nazcube Solution",
    companyPhone: "+60123456789",
    companyEmail: "nazcube.digital@gmail.com",
    companyAddress: "No. 12, Jalan Nazcube, 43000 Kajang, Selangor, Malaysia",
    invoicePrefix: "INV-",
    receiptPrefix: "REC-",
    taxRate: "0",
    themeColor: "indigo",
    startingBalance: "16812.11", // Jan starting balance matching screenshot!
    monthlySecurityFeeRate: "50",
    annualMembershipFeeRate: "120",
    logoUrl: "",
    incomeCategories: "Monthly Security Fee, Annual Membership Fee, Additional Access Card, Others, Maintenance, Card Replacement",
    expenseCategories: "Payment to Security Company, Stationery, Claim, Electronics & Electrical, Access Card Order, Property, Maintenance, Other (Specify)",
    phoneCountryCode: "+60",
    currencySymbol: "RM"
  }
};
