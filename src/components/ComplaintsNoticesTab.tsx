import React, { useState, useEffect } from "react";
import { DatabaseState, Complaint, Notice, News, User, Resident } from "../types";
import {
  MessageSquareWarning,
  Megaphone,
  Newspaper,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  X,
  Check,
  Calendar,
  MessageSquare,
  Edit,
  User as UserIcon,
  Sparkles,
  Image as ImageIcon,
  Paperclip,
  Upload,
  Loader2
} from "lucide-react";

interface ComplaintsNoticesTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onUpdateComplaints: (updatedList: Complaint[]) => void;
  onUpdateNotices: (updatedList: Notice[]) => void;
  onUpdateNews: (updatedList: News[]) => void;
  onUploadFile?: (base64Data: string, fileName: string) => Promise<string>;
  initialReminderResidentId?: string | null;
  onClearInitialReminder?: () => void;
}

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

// Helper component to render an attachment image with automatic fallback to generic paperclip icon
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

export default function ComplaintsNoticesTab({
  state,
  currentUser,
  onUpdateComplaints,
  onUpdateNotices,
  onUpdateNews,
  onUploadFile,
  initialReminderResidentId,
  onClearInitialReminder
}: ComplaintsNoticesTabProps) {
  const [panelMode, setPanelMode] = useState<"Complaints" | "Notices" | "News">("Complaints");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Local entities
  const complaints = state.complaints || [];
  const notices = state.notices || [];
  const news = state.news || [];

  // Overdue residents calculation for Notices Tab Reminders
  const rateMonthly = parseFloat(state.settings.monthlySecurityFeeRate) || 50;
  const rateAnnual = parseFloat(state.settings.annualMembershipFeeRate) || 120;
  const currentMonthNum = 6; // June 2026 is month 6

  const getOverdueDetails = (r: Resident) => {
    if (r["HOUSE STATUS"] === "Vacant") {
      return { monthlyDue: 0, annualDue: 0, total: 0, unpaidMonthsCount: 0, unpaidMonthsList: [] };
    }
    const resPayments = (state.payments || []).filter(p => p["OWNER ID"] === r["OWNER ID"]);
    const paidSecurity = resPayments
      .filter(p => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);

    const unpaidMonthsCount = Math.max(0, currentMonthNum - paidSecurity);
    const monthlyDueVal = unpaidMonthsCount * rateMonthly;

    const hasPaidAnnual = resPayments
      .filter(p => p.PRODUCT === "Annual Membership Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0) >= 1;
    const annualDueVal = hasPaidAnnual ? 0 : rateAnnual;

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const unpaidMonthsList: string[] = [];
    for (let idx = 0; idx < currentMonthNum; idx++) {
      const monthIdxOffset = idx + 1;
      const isPaid = paidSecurity >= monthIdxOffset;
      if (!isPaid) {
        unpaidMonthsList.push(months[idx]);
      }
    }

    return {
      monthlyDue: monthlyDueVal,
      annualDue: annualDueVal,
      total: monthlyDueVal + annualDueVal,
      unpaidMonthsCount,
      unpaidMonthsList,
      hasPaidAnnual
    };
  };

  const overdueResidentsList = (state.residents || []).map(r => {
    const details = getOverdueDetails(r);
    return {
      resident: r,
      details
    };
  }).filter(item => item.details.total > 0 && item.resident["HOUSE STATUS"] !== "Inactive");

  const overdueResidentsCount = overdueResidentsList.length;

  // Handle trigger reminder custom composer modal
  const handleInitiateReminder = (rItem: any) => {
    const r = rItem.resident;
    const d = rItem.details;
    const currency = state.settings.currencySymbol || "RM";

    const title = `REMINDER: Outstanding Maintenance/Security Fees - Unit ${r["OWNER ID"]}`;
    
    let content = `Dear Owner of Unit ${r["OWNER ID"]} (${r["OWNER NAME"]}),\n\n`;
    content += `This is an official notice from Nazcube Estate Management regarding your outstanding account dues.\n\n`;
    content += `According to our ledger for the year 2026, you have a pending balance of ${currency} ${d.total.toFixed(2)}:\n`;
    if (d.monthlyDue > 0) {
      content += `- Monthly Security Fee: ${currency} ${d.monthlyDue.toFixed(2)} (Outstanding: ${d.unpaidMonthsCount} months - ${d.unpaidMonthsList.join(", ")})\n`;
    }
    if (d.annualDue > 0) {
      content += `- Annual Membership Fee: ${currency} ${d.annualDue.toFixed(2)}\n`;
    }
    content += `\nPlease log in to your Resident Portal with your Unit ID (${r["OWNER ID"]}) to review your detailed monthly fee tracker ledger.\n\n`;
    content += `Kindly make the payment through the registered banking accounts or visit the management desk of Resident Association to settle the dues.\n\n`;
    content += `Thank you for your prompt attention and cooperation in maintaining our security operations and garden estate upkeeping!\n\n`;
    content += `Best regards,\nNazcube Estate Management Desk\nDate: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

    setRemindingResident(rItem);
    setReminderTitle(title);
    setReminderContent(content);
    setReminderSuccess(null);
  };

  // Submit Reminder Notice
  const handleDispatchReminder = () => {
    if (!remindingResident || !reminderTitle.trim() || !reminderContent.trim()) return;

    const newNotice: Notice = {
      ID: "N" + Math.floor(1000 + Math.random() * 9000),
      TITLE: reminderTitle.trim(),
      CONTENT: reminderContent.trim(),
      DATE: new Date().toISOString().split("T")[0],
      CATEGORY: "Urgent",
      CREATED_BY: currentUser?.["Full Name"] || "Management Desk",
      TARGET_TYPE: "Selective",
      TARGET_RESIDENTS: remindingResident.resident["OWNER ID"],
    };

    onUpdateNotices([newNotice, ...notices]);
    setReminderSuccess(`Successfully posted urgent targeted reminder circular to Unit ${remindingResident.resident["OWNER ID"]}!`);
    
    setTimeout(() => {
      setRemindingResident(null);
      setReminderTitle("");
      setReminderContent("");
      setReminderSuccess(null);
    }, 1800);
  };

  // Respond Complaint Form state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState("");
  const [complaintStatus, setComplaintStatus] = useState<"Pending" | "In Progress" | "Resolved">("Pending");

  // New Notice state
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeCategory, setNoticeCategory] = useState<"Urgent" | "General" | "Maintenance">("General");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState(false);
  const [noticeTargetType, setNoticeTargetType] = useState<"All" | "Selective">("All");
  const [selectedTargetResidents, setSelectedTargetResidents] = useState<string[]>([]);
  const [targetSearch, setTargetSearch] = useState("");

  // Sub-navigation for Notices Mode
  const [noticesSubView, setNoticesSubView] = useState<"Registry" | "DuesReminders">("Registry");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"notice" | "news" | null>(null);

  // Overdue Reminder Notice State
  const [remindingResident, setRemindingResident] = useState<any | null>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderContent, setReminderContent] = useState("");
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);

  // Notice uploads states
  const [noticeAttachments, setNoticeAttachments] = useState<{ name: string; base64: string }[]>([]);
  const [isUploadingNotice, setIsUploadingNotice] = useState(false);
  const [noticeUploadError, setNoticeUploadError] = useState("");
  const [noticeDragActive, setNoticeDragActive] = useState(false);

  useEffect(() => {
    if (initialReminderResidentId) {
      setPanelMode("Notices");
      setNoticesSubView("DuesReminders");
      const matched = overdueResidentsList.find(
        item => item.resident["OWNER ID"] === initialReminderResidentId
      );
      if (matched) {
        handleInitiateReminder(matched);
      }
      onClearInitialReminder?.();
    }
  }, [initialReminderResidentId]);

  // New News state
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsImgUrl, setNewsImgUrl] = useState("");
  const [newsSuccess, setNewsSuccess] = useState(false);

  // News Cover uploads states
  const [isUploadingNews, setIsUploadingNews] = useState(false);
  const [newsUploadError, setNewsUploadError] = useState("");
  const [localNewsFile, setLocalNewsFile] = useState<{ name: string; base64: string } | null>(null);

  const handleNoticeFileChange = async (files: FileList | null) => {
    setNoticeUploadError("");
    if (!files || files.length === 0) return;

    setIsUploadingNotice(true);
    try {
      const addedFiles: { name: string; base64: string }[] = [];
      for (const file of Array.from(files)) {
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
      setNoticeAttachments(prev => [...prev, ...addedFiles]);
    } catch (err: any) {
      setNoticeUploadError(err.message || "Failed to process attachments preview.");
    } finally {
      setIsUploadingNotice(false);
    }
  };

  const handleNewsUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewsUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNewsUploadError("Image file cannot represent more than 5MB.");
      return;
    }

    setIsUploadingNews(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      
      setLocalNewsFile({ name: file.name, base64 });
      setNewsImgUrl(base64);
    } catch (err: any) {
      setNewsUploadError(err.message || "Failed to process cover photo preview.");
    } finally {
      setIsUploadingNews(false);
    }
  };

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [complaintsCategory, setComplaintsCategory] = useState<string>("All");
  const [complaintsSearch, setComplaintsSearch] = useState<string>("");
  const [complaintsPage, setComplaintsPage] = useState<number>(1);

  const [noticesCategory, setNoticesCategory] = useState<string>("All");
  const [noticesSearch, setNoticesSearch] = useState<string>("");
  const [noticesPage, setNoticesPage] = useState<number>(1);

  const [newsVisibility, setNewsVisibility] = useState<string>("All");
  const [newsSearch, setNewsSearch] = useState<string>("");
  const [newsPage, setNewsPage] = useState<number>(1);

  const [showAddNoticeModal, setShowAddNoticeModal] = useState<boolean>(false);
  const [showAddNewsModal, setShowAddNewsModal] = useState<boolean>(false);

  const ITEMS_PER_PAGE = 5;

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchStatus = filterStatus === "All" || c.STATUS === filterStatus;
    const matchCategory = complaintsCategory === "All" || c.CATEGORY === complaintsCategory;
    const s = complaintsSearch.toLowerCase().trim();
    const matchSearch = !s || 
      (c.ID && c.ID.toLowerCase().includes(s)) ||
      (c["OWNER ID"] && c["OWNER ID"].toLowerCase().includes(s)) ||
      (c["RESIDENT NAME"] && c["RESIDENT NAME"].toLowerCase().includes(s)) ||
      (c.TITLE && c.TITLE.toLowerCase().includes(s)) ||
      (c.DESCRIPTION && c.DESCRIPTION.toLowerCase().includes(s));

    return matchStatus && matchCategory && matchSearch;
  });

  const paginatedComplaints = filteredComplaints.slice((complaintsPage - 1) * ITEMS_PER_PAGE, complaintsPage * ITEMS_PER_PAGE);
  const totalComplaintsPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE) || 1;

  // Filter notices
  const filteredNotices = notices.filter(n => {
    const matchCategory = noticesCategory === "All" || n.CATEGORY === noticesCategory;
    const s = noticesSearch.toLowerCase().trim();
    const matchSearch = !s ||
      (n.ID && n.ID.toLowerCase().includes(s)) ||
      (n.TITLE && n.TITLE.toLowerCase().includes(s)) ||
      (n.CONTENT && n.CONTENT.toLowerCase().includes(s)) ||
      (n.CREATED_BY && n.CREATED_BY.toLowerCase().includes(s));

    return matchCategory && matchSearch;
  });

  const paginatedNotices = filteredNotices.slice((noticesPage - 1) * ITEMS_PER_PAGE, noticesPage * ITEMS_PER_PAGE);
  const totalNoticesPages = Math.ceil(filteredNotices.length / ITEMS_PER_PAGE) || 1;

  // Filter news
  const filteredNews = news.filter(item => {
    const isHidden = item.HIDDEN === true || item.HIDDEN === "TRUE" || item.HIDDEN === "true";
    const matchVis = newsVisibility === "All" ||
      (newsVisibility === "Visible" && !isHidden) ||
      (newsVisibility === "Hidden" && isHidden);

    const s = newsSearch.toLowerCase().trim();
    const matchSearch = !s ||
      (item.ID && item.ID.toLowerCase().includes(s)) ||
      (item.TITLE && item.TITLE.toLowerCase().includes(s)) ||
      (item.SUMMARY && item.SUMMARY.toLowerCase().includes(s)) ||
      (item.CONTENT && item.CONTENT.toLowerCase().includes(s));

    return matchVis && matchSearch;
  });

  const paginatedNews = filteredNews.slice((newsPage - 1) * ITEMS_PER_PAGE, newsPage * ITEMS_PER_PAGE);
  const totalNewsPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE) || 1;

  // Toggle news show/hide
  const handleToggleNewsVisibility = (item: News) => {
    const isHiddenNow = item.HIDDEN === true || item.HIDDEN === "TRUE" || item.HIDDEN === "true";
    const updated = news.map(n => {
      if (n.ID === item.ID) {
        return {
          ...n,
          HIDDEN: !isHiddenNow ? "TRUE" : "FALSE"
        };
      }
      return n;
    });
    onUpdateNews(updated);
  };

  // Handle complaint response
  const handleSaveResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const updated = complaints.map(c => {
      if (c.ID === selectedComplaint.ID) {
        return {
          ...c,
          STATUS: complaintStatus,
          REPLY: replyText.trim() || undefined
        };
      }
      return c;
    });

    onUpdateComplaints(updated);
    setSelectedComplaint(null);
    setReplyText("");
  };

  // Handle new notice
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    if (noticeTargetType === "Selective" && selectedTargetResidents.length === 0) {
      alert("Please select at least one resident unit to deliver this targeted warning/notice.");
      return;
    }

    setIsUploadingNotice(true);
    setNoticeUploadError("");
    try {
      const uploadedUrls: string[] = [];
      for (const fileObj of noticeAttachments) {
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

      const newNotice: Notice = {
        ID: "N" + Math.floor(1000 + Math.random() * 9000),
        TITLE: noticeTitle.trim(),
        CONTENT: noticeContent.trim(),
        DATE: new Date().toISOString().split("T")[0],
        CATEGORY: noticeCategory,
        CREATED_BY: currentUser?.["Full Name"] || "Management Desk",
        TARGET_TYPE: noticeTargetType,
        TARGET_RESIDENTS: noticeTargetType === "Selective" ? selectedTargetResidents.join(", ") : undefined,
        ATTACHMENTS: uploadedUrls.join(",")
      };

      onUpdateNotices([newNotice, ...notices]);
      setNoticeSuccess(true);
      setTimeout(() => {
        setNoticeTitle("");
        setNoticeContent("");
        setNoticeTargetType("All");
        setSelectedTargetResidents([]);
        setTargetSearch("");
        setNoticeAttachments([]);
        setNoticeSuccess(false);
        setShowAddNoticeModal(false);
      }, 1500);
    } catch (err: any) {
      setNoticeUploadError(err.message || "Failed to upload attachments on save.");
    } finally {
      setIsUploadingNotice(false);
    }
  };

  // Handle delete notice
  const handleDeleteNotice = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmType("notice");
  };

  // Handle delete news
  const handleDeleteNews = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmType("news");
  };

  const handleConfirmDeleteNoticeOrNews = () => {
    if (!deleteConfirmId || !deleteConfirmType) return;
    if (deleteConfirmType === "notice") {
      const updated = notices.filter(n => n.ID !== deleteConfirmId);
      onUpdateNotices(updated);
    } else {
      const updated = news.filter(n => n.ID !== deleteConfirmId);
      onUpdateNews(updated);
    }
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
  };

  // Handle new news
  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim() || !newsSummary.trim()) return;

    setIsUploadingNews(true);
    setNewsUploadError("");
    try {
      let finalImgUrl = newsImgUrl.trim();
      if (localNewsFile) {
        if (onUploadFile) {
          finalImgUrl = await onUploadFile(localNewsFile.base64, localNewsFile.name);
        } else {
          finalImgUrl = localNewsFile.base64;
        }
      }

      const newArticle: News = {
        ID: "NW" + Math.floor(1000 + Math.random() * 9000),
        TITLE: newsTitle.trim(),
        SUMMARY: newsSummary.trim(),
        CONTENT: newsContent.trim(),
        DATE: new Date().toISOString().split("T")[0],
        IMAGE_URL: finalImgUrl || "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400",
        HIDDEN: "FALSE"
      };

      onUpdateNews([newArticle, ...news]);
      setNewsSuccess(true);
      setTimeout(() => {
        setNewsTitle("");
        setNewsSummary("");
        setNewsContent("");
        setNewsImgUrl("");
        setLocalNewsFile(null);
        setNewsSuccess(false);
        setShowAddNewsModal(false);
      }, 1500);
    } catch (err: any) {
      setNewsUploadError(err.message || "Failed to upload cover photo on save.");
    } finally {
      setIsUploadingNews(false);
    }
  };



  return (
    <div className="space-y-6">
      
      {/* Upper sub-header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Helpdesk, Notices & News</h1>
          <p className="text-xs text-gray-500">Respond to resident tickets, post urgent bulletins, and manage newsletter articles.</p>
        </div>

        {/* Tab switch controller */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setPanelMode("Complaints")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              panelMode === "Complaints" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500 hover:text-slate-800"
            }`}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Complaints inbox ({complaints.filter(c => c.STATUS !== "Resolved").length})</span>
          </button>
          
          <button
            onClick={() => setPanelMode("Notices")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              panelMode === "Notices" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500 hover:text-slate-800"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Notices ({notices.length})</span>
          </button>

          <button
            onClick={() => setPanelMode("News")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              panelMode === "News" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500 hover:text-slate-800"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News ({news.length})</span>
          </button>
        </div>
      </div>

      {/* COMPLAINTS INBOX SYSTEM */}
      {panelMode === "Complaints" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Filtering cards */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Search Tickets</label>
                <input
                  type="text"
                  placeholder="ID, unit, resident name..."
                  value={complaintsSearch}
                  onChange={(e) => { setComplaintsSearch(e.target.value); setComplaintsPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setComplaintsPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Category</label>
                <select
                  value={complaintsCategory}
                  onChange={(e) => { setComplaintsCategory(e.target.value); setComplaintsPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium"
                >
                  <option value="All">All Categories</option>
                  <option value="Security">Security</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Billing">Billing</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px] text-gray-400 font-bold">
              <span>{filteredComplaints.length} tickets matching filters</span>
              <span>Page {complaintsPage} of {totalComplaintsPages}</span>
            </div>
          </div>

          {/* Table display */}
          <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden">
            {paginatedComplaints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-705 border-b border-slate-200">
                      <th className="p-4 w-20 text-center">Ticket ID</th>
                      <th className="p-4 w-28">Occupant Unit</th>
                      <th className="p-4 w-44">Resident Name</th>
                      <th className="p-4">Issue Description</th>
                      <th className="p-4 w-28">Category</th>
                      <th className="p-4 w-28 text-center">Status</th>
                      <th className="p-4 w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedComplaints.map((c) => (
                      <tr key={c.ID} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-center text-slate-500 font-mono">{c.ID}</td>
                        <td className="p-4 font-bold text-indigo-700 font-mono">{c["OWNER ID"]}</td>
                        <td className="p-4 font-semibold text-slate-800">{c["RESIDENT NAME"]}</td>
                        <td className="p-4 space-y-1">
                           <span className="font-extrabold text-slate-900 block">{c.TITLE}</span>
                          <span className="text-gray-500 block leading-relaxed line-clamp-2">{c.DESCRIPTION}</span>
                          {c.REPLY && (
                            <span className="mt-1 block text-[10.5px] bg-slate-100/70 p-2 border border-slate-200 rounded-lg text-slate-700 italic">
                              <b>Reply given:</b> "{c.REPLY}"
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px]">
                            {c.CATEGORY}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold inline-block leading-none ${
                            c.STATUS === "Resolved" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                            c.STATUS === "In Progress" ? "bg-blue-50 text-blue-800 border border-blue-100" :
                            "bg-amber-50 text-amber-800 border border-amber-100"
                          }`}>
                            {c.STATUS}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setReplyText(c.REPLY || "");
                              setComplaintStatus(c.STATUS);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100/80 rounded-xl font-bold font-sans transition cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Respond</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination footer */}
                {totalComplaintsPages > 1 && (
                  <div className="bg-slate-50/50 border-t border-slate-105 p-3.5 flex items-center justify-between gap-4 text-xs font-sans">
                    <span className="text-slate-500 font-bold">Showing {paginatedComplaints.length} of {filteredComplaints.length} complaints</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setComplaintsPage(prev => Math.max(prev - 1, 1))}
                        disabled={complaintsPage === 1}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-700">{complaintsPage} / {totalComplaintsPages}</span>
                      <button
                        onClick={() => setComplaintsPage(prev => Math.min(prev + 1, totalComplaintsPages))}
                        disabled={complaintsPage === totalComplaintsPages}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold">
                No resident complaints located in this category.
              </div>
            )}
          </div>

          {/* Respond Modal overlay */}
          {selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Respond to Ticket {selectedComplaint.ID}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Raised by unit {selectedComplaint["OWNER ID"]} | {selectedComplaint["RESIDENT NAME"]}</p>
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="p-1 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Inquiry description:</span>
                    <h4 className="font-bold text-slate-805 leading-snug">{selectedComplaint.TITLE}</h4>
                    <p className="text-slate-650 leading-relaxed font-semibold whitespace-pre-wrap">{selectedComplaint.DESCRIPTION}</p>
                    
                    {selectedComplaint.ATTACHMENTS && selectedComplaint.ATTACHMENTS.split(",").filter(Boolean).length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Complaint Evidences/Images:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedComplaint.ATTACHMENTS.split(",").filter(Boolean).map((url, idx) => {
                            const isDoc = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");
                            const cleanUrl = getCleanImageUrl(url);
                            if (isDoc) {
                              return (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block hover:opacity-90 transition shrink-0"
                                >
                                  <AttachmentImageWithFallback url={url} size="w-12 h-12" />
                                </a>
                              );
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewImageUrl(cleanUrl)}
                                className="block hover:opacity-90 transition shrink-0 cursor-pointer focus:outline-none"
                              >
                                <AttachmentImageWithFallback url={url} size="w-12 h-12" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSaveResponse} className="space-y-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Set ticket resolution status</label>
                      <select
                        value={complaintStatus}
                        onChange={(e) => setComplaintStatus(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="Pending">⏳ Pending Approval</option>
                        <option value="In Progress">⚙️ Maintenance In Progress</option>
                        <option value="Resolved">✅ Resolved & Settle Case</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official response text to Resident</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Write a response explaining actions taken... e.g. We have dispatched a technician to inspect unit boiler. Should be fixed today."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedComplaint(null)}
                        className="py-2 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold"
                      >
                        Abort
                      </button>
                      <button
                        type="submit"
                        className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow shadow-indigo-100 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Status & Reply</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTICES PUBLISHER MANAGEMENT */}
      {panelMode === "Notices" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Notices Mode Sub-Navigation Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-72 mb-2">
            <button
              onClick={() => setNoticesSubView("Registry")}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                noticesSubView === "Registry"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Bulletins ({notices.length})
            </button>
            <button
              onClick={() => setNoticesSubView("DuesReminders")}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                noticesSubView === "DuesReminders"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-rose-650 hover:bg-rose-50"
              }`}
            >
              🚨 Reminders ({overdueResidentsCount})
            </button>
          </div>

          {noticesSubView === "Registry" ? (
            <div className="space-y-4">
              {/* Upper control cards with filters and add btn */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Notice Bulletin Registry</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Post estate notices, scheduled alerts, and targeted bulletins securely.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNoticeModal(true)}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow shadow-indigo-150 inline-flex items-center text-xs transition shrink-0 cursor-pointer animate-pulse"
              >
                <Plus className="w-4 h-4" />
                <span>Compose Bulletin</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">Search Bulletins</label>
                <input
                  type="text"
                  placeholder="ID, Title, content or author keyword..."
                  value={noticesSearch}
                  onChange={(e) => { setNoticesSearch(e.target.value); setNoticesPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">Filter Announcement Category</label>
                <select
                  value={noticesCategory}
                  onChange={(e) => { setNoticesCategory(e.target.value); setNoticesPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium text-slate-800"
                >
                  <option value="All">All Categories</option>
                  <option value="Urgent">🚨 Urgent Alerts</option>
                  <option value="Maintenance">🔧 Maintenance Updates</option>
                  <option value="General">📰 General Posts</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-400 font-bold">
              <span>{filteredNotices.length} notices found</span>
              <span>Page {noticesPage} of {totalNoticesPages}</span>
            </div>
          </div>

          {/* Form Modal popup */}
          {showAddNoticeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto w-full h-full">
              <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Megaphone className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                      Compose Notice Bulletin
                    </h3>
                    <p className="text-[10px] text-gray-450 mt-0.5">Publish instructions, warnings, or scheduling details safely.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddNoticeModal(false)}
                    className="p-1 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateNotice} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Headline Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Schedule lift maintenance Block C"
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-505 transition font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Broadcast Category</label>
                    <select
                      value={noticeCategory}
                      onChange={(e) => setNoticeCategory(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition font-bold"
                    >
                      <option value="Urgent">🚨 Urgent Incident Alert</option>
                      <option value="Maintenance">🔧 Scheduled Maintenance</option>
                      <option value="General">📰 General Community Post</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Audience Recipients</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setNoticeTargetType("All")}
                        className={`py-2 px-3 border rounded-xl font-bold text-center transition cursor-pointer text-[11px] ${
                          noticeTargetType === "All"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-55 bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-105"
                        }`}
                      >
                        🌐 All Residents
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoticeTargetType("Selective")}
                        className={`py-2 px-3 border rounded-xl font-bold text-center transition cursor-pointer text-[11px] ${
                          noticeTargetType === "Selective"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-55 bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-105"
                        }`}
                      >
                        🎯 Selective Units
                      </button>
                    </div>

                    {noticeTargetType === "Selective" && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase">
                          <span>Unit Recipients ({selectedTargetResidents.length})</span>
                          <div className="flex gap-1.5 items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTargetResidents(state.residents.map(r => r["OWNER ID"]));
                              }}
                              className="hover:underline text-indigo-600 cursor-pointer font-bold animate-pulse"
                            >
                              Select All
                            </button>
                            <span className="text-gray-350">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTargetResidents([])}
                              className="hover:underline text-rose-600 cursor-pointer font-bold"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {selectedTargetResidents.length > 0 ? (
                          <p className="p-2 bg-white border border-slate-150 rounded-lg text-slate-755 font-bold max-h-12 overflow-y-auto text-[10px] leading-tight select-all">
                            {selectedTargetResidents.join(", ")}
                          </p>
                        ) : (
                          <p className="text-[9.5px] text-amber-705 font-bold bg-amber-50 border border-amber-100 p-2 rounded-lg text-center leading-normal">
                            ⚠️ No recipient housing units checked yet! Toggle checkboxes below.
                          </p>
                        )}

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Filter list by Unit ID / Name..."
                            value={targetSearch}
                            onChange={(e) => setTargetSearch(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-[10.5px] font-medium"
                          />
                        </div>

                        <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                          {state.residents
                            .filter(r => {
                              const query = targetSearch.toLowerCase().trim();
                              if (!query) return true;
                              return (
                                (r["OWNER ID"] || "").toLowerCase().includes(query) ||
                                (r["OWNER NAME"] || "").toLowerCase().includes(query)
                              );
                            })
                            .map(r => {
                              const unitId = r["OWNER ID"];
                              const isSel = selectedTargetResidents.includes(unitId);
                              return (
                                <label
                                  key={unitId}
                                  className={`flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-[10px] font-bold text-slate-750 ${
                                    isSel ? "bg-indigo-50/50 text-indigo-950" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    onChange={() => {
                                      if (isSel) {
                                        setSelectedTargetResidents(prev => prev.filter(id => id !== unitId));
                                      } else {
                                        setSelectedTargetResidents(prev => [...prev, unitId]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-605 focus:ring-indigo-100"
                                  />
                                  <div className="flex justify-between w-full">
                                    <span className="font-extrabold text-slate-905 font-sans">{unitId}</span>
                                    <span className="text-gray-400 font-semibold truncate max-w-[110px]">{r["OWNER NAME"]}</span>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notice Message</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Provide precise details such as timestamps, locations, impact to residents etc."
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-505 transition font-medium leading-relaxed"
                    />
                  </div>

                  {/* Attachment Dropzone */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700 font-sans">Notice Attachments (Images or Documents)</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setNoticeDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setNoticeDragActive(false); }}
                      onDrop={(e) => { e.preventDefault(); setNoticeDragActive(false); if (e.dataTransfer.files) handleNoticeFileChange(e.dataTransfer.files); }}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition text-[11px] ${
                        noticeDragActive ? "border-indigo-600 bg-indigo-50/20" : "border-slate-200 hover:bg-slate-50/40 bg-slate-50/10"
                      }`}
                      onClick={() => document.getElementById("notice-file-input-modal")?.click()}
                    >
                      <input
                        type="file"
                        id="notice-file-input-modal"
                        className="hidden"
                        multiple
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => handleNoticeFileChange(e.target.files)}
                        disabled={isUploadingNotice}
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {isUploadingNotice ? (
                          <Loader2 className="w-5 h-5 text-indigo-650 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="text-slate-655 font-bold block">
                          {isUploadingNotice ? "Uploading document..." : "Click or drag files here to select"}
                        </span>
                        <span className="text-[9px] text-slate-450 block font-semibold">
                          ({noticeAttachments.length} attachments selected)
                        </span>
                      </div>
                    </div>

                    {noticeUploadError && (
                      <p className="text-[10px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100">{noticeUploadError}</p>
                    )}

                    {noticeAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 max-h-16 overflow-y-auto w-full">
                        {noticeAttachments.map((fileObj, idx) => {
                          const isImg = fileObj.base64.startsWith("data:image");
                          return (
                            <div key={idx} className="relative group border border-slate-205 rounded-lg overflow-hidden shrink-0 w-11 h-11 bg-slate-50 flex items-center justify-center">
                              {isImg ? (
                                <img src={fileObj.base64} referrerPolicy="no-referrer" alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="p-1 text-center">
                                  <Paperclip className="w-3.5 h-3.5 mx-auto text-indigo-505" />
                                  <span className="text-[7.5px] truncate max-w-[35px] text-slate-505 block">{fileObj.name || "Doc"}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setNoticeAttachments(prev => prev.filter((_, i) => i !== idx)); }}
                                className="absolute -top-1 -right-1 p-0.5 bg-rose-50 hover:bg-rose-600 border border-slate-205 text-rose-600 hover:text-white rounded-full shadow transition"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {noticeSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center animate-bounce">
                      Notice Broadcasted Successfully!
                    </div>
                  )}

                  <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddNoticeModal(false)}
                      className="py-2 px-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-655 text-xs cursor-pointer block"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploadingNotice}
                      className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow shadow-indigo-100 text-xs cursor-pointer shrink-0"
                    >
                      {isUploadingNotice ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingNotice ? "Broadcasting..." : "Publish Broadcast"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Hidden Composing placeholder container */}
          <div className="hidden bg-white">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-3 border-b border-indigo-100 mb-2">
              <Megaphone className="w-4.5 h-4.5 text-indigo-600" />
              Compose Notice Bulletin
            </h3>
            
            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule lift maintenance Block C"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Category</label>
                <select
                  value={noticeCategory}
                  onChange={(e) => setNoticeCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition font-bold"
                >
                  <option value="Urgent">🚨 Urgent Incident Alert</option>
                  <option value="Maintenance">🔧 scheduled Maintenance</option>
                  <option value="General">📰 General Community Post</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Audience Recipients</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNoticeTargetType("All")}
                    className={`py-2 px-3 border rounded-xl font-bold text-center transition cursor-pointer text-[11px] ${
                      noticeTargetType === "All"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-55 bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    🌐 All Residents
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeTargetType("Selective")}
                    className={`py-2 px-3 border rounded-xl font-bold text-center transition cursor-pointer text-[11px] ${
                      noticeTargetType === "Selective"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-55 bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    🎯 Selective Units
                  </button>
                </div>

                {noticeTargetType === "Selective" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase">
                      <span>Unit Recipients ({selectedTargetResidents.length})</span>
                      <div className="flex gap-1.5 items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTargetResidents(state.residents.map(r => r["OWNER ID"]));
                          }}
                          className="hover:underline text-indigo-600 cursor-pointer"
                        >
                          Select All
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTargetResidents([])}
                          className="hover:underline text-rose-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {selectedTargetResidents.length > 0 ? (
                      <p className="p-2 bg-white border border-slate-150 rounded-lg text-slate-700 font-bold max-h-12 overflow-y-auto text-[10px] leading-tight select-all">
                        {selectedTargetResidents.join(", ")}
                      </p>
                    ) : (
                      <p className="text-[9.5px] text-amber-700 font-bold bg-amber-50 border border-amber-100 p-2 rounded-lg text-center leading-normal">
                        ⚠️ No recipient housing units checked yet! Toggle checkboxes below.
                      </p>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Filter list by Unit ID / Name..."
                        value={targetSearch}
                        onChange={(e) => setTargetSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-[10.5px] font-medium"
                      />
                    </div>

                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {state.residents
                        .filter(r => {
                          const query = targetSearch.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            (r["OWNER ID"] || "").toLowerCase().includes(query) ||
                            (r["OWNER NAME"] || "").toLowerCase().includes(query)
                          );
                        })
                        .map(r => {
                          const unitId = r["OWNER ID"];
                          const isSel = selectedTargetResidents.includes(unitId);
                          return (
                            <label
                              key={unitId}
                              className={`flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-[10px] font-bold text-slate-750 ${
                                isSel ? "bg-indigo-50/50 text-indigo-950" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => {
                                  if (isSel) {
                                    setSelectedTargetResidents(prev => prev.filter(id => id !== unitId));
                                  } else {
                                    setSelectedTargetResidents(prev => [...prev, unitId]);
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-605 focus:ring-indigo-100"
                              />
                              <div className="flex justify-between w-full">
                                <span className="font-extrabold text-slate-900">{unitId}</span>
                                <span className="text-gray-400 font-semibold truncate max-w-[110px]">{r["OWNER NAME"]}</span>
                              </div>
                            </label>
                          );
                        })}
                      {state.residents.length === 0 && (
                        <p className="p-3 text-center text-gray-400 font-bold text-[9px] uppercase">No registered residents found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide precise details such as timestamps, locations, contact info, impact to residents as water outages etc."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium leading-relaxed"
                />
              </div>

              {/* Notice File Attachments Dropzone Box */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Notice Attachments (Images or Documents)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setNoticeDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setNoticeDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); setNoticeDragActive(false); if (e.dataTransfer.files) handleNoticeFileChange(e.dataTransfer.files); }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition text-[11px] ${
                    noticeDragActive ? "border-indigo-600 bg-indigo-50/20" : "border-slate-200 hover:bg-slate-50/40 bg-slate-50/10"
                  }`}
                  onClick={() => document.getElementById("notice-file-input")?.click()}
                >
                  <input
                    type="file"
                    id="notice-file-input"
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleNoticeFileChange(e.target.files)}
                    disabled={isUploadingNotice}
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {isUploadingNotice ? (
                      <Loader2 className="w-5 h-5 text-indigo-650 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-slate-655 font-bold block">
                      {isUploadingNotice ? "Processing document..." : "Click or drag files here to select"}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      PNG, JPG, PDF or Word files up to 5MB. ({noticeAttachments.length} selected)
                    </span>
                  </div>
                </div>

                {noticeUploadError && (
                  <p className="text-[10px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100">{noticeUploadError}</p>
                )}

                {noticeAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {noticeAttachments.map((fileObj, idx) => {
                      const isImg = fileObj.base64.startsWith("data:image");
                      return (
                        <div key={idx} className="relative group border border-slate-205 rounded-lg overflow-hidden shrink-0 w-12 h-12 bg-slate-50 flex items-center justify-center">
                          {isImg ? (
                            <img src={fileObj.base64} referrerPolicy="no-referrer" alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="p-1 text-center">
                              <Paperclip className="w-4 h-4 mx-auto text-indigo-500" />
                              <span className="text-[7.5px] truncate max-w-[40px] text-slate-500 block">{fileObj.name || "Doc"}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setNoticeAttachments(prev => prev.filter((_, i) => i !== idx)); }}
                            className="absolute -top-1 -right-1 p-0.5 bg-rose-50 hover:bg-rose-600 border border-slate-200 text-rose-600 hover:text-white rounded-full shadow transition"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {noticeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center">
                  Notice Broadcasted Successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={isUploadingNotice}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow shadow-indigo-100 transition cursor-pointer"
              >
                {isUploadingNotice ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0" />
                )}
                <span>{isUploadingNotice ? "Uploading & Broadcasting..." : "Publish Announcement"}</span>
              </button>
            </form>
          </div>

          {/* Table list of Notices */}
          <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden">
            {paginatedNotices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-705 border-b border-slate-200 text-[11.5px]">
                      <th className="p-4 w-20 text-center">Notice ID</th>
                      <th className="p-4 w-32">Category & Audience</th>
                      <th className="p-4">Details & Content</th>
                      <th className="p-4 w-44 font-bold">Publisher & Date</th>
                      <th className="p-4 w-24 text-center">Attachments</th>
                      <th className="p-4 w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedNotices.map((n) => (
                      <tr key={n.ID} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-center text-slate-500 font-mono">{n.ID}</td>
                        <td className="p-4 space-y-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold block w-fit ${
                            n.CATEGORY === "Urgent" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                            n.CATEGORY === "Maintenance" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            "bg-slate-50 text-slate-655 border border-slate-200"
                          }`}>
                            {n.CATEGORY}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold border block w-fit ${
                            !n.TARGET_TYPE || n.TARGET_TYPE === "All"
                              ? "bg-slate-100 text-slate-600 border-slate-205"
                              : "bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse"
                          }`}>
                            {!n.TARGET_TYPE || n.TARGET_TYPE === "All"
                              ? "🌐 Public (All)"
                              : `🎯 Targeted (${n.TARGET_RESIDENTS ? n.TARGET_RESIDENTS.split(",").length : 0} units)`}
                          </span>
                        </td>
                        <td className="p-4 space-y-1 leading-normal max-w-sm">
                          <span className="font-extrabold text-slate-900 block text-[12px]">{n.TITLE}</span>
                          <span className="text-slate-650 block break-words whitespace-pre-wrap font-semibold font-sans">{n.CONTENT}</span>
                          {n.TARGET_TYPE === "Selective" && (
                            <span className="block mt-1 bg-slate-50 p-1.5 border border-slate-150 rounded text-[9.5px] font-mono break-all font-bold text-indigo-600">
                              <b>Targets:</b> {n.TARGET_RESIDENTS}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-800 space-y-0.5">
                          <span className="block">{n.CREATED_BY || "Operator staff"}</span>
                          <span className="block text-[10px] font-mono text-gray-400 font-bold">{n.DATE}</span>
                        </td>
                        <td className="p-4 text-center">
                          {n.ATTACHMENTS && n.ATTACHMENTS.split(",").filter(Boolean).length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1 max-w-[100px] mx-auto">
                              {n.ATTACHMENTS.split(",").filter(Boolean).map((url, idx) => {
                                const isDoc = url.match(/\.(pdf|docx?|xlsx?|zip|rar|csv)$/i) || url.startsWith("data:application/pdf");
                                const cleanUrl = getCleanImageUrl(url);
                                if (isDoc) {
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block hover:opacity-90 transition shrink-0"
                                    >
                                      <AttachmentImageWithFallback url={url} size="w-7 h-7" />
                                    </a>
                                  );
                                }
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewImageUrl(cleanUrl)}
                                    className="block hover:opacity-90 transition shrink-0 cursor-pointer focus:outline-none"
                                  >
                                    <AttachmentImageWithFallback url={url} size="w-7 h-7" />
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-bold font-sans">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(n.ID)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition inline-flex items-center gap-0.5 text-[10px] font-extrabold border border-transparent hover:border-rose-200"
                            title="Withdraw Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalNoticesPages > 1 && (
                  <div className="bg-slate-50/50 border-t border-slate-105 p-3.5 flex items-center justify-between gap-4 text-xs font-sans">
                    <span className="text-slate-500 font-bold">Showing {paginatedNotices.length} of {filteredNotices.length} bulletins</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNoticesPage(prev => Math.max(prev - 1, 1))}
                        disabled={noticesPage === 1}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-700">{noticesPage} / {totalNoticesPages}</span>
                      <button
                        type="button"
                        onClick={() => setNoticesPage(prev => Math.min(prev + 1, totalNoticesPages))}
                        disabled={noticesPage === totalNoticesPages}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold">
                No active circular announcements match current search/filter.
              </div>
            )}
          </div>
          </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Overdue Reminders Panel */}
              <div className="bg-white rounded-2xl border border-slate-205 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Dues Outstanding & Notice Reminders Manager</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Track residents with outstanding dues. Pre-compose customized reminder circulars targeted only to individual units. These notices will appear exclusively in their portal inbox.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-rose-50/20 p-4 border border-rose-100 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider block">Overdue Units</span>
                    <span className="text-xl font-extrabold text-rose-650 font-mono">{overdueResidentsCount} Units</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Monthly Security Rate</span>
                    <span className="text-sm font-extrabold text-slate-850 font-mono">
                      {state.settings.currencySymbol || "RM"} {parseFloat(state.settings.monthlySecurityFeeRate) || 50} / month
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Annual Membership Rate</span>
                    <span className="text-sm font-extrabold text-slate-850 font-mono">
                      {state.settings.currencySymbol || "RM"} {parseFloat(state.settings.annualMembershipFeeRate) || 120} / year
                    </span>
                  </div>
                </div>

                {overdueResidentsList.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-55 bg-slate-100/50 font-semibold text-slate-705 border-b border-slate-200">
                          <th className="p-3">Unit ID</th>
                          <th className="p-3">Resident Owner</th>
                          <th className="p-3">Monthly Sec. (RM{rateMonthly}/mo)</th>
                          <th className="p-3">Annual Mem. (RM{rateAnnual})</th>
                          <th className="p-3">Total Outstanding</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overdueResidentsList.map((item) => {
                          const r = item.resident;
                          const d = item.details;
                          return (
                            <tr key={r["OWNER ID"]} className="hover:bg-slate-50/50 transition font-medium">
                              <td className="p-3 font-mono font-bold text-slate-700">{r["OWNER ID"]}</td>
                              <td className="p-3">
                                <span className="font-extrabold text-slate-850 block">{r["OWNER NAME"]}</span>
                                <span className="text-[10px] text-gray-400 font-semibold block">{r.EMAIL || "No email registered"}</span>
                              </td>
                              <td className="p-3">
                                {d.monthlyDue > 0 ? (
                                  <div className="space-y-1">
                                    <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-100">
                                      {state.settings.currencySymbol || "RM"} {d.monthlyDue.toFixed(2)}
                                    </span>
                                    <div className="flex flex-wrap gap-1 max-w-xs pt-1">
                                      {d.unpaidMonthsList.map((m) => (
                                        <span key={m} className="px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[8px] font-mono font-bold">
                                          {m.slice(0, 3)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
                                    ✓ Paid Up
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                {d.annualDue > 0 ? (
                                  <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-100">
                                    {state.settings.currencySymbol || "RM"} {d.annualDue.toFixed(2)} (Due)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
                                    ✓ Paid Up
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-extrabold text-rose-650 font-mono text-sm">
                                {state.settings.currencySymbol || "RM"} {d.total.toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleInitiateReminder(item)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-[10.5px] font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                                >
                                  <Megaphone className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Send Reminder Notice</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400 bg-slate-50 border border-slate-150 rounded-2xl font-bold">
                    Amazing! No outstanding resident accounts recorded for 2026.
                  </div>
                )}
              </div>

              {/* Composer Dialog Modal */}
              {remindingResident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto w-full h-full">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full scale-100 transition animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                      <div>
                        <h4 className="font-extrabold text-slate-850 text-sm">Compose Targeted Overdue Circular</h4>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase font-mono mt-0.5">Selective broadcast dedicated only to Unit {remindingResident.resident["OWNER ID"]}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemindingResident(null)}
                        className="text-gray-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer animate-none"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {reminderSuccess ? (
                      <div className="p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                          <Check className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm text-slate-800">{reminderSuccess}</p>
                        <p className="text-[10.5px] text-gray-400 font-semibold">Broadcasting targeted alert notice to resident portal dashboard inbox...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Target Unit Recipient</label>
                          <div className="p-2.5 bg-rose-50 text-rose-800 font-bold border border-rose-150 rounded-xl block font-mono text-[10.5px]">
                            Unit ID: {remindingResident.resident["OWNER ID"]} • Owner: {remindingResident.resident["OWNER NAME"]} • Outstanding Balance: {state.settings.currencySymbol || "RM"} {remindingResident.details.total.toFixed(2)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-705">Bulletin/Notice Title</label>
                          <input
                            type="text"
                            value={reminderTitle}
                            onChange={(e) => setReminderTitle(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-150 transition font-bold text-slate-800"
                            placeholder="Enter notice title..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-705">Reminder Content Body</label>
                          <textarea
                            rows={8}
                            value={reminderContent}
                            onChange={(e) => setReminderContent(e.target.value)}
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-150 transition font-mono leading-relaxed"
                            placeholder="Type customized circular content..."
                          />
                        </div>

                        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setRemindingResident(null)}
                            className="py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150 rounded-xl font-bold font-mono transition cursor-pointer shrink-0"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDispatchReminder}
                            className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm transition cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Details</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* COMMUNITY NEWS MANAGEMENT */}
      {panelMode === "News" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Upper control cards with filters and add btn */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">News Articles Registry</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Post and manage community newsletter highlights and articles.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNewsModal(true)}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow shadow-indigo-150 inline-flex items-center text-xs transition shrink-0 cursor-pointer animate-pulse"
              >
                <Plus className="w-4 h-4" />
                <span>Compose Article</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-705 mb-1">Search Newsletter</label>
                <input
                  type="text"
                  placeholder="ID, Title, summary or paragraph keyword..."
                  value={newsSearch}
                  onChange={(e) => { setNewsSearch(e.target.value); setNewsPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">Filter Resident Visibility</label>
                <select
                  value={newsVisibility}
                  onChange={(e) => { setNewsVisibility(e.target.value); setNewsPage(1); }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium text-slate-800"
                >
                  <option value="All">All Articles</option>
                  <option value="Visible">👁️ Visible to Residents</option>
                  <option value="Hidden">🚫 Hidden from Residents</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-400 font-bold">
              <span>{filteredNews.length} articles found</span>
              <span>Page {newsPage} of {totalNewsPages}</span>
            </div>
          </div>

          {/* Form Modal popup */}
          {showAddNewsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto w-full h-full">
              <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 text-gray-900 text-xs">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 font-sans">
                      <Newspaper className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                      Compose Newsletter Article
                    </h3>
                    <p className="text-[10px] text-gray-450 mt-0.5">Publish community milestones, highlights or announcements safely.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddNewsModal(false)}
                    className="p-1 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateNews} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">News Headline Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eco-garden launch celebrative"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Short Summary (Marquee summary)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Over 50 residents gathered to celebrate our organic garden."
                      value={newsSummary}
                      onChange={(e) => setNewsSummary(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-700 font-sans">Image Illustration URL (or Cloud Upload)</label>
                      <button
                        type="button"
                        onClick={() => document.getElementById("news-image-input-modal")?.click()}
                        className="text-[10px] font-bold text-indigo-650 flex items-center gap-1 cursor-pointer hover:underline bg-transparent border-none outline-none"
                        disabled={isUploadingNews}
                      >
                        {isUploadingNews ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin animate-normal" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>Upload File</span>
                          </>
                        )}
                      </button>
                      <input
                        type="file"
                        id="news-image-input-modal"
                        className="hidden"
                        accept="image/*"
                        onChange={handleNewsUploadChange}
                      />
                    </div>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Paste URL or click Upload File above to upload cover photo."
                        value={newsImgUrl}
                        onChange={(e) => setNewsImgUrl(e.target.value)}
                        className="w-full pl-9 pr-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-550 transition font-medium text-[10.5px] text-slate-900"
                      />
                    </div>
                    {newsUploadError && (
                      <p className="text-[10px] font-bold text-rose-500 bg-rose-50 p-1 px-2 rounded-lg border border-rose-100 mt-1">{newsUploadError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Article Newsletter Narrative</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write the full news story explaining dates, resident views, and any congratulatory notes..."
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium leading-relaxed text-slate-900"
                    />
                  </div>

                  {newsSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center animate-bounce">
                      News Article Published successfully!
                    </div>
                  )}

                  <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddNewsModal(false)}
                      className="py-2 px-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-655 text-xs cursor-pointer block"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploadingNews}
                      className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow shadow-indigo-100 text-xs cursor-pointer shrink-0"
                    >
                      {isUploadingNews ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingNews ? "Publishing..." : "Publish Article"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Hidden Composing elements container block */}
          <div className="hidden bg-white">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-3 border-b border-indigo-100 mb-2">
              <Newspaper className="w-4.5 h-4.5 text-indigo-600" />
              Compose Newsletter Article
            </h3>

            <form onSubmit={handleCreateNews} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">News Headline Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eco-garden launch celebrative"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Summary (Marquee summary)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Over 50 residents gathered to celebrate our organic garden."
                  value={newsSummary}
                  onChange={(e) => setNewsSummary(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">Image Illustration URL (or Cloud Upload)</label>
                  <button
                    type="button"
                    onClick={() => document.getElementById("news-image-input")?.click()}
                    className="text-[10px] font-bold text-indigo-650 flex items-center gap-1 cursor-pointer hover:underline bg-transparent border-none outline-none"
                    disabled={isUploadingNews}
                  >
                    {isUploadingNews ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>
                  <input
                    type="file"
                    id="news-image-input"
                    className="hidden"
                    accept="image/*"
                    onChange={handleNewsUploadChange}
                  />
                </div>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Paste URL or click Upload File above to upload cover photo."
                    value={newsImgUrl}
                    onChange={(e) => setNewsImgUrl(e.target.value)}
                    className="w-full pl-9 pr-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-550 transition font-medium text-[10.5px]"
                  />
                </div>
                {newsUploadError && (
                  <p className="text-[10px] font-bold text-rose-500 bg-rose-50 p-1 px-2 rounded-lg border border-rose-100 mt-1">{newsUploadError}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Article Newsletter Narrative</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full news story explaining dates, resident views, and any congratulatory notes..."
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition font-medium leading-relaxed"
                />
              </div>

              {newsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center">
                  News Article Published successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={isUploadingNews}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow shadow-indigo-100 transition cursor-pointer"
              >
                {isUploadingNews ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0" />
                )}
                <span>{isUploadingNews ? "Uploading Cover & Publishing..." : "Publish Newsletter"}</span>
              </button>
            </form>
          </div>

          {/* Table list of News Articles */}
          <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden">
            {paginatedNews.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-705 border-b border-slate-200 text-[11.5px]">
                      <th className="p-4 w-20 text-center">News ID</th>
                      <th className="p-4 w-24 text-center">Cover Photo</th>
                      <th className="p-4 w-36">Resident Visibility</th>
                      <th className="p-4">Article Content & Narrative</th>
                      <th className="p-4 w-32 font-bold">Published Date</th>
                      <th className="p-4 w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedNews.map((item) => {
                      const isHidden = item.HIDDEN === true || item.HIDDEN === "TRUE" || item.HIDDEN === "true";
                      return (
                        <tr key={item.ID} className="hover:bg-slate-50/80 transition animate-in fade-in duration-100">
                          <td className="p-4 font-bold text-center text-slate-500 font-mono">{item.ID}</td>
                          <td className="p-4 text-center">
                            {item.IMAGE_URL ? (
                              <div className="w-11 h-11 mx-auto rounded-xl overflow-hidden border border-slate-250 shadow-sm shrink-0 bg-slate-50">
                                <img
                                  src={item.IMAGE_URL}
                                  referrerPolicy="no-referrer"
                                  alt="cover"
                                  className="w-full h-full object-cover animate-duration-300 animate-in fade-in"
                                />
                              </div>
                            ) : (
                              <div className="w-11 h-11 mx-auto rounded-xl border border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-350">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleToggleNewsVisibility(item)}
                              className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${
                                !isHidden
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                              title={!isHidden ? "Hide from Resident App" : "Unhide for Resident App"}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                              <span>{!isHidden ? "👁️ Published" : "🚫 Hidden"}</span>
                            </button>
                            <p className="text-[9px] text-gray-400 mt-1 font-semibold">Click badge to toggle</p>
                          </td>
                          <td className="p-4 space-y-1.5 leading-normal max-w-sm">
                            <span className="font-extrabold text-slate-900 block text-[12.5px] font-sans">{item.TITLE}</span>
                            <span className="text-slate-850 block font-bold text-[11px] bg-slate-50 p-1.5 px-2 rounded-lg border border-slate-150 leading-snug">{item.SUMMARY}</span>
                            <span className="text-slate-600 block text-[10.5px] break-words whitespace-pre-wrap leading-relaxed font-sans font-medium">{item.CONTENT}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-500 font-mono text-[10.5px]">{item.DATE}</td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteNews(item.ID)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition inline-flex items-center gap-0.5 text-[10.5px] font-extrabold border border-transparent hover:border-rose-200"
                              title="Archive Article"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Archive</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalNewsPages > 1 && (
                  <div className="bg-slate-50/50 border-t border-slate-105 p-3.5 flex items-center justify-between gap-4 text-xs font-sans">
                    <span className="text-slate-500 font-bold">Showing {paginatedNews.length} of {filteredNews.length} articles</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewsPage(prev => Math.max(prev - 1, 1))}
                        disabled={newsPage === 1}
                        className="px-2.5 py-1.5 bg-white border border-slate-205 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-700">{newsPage} / {totalNewsPages}</span>
                      <button
                        type="button"
                        onClick={() => setNewsPage(prev => Math.min(prev + 1, totalNewsPages))}
                        disabled={newsPage === totalNewsPages}
                        className="px-2.5 py-1.5 bg-white border border-slate-205 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold">
                No newsletters filed matching current search filters.
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Custom Non-blocking Notice/News Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div id="delete-notice-news-confirm-overlay" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Delete {deleteConfirmType === "notice" ? "Notice Bulletin" : "News Article"}?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Are you sure you want to delete/withdraw system post <span className="font-bold text-slate-800">{deleteConfirmId}</span>? This decision is irreversible.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmType(null);
                }}
                className="flex-1 py-1.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNoticeOrNews}
                className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
