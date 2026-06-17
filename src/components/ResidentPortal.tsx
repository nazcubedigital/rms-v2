import React, { useState } from "react";
import { DatabaseState, Payment, Resident, Notice, News, Complaint } from "../types";
import {
  LayoutDashboard,
  Receipt,
  Megaphone,
  Newspaper,
  MessageSquareWarning,
  Plus,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  User,
  Settings,
  Moon,
  Sun,
  Shield,
  Wrench,
  HelpCircle,
  MessageSquare,
  LogOut,
  ChevronRight,
  Trash2,
  Paperclip,
  Upload,
  Image,
  Loader2,
  QrCode,
  Calendar,
  Car,
  X,
  MoreVertical,
  Link,
  Copy,
  Check,
  ExternalLink,
  Share2
} from "lucide-react";
import { getMalaysiaDateString, isCurrentTimeInTimeRange } from "../utils/dateUtils";
import QRCode from "qrcode";

// Clean drive formats to retrieve direct embedding
function getCleanImageUrl(url: string): string {
  if (url.includes("drive.google.com") && (url.includes("/file/d/") || url.includes("id="))) {
    let fileId = "";
    if (url.includes("/file/d/")) {
      const parts = url.split("/file/d/");
      if (parts[1]) {
        fileId = parts[1].split("/")[0];
      }
    } else if (url.includes("id=")) {
      const match = url.match(/id=([^&]+)/);
      if (match) fileId = match[1];
    }
    if (fileId) {
      return `https://docs.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return url;
}

// Helper component to render an attachment image with automatic fallback to generic paperclip/file icon
function AttachmentImageWithFallback({ url, size = "w-12 h-12" }: { url: string; size?: string }) {
  const [loadFailed, setLoadFailed] = useState(false);

  // If obviously a document, we can skip loading as image
  const isDocument = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");

  // Re-write drive format if needed to get direct embedding
  const srcUrl = getCleanImageUrl(url);

  if (!isDocument && !loadFailed) {
    return (
      <img
        src={srcUrl}
        referrerPolicy="no-referrer"
        alt="evidence preview"
        className={`${size} object-contain bg-slate-50 border border-slate-150 rounded-lg hover:scale-105 transition duration-150`}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <div className={`${size} flex flex-col items-center justify-center p-1 text-center font-mono text-[7.5px] text-indigo-600 bg-slate-50 border border-slate-150 rounded-lg`}>
      <Paperclip className="w-4 h-4 mb-0.5 text-indigo-500" />
      <span className="truncate max-w-[35px]">Open</span>
    </div>
  );
}

// Helper component to render a real, high-fidelity, fully scannable QR code locally based on target text
function QRCodeRender({ text, className = "w-24 h-24" }: { text: string; className?: string }) {
  const [src, setSrc] = useState<string>("");

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(text, { margin: 1, width: 220, color: { dark: "#020617", light: "#ffffff" } })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch((err) => {
        console.error("QR Code generation failed:", err);
      });
    return () => {
      active = false;
    };
  }, [text]);

  if (!src) {
    return <div className={`${className} bg-slate-100 animate-pulse rounded-lg`} />;
  }

  return <img src={src} alt="Pass QR Code" className={`${className} object-contain`} referrerPolicy="no-referrer" />;
}

interface ResidentPortalProps {
  state: DatabaseState;
  residentUser: {
    ID: string;
    "Full Name": string;
    Email: string;
    Phone: string;
    Role: string;
    Avatar: string;
  };
  onLogOut: () => void;
  onAddComplaint: (newComplaint: Complaint) => void;
  onUploadFile?: (base64Data: string, fileName: string) => Promise<string>;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectPaymentForInvoice: (p: Payment) => void;
  onUpdateVisitorPasses: (updated: any[]) => void;
}

export default function ResidentPortal({
  state,
  residentUser,
  onLogOut,
  onAddComplaint,
  onUploadFile,
  isDarkMode,
  onToggleDarkMode,
  onSelectPaymentForInvoice,
  onUpdateVisitorPasses
}: ResidentPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [sharingPass, setSharingPass] = useState<any | null>(null);
  const [copiedPassId, setCopiedPassId] = useState<boolean>(false);
  
  // Find resident details
  const residentDetails = state.residents.find(r => r["OWNER ID"] === residentUser.ID);

  // Filter payments for this resident
  const myPayments = state.payments.filter(
    p => p.TYPE === "Resident" && p["OWNER ID"] === residentUser.ID
  );

  // Dues calculation for Resident Portal
  const getDuesForResident = () => {
    const rateMonthly = parseFloat(state.settings.monthlySecurityFeeRate) || 50;
    const rateAnnual = parseFloat(state.settings.annualMembershipFeeRate) || 120;
    const currentMonthNum = 6; // June 2026 is month 6

    if (!residentDetails || residentDetails["HOUSE STATUS"] === "Vacant") {
      return { 
        monthlyDue: 0, 
        annualDue: 0, 
        overallDue: 0, 
        securityPaymentsCount: 0, 
        hasPaidAnnual: true,
        monthlyBreakdown: [] 
      };
    }

    const securityPaymentsCount = myPayments
      .filter(p => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);

    const hasPaidAnnual = myPayments
      .filter(p => p.PRODUCT === "Annual Membership Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0) >= 1;

    const months = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

    const monthlyBreakdown = months.map((mName, idx) => {
      const monthIndex = idx + 1; // 1-indexed
      const isPaid = securityPaymentsCount >= monthIndex;
      const isElapsed = monthIndex <= currentMonthNum;
      
      let status: "Paid" | "Overdue" | "Upcoming" = "Upcoming";
      if (isPaid) {
        status = "Paid";
      } else if (isElapsed) {
        status = "Overdue";
      } else {
        status = "Upcoming";
      }

      return {
        monthIndex,
        monthName: mName,
        status,
        amount: rateMonthly
      };
    });

    const unpaidMonthsCount = Math.max(0, currentMonthNum - securityPaymentsCount);
    const monthlyDueVal = unpaidMonthsCount * rateMonthly;
    const annualDueVal = hasPaidAnnual ? 0 : rateAnnual;

    return {
      monthlyDue: monthlyDueVal,
      annualDue: annualDueVal,
      overallDue: monthlyDueVal + annualDueVal,
      securityPaymentsCount,
      hasPaidAnnual,
      monthlyBreakdown
    };
  };

  const myDues = getDuesForResident();

  // Total paid
  const totalPaid = myPayments.reduce((sum, p) => sum + (p.AMOUNT || 0), 0);

  // Filter complaints for this resident
  const myComplaints = (state.complaints || []).filter(
    c => c["OWNER ID"] === residentUser.ID
  );

  // Notices and News
  const rawNotices = state.notices || [];
  const notices = rawNotices.filter(n => {
    if (!n.TARGET_TYPE || n.TARGET_TYPE === "All") return true;
    if (n.TARGET_TYPE === "Selective") {
      const targets = (n.TARGET_RESIDENTS || "")
        .split(",")
        .map(id => id.trim().toUpperCase());
      return targets.includes(String(residentUser.ID).trim().toUpperCase());
    }
    return true;
  });
  const news = state.news || [];

  // New Complaint Form state
  const [showAddComplaint, setShowAddComplaint] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintCategory, setComplaintCategory] = useState<"Security" | "Maintenance" | "Billing" | "Others">("Maintenance");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [complaintImages, setComplaintImages] = useState<{ name: string; base64: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  // Visitor Passes Pre-Authorization form states
  const [showCreatePassForm, setShowCreatePassForm] = useState(false);
  const [passVisitorName, setPassVisitorName] = useState("");
  const [passVisitorType, setPassVisitorType] = useState<"visitor" | "contractor" | "delivery" | "others">("visitor");
  const [passVehiclePlate, setPassVehiclePlate] = useState("");
  const [passStartDate, setPassStartDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA');
  });
  const [passEndDate, setPassEndDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA');
  });
  const [passTimeRange, setPassTimeRange] = useState("All Day");
  const [passCreateSuccess, setPassCreateSuccess] = useState(false);

  const handleFileChange = async (files: FileList | null) => {
    setUploadError("");
    if (!files || files.length === 0) return;
    
    const availableSlot = 5 - complaintImages.length;
    if (availableSlot <= 0) {
      setUploadError("Maximum of 5 images achieved.");
      return;
    }
    
    const filesToUpload = Array.from(files).slice(0, availableSlot);
    setIsUploading(true);
    try {
      const addedFiles: { name: string; base64: string }[] = [];
      for (const file of filesToUpload) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the 5MB size limit.`);
        }
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        
        addedFiles.push({ name: file.name, base64 });
      }
      setComplaintImages(prev => [...prev, ...addedFiles]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process image preview.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setComplaintImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTitle.trim() || !complaintDescription.trim()) return;

    setIsUploading(true);
    setUploadError("");
    try {
      const uploadedUrls: string[] = [];
      for (const fileObj of complaintImages) {
        let finalUrl = "";
        if (onUploadFile) {
          finalUrl = await onUploadFile(fileObj.base64, fileObj.name);
        } else {
          finalUrl = fileObj.base64;
        }
        if (finalUrl) {
          uploadedUrls.push(finalUrl);
        }
      }

      const newComplaint: Complaint = {
        ID: "C" + Math.floor(1000 + Math.random() * 9000),
        "OWNER ID": residentUser.ID,
        "RESIDENT NAME": residentUser["Full Name"],
        TITLE: complaintTitle.trim(),
        DESCRIPTION: complaintDescription.trim(),
        CATEGORY: complaintCategory,
        DATE: new Date().toLocaleDateString('en-CA'),
        STATUS: "Pending",
        ATTACHMENTS: uploadedUrls.join(",")
      };

      onAddComplaint(newComplaint);
      setSubmitSuccess(true);
      
      // reset form after delay
      setTimeout(() => {
        setComplaintTitle("");
        setComplaintDescription("");
        setComplaintImages([]);
        setShowAddComplaint(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachments on save.");
    } finally {
      setIsUploading(false);
    }
  };

  // Color preset matching setting theme color
  const themeClasses = () => {
    const activeCol = state.settings.themeColor || "indigo";
    switch (activeCol) {
      case "emerald":
        return {
          primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
          accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
          border: "border-emerald-500",
          ring: "focus:ring-emerald-500",
          badge: "bg-emerald-100 text-emerald-800"
        };
      case "blue":
        return {
          primary: "bg-blue-600 hover:bg-blue-700 text-white",
          accent: "text-blue-700 bg-blue-50 border-blue-100",
          border: "border-blue-500",
          ring: "focus:ring-blue-500",
          badge: "bg-blue-100 text-blue-800"
        };
      case "slate":
        return {
          primary: "bg-slate-900 hover:bg-slate-800 text-white",
          accent: "text-slate-850 bg-slate-100 border-slate-200",
          border: "border-slate-900",
          ring: "focus:ring-slate-900",
          badge: "bg-slate-200 text-slate-800"
        };
      default:
        return {
          primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
          accent: "text-indigo-700 bg-indigo-50 border-indigo-100",
          border: "border-indigo-500",
          ring: "focus:ring-indigo-500",
          badge: "bg-indigo-100 text-indigo-800"
        };
    }
  };

  // Submit Pre-Authorized Visitor Pass
  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passVisitorName.trim() || !passVehiclePlate.trim()) return;

    if (passEndDate < passStartDate) {
      alert("Validity End Date cannot be before Validity Start Date.");
      return;
    }

    const passId = `PASS-${residentUser.ID}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass = {
      ID: passId,
      HOUSE_UNIT: residentUser.ID,
      VISITOR_NAME: passVisitorName.trim(),
      VISITOR_TYPE: passVisitorType,
      VEHICLE_PLATE: passVehiclePlate.trim().toUpperCase(),
      START_DATE: passStartDate,
      END_DATE: passEndDate,
      TIME_RANGE: passTimeRange,
      STATUS: "Active" as const,
      CREATED_AT: new Date().toLocaleDateString('en-CA'),
      QR_CODE_DATA: passId
    };

    const existingPasses = state.visitorPasses || [];
    onUpdateVisitorPasses([newPass, ...existingPasses]);
    setPassCreateSuccess(true);
    
    // Reset form fields
    setPassVisitorName("");
    setPassVisitorType("visitor");
    setPassVehiclePlate("");
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    setPassStartDate(todayStr);
    setPassEndDate(todayStr);
    setPassTimeRange("All Day");

    setTimeout(() => {
      setPassCreateSuccess(false);
      setShowCreatePassForm(false);
    }, 2000);
  };

  const handleCancelPass = (passId: string) => {
    const existing = state.visitorPasses || [];
    const updated = existing.map(p => {
      if (p.ID === passId) {
        return { ...p, STATUS: "Expired" as const };
      }
      return p;
    });
    onUpdateVisitorPasses(updated);
  };

  const t = themeClasses();

  return (
    <div id="resident-portal-workspace" className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR FOR RESIDENTS */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-305 bg-white border-r border-slate-205 p-4 shrink-0 flex flex-col justify-between h-full w-64 md:h-auto md:shadow-none shadow-2xl`}>
        <div>
          {/* Header Branding */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {state.settings.logoUrl ? (
                <img
                  referrerPolicy="no-referrer"
                  src={state.settings.logoUrl}
                  alt="Logo"
                  className="w-10 h-10 object-contain rounded-xl shrink-0 bg-white p-0.5 border border-slate-200"
                />
              ) : (
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center shrink-0 tracking-wider">R</span>
              )}
              <div>
                <span className="font-bold text-xs tracking-tight block text-slate-950 font-sans">{state.settings.appName || "Nazcube HMS"}</span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">RESIDENT PORTAL</span>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 md:hidden"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Quick info about unit */}
          <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-150">
            <p className="text-[10px] uppercase font-bold text-gray-400">Welcome back</p>
            <h4 className="font-bold text-xs text-slate-800 truncate">{residentUser["Full Name"]}</h4>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-medium">
              <span>Unit: <b className="font-bold text-slate-800">{residentUser.ID}</b></span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                residentDetails?.["HOUSE STATUS"] === "Occupied" ? "bg-emerald-50 text-emerald-700" :
                residentDetails?.["HOUSE STATUS"] === "Rented" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
              }`}>
                {residentDetails?.["HOUSE STATUS"] || "Registered"}
              </span>
            </div>
          </div>

          {/* Resident Navigation */}
          <nav className="space-y-1">
            {[
              { id: "Dashboard", label: "Overview Hub", icon: LayoutDashboard },
              { id: "Payments", label: "My Payments", icon: Receipt },
              { id: "VisitorPasses", label: "Visitor Pre-Auth", icon: QrCode, badge: (state.visitorPasses || []).filter(p => p.HOUSE_UNIT === residentUser.ID && p.STATUS === "Active").length || undefined },
              { id: "Notices", label: "Management Notices", icon: Megaphone, badge: notices.filter(n => n.CATEGORY === "Urgent").length || undefined },
              { id: "News", label: "Community News", icon: Newspaper },
              { id: "Complaints", label: "Complaints Center", icon: MessageSquareWarning, badge: myComplaints.filter(c => c.STATUS !== "Resolved").length || undefined }
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition ${
                    isSelected
                      ? `${t.primary} shadow-md shadow-indigo-100`
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TabIcon className="w-4.5 h-4.5 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isSelected ? "bg-white text-indigo-700" : "bg-rose-100 text-rose-700"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom controls */}
        <div className="pt-4 mt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleDarkMode}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer flex-1 flex justify-center"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-2"></div>
            <button
              onClick={onLogOut}
              className="p-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
          <p className="text-center font-bold tracking-wider text-[8px] text-gray-400">
            NAZCUBE SOLUTION &copy; 2026
          </p>
        </div>
      </aside>

      {/* PORTAL MAIN AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Mobile Header Bar */}
        <header className="p-3.5 border border-slate-201 bg-white rounded-2xl flex items-center justify-between md:hidden shrink-0 shadow-xs mb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-slate-205 rounded-xl transition cursor-pointer bg-indigo-50/50"
              title="Toggle Menu"
            >
              <MoreVertical className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
            </button>
            <div>
              <h2 className="text-xs font-extrabold leading-none">{state.settings.appName || "Nazcube HMS"}</h2>
              <p className="text-[9px] text-slate-400 mt-0.5">Resident Portal • Unit {residentUser.ID}</p>
            </div>
          </div>
          <div className="text-[9px] font-mono font-bold tracking-widest text-emerald-600 px-1.5 py-0.5 bg-emerald-55/10 rounded-lg">ACTIVE</div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === "Dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Overview Dashboard</h1>
              <p className="text-xs text-gray-500">Track invoices, community activities, and notices for Unit {residentUser.ID}.</p>
            </div>

            {/* Resident Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Bills Paid</span>
                  <DollarSign className="w-4.5 h-4.5 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {state.settings.currencySymbol || "RM"} {totalPaid.toFixed(2)}
                  </span>
                  <p className="text-[9.5px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" />
                    <span>{myPayments.length} fully settled bills</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">House Unit Status</span>
                  <User className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold text-slate-800">
                    {residentDetails?.["HOUSE STATUS"] || "Registered"}
                  </span>
                  <p className="text-[9.5px] font-medium text-slate-400 mt-1">
                    Registered to: {residentUser["Full Name"]}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Management Notices</span>
                  <Megaphone className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-900">{notices.length}</span>
                  <p className="text-[9.5px] font-semibold text-amber-600 mt-1 flex items-center gap-0.5">
                    <Clock className="w-3 h-3 animate-pulse" />
                    <span>{notices.filter(n => n.CATEGORY === "Urgent").length} Urgent Broadcasts</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">My Open Complaints</span>
                  <MessageSquareWarning className="w-4.5 h-4.5 text-rose-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {myComplaints.filter(c => c.STATUS !== "Resolved").length}
                  </span>
                  <p className="text-[9.5px] font-semibold text-rose-600 mt-1">
                    Of {myComplaints.length} filed historic cases
                  </p>
                </div>
              </div>
            </div>

            {/* Outstanding Dues Alert banner */}
            {myDues.overallDue > 0 ? (
              <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-55 bg-rose-100/50 flex items-center justify-center shrink-0 border border-rose-200">
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-rose-950">Outstanding Account Dues Detected</h3>
                    <p className="text-[11px] text-rose-800 font-semibold leading-relaxed mt-0.5">
                      Your unit has outstanding balance of <b>{state.settings.currencySymbol || "RM"} {myDues.overallDue.toFixed(2)}</b>.
                      This includes {myDues.monthlyDue > 0 ? `${(myDues.monthlyDue / (parseFloat(state.settings.monthlySecurityFeeRate) || 50))} unpaid months of security fees` : ""}
                      {myDues.monthlyDue > 0 && myDues.annualDue > 0 ? " and " : ""}
                      {myDues.annualDue > 0 ? "your outstanding 2026 Annual Membership Fee (RM120.00)" : ""}.
                    </p>
                    <p className="text-[9.5px] text-rose-500 mt-1 font-bold">
                       Please settle outstanding amounts to ensure uninterrupted RFID vehicle gate access.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Payments")}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shrink-0 cursor-pointer shadow-md shadow-rose-100"
                >
                  Review Fee Ledger
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/50 border border-emerald-100/85 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-200/50">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-emerald-950">Awesome! Your Account is Fully Cleared</h3>
                    <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed mt-0.5">
                      Thank you! Your monthly security fees and annual membership for Unit {residentUser.ID} are paid up to date. Excellent community stewardship!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Payments")}
                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
                >
                  View Receipts List
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Latest Notice panel */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-indigo-600" />
                    Latest Management Bulletin
                  </h3>
                  <button
                    onClick={() => setActiveTab("Notices")}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {notices.length > 0 ? (
                  <div className="space-y-3.5">
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/10 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold text-white ${
                          notices[0].CATEGORY === "Urgent" ? "bg-rose-500" :
                          notices[0].CATEGORY === "Maintenance" ? "bg-blue-500" : "bg-slate-400"
                        }`}>
                          {notices[0].CATEGORY}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-gray-400">{notices[0].DATE}</span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-800 mb-1">{notices[0].TITLE}</h4>
                      <p className="text-[11px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap">{notices[0].CONTENT}</p>
                      {notices[0].ATTACHMENTS && notices[0].ATTACHMENTS.split(",").filter(Boolean).length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Attachments:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {notices[0].ATTACHMENTS.split(",").filter(Boolean).map((url, i) => {
                              const isDoc = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");
                              const cleanUrl = getCleanImageUrl(url);
                              if (isDoc) {
                                return (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block hover:opacity-90 transition shrink-0"
                                  >
                                    <AttachmentImageWithFallback url={url} size="w-10 h-10" />
                                  </a>
                                );
                              }
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setPreviewImageUrl(cleanUrl)}
                                  className="block hover:opacity-90 transition shrink-0 cursor-pointer focus:outline-none"
                                >
                                  <AttachmentImageWithFallback url={url} size="w-10 h-10" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-150 rounded-xl p-3 divide-y divide-slate-100">
                      {notices.slice(1, 3).map(n => (
                        <div key={n.ID} className="flex justify-between items-center py-2 first:pt-0 last:pb-0 text-xs">
                          <span className="font-semibold text-slate-750 truncate max-w-xs">{n.TITLE}</span>
                          <span className="text-[10px] font-mono text-gray-400 shrink-0 ml-2">{n.DATE}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-gray-400 font-bold">No active announcements available.</p>
                )}
              </div>

              {/* Quick Actions / Unit Cards status detail */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-3 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Your Residence Card Hub
                </h3>

                <div className="space-y-2.5">
                  <p className="text-[11px] text-gray-500 leading-normal">
                    The following RFID access cards are registered under owner unit:
                  </p>

                  <div className="space-y-1.5 font-mono text-[10.5px]">
                    {[1, 2, 3, 4, 5].map(i => {
                      const key = `CARD ${i}` as keyof Resident;
                      const cardNo = residentDetails?.[key];
                      if (!cardNo) return null;
                      return (
                        <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-150 rounded-lg">
                          <span className="font-semibold text-slate-500">Access Card #{i}</span>
                          <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded">
                            {cardNo}
                          </span>
                        </div>
                      );
                    })}
                    {!residentDetails?.["CARD 1"] && (
                      <div className="text-center py-2 text-xs text-gray-400 font-semibold bg-slate-50 rounded-xl border border-slate-150">
                        No active cards compiled.
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTab("Complaints");
                        setShowAddComplaint(true);
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Request Additional Card</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY PAYMENTS TAB */}
        {activeTab === "Payments" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">My Receipts & Bills</h1>
                <p className="text-xs text-gray-500">Verify your paid invoices, ledger entries and review official digital PDF receipts.</p>
              </div>
              {myDues.overallDue === 0 ? (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 self-stretch sm:self-auto text-center shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Unit Fully Cleared</span>
                </div>
              ) : (
                <div className="bg-rose-55 bg-rose-100/50 text-rose-800 border border-rose-200 rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 self-stretch sm:self-auto text-center shrink-0 animate-pulse">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                  <span>Pending Outstanding Dues ({state.settings.currencySymbol || "RM"} {myDues.overallDue.toFixed(2)})</span>
                </div>
              )}
            </div>

            {/* Dynamic Month-by-month Ledger Block */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    2026 Monthly & Annual Fee Ledger Tracker
                  </h3>
                  <p className="text-[9.5px] text-gray-400 font-bold uppercase font-mono mt-0.5">Unit dues breakdown based on sequential paid receipts coverage</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-1 font-bold rounded-lg border border-indigo-100">
                    Monthly Security Rate: {state.settings.currencySymbol || "RM"} {parseFloat(state.settings.monthlySecurityFeeRate) || 50}/mo
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-1 font-bold rounded-lg border border-indigo-100">
                    Annual Membership Rate: {state.settings.currencySymbol || "RM"} {parseFloat(state.settings.annualMembershipFeeRate) || 120}/yr
                  </span>
                </div>
              </div>

              {/* Annual dues box & quick summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-amber-500 font-mono tracking-wider block">Global Annual Fee</span>
                    <h4 className="font-extrabold text-sm text-amber-950 mt-1">2026 Annual Membership</h4>
                    <p className="text-[10px] text-amber-800 font-semibold leading-relaxed mt-1">
                      Required once per calendar year for general resident association funds.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-amber-200/40 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Status:</span>
                    {myDues.hasPaidAnnual ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded font-bold text-[9px] uppercase tracking-wider">
                        ✓ PAID
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-650 border border-rose-500/20 rounded font-bold text-[8.5px] uppercase tracking-wider animate-pulse">
                        ⚠️ DUE (RM {parseFloat(state.settings.annualMembershipFeeRate) || 120})
                      </span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                  {myDues.monthlyBreakdown.map((m) => {
                    return (
                      <div 
                        key={m.monthIndex} 
                        className={`p-3 rounded-xl border flex flex-col justify-between h-20 transition shadow-xs ${
                          m.status === "Paid" 
                            ? "bg-emerald-50/20 border-emerald-100/80" 
                            : m.status === "Overdue"
                            ? "bg-rose-50/30 border-rose-100/80 animate-in fade-in"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10.5px] font-extrabold text-slate-800">{m.monthName}</span>
                          <span className="text-[9px] font-bold font-mono text-slate-400">#{m.monthIndex}</span>
                        </div>
                        <div className="mt-2 flex justify-between items-baseline">
                          <span className="text-[10px] font-bold font-mono text-slate-500">
                             {state.settings.currencySymbol || "RM"}{m.amount.toFixed(0)}
                          </span>
                          {m.status === "Paid" ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 font-extrabold text-[8px] rounded uppercase tracking-wider">
                              Paid
                            </span>
                          ) : m.status === "Overdue" ? (
                            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 font-extrabold text-[8px] rounded uppercase tracking-wider animate-pulse">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 font-bold text-[8px] rounded uppercase tracking-wider">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payments list table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Billing History</span>
                <span className="text-[11px] font-semibold text-gray-400">{myPayments.length} transactions stored</span>
              </div>

              {myPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-55 bg-slate-100/50 font-bold text-slate-650 uppercase border-b border-slate-205">
                        <th className="p-4">Receipt Num.</th>
                        <th className="p-4">Service Product</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4 text-right">Amount Received</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myPayments.map((p) => (
                        <tr key={p["RECORD ID"]} className="hover:bg-slate-50/80 transition font-medium">
                          <td className="p-4 font-bold text-indigo-700">{p["RECEIPT NO."] || "PENDING"}</td>
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block text-[11.5px]">{p.PRODUCT}</span>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase font-mono">ID: {p["RECORD ID"]}</span>
                          </td>
                          <td className="p-4 font-mono text-gray-500">
                            {new Date(p.TIMESTAMP).toLocaleString("en-MY", {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                              {p["PAYMENT TYPE"]}
                            </span>
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-900">
                            {state.settings.currencySymbol || "RM"} {Number(p.AMOUNT).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => onSelectPaymentForInvoice(p)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400 font-bold">
                  No payment records compiled for Unit {residentUser.ID}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTICES TAB */}
        {activeTab === "Notices" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Official Management Circulars</h1>
              <p className="text-xs text-gray-500">Keep updated with general maintenance and urgent security bulletins issued by management.</p>
            </div>

            {notices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((n) => (
                  <div key={n.ID} className={`p-5 rounded-2xl border bg-white shadow-sm transition hover:shadow-md flex flex-col justify-between gap-4 ${
                    n.CATEGORY === "Urgent" ? "border-l-4 border-l-rose-500" :
                    n.CATEGORY === "Maintenance" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-indigo-400"
                  }`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          n.CATEGORY === "Urgent" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                          n.CATEGORY === "Maintenance" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {n.CATEGORY}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 font-semibold">{n.DATE}</span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-800 leading-tight">{n.TITLE}</h3>
                      <p className="text-[11px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap">{n.CONTENT}</p>
                      {n.ATTACHMENTS && n.ATTACHMENTS.split(",").filter(Boolean).length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Attachments:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {n.ATTACHMENTS.split(",").filter(Boolean).map((url, i) => {
                              const isDoc = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");
                              const cleanUrl = getCleanImageUrl(url);
                              if (isDoc) {
                                return (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block hover:opacity-90 transition shrink-0"
                                  >
                                    <AttachmentImageWithFallback url={url} size="w-10 h-10" />
                                  </a>
                                );
                              }
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setPreviewImageUrl(cleanUrl)}
                                  className="block hover:opacity-90 transition shrink-0 cursor-pointer focus:outline-none"
                                >
                                  <AttachmentImageWithFallback url={url} size="w-10 h-10" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
                      <span>Authority: {n.CREATED_BY || "Resident Office"}</span>
                      <span className="font-mono text-slate-350 bg-slate-50 px-1 py-0.5 rounded">ID: {n.ID}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold bg-white rounded-3xl border border-slate-200">
                No official announcements logged.
              </div>
            )}
          </div>
        )}

        {/* NEWS TAB */}
        {activeTab === "News" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Community Feed & News</h1>
              <p className="text-xs text-gray-500">Read what's happening around our residences, including green activities, garden yields, and estate upgrades.</p>
            </div>

            {news.filter(item => item.HIDDEN !== true && item.HIDDEN !== "TRUE" && item.HIDDEN !== "true").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.filter(item => item.HIDDEN !== true && item.HIDDEN !== "TRUE" && item.HIDDEN !== "true").map((item) => (
                  <div key={item.ID} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    {item.IMAGE_URL && (
                      <div className="h-44 w-full overflow-hidden relative bg-slate-100 shrink-0">
                        <img
                          src={item.IMAGE_URL}
                          referrerPolicy="no-referrer"
                          alt={item.TITLE}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm shadow px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-slate-800">
                          {item.DATE}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        {!item.IMAGE_URL && (
                          <span className="text-[10px] font-mono font-bold text-indigo-600 block mb-1">{item.DATE}</span>
                        )}
                        <h2 className="font-extrabold text-sm text-slate-800 leading-snug mb-1">{item.TITLE}</h2>
                        <p className="text-[11.5px] text-slate-650 leading-relaxed font-bold mb-2">{item.SUMMARY}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">{item.CONTENT}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-bold uppercase text-gray-400">NAZCUBE COMMUNITY</span>
                        <span className="text-[9.5px] font-mono text-gray-300">ID: {item.ID}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold bg-white rounded-3xl border border-slate-200">
                No newsletter logs published.
              </div>
            )}
          </div>
        )}

        {/* COMPLAINTS TAB */}
        {activeTab === "Complaints" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Complaints & Feedback Desk</h1>
                <p className="text-xs text-gray-500">File a repair/security incident report directly to management and track resolution notes.</p>
              </div>
              <button
                onClick={() => setShowAddComplaint(!showAddComplaint)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center ${
                  showAddComplaint ? "bg-slate-250 border border-slate-300 text-slate-700" : `${t.primary} shadow shadow-indigo-100`
                }`}
              >
                {showAddComplaint ? (
                  <span>View Existing Complaints</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>File New Case Ticket</span>
                  </>
                )}
              </button>
            </div>

            {/* Submit complaint card overlay */}
            {showAddComplaint ? (
              <div className="bg-white rounded-3xl border border-slate-205 p-6 shadow-md max-w-xl duration-200 animate-in slide-in-from-top-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-3 border-b border-indigo-100 mb-4 text-indigo-700">
                  <MessageSquareWarning className="w-4.5 h-4.5 text-indigo-600" />
                  Compile Incident / Maintenance Incident Ticket
                </h3>

                <form onSubmit={handleSubmitComplaint} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Issue Topic Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Block B main water boiler leaking"
                        value={complaintTitle}
                        onChange={(e) => setComplaintTitle(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Incident Category Type</label>
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-bold text-slate-755"
                      >
                        <option value="Maintenance">🔧 Maintenance / Repair</option>
                        <option value="Security">🚨 Guard & Perimeter Security</option>
                        <option value="Billing">💵 Billing & Cashbook discrepancy</option>
                        <option value="Others">❓ Miscellaneous Query</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Detailed Description & Location</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Specify your level/block or description of the fault. e.g. Streetlamp pole #3 is flickering near Gate B."
                      value={complaintDescription}
                      onChange={(e) => setComplaintDescription(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-450 transition font-medium text-xs leading-relaxed"
                    />
                  </div>

                  {/* Attachment Images Uploader Box */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">Upload Attachments / Evidence (Max 5 files)</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files); }}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                        isDragActive ? "border-indigo-600 bg-indigo-50/20" : "border-slate-200 hover:bg-slate-50/40 bg-slate-50/10"
                      }`}
                      onClick={() => document.getElementById("complaint-dropzone-input")?.click()}
                    >
                      <input
                        type="file"
                        id="complaint-dropzone-input"
                        className="hidden"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e.target.files)}
                        disabled={complaintImages.length >= 5 || isUploading}
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 text-indigo-650 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6 text-slate-400" />
                        )}
                        <span className="text-slate-700 font-bold block">
                          {isUploading ? "Uploading to Cloud Drive..." : "Click or drag files here to select"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Supports images, PDFs up to 5MB. ({complaintImages.length}/5 selected)
                        </span>
                      </div>
                    </div>

                    {uploadError && (
                      <p className="text-[10.5px] font-bold text-rose-500 bg-rose-50 p-2 border border-rose-100 rounded-lg">{uploadError}</p>
                    )}

                    {complaintImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 pt-1">
                        {complaintImages.map((fileObj, index) => {
                          const isImg = fileObj.base64.startsWith("data:image");
                          return (
                            <div key={index} className="relative group border border-slate-200 rounded-xl overflow-hidden aspect-square bg-slate-50 flex items-center justify-center">
                              {isImg ? (
                                <img src={fileObj.base64} referrerPolicy="no-referrer" alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="p-1 text-center flex flex-col items-center">
                                  <Paperclip className="w-4 h-4 text-indigo-505" />
                                  <span className="text-[8px] truncate max-w-[40px] text-slate-500 block">{fileObj.name || "Attachment"}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                className="absolute -top-1 -right-1 p-1 bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-rose-600 hover:text-white rounded-full shadow transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {submitSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center animate-pulse">
                      Case Submitted Successfully! Syncing logs...
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddComplaint(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition"
                    >
                      Bypass
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploading ? "Uploading & Dispatching..." : "Dispatch Complaint"}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.length > 0 ? (
                  <div className="space-y-4">
                    {myComplaints.map((c) => (
                      <div key={c.ID} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-350 mr-2 bg-slate-50 px-1.5 py-0.5 rounded">ID: {c.ID}</span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">Category: {c.CATEGORY}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                            c.STATUS === "Resolved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            c.STATUS === "In Progress" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {c.STATUS === "Resolved" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{c.STATUS}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-xs text-slate-800 mb-1">{c.TITLE}</h4>
                          <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">{c.DESCRIPTION}</p>
                          
                          {c.ATTACHMENTS && c.ATTACHMENTS.split(",").filter(Boolean).length > 0 && (
                            <div className="pt-2">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Attachments:</span>
                              <div className="flex flex-wrap gap-2">
                                {c.ATTACHMENTS.split(",").filter(Boolean).map((url, i) => {
                                  const isDoc = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");
                                  const cleanUrl = getCleanImageUrl(url);
                                  if (isDoc) {
                                    return (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block hover:opacity-90 hover:ring-2 hover:ring-indigo-100 transition shrink-0"
                                      >
                                        <AttachmentImageWithFallback url={url} size="w-14 h-14" />
                                      </a>
                                    );
                                  }
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setPreviewImageUrl(cleanUrl)}
                                      className="block hover:opacity-90 hover:ring-2 hover:ring-indigo-100 transition shrink-0 cursor-pointer focus:outline-none"
                                    >
                                      <AttachmentImageWithFallback url={url} size="w-14 h-14" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {c.REPLY ? (
                          <div className="bg-slate-50/80 border border-slate-150 rounded-xl p-4 space-y-2">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-600 block flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                              Official Management Response
                            </span>
                            <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic">
                              "{c.REPLY}"
                            </p>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 italic">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Awaiting Operator Desk review...</span>
                          </div>
                        )}

                        <div className="text-[10.5px] font-mono text-gray-400 font-medium text-right">
                          Submitted on: {c.DATE}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400 font-bold bg-white rounded-3xl border border-slate-200">
                    You have not submitted any complaints yet. Praise is also welcome!
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VISITOR PASSES PRE-AUTH TAB */}
        {activeTab === "VisitorPasses" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Pre-Authorized Visitor Passes</h1>
                <p className="text-xs text-gray-500 font-medium">Generate digital entry credentials (with QR codes) for your incoming guests, contractors, or delivery drivers to speed up security gate checks.</p>
              </div>
              <button
                onClick={() => setShowCreatePassForm(!showCreatePassForm)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center ${
                  showCreatePassForm ? "bg-slate-200 border border-slate-305 text-slate-700 hover:bg-slate-300" : `${t.primary} shadow shadow-indigo-100`
                }`}
              >
                {showCreatePassForm ? (
                  <span>View My Passes</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Create Visitor Pass</span>
                  </>
                )}
              </button>
            </div>

            {showCreatePassForm ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm max-w-2xl text-xs text-gray-900">
                <div className="pb-3 border-b border-slate-100 mb-5">
                  <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5">
                    <QrCode className="w-4.5 h-4.5 text-indigo-650" />
                    Issue Pre-Authorized Entrance Certificate
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">Your credentials will automatically load into the Guard Barrack desk queue once created.</p>
                </div>

                {passCreateSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center animate-bounce">
                    ✔ Pre-authorization token published successfully! Loading layout...
                  </div>
                )}

                <form onSubmit={handleCreatePass} className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Visitor's Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe, Aircon Servicing Seng"
                        value={passVisitorName}
                        onChange={(e) => setPassVisitorName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Vehicle License Plate Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. WQG 3110, PLX 4567"
                        value={passVehiclePlate}
                        onChange={(e) => setPassVehiclePlate(e.target.value.toUpperCase())}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold uppercase tracking-widest font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Visitor Classification</label>
                      <select
                        value={passVisitorType}
                        onChange={(e) => setPassVisitorType(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                      >
                        <option value="visitor">👤 Standard Guest / Friend</option>
                        <option value="contractor">🛠️ Repair / Contractor</option>
                        <option value="delivery">📦 Courier Delivery</option>
                        <option value="others">🔘 Miscellaneous</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Restricted Time Segment</label>
                      <select
                        value={passTimeRange}
                        onChange={(e) => setPassTimeRange(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                      >
                        <option value="All Day">All Day Entry (00:00 - 23:59)</option>
                        <option value="Morning Shift (07:00 - 13:00)">Morning shift only (07:00 - 13:00)</option>
                        <option value="Noon Shift (13:01 - 19:00)">Noon shift only (13:01 - 19:00)</option>
                        <option value="Night Shift (19:01 - 23:59)">Night shift only (19:01 - 23:59)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Validity Start Date *</label>
                      <input
                        type="date"
                        required
                        value={passStartDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setPassStartDate(newStart);
                          if (passEndDate < newStart) {
                            setPassEndDate(newStart);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-750 mb-1">Validity End Date *</label>
                      <input
                        type="date"
                        required
                        min={passStartDate}
                        value={passEndDate}
                        onChange={(e) => setPassEndDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreatePassForm(false)}
                      className="py-2.5 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold cursor-pointer transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Create and Sync Pass</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Active passes lists */}
                {((state.visitorPasses || []).filter(p => p.HOUSE_UNIT === residentUser.ID)).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {((state.visitorPasses || []).filter(p => p.HOUSE_UNIT === residentUser.ID)).map((pass) => {
                      const isExpired = pass.STATUS === "Expired";
                      const isUsed = pass.STATUS === "Used";
                      const todayStr = getMalaysiaDateString(new Date());
                      const cleanStartDate = getMalaysiaDateString(pass.START_DATE);
                      const cleanEndDate = getMalaysiaDateString(pass.END_DATE);
                      const isOverdue = cleanEndDate < todayStr;
                      const isUpcoming = cleanStartDate > todayStr;
                      const timeRangeCheck = isCurrentTimeInTimeRange(pass.TIME_RANGE);
                      const isOutsideTimeRange = !timeRangeCheck.valid;
                      
                      // Check if visitor is currently on premise vs checked-out in logs
                      const visitorStillInside = (state.visitorLogs || []).some(
                        (log) => log.PRE_AUTH_PASS_ID === pass.ID && (!log.CHECK_OUT_TIME || String(log.CHECK_OUT_TIME).trim() === "")
                      );
                      const visitorCheckedOut = (state.visitorLogs || []).some(
                        (log) => log.PRE_AUTH_PASS_ID === pass.ID && (!!log.CHECK_OUT_TIME && String(log.CHECK_OUT_TIME).trim() !== "")
                      );

                      let badgeColor = "bg-emerald-50 border-emerald-150 text-emerald-700";
                      let badgeText = "Active Available";

                      if (visitorStillInside) {
                        if (isOverdue) {
                          badgeColor = "bg-rose-100 border-rose-300 text-rose-700 font-extrabold animate-pulse";
                          badgeText = "⚠️ OVERSTAYING ON PREMISE";
                        } else {
                          badgeColor = "bg-indigo-100 border-indigo-200 text-indigo-800 font-bold";
                          badgeText = "📍 Checked-In (Inside)";
                        }
                      } else if (visitorCheckedOut) {
                        badgeColor = "bg-slate-100 border-slate-200 text-slate-500";
                        badgeText = "✔ Exited (Checked-Out)";
                      } else if (isExpired || isOverdue) {
                        badgeColor = "bg-slate-100 border-slate-200 text-slate-500";
                        badgeText = "Expired / Inactive";
                      } else if (isUsed) {
                        badgeColor = "bg-indigo-50 border-indigo-100 text-indigo-700";
                        badgeText = "Checked-In Used";
                      } else if (isUpcoming) {
                        badgeColor = "bg-amber-100 border-amber-300 text-amber-800 font-bold";
                        badgeText = "📅 Upcoming Pass";
                      } else if (isOutsideTimeRange) {
                        badgeColor = "bg-orange-100 border-orange-200 text-orange-700 font-bold";
                        badgeText = "⏳ Outside Segment Hours";
                      }

                      return (
                        <div
                          key={pass.ID}
                          className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition text-xs text-slate-800 ${
                            (isExpired || isOverdue) && !visitorStillInside ? "opacity-75" : ""
                          }`}
                        >
                          {/* Top pass details */}
                          <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Unit {pass.HOUSE_UNIT} Pass</span>
                                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{pass.VISITOR_NAME}</h4>
                              </div>
                              <span className={`inline-block border px-2 py-0.5 rounded text-[9px] font-extrabold uppercase whitespace-nowrap ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>

                            {/* Real scannable local QR code element */}
                            <div className="mx-auto flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-2xl w-36 h-36 shadow-xs">
                              {(isExpired || isOverdue) && !visitorStillInside ? (
                                <div className="text-center space-y-1 text-slate-400 font-sans">
                                  <X className="w-8 h-8 text-slate-400 mx-auto" />
                                  <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Void coupon</span>
                                  <span className="text-[9.5px] font-mono font-extrabold text-slate-400 block tracking-wider uppercase">{pass.ID}</span>
                                </div>
                              ) : (
                                <div className="space-y-1 text-center">
                                  <div className="flex justify-center select-none">
                                    <QRCodeRender text={pass.ID} className="w-24 h-24" />
                                  </div>
                                  <span className="text-[9.5px] font-mono font-extrabold text-indigo-700 block tracking-wider uppercase mt-1">{pass.ID}</span>
                                </div>
                              )}
                            </div>

                            {/* Validity list */}
                            <div className="space-y-1 text-[10.5px] font-medium leading-relaxed text-slate-605 border-t border-slate-100 pt-3">
                              <div className="flex justify-between"><span className="text-slate-400">Classification:</span> <span className="font-bold text-slate-800 uppercase">{pass.VISITOR_TYPE}</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">License Plate:</span> <span className="font-bold text-slate-900 tracking-wider font-mono">{pass.VEHICLE_PLATE}</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">Valid Dates:</span> <span className="font-bold text-slate-800">{getMalaysiaDateString(pass.START_DATE)} to {getMalaysiaDateString(pass.END_DATE)}</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">Time Segment:</span> <span className="font-bold text-slate-800">{pass.TIME_RANGE}</span></div>
                            </div>
                          </div>

                          {/* Action cancel & share buttons */}
                          <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-between items-center text-[10.5px]">
                            <span className="text-slate-400 font-mono font-bold">Issued: {getMalaysiaDateString(pass.CREATED_AT)}</span>
                            {pass.STATUS === "Active" && !isOverdue ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSharingPass(pass)}
                                  className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 font-bold rounded-lg cursor-pointer transition text-[9px] flex items-center gap-1 border border-indigo-150/60"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                                  Share Pass
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelPass(pass.ID)}
                                  className="py-1 px-2 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer transition text-[9px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-slate-200 font-bold">
                    You do not have any pre-authorized visitor passes recorded. Click "Create Visitor Pass" above to authorize entry for an upcoming guest!
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </main>

      {/* Image Lightbox/Preview Modal Overlay */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer z-10"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-1 flex-1 flex items-center justify-center min-h-0">
              <img 
                src={previewImageUrl} 
                referrerPolicy="no-referrer"
                alt="Expanded attachment preview font-sans" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <div className="bg-neutral-950 p-3.5 flex justify-between items-center text-xs text-neutral-300 font-bold border-t border-neutral-800">
              <span>Evidential Attachment Image Preview</span>
              <a 
                href={previewImageUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 font-extrabold underline transition flex items-center gap-1"
              >
                Open Original Tab ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Invite Link Modal Overlay */}
      {sharingPass && (() => {
        const textDetails = `✦ NAZCUBE RESIDENCES GUEST ENTRY PASS ✦
Pass ID: ${sharingPass.ID}
Authorized Guest: ${sharingPass.VISITOR_NAME}
Designated Unit: UNIT ${sharingPass.HOUSE_UNIT}
Vehicle Plate: ${sharingPass.VEHICLE_PLATE}
Validity Date: ${getMalaysiaDateString(sharingPass.START_DATE)} to ${getMalaysiaDateString(sharingPass.END_DATE)}
Visitation Slot: ${sharingPass.TIME_RANGE}
Status: pre-authorized security guard entrance pass.`;

        const whatsappMsg = `Hi! Here is your entrance pass for Unit ${sharingPass.HOUSE_UNIT} at Nazcube Residences.

*Pass ID:* ${sharingPass.ID}
*Guest Name:* ${sharingPass.VISITOR_NAME}
*Vehicle Plate:* ${sharingPass.VEHICLE_PLATE}
*Date:* ${getMalaysiaDateString(sharingPass.START_DATE)} to ${getMalaysiaDateString(sharingPass.END_DATE)}
*Time Window:* ${sharingPass.TIME_RANGE}

Please present this information/pass image to the guardhouse upon entry.`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

        const copyToClipboard = () => {
          navigator.clipboard.writeText(textDetails).then(() => {
            setCopiedPassId(true);
            setTimeout(() => setCopiedPassId(false), 2000);
          }).catch(() => {
            alert("Could not copy details automatically. Please select and copy manually.");
          });
        };

        const downloadPassAsImage = async () => {
          const canvas = document.createElement("canvas");
          // Set high resolution for crisp reading on mobile screens
          canvas.width = 600;
          canvas.height = 950;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // 1. Draw rounded container background
          ctx.fillStyle = "#0f172a"; // Deep Slate base
          ctx.fillRect(0, 0, 600, 950);

          // Rounded corners outline
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, 596, 946);

          // 2. Main Header Gradient Banner
          const gradient = ctx.createLinearGradient(0, 0, 600, 160);
          gradient.addColorStop(0, "#312e81"); // Deep Indigo
          gradient.addColorStop(1, "#1e1b4b");
          ctx.fillStyle = gradient;
          ctx.fillRect(4, 4, 592, 160);

          // Nazcube Logo Text
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 26px sans-serif";
          ctx.fillText("NAZCUBE RESIDENCES", 40, 65);

          ctx.fillStyle = "#a5b4fc";
          ctx.font = "bold 14px monospace";
          ctx.fillText("GUEST GATEWAY SECURITY PASS", 40, 95);

          // Status Badge Block (Active Authorized)
          ctx.fillStyle = "#10b981"; // Emerald
          ctx.beginPath();
          ctx.roundRect(40, 115, 180, 30, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("✓ ACTIVE AUTHORIZED", 55, 134);

          // 3. Central Ticket Section
          ctx.fillStyle = "#1e293b"; // Lighter slate for middle section
          ctx.fillRect(4, 168, 592, 580);

          // Guest Information Labels and Values
          const drawMeta = (label: string, value: string, x: number, y: number, isPlate = false) => {
            ctx.fillStyle = "#94a3b8";
            ctx.font = "bold 12px monospace";
            ctx.fillText(label.toUpperCase(), x, y);

            if (isPlate) {
              // Draw plate box
              ctx.fillStyle = "#0f172a";
              ctx.beginPath();
              ctx.roundRect(x, y + 8, 220, 42, 8);
              ctx.fill();
              ctx.strokeStyle = "#475569";
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x, y + 8, 220, 42);

              ctx.fillStyle = "#f8fafc";
              ctx.font = "bold 20px monospace";
              ctx.fillText(value.toUpperCase(), x + 15, y + 36);
            } else {
              ctx.fillStyle = "#f8fafc";
              ctx.font = "bold 18px sans-serif";
              ctx.fillText(value, x, y + 26);
            }
          };

          drawMeta("AUTHORIZED GUEST NAME", sharingPass.VISITOR_NAME || "N/A", 40, 210);
          drawMeta("DESIGNATED HOUSE UNIT", `UNIT ${sharingPass.HOUSE_UNIT || "N/A"}`, 40, 290);
          drawMeta("VEHICLE PLATE NUMBER", sharingPass.VEHICLE_PLATE || "N/A", 40, 370, true);

          // Date and Time Range
          drawMeta("VALIDITY DATE", `${getMalaysiaDateString(sharingPass.START_DATE)} to ${getMalaysiaDateString(sharingPass.END_DATE)}`, 40, 470);
          drawMeta("DAILY VISITATION HOUR SEGMENT", sharingPass.TIME_RANGE || "N/A", 40, 550);

          // 4. Barcode/QR Representation in Right Column or Bottom Center
          // Render actual scannable QR Code using locally executed qrcode library
          const qrX = 350;
          const qrY = 210;
          const qrSize = 210;

          ctx.fillStyle = "#020617";
          ctx.beginPath();
          ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
          ctx.fill();
          ctx.strokeStyle = "#10b981"; // Emerald border
          ctx.lineWidth = 2.5;
          ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

          try {
            const qrCanvas = document.createElement("canvas");
            await QRCode.toCanvas(qrCanvas, sharingPass.ID || "N/A", {
              margin: 1,
              width: qrSize,
              color: {
                dark: "#020617",
                light: "#ffffff"
              }
            });
            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
          } catch (qrErr) {
            console.error("Failed to render real QR code on download canvas:", qrErr);
            // Dynamic fallback to clean simulated QR corner anchors if library fails
            const drawCorner = (cx: number, cy: number) => {
              ctx.strokeStyle = "#f8fafc";
              ctx.lineWidth = 6;
              ctx.strokeRect(cx, cy, 46, 46);
              ctx.fillStyle = "#f8fafc";
              ctx.fillRect(cx + 12, cy + 12, 22, 22);
            };
            drawCorner(qrX, qrY);
            drawCorner(qrX + qrSize - 46, qrY);
            drawCorner(qrX, qrY + qrSize - 46);

            ctx.fillStyle = "#f8fafc";
            for (let r = 0; r < 23; r++) {
              for (let c = 0; c < 23; c++) {
                if ((r < 7 && c < 7) || (r > 15 && c < 7) || (r < 7 && c > 15)) continue;
                const seed = (sharingPass.ID || "FALLBACK").charCodeAt(0) + r + c;
                if (seed % 2 === 0) {
                  ctx.fillRect(qrX + c * 9 + 4, qrY + r * 9 + 4, 7, 7);
                }
              }
            }
          }

          // Draw code label below QR
          ctx.fillStyle = "#a5b4fc";
          ctx.font = "bold 13px monospace";
          ctx.fillText(sharingPass.ID || "N/A", qrX + 22, qrY + qrSize + 30);

          // 5. Beautiful Ticket Scallop Divider
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = "#475569";
          ctx.beginPath();
          ctx.moveTo(30, 770);
          ctx.lineTo(570, 770);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw scallop cuts on the left and right edges
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(0, 770, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(600, 770, 20, 0, Math.PI * 2);
          ctx.fill();

          // 6. Safeguard Protocol Header & Rules (Bottom Section)
          ctx.fillStyle = "#64748b";
          ctx.font = "bold 10px monospace";
          ctx.fillText("SECURITY GATEKEEPER & DEPUTY PROTOCOLS", 40, 805);

          const protocols = [
            "1. Officer must inspect physical license plate against " + (sharingPass.VEHICLE_PLATE || "listed registration") + ".",
            "2. Standard verification of authorized vehicle booth compartment is mandatory.",
            "3. Keep vehicle entry log updated under Nazcube Smart HMS Guidelines."
          ];

          ctx.fillStyle = "#94a3b8";
          ctx.font = "11px sans-serif";
          protocols.forEach((rule, idx) => {
            ctx.fillText(rule, 40, 835 + idx * 24);
          });

          // Footer seal line
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(4, 915, 592, 30);
          ctx.fillStyle = "#a5b4fc";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("NAZCUBE HMS SECURITY SAFEGUARD SYSTEM GATEWAY COU-PASS", 300, 934);

          // Trigger download process
          const dlLink = document.createElement("a");
          dlLink.download = `Nazcube_Pass_${sharingPass.VISITOR_NAME.replace(/\s+/g, "_")}_${sharingPass.ID}.png`;
          dlLink.href = canvas.toDataURL("image/png");
          dlLink.click();
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs text-slate-800">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Download Shareable Guest Pass</h3>
                    <p className="text-[10px] text-indigo-200 font-medium">Export secure security tickets instantly offline</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSharingPass(null)}
                  className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Core Content with Virtual Ticket Preview */}
              <div className="p-5 space-y-4 overflow-y-auto bg-slate-100 flex-1">
                
                {/* Visual Ticket Preview */}
                <div className="bg-[#0f172a] text-[#f8fafc] rounded-2xl overflow-hidden border border-[#1e293b] shadow-xl flex flex-col font-sans shrink-0">
                  {/* Banner header of static ticket preview */}
                  <div className="p-4 bg-gradient-to-r from-[#1e1b4b] to-[#312e81] flex items-center justify-between border-b border-[#334155]/60 pr-5">
                    <div>
                      <span className="text-[10.5px] uppercase font-mono font-bold text-indigo-300 tracking-wider">Nazcube Residences</span>
                      <h4 className="text-[12px] font-extrabold text-white tracking-wide">VISITOR GATEWAY PASS</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold font-mono text-[9px] rounded-md tracking-wider">
                      ✓ AUTHORIZED
                    </span>
                  </div>

                  {/* Body elements */}
                  <div className="p-4 grid grid-cols-5 gap-4 relative">
                    {/* Left Column (Details) */}
                    <div className="col-span-3 space-y-3.5">
                      <div>
                        <label className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Guest Visitor</label>
                        <p className="text-xs font-bold text-white mt-0.5">{sharingPass.VISITOR_NAME}</p>
                      </div>
                      <div>
                        <label className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Designated Unit</label>
                        <p className="text-xs font-mono font-bold text-indigo-300 mt-0.5">UNIT {sharingPass.HOUSE_UNIT}</p>
                      </div>
                      <div>
                        <label className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Vehicle License Plate</label>
                        <div className="bg-[#0f172a] border border-[#475569]/80 py-1 px-2.5 rounded-lg text-center mt-0.5 inline-block font-mono text-[11.5px] font-extrabold text-white uppercase tracking-wider">
                          {sharingPass.VEHICLE_PLATE || "NO PLATE"}
                        </div>
                      </div>
                      <div>
                        <label className="text-[8.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Validity Period</label>
                        <p className="text-[10px] font-semibold text-slate-200 leading-tight mt-0.5">
                          {getMalaysiaDateString(sharingPass.START_DATE)} to {getMalaysiaDateString(sharingPass.END_DATE)}
                        </p>
                        <p className="text-[9.5px] font-bold text-emerald-400 mt-0.5">
                          Window: {sharingPass.TIME_RANGE}
                        </p>
                      </div>
                    </div>

                    {/* Right Column (Dynamic QR representation) */}
                    <div className="col-span-2 flex flex-col items-center justify-center gap-1.5 self-center border-l border-slate-800 pl-3">
                      <div className="p-1 bg-white rounded-xl shadow-xs overflow-hidden">
                        <QRCodeRender text={sharingPass.ID} className="w-24 h-24" />
                      </div>
                      <span className="text-[8.5px] font-bold font-mono text-indigo-200 uppercase tracking-widest">{sharingPass.ID}</span>
                    </div>

                    {/* Scallop circle dots overlay simulation */}
                    <div className="absolute left-[-8px] bottom-[-8px] w-4 h-4 rounded-full bg-slate-100 border border-transparent shadow-inner pointer-events-none" />
                    <div className="absolute right-[-8px] bottom-[-8px] w-4 h-4 rounded-full bg-slate-100 border border-transparent shadow-inner pointer-events-none" />
                  </div>

                  {/* Scallop divider boundary line */}
                  <div className="border-t border-dashed border-slate-700/60 my-0.5" />

                  {/* Bottom Ticket segment */}
                  <div className="p-3.5 bg-[#0b0f19] text-[9px] text-[#94a3b8] leading-tight space-y-1 rounded-b-2xl">
                    <span className="text-[8.5px] font-extrabold uppercase text-[#64748b] tracking-wider block font-mono">Duty Gatekeeper Protocol</span>
                    <p className="italic">1. Conform vehicle license plate matches: <strong className="text-white font-mono">{sharingPass.VEHICLE_PLATE || "N/A"}</strong>.</p>
                    <p className="italic">2. Hand over temporary parking block permit sticker prior to ingress.</p>
                  </div>
                </div>

                {/* Primary Actions Pane */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={downloadPassAsImage}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl cursor-pointer shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2 text-xs"
                  >
                    📥 Download Pass PNG Image
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className={`py-2.5 px-3 border border-slate-200 text-slate-705 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        copiedPassId ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {copiedPassId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Text Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          Copy Pass Text
                        </>
                      )}
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 rounded-xl cursor-pointer font-bold text-[11px] transition flex items-center justify-center gap-1.5 text-center"
                    >
                      💬 WhatsApp Guest
                    </a>
                  </div>
                </div>

                {/* Helpful instructions note */}
                <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-150 flex items-start gap-2.5">
                  <span className="text-sm">⚡</span>
                  <p className="text-[10px] text-amber-950 font-medium leading-relaxed">
                    <b>No URLs or dynamic links needed!</b> Simply download the ticket image above and pass it to your guest over WhatsApp or WeChat. Guards can inspect and read this high-contrast stamp directly, avoiding connection issues!
                  </p>
                </div>

              </div>

              {/* Modal footer info */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 text-center text-[10px] text-slate-400 font-medium shrink-0">
                Nazcube HMS Smart Ticket System
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
