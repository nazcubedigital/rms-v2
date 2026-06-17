import React, { useState, useEffect } from "react";
import { DatabaseState, User, Payment, Resident, Expense, Product, AppSettings } from "./types";
import { DEFAULT_STATE } from "./demoData";
import { getMalaysiaDateString, isCurrentTimeInTimeRange } from "./utils/dateUtils";

function sanitizeState(state: DatabaseState | null | undefined): DatabaseState {
  const base = state || DEFAULT_STATE;
  return {
    ...base,
    payments: (base.payments || []).map(p => {
      const nonResName = p["NON-RESIDENT NAME"] || p.NAME || "";
      const nonResPhone = p["NON-RESIDENT PHONE"] || p.PHONE || "";
      const nonResEmail = p["NON-RESIDENT EMAIL"] || p.EMAIL || "";
      let incCat = p["INCOME CATEGORY"] || "";
      const normProd = (p.PRODUCT || "").toLowerCase().trim();
      if (normProd === "monthly security fee" || normProd === "monthly security rate" || normProd === "monthly fee" || normProd === "weekly security fee") {
        incCat = "Monthly Security Fee";
      } else if (normProd === "annual membership fee" || normProd === "annual membership rate" || normProd === "annual fee") {
        incCat = "Annual Membership Fee";
      } else if (!incCat && base.products) {
        const prod = base.products.find(pr => (pr.DESCIPTION || "").toLowerCase().trim() === normProd);
        if (prod) {
          incCat = prod.CATEGORY || prod.DESCIPTION || "";
        }
      }
      return {
        ...p,
        QUANTITY: Number(p.QUANTITY) || 0,
        AMOUNT: Number(p.AMOUNT) || 0,
        TAX: Number(p.TAX) || 0,
        DISCOUNT: Number(p.DISCOUNT) || 0,
        "NON-RESIDENT NAME": nonResName || undefined,
        "NON-RESIDENT PHONE": nonResPhone || undefined,
        "NON-RESIDENT EMAIL": nonResEmail || undefined,
        NAME: nonResName || undefined,
        PHONE: nonResPhone || undefined,
        EMAIL: nonResEmail || undefined,
        "INCOME CATEGORY": incCat || undefined
      };
    }),
    expenses: (base.expenses || []).map(e => ({
      ...e,
      AMOUNT: Number(e.AMOUNT) || 0,
      MONTH: e.MONTH !== undefined ? (Number(e.MONTH) || undefined) : undefined,
      YEAR: e.YEAR !== undefined ? (Number(e.YEAR) || undefined) : undefined
    })),
    products: (base.products || []).map(pr => ({
      ...pr,
      AMOUNT: Number(pr.AMOUNT) || 0,
      CATEGORY: pr.CATEGORY || (pr as any).Category || (pr as any).category || ""
    })),
    residents: base.residents || [],
    users: (base.users && base.users.length > 0) ? base.users : DEFAULT_STATE.users,
    notices: base.notices || DEFAULT_STATE.notices || [],
    news: base.news || DEFAULT_STATE.news || [],
    complaints: base.complaints || DEFAULT_STATE.complaints || [],
    visitorLogs: base.visitorLogs || DEFAULT_STATE.visitorLogs || [],
    visitorPasses: (base.visitorPasses || DEFAULT_STATE.visitorPasses || []).map(p => ({
      ...p,
      START_DATE: getMalaysiaDateString(p.START_DATE),
      END_DATE: getMalaysiaDateString(p.END_DATE),
      CREATED_AT: getMalaysiaDateString(p.CREATED_AT)
    })),
    securityInstructions: base.securityInstructions || DEFAULT_STATE.securityInstructions || [],
    settings: {
      ...DEFAULT_STATE.settings,
      ...(base.settings || {})
    }
  };
}

// Modular Tabs
import DashboardTab from "./components/DashboardTab";
import BillingTab from "./components/BillingTab";
import ResidentsTab from "./components/ResidentsTab";
import ExpensesTab from "./components/ExpensesTab";
import ProductsTab from "./components/ProductsTab";
import CashbookTab from "./components/CashbookTab";
import UsersTab from "./components/UsersTab";
import SettingsTab from "./components/SettingsTab";
import InvoiceModal from "./components/InvoiceModal";
import ResidentPortal from "./components/ResidentPortal";
import ComplaintsNoticesTab from "./components/ComplaintsNoticesTab";
import SecurityVisitorTab from "./components/SecurityVisitorTab";

// Icons from lucide-react
import {
  LayoutDashboard,
  Receipt,
  Users,
  TrendingDown,
  Tag,
  BookOpen,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  Database,
  Unplug,
  RefreshCw,
  Mail,
  Lock,
  LockKeyhole,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Unlock,
  Shield,
  MoreVertical,
  X,
  Clock,
  ArrowLeft,
  ExternalLink,
  Phone,
  QrCode,
  Calendar
} from "lucide-react";

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(DEFAULT_STATE);
  
  // App connection state
  const [gasUrl, setGasUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showConfigPopup, setShowConfigPopup] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginType, setLoginType] = useState<"management" | "resident">("management");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showUrlConfigInLogin, setShowUrlConfigInLogin] = useState(false);

  // OTP Reset password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [developerOtpToast, setDeveloperOtpToast] = useState("");

  // Navigation Sidebar state
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(true); // Manual collapser state
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // User Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [activeInvoice, setActiveInvoice] = useState<Payment | null>(null);
  const [pendingReminderResidentId, setPendingReminderResidentId] = useState<string | null>(null);

  // Public Shared Visitor Pass state
  const [publicPassId, setPublicPassId] = useState<string | null>(null);
  const [visitorLiveClock, setVisitorLiveClock] = useState<Date>(new Date());

  useEffect(() => {
    // Detect if ?pass=PASS-xxx is in URL search
    const queryParams = new URLSearchParams(window.location.search);
    const passQuery = queryParams.get("pass");
    if (passQuery) {
      setPublicPassId(passQuery);
    }
  }, []);

  useEffect(() => {
    if (publicPassId) {
      const interval = setInterval(() => {
        setVisitorLiveClock(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [publicPassId]);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem("nazcube-hms-dark") === "true");

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem("nazcube-hms-dark", String(next));
      return next;
    });
  };

  // Initialize Connection state
  useEffect(() => {
    let savedUrl = localStorage.getItem("naz_gas_url");
    const savedStates = localStorage.getItem("naz_local_db");
    
    // Auto-detect if injected by Google Apps Script template hosting environment
    // @ts-ignore
    const injectedUrl = window.GOOGLE_SCRIPT_URL;
    if (!savedUrl && injectedUrl && typeof injectedUrl === "string" && injectedUrl.startsWith("https://") && !injectedUrl.includes("<?=")) {
      savedUrl = injectedUrl;
      localStorage.setItem("naz_gas_url", savedUrl);
    }
    
    if (savedStates) {
      try {
        setDbState(sanitizeState(JSON.parse(savedStates)));
      } catch (e) {
        // Fall back to default seed data
      }
    }

    if (savedUrl) {
      setGasUrl(savedUrl);
      testConnectionAndSync(savedUrl);
    } else {
      // First opening - show required popup
      setShowConfigPopup(true);
    }
  }, []);

  // Sync to local storage as fallback
  useEffect(() => {
    localStorage.setItem("naz_local_db", JSON.stringify(dbState));
  }, [dbState]);

  // Main HTTP Sync logic
  const testConnectionAndSync = async (targetUrl: string, notifySuccess = false) => {
    if (!targetUrl) return false;
    setIsSyncing(true);
    try {
      // Check if they pasted the /edit or /editor URL
      if (targetUrl.includes("/edit") || !targetUrl.includes("/exec")) {
         throw new Error("The URL entered appears to be your Apps Script Editor URL, not the Web App URL. Web App URLs have '/exec' at the end, not '/edit'. Plese deploy it and copy the Executable URL.");
      }

      // Create clean URL with Action readAll
      const endpoint = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}action=readAll`;
      const response = await fetch(endpoint, {
        method: "GET",
        mode: "cors"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.ok ? 'ok' : response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (text.includes("Google Accounts") || text.includes("signin") || text.includes("login") || text.includes("Service Login")) {
          throw new Error("Authorization/Sign-In is required. This means the Apps Script Web App was deployed with 'Who has access: Only myself'. You must update and redeploy it with access set to 'Anyone' so the application can communicate with it.");
        } else if (text.includes("ScriptError") || text.includes("Exception") || text.includes("Scripts")) {
          throw new Error(`Runtime script error: ${text.substring(0, 200)}... Make sure you have authorized access by running the 'authorizeScript' function inside the Apps Script Toolbar before deploying.`);
        } else {
          throw new Error(`Response was not valid JSON database data. Response starts with: ${text.substring(0, 150)}`);
        }
      }
      
      if (data && (data.payments || data.residents || data.users)) {
        // Connected! Load sheets data
        const formattedState: DatabaseState = {
          payments: data.payments || [],
          residents: data.residents || [],
          expenses: data.expenses || [],
          products: data.products || [],
          users: data.users || [],
          notices: data.notices || [],
          news: data.news || [],
          complaints: data.complaints || [],
          visitorLogs: data.visitorLogs || [],
          visitorPasses: data.visitorPasses || [],
          securityInstructions: data.securityInstructions || [],
          settings: {
            appName: data.settings?.appName || "Nazcube HMS",
            companyName: data.settings?.companyName || "Nazcube Solution",
            companyPhone: data.settings?.companyPhone || "+60123456789",
            companyEmail: data.settings?.companyEmail || "nazcube.digital@gmail.com",
            companyAddress: data.settings?.companyAddress || "Kajang, Selangor, Malaysia",
            invoicePrefix: data.settings?.invoicePrefix || "INV-",
            receiptPrefix: data.settings?.receiptPrefix || "REC-",
            taxRate: data.settings?.taxRate || "0",
            themeColor: data.settings?.themeColor || "indigo",
            startingBalance: data.settings?.startingBalance || "16812.11",
            monthlySecurityFeeRate: data.settings?.monthlySecurityFeeRate || "50",
            annualMembershipFeeRate: data.settings?.annualMembershipFeeRate || "120",
            logoUrl: data.settings?.logoUrl || "",
            incomeCategories: data.settings?.incomeCategories || "Monthly Security Fee, Annual Membership Fee, Additional Access Card, Others, Maintenance, Card Replacement",
            expenseCategories: data.settings?.expenseCategories || "Payment to Security Company, Stationery, Claim, Electronics & Electrical, Access Card Order, Property, Maintenance, Other (Specify)"
          }
        };
        
        setDbState(sanitizeState(formattedState));
        setIsConnected(true);
        localStorage.setItem("naz_gas_url", targetUrl);
        if (notifySuccess) alert("Connection with Google Sheets authorized successfully! State loaded.");
        return true;
      } else {
        throw new Error("Invalid schema response - missing required tables.");
      }
    } catch (err: any) {
      console.warn("Connection test failed, utilizing Offline simulation fallback.", err);
      setIsConnected(false);
      
      let errorMsg = err?.message || String(err);
      if (errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch")) {
        errorMsg = "Network Error / CORS Block.\n\nThis is a browser security mechanism that blocks communication unless Google Apps Script is configured with the following settings:\n1. Execute as: 'Me' (Your Google Account)\n2. Who has access: 'Anyone'\n\nIf you have already configured these settings, verify that you copied the actual Web App URL ending in '/exec' (NOT the '/edit' URL of the Apps Script Editor).";
      }
      
      if (notifySuccess) {
        alert(`Could not establish integration link:\n\n❌ ${errorMsg}`);
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // POST operation helper to update Sheets Web API
  const performPostAction = async (action: string, payload: any) => {
    if (!gasUrl) {
      console.warn("Offline Sandbox simulation run for: " + action);
      return true;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: action,
          ...payload
        })
      });
      const resultObj = await response.json();
      
      if (resultObj && (resultObj.status === "success" || resultObj.status === "ok") && resultObj.database) {
        const fresh = resultObj.database;
        setDbState(sanitizeState({
          payments: fresh.payments || [],
          residents: fresh.residents || [],
          expenses: fresh.expenses || [],
          products: fresh.products || [],
          users: fresh.users || [],
          notices: fresh.notices || [],
          news: fresh.news || [],
          complaints: fresh.complaints || [],
          visitorLogs: fresh.visitorLogs || [],
          visitorPasses: fresh.visitorPasses || [],
          securityInstructions: fresh.securityInstructions || [],
          settings: fresh.settings || dbState.settings
        }));
        setIsConnected(true);
        return true;
      } else {
        throw new Error(resultObj?.message || "Invalid database response status from Google Sheets API");
      }
    } catch (err: any) {
      console.error("Failed post operation. Offline state preserved.", err);
      setIsConnected(false);
      // Suppress raw throws for background / optional updates so offline flow remains smooth and unbroken
      const isOptionalAction = action.endsWith("Batch") || action.startsWith("update") || action === "addComplaint";
      if (isOptionalAction) {
        console.warn(`Action "${action}" is not supported by your currently deployed Google Sheets Apps Script integration or connection is offline. ` +
                     `To enable this, deploy the latest code from "google-apps-script.js" located in your project root!`);
        return false;
      }
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Sync Manual Click
  const handleReloadData = () => {
    testConnectionAndSync(gasUrl, true);
  };

  // Submit Sheets setup modal
  const handleSaveGasUrl = async (urlVal: string) => {
    if (!urlVal.trim()) {
      alert("Please provide a valid Google Web App endpoint.");
      return;
    }
    const sanitizedUrl = urlVal.trim();
    if (sanitizedUrl.includes("docs.google.com/spreadsheets")) {
      alert("Error: You have pasted the Google Sheets Spreadsheet Link instead of the Web App API URL.\n\nPlease provide the deployed Web App URL from your Apps Script editor (which should look like: https://script.google.com/macros/s/.../exec) so the app can sync data.\n\nCheck the instructions in the 'Connect Sheets' documentation to obtain the correct Web App URL.");
      return;
    }
    setGasUrl(sanitizedUrl);
    const success = await testConnectionAndSync(sanitizedUrl, true);
    if (success) {
      setShowConfigPopup(false);
    } else {
      if (confirm("Setup Warning:\n\nWe could not establish a connection to this endpoint right now.\n\nWould you like to save the URL anyway and proceed in Offline Sandbox / Simulation mode?")) {
        localStorage.setItem("naz_gas_url", sanitizedUrl);
        setShowConfigPopup(false);
      }
    }
  };

  // Auth Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginType === "resident") {
      const residentObj = dbState.residents.find((r) => {
        const email = String(r.EMAIL || "").trim().toLowerCase();
        const phone = String(r["PHONE 1"] || "").trim().replace(/\s/g, "");
        const inputPass = loginPassword.trim().replace(/\s/g, "");
        
        return email === loginEmail.trim().toLowerCase() && phone === inputPass;
      });

      if (residentObj) {
        if (residentObj["HOUSE STATUS"] === "Inactive") {
          setLoginError("This resident profile is marked as Inactive. Contact management.");
          return;
        }
        
        // Construct standard synthetic user object
        const syntheticUser: User = {
          ID: residentObj["OWNER ID"],
          "Full Name": residentObj["OWNER NAME"],
          Email: residentObj.EMAIL,
          Phone: residentObj["PHONE 1"],
          Role: "resident" as any,
          Avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${residentObj["OWNER ID"]}`,
          "Is Active": true
        };
        
        setCurrentUser(syntheticUser);
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError("Incorrect Resident Email or registered phone number passphrase. Check quick-fill list.");
      }
      return;
    }

    // Look up helper that is case-insensitive and whitespace-insulated
    const getPropIgnoreCase = (obj: any, targetKey: string): any => {
      if (!obj) return undefined;
      const cleanTarget = targetKey.toLowerCase().replace(/[\s_-]/g, "");
      const foundKey = Object.keys(obj).find(k => {
        const cleanK = k.toLowerCase().replace(/[\s_-]/g, "");
        return cleanK === cleanTarget;
      });
      return foundKey ? obj[foundKey] : undefined;
    };

    const userObj = dbState.users.find((u) => {
      const emailVal = getPropIgnoreCase(u, "Email");
      const passVal = getPropIgnoreCase(u, "Password");
      
      const email = typeof emailVal === "string" ? emailVal : String(emailVal || "");
      const pass = typeof passVal === "string" ? passVal : String(passVal || "");
      
      return email.trim().toLowerCase() === loginEmail.trim().toLowerCase() && 
             pass.trim() === loginPassword.trim();
    });

    if (userObj) {
      const activeVal = getPropIgnoreCase(userObj, "Is Active");
      const activeState = activeVal === true || 
                          activeVal === 1 ||
                          String(activeVal).trim().toLowerCase() === "true" ||
                          String(activeVal).trim().toLowerCase() === "active" ||
                          String(activeVal).trim().toLowerCase() === "yes" ||
                          String(activeVal).trim().toLowerCase() === "1";
      if (!activeState) {
        setLoginError("This management account is suspended. Contact Administrator.");
        return;
      }
      setCurrentUser(userObj);
      // Success auto navigating
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError("Incorrect Email Address or Passphrase Code. Try quick-selections.");
    }
  };

  // Simulate quick-fill login
  const handleQuickLoginFill = (emailVal: string, passVal: string) => {
    setLoginEmail(emailVal);
    setLoginPassword(passVal);
    setLoginError("");
  };

  // OTP Password Reset Simulation
  const handleSendResetOtp = async () => {
    setDeveloperOtpToast("");
    const matchedUser = dbState.users.find((u) => u.Email.toLowerCase() === forgotEmail.toLowerCase());
    
    if (!matchedUser) {
      alert("Email address not found in authorized USERS directory!");
      return;
    }

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(randomOtp);
    setOtpSent(true);

    try {
      // Write OTP inside Sheets
      await performPostAction("updateUser", {
        id: matchedUser.ID,
        data: {
          ...matchedUser,
          OTP: randomOtp,
          "OTP Expires": new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }
      });

      // Send real email via Apps script
      if (isConnected) {
        await performPostAction("sendOTP", { email: forgotEmail, otp: randomOtp });
      }
    } catch (err) {
      console.warn("Unable to sync OTP to Google Sheets. Operating in sandbox fallback.", err);
    }

    // Display Toast overlay so testing is extremely smooth!
    setDeveloperOtpToast(randomOtp);
  };

  const handleVerifyOtpAndChangeVal = async () => {
    if (enteredOtp !== otpCode) {
      alert("Invalid verification code! Double check the simulated toaster in green.");
      return;
    }
    if (!newPassword.trim()) {
      alert("Specify a strong master secret password.");
      return;
    }

    // Update state & Sheet password
    const matchedUser = dbState.users.find((u) => u.Email.toLowerCase() === forgotEmail.toLowerCase());
    if (matchedUser) {
      const updatedUser: User = {
        ...matchedUser,
        Password: newPassword,
        OTP: "",
        "OTP Expires": ""
      };
      
      try {
        if (!gasUrl) {
          setDbState(prev => ({
            ...prev,
            users: prev.users.map(u => u.ID === matchedUser.ID ? updatedUser : u)
          }));
        } else {
          await performPostAction("updateUser", { id: matchedUser.ID, data: updatedUser });
        }
        setResetSuccess(true);
        setTimeout(() => {
          setShowForgotModal(false);
          setOtpSent(false);
          setForgotEmail("");
          setNewPassword("");
          setEnteredOtp("");
          setResetSuccess(false);
        }, 3000);
      } catch (err) {
        alert("Failed to sync password reset to Google Sheets. Verify Web App deployment.");
      }
    }
  };

  // Sidebar Layout Hover handlers
  const handleMouseEnterSidebar = () => {
    if (!isPinned) {
      setIsHovered(true);
    }
  };

  const handleMouseLeaveSidebar = () => {
    if (!isPinned) {
      setIsHovered(false);
    }
  };

  // Sidebar logic toggles
  const computedCollapsed = isPinned ? sidebarCollapsed : !isHovered;

  // Sync state mutation functions from child tabs
  const handleAddPayment = async (newPmt: Payment) => {
    if (!gasUrl) {
      setDbState((prev) => ({
        ...prev,
        payments: [...prev.payments, newPmt]
      }));
      return;
    }
    await performPostAction("addPayment", { data: newPmt });
  };

  const handleUpdatePayment = async (recordId: string, updatedPmt: Payment) => {
    if (!gasUrl) {
      setDbState((prev) => ({
        ...prev,
        payments: prev.payments.map(p => p["RECORD ID"] === recordId ? updatedPmt : p)
      }));
      return;
    }
    await performPostAction("updatePayment", { recordId, data: updatedPmt });
  };

  const handleAddPaymentsBatch = async (newPmts: Payment[]) => {
    if (!gasUrl) {
      setDbState((prev) => ({
        ...prev,
        payments: [...prev.payments, ...newPmts]
      }));
      return;
    }
    await performPostAction("addPaymentsBatch", { data: newPmts });
  };

  const handleUpdatePaymentsBatch = async (dataArray: { recordId: string; data: Payment }[]) => {
    if (!gasUrl) {
      setDbState((prev) => {
        const updatedPayments = [...prev.payments];
        dataArray.forEach((item) => {
          const idx = updatedPayments.findIndex(p => p["RECORD ID"] === item.recordId);
          if (idx !== -1) {
            updatedPayments[idx] = item.data;
          } else {
            updatedPayments.push(item.data);
          }
        });
        return { ...prev, payments: updatedPayments };
      });
      return;
    }
    await performPostAction("updatePaymentsBatch", { data: dataArray });
  };

  const handleAddResident = async (newRes: Resident) => {
    setDbState((prev) => ({
      ...prev,
      residents: [...prev.residents, newRes]
    }));
    if (gasUrl) {
      await performPostAction("addResident", { data: newRes });
    }
  };

  const handleUpdateResident = async (ownerIdVal: string, updatedRes: Resident) => {
    setDbState((prev) => ({
      ...prev,
      residents: prev.residents.map(r => r["OWNER ID"] === ownerIdVal ? updatedRes : r)
    }));
    if (gasUrl) {
      await performPostAction("updateResident", { ownerId: ownerIdVal, data: updatedRes });
    }
  };

  const handleDeleteResident = async (ownerIdVal: string) => {
    setDbState((prev) => ({
      ...prev,
      residents: prev.residents.filter(r => r["OWNER ID"] !== ownerIdVal)
    }));
    if (gasUrl) {
      await performPostAction("deleteResident", { ownerId: ownerIdVal });
    }
  };

  const handleAddExpense = async (newExp: Expense) => {
    setDbState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, newExp]
    }));
    if (gasUrl) {
      await performPostAction("addExpense", { data: newExp });
    }
  };

  const handleUpdateExpense = async (recordId: string, updatedExp: Expense) => {
    setDbState((prev) => ({
      ...prev,
      expenses: prev.expenses.map(e => e["RECORD ID"] === recordId ? updatedExp : e)
    }));
    if (gasUrl) {
      await performPostAction("updateExpense", { recordId, data: updatedExp });
    }
  };

  const handleDeleteExpense = async (recordId: string) => {
    setDbState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter(e => e["RECORD ID"] !== recordId)
    }));
    if (gasUrl) {
      await performPostAction("deleteExpense", { recordId });
    }
  };

  const handleAddProduct = async (newProd: Product) => {
    setDbState((prev) => ({
      ...prev,
      products: [...prev.products, newProd]
    }));
    if (gasUrl) {
      await performPostAction("addProduct", { data: newProd });
    }
  };

  const handleUpdateProduct = async (pId: string, updatedProd: Product) => {
    setDbState((prev) => ({
      ...prev,
      products: prev.products.map(p => p.ID === pId ? updatedProd : p)
    }));
    if (gasUrl) {
      await performPostAction("updateProduct", { id: pId, data: updatedProd });
    }
  };

  const handleDeleteProduct = async (pId: string) => {
    setDbState((prev) => ({
      ...prev,
      products: prev.products.filter(p => p.ID !== pId)
    }));
    if (gasUrl) {
      await performPostAction("deleteProduct", { id: pId });
    }
  };

  const handleAddUser = async (newUser: User) => {
    setDbState((prev) => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
    if (gasUrl) {
      await performPostAction("addUser", { data: newUser });
    }
  };

  const handleUpdateUser = async (uId: string, updatedUser: User) => {
    setDbState((prev) => ({
      ...prev,
      users: prev.users.map(u => u.ID === uId ? updatedUser : u)
    }));
    if (gasUrl) {
      await performPostAction("updateUser", { id: uId, data: updatedUser });
    }
  };

  const handleDeleteUser = async (uId: string) => {
    setDbState((prev) => ({
      ...prev,
      users: prev.users.filter(u => u.ID !== uId)
    }));
    if (gasUrl) {
      await performPostAction("deleteUser", { id: uId });
    }
  };

  const handleUpdateSettings = async (updatedSettings: AppSettings) => {
    if (!gasUrl) {
      setDbState((prev) => ({
        ...prev,
        settings: updatedSettings
      }));
      return;
    }
    await performPostAction("updateSettings", { data: updatedSettings });
  };

  const handleUploadLogo = async (base64Data: string, fileName: string): Promise<string> => {
    if (!gasUrl) {
      setDbState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          logoUrl: base64Data
        }
      }));
      return base64Data;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "uploadLogo",
          base64Data,
          fileName
        })
      });
      const resultObj = await response.json();
      if (resultObj && (resultObj.status === "success" || resultObj.status === "ok") && resultObj.database) {
        if (resultObj.result && resultObj.result.status === "error") {
          throw new Error(resultObj.result.message || "Failed to save logo to Google Drive");
        }
        const fresh = resultObj.database;
        setDbState(sanitizeState({
          payments: fresh.payments || [],
          residents: fresh.residents || [],
          expenses: fresh.expenses || [],
          products: fresh.products || [],
          users: fresh.users || [],
          notices: fresh.notices || [],
          news: fresh.news || [],
          complaints: fresh.complaints || [],
          visitorLogs: fresh.visitorLogs || [],
          visitorPasses: fresh.visitorPasses || [],
          securityInstructions: fresh.securityInstructions || [],
          settings: fresh.settings || dbState.settings
        }));
        setIsConnected(true);
        return resultObj.result?.logoUrl || resultObj.logoUrl || "";
      } else {
        throw new Error(resultObj?.message || "Failed to parse Google Drive response from Google sheets API");
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Failed to connect to Google Sheets backend to upload logo.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadFile = async (base64Data: string, fileName: string): Promise<string> => {
    if (!gasUrl) {
      // Offline sandbox - return local base64 so user can preview files
      return base64Data;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "uploadFile",
          base64Data,
          fileName
        })
      });
      const resultObj = await response.json();
      if (resultObj && resultObj.status === "success") {
        if (resultObj.result && resultObj.result.status === "error") {
          throw new Error(resultObj.result.message || "Failed to upload file to Google Drive folder");
        }
        return resultObj.result?.fileUrl || resultObj.fileUrl || "";
      } else {
        throw new Error(resultObj?.message || "Failed to upload file to Google Drive folder");
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Failed to connect to Google Drive to upload file.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Dynamic branding color themes
  const colorPresetClasses = () => {
    const activeCol = dbState.settings.themeColor || "slate";
    switch (activeCol) {
      case "emerald":
        return {
          primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
          accent: "text-emerald-700 bg-emerald-50 border-emerald-100/70",
          text: "text-emerald-700",
          sidebar: "bg-white",
          highlight: "border-emerald-500 text-emerald-700",
          indigoRing: "focus:ring-emerald-100 focus:border-emerald-500"
        };
      case "blue":
        return {
          primary: "bg-blue-600 hover:bg-blue-700 text-white",
          accent: "text-blue-700 bg-blue-50 border-blue-100/70",
          text: "text-blue-705",
          sidebar: "bg-white",
          highlight: "border-blue-500 text-blue-700",
          indigoRing: "focus:ring-blue-100 focus:border-blue-500"
        };
      case "slate":
        return {
          primary: "bg-slate-900 hover:bg-slate-800 text-white",
          accent: "text-slate-800 bg-slate-100/80 border-slate-200/50",
          text: "text-slate-800",
          sidebar: "bg-white",
          highlight: "border-slate-900 text-slate-900",
          indigoRing: "focus:ring-slate-100 focus:border-slate-900"
        };
      default:
        return {
          primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
          accent: "text-indigo-700 bg-indigo-50 border-indigo-100/70",
          text: "text-indigo-700",
          sidebar: "bg-white",
          highlight: "border-indigo-650 text-indigo-700",
          indigoRing: "focus:ring-indigo-105 focus:border-indigo-505"
        };
    }
  };

  const themeClasses = colorPresetClasses();

  // --- PUBLIC SHARED VISITOR PASS GATEWAY BYPASS ---
  if (publicPassId) {
    const passDetails = dbState.visitorPasses?.find((p) => p.ID === publicPassId);
    const hostDetails = passDetails ? dbState.residents?.find((r) => r["OWNER ID"] === passDetails.HOUSE_UNIT) : null;

    // Render time string with seconds nicely in GMT+8
    const liveTimeStr = visitorLiveClock.toLocaleTimeString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    const liveDateStr = visitorLiveClock.toLocaleDateString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    if (!passDetails) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 font-sans antialiased text-center relative overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-900/10 rounded-full blur-3xl pointer-events-none" />
          <div className="my-auto max-w-sm mx-auto space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-505 rounded-2xl flex items-center justify-center mx-auto text-3xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Pass Not Found or Invalid</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                The visitor coupon code you followed does not correspond to an active record in our Residences HMS Registry, or the URL might be malformed.
              </p>
            </div>
            <button
              onClick={() => {
                // Clear state
                setPublicPassId(null);
                // Also strip query parameter from URL cleanly without full reload!
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
              className="w-full bg-slate-805 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl cursor-pointer transition text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Nazcube Portal
            </button>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
            Nazcube HMS Safe Shield Gateway
          </div>
        </div>
      );
    }

    // Pass details found, calculate live statuses
    const todayStr = getMalaysiaDateString(visitorLiveClock);
    const cleanStartDate = getMalaysiaDateString(passDetails.START_DATE);
    const cleanEndDate = getMalaysiaDateString(passDetails.END_DATE);

    const isExpired = passDetails.STATUS === "Expired";
    const isUsed = passDetails.STATUS === "Used";
    const isOverdue = cleanEndDate < todayStr;
    const isUpcoming = cleanStartDate > todayStr;
    const isOutsideTimeRange = !isCurrentTimeInTimeRange(passDetails.TIME_RANGE).valid;

    let passStatusText = "AUTHORIZED GUEST PASS";
    let passStatusBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    let passBadgeDotColor = "bg-emerald-500 animate-pulse";
    let passStatusDetails = "Pre-screened of record. Guard entry is fully authorized.";
    let passIsValid = true;

    if (isExpired || isOverdue) {
      passStatusText = "EXPIRED PASS COUPON";
      passStatusBg = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      passBadgeDotColor = "bg-rose-500";
      passStatusDetails = "Valid period elapsed. Guest entry strictly forbidden.";
      passIsValid = false;
    } else if (isUsed) {
      passStatusText = "PASS MARKED AS USED";
      passStatusBg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      passBadgeDotColor = "bg-indigo-500";
      passStatusDetails = "Logged entry complete. Reuse forbidden under bylaws.";
      passIsValid = false;
    } else if (isUpcoming) {
      passStatusText = "UPCOMING PASS - NOT YET VALID";
      passStatusBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      passBadgeDotColor = "bg-amber-500";
      passStatusDetails = `Scheduled for date starting: ${cleanStartDate}.`;
      passIsValid = false;
    } else if (isOutsideTimeRange) {
      passStatusText = "OUTSIDE SEGMENT WINDOW";
      passStatusBg = "bg-orange-500/10 text-orange-400 border-orange-500/30";
      passBadgeDotColor = "bg-orange-500";
      passStatusDetails = `Authorized only for hours segment: ${passDetails.TIME_RANGE}.`;
      passIsValid = false;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans antialiased relative overflow-x-hidden">
        {/* Ambient neon radial gradients */}
        <div className="absolute top-1/10 left-1/10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/10 right-1/10 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Global style block containing animated scan sweep laser */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideLaser {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .laser-sweep-line {
            animation: slideLaser 3.5s infinite linear;
          }
        `}} />

        {/* Outer viewport wrapper */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-4 relative z-10">
          
          {/* Header Portal logo */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              {dbState.settings.logoUrl ? (
                <img
                  referrerPolicy="no-referrer"
                  src={dbState.settings.logoUrl}
                  alt="Logo"
                  className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white p-0.5 border border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 bg-indigo-600 font-extrabold flex items-center justify-center rounded-lg text-sm text-white font-sans">N</div>
              )}
              <div>
                <span className="font-extrabold text-xs block text-slate-100 uppercase tracking-tight">{dbState.settings.companyName || "Nazcube Residences"}</span>
                <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-medium">Verified Gateway Pass</span>
              </div>
            </div>
            <button
              onClick={() => {
                setPublicPassId(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
              title="Leave Gateway"
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition text-[9px] font-bold cursor-pointer"
            >
              Portal Home
            </button>
          </div>

          {/* Primary Pass Holder Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            
            {/* Real-time Status Badge Header */}
            <div className={`p-4 border-b border-slate-800/80 flex flex-col items-center text-center gap-1.5 ${passStatusBg}`}>
              <div className="flex items-center gap-1.5 font-extrabold text-[11px] tracking-widest uppercase font-mono">
                <span className={`w-2 h-2 rounded-full ${passBadgeDotColor}`}></span>
                {passStatusText}
              </div>
              <p className="text-[10px] opacity-80 leading-normal font-sans">{passStatusDetails}</p>
            </div>

            {/* Content segments */}
            <div className="p-5 space-y-4">
              
              {/* Dynamic Animated QR Scanning Area */}
              <div className="mx-auto bg-slate-950 border border-slate-850 p-4 rounded-2xl w-44 h-44 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
                
                {passIsValid ? (
                  <>
                    {/* Laser sweep line overlay */}
                    <div className="absolute left-0 right-0 h-[2px] bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.8)] laser-sweep-line pointer-events-none z-10" />

                    {/* Green scanning corners brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />

                    <div className="space-y-2 text-center">
                      <svg className="w-28 h-28 text-slate-200 transition duration-300 group-hover:scale-[1.03]" viewBox="0 0 100 100">
                        <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                        <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="77" y="12" width="11" height="11" fill="currentColor" />
                        <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="12" y="77" width="11" height="11" fill="currentColor" />
                        
                        <path d="M 40,10 H 50 M 45,20 H 60 M 10,40 V 55 M 90,40 V 85 M 40,40 H 60 V 60 H 40 Z M 70,70 H 80 M 80,80 H 90 H 80 M 50,75 H 65 M 55,90 H 70" stroke="currentColor" strokeWidth="5.5" strokeLinecap="square" fill="none" />
                      </svg>
                      <span className="text-[10px] font-mono font-extrabold text-emerald-400 block tracking-widest uppercase">{passDetails.ID}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-1.5 text-slate-500">
                    <X className="w-10 h-10 text-slate-600 mx-auto" />
                    <span className="text-[9.5px] uppercase font-bold tracking-widest font-mono">Void Access Coupon</span>
                  </div>
                )}
              </div>

              {/* Main Visitor & Host profile meta */}
              <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
                <span className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Authorized Guest & Vehicle ID</span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-start leading-tight">
                    <span className="text-slate-400">Visitor Name:</span>
                    <span className="font-extrabold text-slate-100 text-right">{passDetails.VISITOR_NAME}</span>
                  </div>
                  <div className="flex justify-between items-center leading-normal">
                    <span className="text-slate-400">Class Classification:</span>
                    <span className="font-bold text-slate-300 text-right uppercase bg-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-700">{passDetails.VISITOR_TYPE}</span>
                  </div>
                  <div className="flex justify-between items-center leading-normal">
                    <span className="text-slate-400">License Plate:</span>
                    <span className="font-extrabold font-mono text-slate-100 text-[13px] tracking-wider bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 text-right uppercase">{passDetails.VEHICLE_PLATE}</span>
                  </div>
                  <div className="flex justify-between items-start leading-tight">
                    <span className="text-slate-400">Validity Date:</span>
                    <span className="font-semibold text-slate-200 text-right">{getMalaysiaDateString(passDetails.START_DATE)} to {getMalaysiaDateString(passDetails.END_DATE)}</span>
                  </div>
                  <div className="flex justify-between items-start leading-tight">
                    <span className="text-slate-400">Hours Window Slot:</span>
                    <span className="font-extrabold text-indigo-400 text-right">{passDetails.TIME_RANGE}</span>
                  </div>
                </div>
              </div>

              {/* Resident Host Information */}
              {hostDetails && (
                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5 font-sans">
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-450 tracking-wider">Designated Resident Host</span>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-200 text-[12px] block">{hostDetails["OWNER NAME"]}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-0.5">Unit {passDetails.HOUSE_UNIT}</span>
                      </div>
                    </div>
                  </div>
                  
                  {hostDetails["PHONE 1"] && (
                    <a
                      href={`tel:${hostDetails["PHONE 1"]}`}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-[10.5px] flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950 cursor-pointer text-center"
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      Call Resident Host Friend
                    </a>
                  )}
                </div>
              )}

              {/* Gatekeeper Check instructions */}
              <div className="bg-slate-950/30 rounded-2xl p-4 border border-slate-850 text-[10px] text-slate-400 leading-relaxed font-sans space-y-2">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-450 tracking-wider block">Security Officer Protocol Block</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Validate that the physical vehicle plate matches <b>{passDetails.VEHICLE_PLATE}</b>.</li>
                  <li>Confirm guest identity with authorized ID if necessary.</li>
                  <li>Conduct standard boot safety inspection upon entry.</li>
                  <li>Provide visitor card bay sticker and permit access.</li>
                </ul>
              </div>

            </div>

            {/* LIVE DYNAMIC GMT+8 MALAYSIA CLOCK SECTION */}
            <div className="bg-slate-950/90 border-t border-slate-800 text-center p-3.5 space-y-1 relative font-sans">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 font-mono tracking-tight">
                <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Malaysian Time (GMT+8)</span>
              </div>
              <div className="font-mono text-base font-extrabold text-slate-100 tracking-wider">
                {liveTimeStr}
              </div>
              <div className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                {liveDateStr}
              </div>
              {/* Pulsing indicator of legitimacy */}
              <div className="absolute top-2.5 right-3 flex items-center gap-1 font-mono text-[8px] text-emerald-400 uppercase font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live Feed</span>
              </div>
            </div>

          </div>

          {/* Safe shield logo */}
          <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-mono pt-1">
            ✦ Nazcube Estate Smart Gateway System ✦
          </div>

        </div>
      </div>
    );
  }

  // If NOT authenticated, show gorgeous Login Card Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 font-sans antialiased text-gray-900 relative overflow-hidden">
        {/* Abstract design elements background */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-30 select-none pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-30 select-none pointer-events-none" />

        <div className="w-full max-w-md mx-auto my-auto space-y-6 relative z-10">
          <div className="text-center">
            {dbState.settings.logoUrl ? (
              <img
                referrerPolicy="no-referrer"
                src={dbState.settings.logoUrl}
                alt="Logo"
                className="w-14 h-14 object-contain rounded-2xl mx-auto shadow-lg bg-white p-1.5 border border-slate-200 animate-bounce"
              />
            ) : (
              <div className="w-14 h-14 bg-indigo-600 text-white font-extrabold flex items-center justify-center rounded-2xl mx-auto shadow-lg shadow-indigo-200 text-xl tracking-widest animate-bounce">N</div>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight mt-3 text-slate-900">{dbState.settings.appName || "Nazcube HMS"}</h1>
            <p className="text-xs text-gray-500 mt-1">Authorized Residence Management Credentials Required</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-xl">
            {/* Toggle Switch Tabs block */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 mb-5 relative">
              <button
                type="button"
                onClick={() => {
                  setLoginType("management");
                  setLoginError("");
                  setLoginEmail("");
                  setLoginPassword("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${
                  loginType === "management"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                💼 Management
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginType("resident");
                  setLoginError("");
                  setLoginEmail("");
                  setLoginPassword("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${
                  loginType === "resident"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                🏠 Resident Portal
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {loginType === "resident" ? "Registered Email Address" : "Email Username"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    id="login-email-input"
                    placeholder={loginType === "resident" ? "resident@example.com" : "operator@nazcube.com"}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-105 focus:border-indigo-400 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-slate-700">
                    {loginType === "resident" ? "Registered Phone Number Passphrase" : "Passphrase Code"}
                  </label>
                  {loginType === "management" && (
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      Forgot Code?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type={showLoginPassword ? "text" : "password"}
                    id="login-password-input"
                    placeholder={loginType === "resident" ? "+6012-XXXXXXX" : "••••••••"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-105 focus:border-indigo-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={showLoginPassword ? "Hide passphrase" : "Show passphrase"}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginType === "resident" && (
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    *Provide your registered Email & Phone Number 1 list entry as the passphrase.
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="submit-login-btn"
                className="w-full py-3 mt-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow shadow-indigo-150 transition cursor-pointer text-xs"
              >
                {loginType === "resident" ? "Sign In to Resident Dashboard" : "Access System Panel"}
              </button>
            </form>

            {/* Quick seletion accounts for easy testing */}
            {loginType === "resident" ? (
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">QUICK TEST RESIDENTS</span>
                <div className="grid grid-cols-1 gap-1.5 text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("nazri@example.com");
                      setLoginPassword("+6012-3456789");
                      setLoginError("");
                    }}
                    className="px-2 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
                  >
                    Nazri Abdullah Unit R101 (Occupied)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("sophia.tan@example.com");
                      setLoginPassword("+6017-2223344");
                      setLoginError("");
                    }}
                    className="px-2 py-1.5 rounded-lg border border-teal-100 text-teal-700 bg-teal-50/50 hover:bg-teal-50"
                  >
                    Sophia Tan Unit R102 (Rented Tenant)
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">QUICK TEST LOGIN ACCOUNTS</span>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleQuickLoginFill("admin@nazcube.com", "admin123")}
                    className="px-2 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
                  >
                    ADMIN (Full Access)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLoginFill("manager@nazcube.com", "manager123")}
                    className="px-2 py-1.5 rounded-lg border border-teal-100 text-teal-700 bg-teal-50/50 hover:bg-teal-50"
                  >
                    MANAGER (R/W)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLoginFill("staff@nazcube.com", "staff123")}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100"
                  >
                    STAFF (Read Only)
                  </button>
                </div>
              </div>
            )}

            {/* Database Sheets Configuration link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowUrlConfigInLogin(!showUrlConfigInLogin)}
                className="text-xs text-gray-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Configure Sheets API Endpoint</span>
              </button>

              {showUrlConfigInLogin && (
                <div className="mt-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-left text-gray-500 font-semibold mb-1">Google Apps Script Web App URL</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      defaultValue={gasUrl}
                      id="login-gas-url-input"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = (document.getElementById("login-gas-url-input") as HTMLInputElement)?.value;
                        handleSaveGasUrl(val);
                      }}
                      className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shrink-0"
                    >
                      Save / Connect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center text-gray-400 font-bold uppercase tracking-wider text-[10px] mt-4 relative z-10 py-2 border-t border-slate-200/50 w-full">
          NAZCUBE SOLUTION &copy; 2026 HMS
        </div>

        {/* Forgot password / OTP Reset Modal Simulation */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1">
                <LockKeyhole className="w-5 h-5 text-indigo-600" />
                Password Reset Verification Logic
              </h3>
              
              {!otpSent ? (
                <div className="space-y-3">
                  <p className="text-gray-500 leading-relaxed">
                    Enter the email registered within your USERS roster. The App will send a reset verification OTP:
                  </p>
                  <div>
                    <label className="block font-semibold mb-1">Registered Account Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@nazcube.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-sans"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3.5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                    >
                      Send Verification Code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {developerOtpToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex flex-col gap-1">
                      <span className="font-bold block text-[10px] text-emerald-700 uppercase">Simulated OTP Code (Console bypass):</span>
                      <p className="text-lg font-mono font-extrabold text-slate-900 letter-spacing-2">{developerOtpToast}</p>
                      <p className="text-[9.5px] text-gray-650 mt-1">If sheets email delivery is offline, use this code to proceed.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold mb-1">Enter 6-Digit OTP Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 123456"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-center font-bold text-base outline-none tracking-widest"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">New System Passphrase</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Set new secret password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title={showNewPassword ? "Hide passphrase" : "Show passphrase"}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {resetSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold block rounded-xl text-center">
                      Password changed successfully! Redirecting...
                    </div>
                  )}

                  <div className="flex justify-end gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="px-3.5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtpAndChangeVal}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                    >
                      Approve & Change Pass
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dynamic CSS injector to map theme colors globally across all sub-components and tabs
  const generateThemeStyleBlock = () => {
    const activeCol = dbState.settings.themeColor || "indigo";

    let primary = "#4f46e5"; // indigo-600
    let primaryHover = "#4338ca"; // indigo-700
    let lightBg = "#f5f3ff"; // indigo-50
    let lightBorder = "#ddd6fe"; // indigo-100
    let mdBorder = "#c4b5fd"; // indigo-200
    let darkText = "#312e81"; // indigo-900
    let primaryText = "#4f46e5"; // indigo-600
    let ringColor = "rgba(79, 70, 229, 0.15)";

    if (activeCol === "blue") {
      primary = "#2563eb"; // blue-600
      primaryHover = "#1d4ed8"; // blue-700
      lightBg = "#eff6ff"; // blue-50
      lightBorder = "#dbeafe"; // blue-100
      mdBorder = "#bfdbfe"; // blue-200
      darkText = "#1e3a8a"; // blue-900
      primaryText = "#2563eb"; // blue-600
      ringColor = "rgba(59, 130, 246, 0.15)";
    } else if (activeCol === "emerald") {
      primary = "#059669"; // emerald-600
      primaryHover = "#047857"; // emerald-700
      lightBg = "#ecfdf5"; // emerald-50
      lightBorder = "#d1fae5"; // emerald-100
      mdBorder = "#a7f3d0"; // emerald-200
      darkText = "#064e3b"; // emerald-950
      primaryText = "#059669"; // emerald-600
      ringColor = "rgba(16, 185, 129, 0.15)";
    } else if (activeCol === "slate") {
      primary = "#475569"; // slate-600
      primaryHover = "#334155"; // slate-700
      lightBg = "#f1f5f9"; // slate-100 / bg
      lightBorder = "#e2e8f0"; // slate-200
      mdBorder = "#cbd5e1"; // slate-300
      darkText = "#0f172a"; // slate-950
      primaryText = "#334155"; // slate-700
      ringColor = "rgba(71, 85, 105, 0.15)";
    }

    return (
      <style>{`
        /* --- Dynamic Theme Override Style Injections --- */
        
        /* Overriding core background color helper classes */
        .bg-indigo-50, .bg-indigo-50\\/20, .bg-indigo-50\\/50 {
          background-color: ${lightBg} !important;
        }
        .bg-indigo-100 {
          background-color: ${lightBorder} !important;
        }
        .bg-indigo-600, .bg-indigo-650 {
          background-color: ${primary} !important;
        }
        .hover\\:bg-indigo-700:hover, .hover\\:bg-indigo-800:hover {
          background-color: ${primaryHover} !important;
        }
        .hover\\:bg-indigo-50:hover {
          background-color: ${lightBg} !important;
        }
        .hover\\:bg-indigo-100:hover {
          background-color: ${lightBorder} !important;
        }

        /* Overriding core text utility classes */
        .text-indigo-600, .text-indigo-650 {
          color: ${primaryText} !important;
        }
        .text-indigo-700, .text-indigo-800, .text-indigo-900 {
          color: ${darkText} !important;
        }
        .hover\\:text-indigo-600:hover {
          color: ${primaryText} !important;
        }
        .hover\\:text-indigo-700:hover, .hover\\:text-indigo-805:hover, .hover\\:text-indigo-900:hover {
          color: ${darkText} !important;
        }

        /* Overriding borders */
        .border-indigo-100, .border-indigo-150 {
          border-color: ${lightBorder} !important;
        }
        .border-indigo-200, .border-indigo-205 {
          border-color: ${mdBorder} !important;
        }
        .border-indigo-500, .border-indigo-600 {
          border-color: ${primary} !important;
        }

        /* Overriding focus borders & ring markers */
        .focus\\:ring-indigo-100:focus, .focus\\:ring-indigo-105:focus, .focus\\:border-indigo-500:focus, .focus\\:border-indigo-400:focus {
          --tw-ring-color: ${ringColor} !important;
          border-color: ${primary} !important;
        }
        .shadow-indigo-200 {
          --tw-shadow-color: ${ringColor} !important;
        }

        /* Primary Button Theming (bg-slate-900, bg-slate-950 overrides) */
        button.bg-slate-900,
        button.bg-slate-950,
        a.bg-slate-900,
        input[type="submit"].bg-slate-900 {
          background-color: ${primary} !important;
          border-color: ${primaryHover} !important;
          color: #ffffff !important;
        }
        button.bg-slate-900:hover,
        button.bg-slate-950:hover,
        button.hover\\:bg-slate-800:hover,
        button.hover\\:bg-slate-850:hover,
        a.bg-slate-900:hover {
          background-color: ${primaryHover} !important;
          border-color: ${primaryHover} !important;
        }

        /* --- DARK MODE OVERRIDES --- */
        .dark-mode {
          background-color: #0b0f19 !important;
          color: #f1f5f9 !important;
        }
        
        .dark-mode #application-active-workspace,
        .dark-mode main,
        .dark-mode .bg-slate-50,
        .dark-mode .bg-slate-50\\/50,
        .dark-mode .bg-slate-100\\/50,
        .dark-mode .bg-slate-100,
        .dark-mode .bg-slate-200\\/60,
        .dark-mode .bg-slate-50\\/40,
        .dark-mode .bg-slate-50\\/10 {
          background-color: #0b0f19 !important;
        }

        .dark-mode .bg-white,
        .dark-mode aside,
        .dark-mode #user-popup-dropdown,
        .dark-mode #navigation-sidebar-aside,
        .dark-mode .bg-white\\/80 {
          background-color: #121826 !important;
          border-color: #1f293d !important;
          color: #f1f5f9 !important;
        }

        .dark-mode .bg-white {
          background-color: #121826 !important;
        }

        .dark-mode .text-slate-905,
        .dark-mode .text-slate-900,
        .dark-mode .text-slate-850,
        .dark-mode .text-slate-800,
        .dark-mode .text-slate-750,
        .dark-mode .text-slate-705,
        .dark-mode .text-slate-700,
        .dark-mode .text-slate-650,
        .dark-mode .text-slate-600,
        .dark-mode .text-gray-900,
        .dark-mode .text-gray-850,
        .dark-mode .text-gray-800,
        .dark-mode .text-gray-750,
        .dark-mode .text-gray-700,
        .dark-mode .text-gray-650,
        .dark-mode .text-gray-600,
        .dark-mode .text-slate-800.font-bold,
        .dark-mode h1,
        .dark-mode h2,
        .dark-mode h3,
        .dark-mode h4,
        .dark-mode p.text-slate-900,
        .dark-mode p.text-slate-800,
        .dark-mode div.text-slate-900,
        .dark-mode span.text-slate-800,
        .dark-mode span.text-slate-900 {
          color: #f1f5f9 !important;
        }

        .dark-mode .text-slate-500,
        .dark-mode .text-slate-450,
        .dark-mode .text-slate-400,
        .dark-mode .text-gray-500,
        .dark-mode .text-gray-400,
        .dark-mode .text-gray-450 {
          color: #94a3b8 !important;
        }

        /* Accent Banners in dark mode */
        .dark-mode .bg-indigo-50,
        .dark-mode .bg-indigo-50\\/50,
        .dark-mode .bg-indigo-50\\/20,
        .dark-mode .bg-indigo-100 {
          background-color: rgba(79, 70, 229, 0.15) !important;
          color: #ddd6fe !important;
        }

        .dark-mode .bg-emerald-50,
        .dark-mode .bg-emerald-50\\/50,
        .dark-mode .bg-emerald-50\\/20,
        .dark-mode .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.15) !important;
          color: #a7f3d0 !important;
        }

        .dark-mode .bg-rose-50,
        .dark-mode .bg-rose-50\\/50,
        .dark-mode .bg-rose-100 {
          background-color: rgba(244, 63, 94, 0.15) !important;
          color: #fecdd3 !important;
        }

        .dark-mode .bg-amber-50,
        .dark-mode .bg-amber-50\\/50,
        .dark-mode .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.15) !important;
          color: #fde68a !important;
        }

        .dark-mode .bg-slate-100,
        .dark-mode .bg-slate-100\\/60,
        .dark-mode .bg-slate-100\\/80 {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
        }

        /* Borders in dark mode */
        .dark-mode .border-slate-100,
        .dark-mode .border-slate-150,
        .dark-mode .border-slate-200,
        .dark-mode .border-slate-205,
        .dark-mode .border-slate-250\\/20,
        .dark-mode .border-gray-100,
        .dark-mode .border-gray-200,
        .dark-mode .border-slate-200\\/65,
        .dark-mode .border-slate-200\\/60,
        .dark-mode .border-slate-205\\/60,
        .dark-mode .border-slate-100\\/80 {
          border-color: #1f293d !important;
        }

        .dark-mode table,
        .dark-mode tr,
        .dark-mode th,
        .dark-mode td {
          border-color: #1f293d !important;
        }

        /* Forms in dark mode */
        .dark-mode input[type="text"],
        .dark-mode input[type="number"],
        .dark-mode input[type="email"],
        .dark-mode input[type="password"],
        .dark-mode input[type="date"],
        .dark-mode select,
        .dark-mode textarea {
          background-color: #0b0f19 !important;
          color: #f8fafc !important;
          border-color: #1f293d !important;
        }

        .dark-mode input::placeholder,
        .dark-mode textarea::placeholder {
          color: #475569 !important;
        }

        .dark-mode select option {
          background-color: #121826 !important;
          color: #f8fafc !important;
        }

        /* KPI and Stat Cards specifically */
        .dark-mode #kpi-income-card,
        .dark-mode #kpi-expenses-card,
        .dark-mode #kpi-dues-card {
          background-color: #121826 !important;
          border-color: #1f293d !important;
        }

        /* Modals specifically */
        .dark-mode #sheets-config-overlay .bg-white,
        .dark-mode #user-popup-dropdown,
        .dark-mode #invoice-modal-content {
          background-color: #121826 !important;
          border-color: #1f293d !important;
          color: #f8fafc !important;
        }

        /* Recharts tooltips */
        .dark-mode .recharts-default-tooltip {
          background-color: #121826 !important;
          border-color: #1f293d !important;
        }
        .dark-mode .recharts-tooltip-item {
          color: #f8fafc !important;
        }
      `}</style>
    );
  };

  // --- LOGGED IN USER INTERFACE DASHBOARD PANEL ---
  if (currentUser?.Role === "security") {
    return (
      <div className={`min-h-screen font-sans antialiased overflow-hidden ${
        isDarkMode ? "dark-mode bg-slate-950 text-slate-100" : "bg-slate-50/50 text-gray-900"
      }`}>
        {generateThemeStyleBlock()}
        <SecurityVisitorTab
          state={dbState}
          currentUser={currentUser}
          isSecurityPortal={true}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onLogOut={() => {
            setCurrentUser(null);
            setLoginType("management");
          }}
          onUploadFile={handleUploadFile}
          onUpdateVisitorLogs={(updated) => {
            setDbState(prev => ({ ...prev, visitorLogs: updated }));
            if (gasUrl) {
              performPostAction("updateVisitorLogsBatch", { data: updated });
            }
          }}
          onUpdateVisitorPasses={(updated) => {
            setDbState(prev => ({ ...prev, visitorPasses: updated }));
            if (gasUrl) {
              performPostAction("updateVisitorPassesBatch", { data: updated });
            }
          }}
          onUpdateSecurityInstructions={(updated) => {
            setDbState(prev => ({ ...prev, securityInstructions: updated }));
            if (gasUrl) {
              performPostAction("updateSecurityInstructionsBatch", { data: updated });
            }
          }}
        />
      </div>
    );
  }

  if (currentUser?.Role === "resident") {
    return (
      <div className={`min-h-screen font-sans antialiased overflow-hidden ${
        isDarkMode ? "dark-mode bg-slate-950 text-slate-100" : "bg-slate-50/50 text-gray-900"
      }`}>
        {generateThemeStyleBlock()}
        <ResidentPortal
          state={dbState}
          residentUser={currentUser}
          onLogOut={() => {
            setCurrentUser(null);
            setLoginType("resident");
          }}
          onAddComplaint={(newComplaint) => {
            setDbState(prev => {
              const updatedComplaints = [...(prev.complaints || []), newComplaint];
              return {
                ...prev,
                complaints: updatedComplaints
              };
            });
            // Call optional sheet update if active
            if (gasUrl) {
              performPostAction("addComplaint", { data: newComplaint });
            }
          }}
          onUploadFile={handleUploadFile}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onSelectPaymentForInvoice={(p) => setActiveInvoice(p)}
          onUpdateVisitorPasses={(updated) => {
            setDbState(prev => ({ ...prev, visitorPasses: updated }));
            if (gasUrl) performPostAction("updateVisitorPassesBatch", { data: updated });
          }}
        />
        {/* Invoice Detail modal handler */}
        {activeInvoice && (
          <InvoiceModal
            payment={activeInvoice}
            payments={dbState.payments}
            residents={dbState.residents}
            settings={dbState.settings}
            onClose={() => setActiveInvoice(null)}
            onSendEmail={async (email: string, subject: string, htmlBody: string) => {
              return await performPostAction("sendInvoiceEmail", { email, subject, htmlBody });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex font-sans antialiased overflow-hidden ${
      isDarkMode ? "dark-mode bg-slate-950 text-slate-100" : "bg-slate-50/50 text-gray-900"
    }`}>
      {generateThemeStyleBlock()}
      
      {/* 1. COLLAPSIBLE RESIZABLE SIDEBAR */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
      
      <aside
        id="navigation-sidebar-aside"
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        className={`bg-white border-r border-slate-205/60 text-slate-700 flex flex-col justify-between transition-all duration-300 select-none
          fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
          md:relative md:translate-x-0 shrink-0 md:h-auto h-full shadow-2xl md:shadow-none ${
            computedCollapsed ? "md:w-16" : "md:w-64"
          } w-64`}
      >
        {/* Upper Sidebar Logo container */}
        <div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {dbState.settings.logoUrl ? (
                <img
                  referrerPolicy="no-referrer"
                  src={dbState.settings.logoUrl}
                  alt="Logo"
                  className="w-9 h-9 object-contain rounded-xl shrink-0 bg-white p-0.5 border border-slate-205"
                />
              ) : (
                <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center shrink-0 tracking-wider">N</span>
              )}
              {(!computedCollapsed || mobileMenuOpen) && (
                <div className="animate-in fade-in duration-300">
                  <span className="font-bold text-xs tracking-tight block text-slate-900 font-sans">{dbState.settings.companyName || "Nazcube Solution"}</span>
                  <span className="text-[9.5px] text-slate-400 font-medium block">Residences HMS Suite</span>
                </div>
              )}
            </div>
            {/* Mobile close button inside sidebar header */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-900 md:hidden hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation link sets */}
          <nav className="p-3 space-y-1 mt-4" id="sidebar-nav-links">
            {[
              { id: "Dashboard", label: "Dashboard Hub", icon: LayoutDashboard },
              { id: "Billing", label: "Billing Receipts", icon: Receipt },
              { id: "Residents", label: "Occupant Registry", icon: Users },
              { id: "ComplaintsNotices", label: "Complaints & News", icon: HelpCircle },
              { id: "SecurityVisitor", label: "Security & Visitors", icon: Shield },
              { id: "Expenses", label: "Expenses Ledger", icon: TrendingDown },
              { id: "Products", label: "Fee Products", icon: Tag },
              { id: "Cashbook", label: "Annual Cashbook", icon: BookOpen },
              { id: "Users", label: "Operator Accounts", icon: UserCheck },
              { id: "Settings", label: "System Setup", icon: Settings }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold cursor-pointer transition duration-150 ${
                    isSelected
                      ? `${themeClasses.primary} shadow-sm`
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  {(!computedCollapsed || mobileMenuOpen) && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower Sidebar container & collapse controller */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Manual / Auto collapsible toggle controller panel */}
          <div className="flex items-center justify-between text-slate-400 text-[10px] mt-1 pl-1 select-none">
            {!computedCollapsed ? (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => {
                    const nextPinned = !isPinned;
                    setIsPinned(nextPinned);
                    if (nextPinned) {
                      setSidebarCollapsed(false);
                    }
                  }}
                  className={`p-1.5 rounded transition cursor-pointer text-slate-500 hover:bg-slate-100 ${isPinned ? "text-indigo-600 bg-indigo-50" : ""}`}
                  title={isPinned ? "Unlock sidebar to auto hover scale" : "Pin sidebar steady open"}
                >
                  {isPinned ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <span className="font-semibold text-[8px] uppercase tracking-wider text-slate-400 text-center">
                  {isPinned ? "PINNED OPEN" : "HOVER MODE"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned(true);
                    setSidebarCollapsed(true);
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                  title="Collapse sidebar and lock"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned(true);
                    setSidebarCollapsed(false);
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center w-8 h-8 shadow-sm"
                  title="Expand and Pin Sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-slate-900" />
                </button>
              </div>
            )}
          </div>

          {/* Collapsible status profile info */}
          {!computedCollapsed && (
            <div className="bg-slate-50 p-2 border border-slate-150 flex items-center gap-2 rounded-xl">
              <img
                src={currentUser.Avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.ID}`}
                referrerPolicy="no-referrer"
                alt="user avatar"
                className="w-8 h-8 rounded-lg bg-slate-200 shrink-0 border border-slate-350/20"
              />
              <div className="overflow-hidden">
                <span className="font-bold text-xs truncate block text-slate-800 leading-snug">{currentUser["Full Name"]}</span>
                <span className="text-[9px] text-slate-550 truncate block font-semibold uppercase">{currentUser.Role}</span>
              </div>
            </div>
          )}

          {/* Bottom Nazcube solution credit line */}
          <div className="text-center font-bold tracking-wider text-[8px] text-slate-405 font-mono py-1 uppercase border-t border-slate-100">
            {!computedCollapsed ? "NAZCUBE SOLUTION" : "NAS"}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Main top header navigation bar */}
        <header id="main-application-header" className="bg-white border-b border-slate-150 p-4 shrink-0 flex items-center justify-between relative z-20 no-print shadow-sm">
          <div className="flex items-center gap-3">
            {/* Quick Mobile display button (Three Dots Menu) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-slate-205 rounded-xl hover:bg-slate-50 transition cursor-pointer md:hidden block bg-indigo-50/50"
              title="Toggle Menu"
            >
              <MoreVertical className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800 leading-none">{dbState.settings.appName || "Nazcube HMS"}</h2>
              <span className="text-[10px] text-gray-400 font-mono hidden md:block">| File Sync System</span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-sans">
            {/* Connection sync status button indicator */}
            <button
              onClick={handleReloadData}
              disabled={isSyncing}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10.5px] font-bold tracking-tight transition cursor-pointer ${
                isConnected
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100 animate-pulse"
              }`}
              title={isConnected ? "Synced with active sheet. Click to reload data." : "Offline Local sandbox. Click to Retry Google Sheet."}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Syncing database...</span>
                </>
              ) : isConnected ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Google Sheets</span>
                </>
              ) : (
                <>
                  <Unplug className="w-3.5 h-3.5 text-amber-600" />
                  <span>Local Sandbox (Click to Sync)</span>
                </>
              )}
            </button>

            {/* Sync URL configurations trigger */}
            <button
              onClick={() => setShowConfigPopup(true)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-250/20 rounded-xl transition cursor-pointer"
              title="Sheets Connection manager"
            >
              <Database className="w-4 h-4 text-indigo-600" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border border-slate-250/20 transition cursor-pointer ${
                isDarkMode 
                  ? "text-amber-400 bg-slate-800 hover:bg-slate-755 hover:text-amber-300" 
                  : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Top-right operator profile dropdown clicker */}
            <div className="relative">
              <button
                id="header-user-profile-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-205/60 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <img
                  src={currentUser.Avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.ID}`}
                  referrerPolicy="no-referrer"
                  alt="user avatar"
                  className="w-7 h-7 rounded-lg bg-teal-50"
                />
                <span className="text-xs font-bold text-slate-700 hidden sm:inline-block pr-1">{currentUser["Full Name"]}</span>
              </button>

              {/* Profile dropdown popup */}
              {showUserDropdown && (
                <div id="user-popup-dropdown" className="absolute right-0 mt-2.5 w-52 bg-white text-gray-900 border border-slate-200/80 rounded-2xl shadow-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 font-sans text-xs">
                  <div className="p-2 border-b border-slate-100/80">
                    <span className="block font-bold text-slate-800">{currentUser["Full Name"]}</span>
                    <span className="block font-mono text-[10px] text-gray-450 truncate">{currentUser.Email}</span>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase font-extrabold text-[8px] tracking-wide">{currentUser.Role}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setActiveTab("Settings");
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-slate-400 font-semibold" />
                    User Settings
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentUser(null);
                    }}
                    className="w-full text-left p-2 hover:bg-rose-50 rounded-xl font-semibold text-rose-500 flex items-center gap-2 cursor-pointer border-t border-slate-100/50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out / Exit
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. WORKING CONTENT SWITCH PANEL */}
        <main className="flex-1 p-6 overflow-y-auto" id="application-active-workspace">
          
          {activeTab === "Dashboard" && (
            <DashboardTab
              state={dbState}
              onNavigateTab={(target) => setActiveTab(target)}
            />
          )}

          {activeTab === "Billing" && (
            <BillingTab
              state={dbState}
              currentUser={currentUser}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onAddPaymentsBatch={handleAddPaymentsBatch}
              onUpdatePaymentsBatch={handleUpdatePaymentsBatch}
              onSelectPaymentForInvoice={(p) => setActiveInvoice(p)}
            />
          )}

          {activeTab === "Residents" && (
            <ResidentsTab
              state={dbState}
              currentUser={currentUser}
              onAddResident={handleAddResident}
              onUpdateResident={handleUpdateResident}
              onDeleteResident={handleDeleteResident}
              onUploadFile={handleUploadFile}
              onTriggerReminder={(ownerId) => {
                setPendingReminderResidentId(ownerId);
                setActiveTab("ComplaintsNotices");
              }}
            />
          )}

          {activeTab === "ComplaintsNotices" && (
            <ComplaintsNoticesTab
              state={dbState}
              currentUser={currentUser}
              onUpdateComplaints={(updated) => {
                setDbState(prev => ({ ...prev, complaints: updated }));
                if (gasUrl) performPostAction("updateComplaintsBatch", { data: updated });
              }}
              onUpdateNotices={(updated) => {
                setDbState(prev => ({ ...prev, notices: updated }));
                if (gasUrl) performPostAction("updateNoticesBatch", { data: updated });
              }}
              onUpdateNews={(updated) => {
                setDbState(prev => ({ ...prev, news: updated }));
                if (gasUrl) performPostAction("updateNewsBatch", { data: updated });
              }}
              onUploadFile={handleUploadFile}
              initialReminderResidentId={pendingReminderResidentId}
              onClearInitialReminder={() => setPendingReminderResidentId(null)}
            />
          )}

          {activeTab === "SecurityVisitor" && (
            <SecurityVisitorTab
              state={dbState}
              currentUser={currentUser}
              onUploadFile={handleUploadFile}
              onUpdateVisitorLogs={(updated) => {
                setDbState(prev => ({ ...prev, visitorLogs: updated }));
                if (gasUrl) performPostAction("updateVisitorLogsBatch", { data: updated });
              }}
              onUpdateVisitorPasses={(updated) => {
                setDbState(prev => ({ ...prev, visitorPasses: updated }));
                if (gasUrl) performPostAction("updateVisitorPassesBatch", { data: updated });
              }}
              onUpdateSecurityInstructions={(updated) => {
                setDbState(prev => ({ ...prev, securityInstructions: updated }));
                if (gasUrl) performPostAction("updateSecurityInstructionsBatch", { data: updated });
              }}
            />
          )}

          {activeTab === "Expenses" && (
            <ExpensesTab
              state={dbState}
              currentUser={currentUser}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === "Products" && (
            <ProductsTab
              state={dbState}
              currentUser={currentUser}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === "Cashbook" && (
            <CashbookTab state={dbState} />
          )}

          {activeTab === "Users" && (
            <UsersTab
              state={dbState}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onUploadFile={handleUploadFile}
            />
          )}

          {activeTab === "Settings" && (
            <SettingsTab
              state={dbState}
              currentUser={currentUser}
              onUpdateSettings={handleUpdateSettings}
              onUploadLogo={handleUploadLogo}
            />
          )}

        </main>
      </div>

      {/* Required Connection Configuration Popup overlay */}
      {showConfigPopup && (
        <div id="sheets-config-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
            <div className="flex items-center gap-2 text-indigo-600 mb-3">
              <Database className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-800">Configure Nazcube HMS Sheet API</h3>
            </div>
            
            <p className="text-gray-500 leading-relaxed mb-4">
              Enter your deployed **Google Apps Script Web App URL** below to connect this client application directly to your active Google Sheet (2 tabs spreadsheet layout).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Google Apps Script Web App URL</label>
                <input
                  required
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  id="gas-url-setup-input"
                  defaultValue={gasUrl}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-mono text-[10.5px] outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl bg-opacity-70">
                <span className="font-bold block text-[10px] uppercase">Default Local preview Sandbox:</span>
                <p className="mt-0.5 leading-relaxed">
                  If you haven't deployed your script yet, click **"Use Offline Demo Sandbox"** to test and explore the entire interface instantly using seeded variables. You can bind Google Sheets to it anytime later!
                </p>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("naz_gas_url", "");
                    setGasUrl("");
                    setIsConnected(false);
                    setShowConfigPopup(false);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-gray-650 transition cursor-pointer"
                >
                  Use Offline Demo Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = (document.getElementById("gas-url-setup-input") as HTMLInputElement)?.value;
                    handleSaveGasUrl(val);
                  }}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow shadow-indigo-100 transition duration-200 cursor-pointer"
                >
                  Apply & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail modal handler */}
      {activeInvoice && (
        <InvoiceModal
          payment={activeInvoice}
          payments={dbState.payments}
          residents={dbState.residents}
          settings={dbState.settings}
          onClose={() => setActiveInvoice(null)}
          onSendEmail={async (email: string, subject: string, htmlBody: string) => {
            return await performPostAction("sendInvoiceEmail", { email, subject, htmlBody });
          }}
        />
      )}
    </div>
  );
}
