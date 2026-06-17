import React, { useState } from "react";
import { DatabaseState, Resident, User } from "../types";
import { formatPhoneNumber } from "../utils/phoneFormatter";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Contact,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  UploadCloud,
  Eye,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Files,
  Megaphone
} from "lucide-react";

interface ResidentsTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onAddResident: (newResident: Resident) => Promise<any>;
  onUpdateResident: (ownerId: string, updatedResident: Resident) => Promise<any>;
  onDeleteResident: (ownerId: string) => Promise<any>;
  onUploadFile?: (base64Data: string, fileName: string) => Promise<string>;
  onTriggerReminder?: (ownerId: string) => void;
}

export default function ResidentsTab({
  state,
  currentUser,
  onAddResident,
  onUpdateResident,
  onDeleteResident,
  onUploadFile,
  onTriggerReminder
}: ResidentsTabProps) {
  const { residents, payments } = state;
  const currency = state.settings.currencySymbol || "RM";

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [houseStatusFilter, setHouseStatusFilter] = useState("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editResident, setEditResident] = useState<Resident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Inputs
  const [ownerId, setOwnerId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [houseStatus, setHouseStatus] = useState<"Occupied" | "Vacant" | "Rented" | "Inactive">("Occupied");
  const [email, setEmail] = useState("");
  const [cards, setCards] = useState<string[]>(Array(10).fill(""));
  const [remark, setRemark] = useState("");

  // Tenant / Renter Fields State
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantAgreementName, setTenantAgreementName] = useState("");
  const [tenantAgreementUrl, setTenantAgreementUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingAgreement, setIsUploadingAgreement] = useState(false);

  // Row Expansion & Document Preview
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{name: string, url: string} | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processAgreementFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Only PDF copies are supported for Tenancy Agreements.");
      return;
    }
    const reader = new FileReader();
    setIsUploadingAgreement(true);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        if (onUploadFile) {
          const finalUrl = await onUploadFile(base64Data, file.name);
          setTenantAgreementName(file.name);
          setTenantAgreementUrl(finalUrl);
        } else {
          setTenantAgreementName(file.name);
          setTenantAgreementUrl(base64Data);
        }
      } catch (err: any) {
        console.error("Failed to upload agreement:", err);
        alert("Failed to upload file to Google Drive. Check connection.");
      } finally {
        setIsUploadingAgreement(false);
      }
    };
    reader.onerror = () => {
      alert("Failed to read agreement copy.");
      setIsUploadingAgreement(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAgreementFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAgreementFile(file);
  };

  const handleShowAddModal = () => {
    setEditResident(null);
    setOwnerId(`R${100 + residents.length + 1}`); // Simple autoincrement ID
    setOwnerName("");
    setPhone1("");
    setPhone2("");
    setHouseStatus("Occupied");
    setEmail("");
    setCards(Array(10).fill(""));
    setRemark("");
    setTenantName("");
    setTenantPhone("");
    setTenantAgreementName("");
    setTenantAgreementUrl("");
    setShowAddModal(true);
  };

  const handleShowEditModal = (res: Resident) => {
    setEditResident(res);
    setOwnerId(res["OWNER ID"]);
    setOwnerName(res["OWNER NAME"]);
    setPhone1(res["PHONE 1"]);
    setPhone2(res["PHONE 2"] || "");
    setHouseStatus(res["HOUSE STATUS"]);
    setEmail(res.EMAIL);
    setCards([
      res["CARD 1"] !== undefined && res["CARD 1"] !== null ? String(res["CARD 1"]) : "",
      res["CARD 2"] !== undefined && res["CARD 2"] !== null ? String(res["CARD 2"]) : "",
      res["CARD 3"] !== undefined && res["CARD 3"] !== null ? String(res["CARD 3"]) : "",
      res["CARD 4"] !== undefined && res["CARD 4"] !== null ? String(res["CARD 4"]) : "",
      res["CARD 5"] !== undefined && res["CARD 5"] !== null ? String(res["CARD 5"]) : "",
      res["CARD 6"] !== undefined && res["CARD 6"] !== null ? String(res["CARD 6"]) : "",
      res["CARD 7"] !== undefined && res["CARD 7"] !== null ? String(res["CARD 7"]) : "",
      res["CARD 8"] !== undefined && res["CARD 8"] !== null ? String(res["CARD 8"]) : "",
      res["CARD 9"] !== undefined && res["CARD 9"] !== null ? String(res["CARD 9"]) : "",
      res["CARD 10"] !== undefined && res["CARD 10"] !== null ? String(res["CARD 10"]) : "",
    ]);
    setRemark(res.REMARK || "");
    setTenantName(res.TENANT_NAME || "");
    setTenantPhone(res.TENANT_PHONE || "");
    setTenantAgreementName(res.TENANT_AGREEMENT_NAME || "");
    setTenantAgreementUrl(res.TENANT_AGREEMENT_URL || "");
    setShowAddModal(true);
  };

  const handleDelete = (ownerIdVal: string) => {
    setDeleteConfirmId(ownerIdVal);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    try {
      await onDeleteResident(deleteConfirmId);
      setShowAddModal(false);
      setEditResident(null);
    } catch (err) {
      console.error("Delete failed.", err);
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const defaultCountry = state.settings.phoneCountryCode || "+60";
    const formattedPhone1 = formatPhoneNumber(phone1, defaultCountry);
    const formattedPhone2 = phone2 ? formatPhoneNumber(phone2, defaultCountry) : "";
    
    // Format tenant phone if entered or exists
    const formattedTenantPhone = tenantPhone ? formatPhoneNumber(tenantPhone, defaultCountry) : "";

    const residentData: Resident = {
      "OWNER ID": ownerId,
      "OWNER NAME": ownerName,
      "PHONE 1": formattedPhone1,
      "PHONE 2": formattedPhone2,
      "HOUSE STATUS": houseStatus,
      EMAIL: email,
      "CARD 1": cards[0] || "",
      "CARD 2": cards[1] || "",
      "CARD 3": cards[2] || "",
      "CARD 4": cards[3] || "",
      "CARD 5": cards[4] || "",
      "CARD 6": cards[5] || "",
      "CARD 7": cards[6] || "",
      "CARD 8": cards[7] || "",
      "CARD 9": cards[8] || "",
      "CARD 10": cards[9] || "",
      REMARK: remark,
      "LAST UPDATE": new Date().toISOString(),
      TENANT_NAME: tenantName,
      TENANT_PHONE: formattedTenantPhone,
      TENANT_AGREEMENT_NAME: tenantAgreementName,
      TENANT_AGREEMENT_URL: tenantAgreementUrl
    };

    try {
      if (editResident) {
        await onUpdateResident(editResident["OWNER ID"], residentData);
      } else {
        await onAddResident(residentData);
      }
      setShowAddModal(false);
    } catch (err) {
      alert("Error saving resident. Check Sheet config.");
    }

    setIsSubmitting(false);
  };

  // Perform Filters and Sorting (recently updated first)
  const filteredResidents = React.useMemo(() => {
    const list = residents.filter((r) => {
      const searchString = `${r["OWNER ID"]} ${r["OWNER NAME"]} ${r.EMAIL} ${r["PHONE 1"]} ${r.TENANT_NAME || ""} ${r.TENANT_PHONE || ""}`.toLowerCase();
      const rCards = [
        r["CARD 1"], r["CARD 2"], r["CARD 3"], r["CARD 4"], r["CARD 5"],
        r["CARD 6"], r["CARD 7"], r["CARD 8"], r["CARD 9"], r["CARD 10"]
      ].filter(Boolean).join(" ");
      const matchesSearch = 
        searchString.includes(searchTerm.toLowerCase()) || 
        rCards.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = houseStatusFilter ? r["HOUSE STATUS"] === houseStatusFilter : true;
      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      const timeB = b["LAST UPDATE"] ? new Date(b["LAST UPDATE"]).getTime() : 0;
      const timeA = a["LAST UPDATE"] ? new Date(a["LAST UPDATE"]).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return b["OWNER ID"].localeCompare(a["OWNER ID"]);
    });

    return list;
  }, [residents, searchTerm, houseStatusFilter]);

  // Pagination Math
  const totalItems = filteredResidents.length;
  const pageSize = 10;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const displayPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (displayPage - 1) * pageSize;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + pageSize);

  // Calculate dynamic due status for residents:
  // - Current Month is May 2026.
  // - Monthly Security Fee is RM50.
  // - Annual Membership Fee is RM120.
  const getResidentDueRecord = (rOwnerId: string, hStatus: string) => {
    if (hStatus === "Vacant") {
      return { monthlyDue: 0, annualDue: 0, paidMonths: [], hasPaidAnnual: true, summary: "Vacant (No fees)" };
    }

    const resPayments = payments.filter((p) => p["OWNER ID"] === rOwnerId);
    
    // Find security fee payments in 2026 (counting quantity)
    const securityPaymentsCount = resPayments
      .filter((p) => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);

    // Standard year up to June has 6 months (Jan, Feb, Mar, Apr, May, Jun).
    // Let's check how many monthly security payments they have in 2026:
    // If they have 6 payments, they are paid up. If 5, they are due for 1 month, etc.
    const expectedMonths = 6; // Jan, Feb, Mar, Apr, May, Jun
    const monthlyDueVal = Math.max(0, expectedMonths - securityPaymentsCount) * (parseFloat(state.settings.monthlySecurityFeeRate) || 50);

    // Annual Membership Fee (counting quantity)
    const hasPaidAnnualVal = resPayments
      .filter((p) => p.PRODUCT === "Annual Membership Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0) >= 1;
    const annualDueVal = hasPaidAnnualVal ? 0 : (parseFloat(state.settings.annualMembershipFeeRate) || 120);

    return {
      monthlyDue: monthlyDueVal,
      annualDue: annualDueVal,
      securityPaymentsCount,
      hasPaidAnnual: hasPaidAnnualVal,
      summary: monthlyDueVal === 0 && annualDueVal === 0 ? "Paid In Full" : "Pending Dues"
    };
  };

  // Detailed 2026 Monthly Breakdown for any resident to match Notices/Portal styles
  const getResidentDueBreakdown = (rOwnerId: string, hStatus: string) => {
    const rateMonthly = parseFloat(state.settings.monthlySecurityFeeRate) || 50;
    const rateAnnual = parseFloat(state.settings.annualMembershipFeeRate) || 120;
    const currentMonthNum = 6; // Use 6 (up to June elapsed) to include June as elapsed/due
    
    if (hStatus === "Vacant") {
      return { 
        monthlyDue: 0, 
        annualDue: 0, 
        total: 0, 
        securityPaymentsCount: 0, 
        hasPaidAnnual: true, 
        monthlyBreakdown: [] 
      };
    }

    const resPayments = payments.filter((p) => p["OWNER ID"] === rOwnerId);
    
    const securityPaymentsCount = resPayments
      .filter((p) => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);

    const hasPaidAnnual = resPayments
      .filter((p) => p.PRODUCT === "Annual Membership Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
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
      total: monthlyDueVal + annualDueVal,
      securityPaymentsCount,
      hasPaidAnnual,
      monthlyBreakdown
    };
  };

  return (
    <div className="space-y-6" id="residents-tab-view">
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Occupant Directory</h2>
          <p className="text-xs text-slate-500">Track house occupancy, registered RFID card IDs, and outstanding dues</p>
        </div>
        <button
          id="trigger-add-resident-modal"
          onClick={handleShowAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Resident
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">All Registered Occupants</span>
          <span className="text-2xl font-bold text-slate-850 mt-1 block">{residents.length}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Occupied Units</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {residents.filter((r) => r["HOUSE STATUS"] === "Occupied" || r["HOUSE STATUS"] === "Rented").length}
          </span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Vacant properties</span>
          <span className="text-2xl font-semibold text-slate-500 mt-1 block">
            {residents.filter((r) => r["HOUSE STATUS"] === "Vacant").length}
          </span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding May deficit</span>
          <span className="text-2xl font-bold text-rose-500 mt-1 block">
            {residents.filter((r) => getResidentDueRecord(r["OWNER ID"], r["HOUSE STATUS"]).monthlyDue > 0).length} units
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Search header */}
        <div className="p-4 bg-slate-50/50 border-b border-gray-150 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              id="search-residents"
              type="text"
              placeholder="Search resident name, owner id, email, cards..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 font-sans transition"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-600">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-house-status"
              value={houseStatusFilter}
              onChange={(e) => {
                setHouseStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none outline-none text-xs"
            >
              <option value="">All Occupancy</option>
              <option value="Occupied">Occupied</option>
              <option value="Rented">Rented</option>
              <option value="Vacant">Vacant</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="p-4 font-semibold text-[10px]">Owner ID</th>
                <th className="p-4 font-semibold text-[10px]">Owner Full Name</th>
                <th className="p-4 font-semibold text-[10px]">Contact Info</th>
                <th className="p-4 font-semibold text-[10px]">Status</th>
                <th className="p-4 font-semibold text-[10px]">Registered RFID cards</th>
                <th className="p-4 font-semibold text-[10px]">Outstanding Due</th>
                <th className="p-4 font-semibold text-[10px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedResidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No occupant records matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((r) => {
                  const dues = getResidentDueRecord(r["OWNER ID"], r["HOUSE STATUS"]);
                  const totalDuesVal = dues.monthlyDue + dues.annualDue;
                  const isExpanded = expandedRowId === r["OWNER ID"];

                  return (
                    <React.Fragment key={r["OWNER ID"]}>
                      <tr className={`hover:bg-slate-50/50 transition duration-155 ${isExpanded ? "bg-indigo-50/15" : ""}`}>
                        <td className="p-4 font-mono font-bold text-gray-900">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : r["OWNER ID"])}
                            className="hover:underline text-indigo-600 font-bold text-left cursor-pointer"
                          >
                            {r["OWNER ID"]}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{r["OWNER NAME"]}</p>
                              {r.REMARK && <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate font-medium">{r.REMARK}</p>}
                              {r["HOUSE STATUS"] === "Rented" && r.TENANT_NAME && (
                                <p className="text-[10px] text-indigo-600 mt-1 font-semibold flex items-center gap-1">
                                  <Contact className="w-3 h-3" />
                                  <span>Tenant: {r.TENANT_NAME}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 space-y-1 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{r["PHONE 1"]}</span>
                          </div>
                          {r.EMAIL && (
                            <div className="flex items-center gap-1 font-mono text-[10.5px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{r.EMAIL}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r["HOUSE STATUS"] === "Occupied"
                              ? "bg-slate-100 text-slate-850 border border-slate-250"
                              : r["HOUSE STATUS"] === "Rented"
                              ? "bg-indigo-50 text-indigo-800 border border-indigo-100"
                              : r["HOUSE STATUS"] === "Vacant"
                              ? "bg-slate-50 text-slate-500 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {r["HOUSE STATUS"]}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-1 max-w-[210px]">
                            {(() => {
                              const filledCards = [
                                r["CARD 1"], r["CARD 2"], r["CARD 3"], r["CARD 4"], r["CARD 5"],
                                r["CARD 6"], r["CARD 7"], r["CARD 8"], r["CARD 9"], r["CARD 10"]
                              ].map(c => (c !== undefined && c !== null ? String(c) : "").trim()).filter(Boolean);

                              if (filledCards.length === 0) {
                                return <span className="text-slate-400 text-[10px] font-mono">No Cards</span>;
                              }

                              if (filledCards.length <= 2) {
                                return filledCards.map((c, i) => (
                                  <span key={i} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 font-mono text-slate-650">
                                    {c}
                                  </span>
                                ));
                              }

                              return (
                                <>
                                  {filledCards.slice(0, 2).map((c, i) => (
                                    <span key={i} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 font-mono text-slate-650">
                                      {c}
                                    </span>
                                  ))}
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-150/50 font-mono" title={filledCards.slice(2).join(", ")}>
                                    +{filledCards.length - 2}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="p-4">
                          {totalDuesVal === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Paid Up In Full
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                {currency} {(Number(totalDuesVal) || 0).toFixed(2)} Due
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1 md:gap-2">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : r["OWNER ID"])}
                              title={isExpanded ? "Collapse Details" : "View Details & Tenant SLA"}
                              className={`p-1.5 rounded-lg cursor-pointer transition ${
                                isExpanded ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                              }`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                             <button
                              onClick={() => handleShowEditModal(r)}
                              title="Edit Occupant details"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Panel containing renter/tenant agreements */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-indigo-100 bg-slate-50/40">
                            <div className="p-5 text-xs text-slate-700 animate-in slide-in-from-top-1 duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                
                                {/* Col 1: Property Ownership profile */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">House Proprietor Profile</span>
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-[9px] text-slate-400 block uppercase font-mono">Owner Legal Name</label>
                                        <span className="font-semibold text-slate-800 text-xs">{r["OWNER NAME"]}</span>
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-slate-400 block uppercase font-mono">Primary Contact</label>
                                        <a href={`tel:${r["PHONE 1"]}`} className="font-medium text-emerald-600 hover:underline">{r["PHONE 1"]}</a>
                                      </div>
                                      {r["PHONE 2"] && (
                                        <div>
                                          <label className="text-[9px] text-slate-400 block uppercase font-mono">Emergency Alt Phone</label>
                                          <a href={`tel:${r["PHONE 2"]}`} className="font-medium text-slate-700 hover:underline">{r["PHONE 2"]}</a>
                                        </div>
                                      )}
                                      <div>
                                        <label className="text-[9px] text-slate-400 block uppercase font-mono">Email Address</label>
                                        <span className="font-medium text-slate-600 font-mono break-all">{r.EMAIL || "No email registered"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                                    Last synced trace: <b className="font-semibold text-slate-600">{r["LAST UPDATE"] ? new Date(r["LAST UPDATE"]).toLocaleDateString() : "Historical"}</b>
                                  </div>
                                </div>

                                {/* Col 2: Active Renter & Tenant Info & Agreement */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold text-indigo-500 block uppercase tracking-wider mb-2.5 pb-1 border-b border-indigo-100">
                                      {r["HOUSE STATUS"] === "Rented" ? "Active Renter / Tenant Info" : "Tenant Records"}
                                    </span>
                                    
                                    {r.TENANT_NAME ? (
                                      <div className="space-y-2.5">
                                        <div>
                                          <label className="text-[9px] text-slate-400 block uppercase font-mono">Tenant Occupant Name</label>
                                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {r.TENANT_NAME}
                                          </span>
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 block uppercase font-mono">Tenant Contact Number</label>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <a href={`tel:${r.TENANT_PHONE}`} className="font-bold text-indigo-600 hover:underline text-xs">{r.TENANT_PHONE}</a>
                                            <a 
                                              href={`https://wa.me/${String(r.TENANT_PHONE).replace(/[^0-9]/g, "")}`} 
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[9.5px] hover:bg-emerald-100 transition"
                                            >
                                              WhatsApp
                                            </a>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 block uppercase font-mono">Unit Tenancy Covenants</label>
                                          <span className="text-[10.5px] text-slate-600 italic block mt-0.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200/50">
                                            {r.REMARK && r.REMARK.toLowerCase().includes("tenant") ? r.REMARK : "Standard RMUA tenancy rules applied. Outstanding bills charged directly to registered proprietor as per HOA rules."}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-4 text-center text-slate-400">
                                        <Contact className="w-7 h-7 text-slate-350 bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-2" />
                                        <p className="font-bold text-[10px] text-slate-500">No Renter Info Assigned</p>
                                        <p className="text-[9px] mt-0.5 max-w-[170px] text-slate-400">To assign renter info, set status as "Rented" and enter details via "Edit Info".</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Merged Tenant Agreement Copy inside Active Renter/Tenant Info */}
                                  <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[9px] text-slate-400 block uppercase font-mono">Tenant Agreement Copy</label>
                                      {r.TENANT_AGREEMENT_NAME ? (
                                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-[8px] font-bold uppercase">SLA Uploaded</span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-400 rounded text-[8px] font-bold uppercase">No SLA Document</span>
                                      )}
                                    </div>

                                    {r.TENANT_AGREEMENT_NAME ? (
                                      <div className="space-y-2 mt-1.5">
                                        <div className="flex items-center gap-2 bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/40">
                                          <FileText className="w-5 h-5 text-indigo-650 shrink-0 bg-indigo-100/50 p-1 rounded" />
                                          <p className="font-semibold text-slate-700 text-[10px] truncate font-mono flex-1 text-left" title={r.TENANT_AGREEMENT_NAME}>
                                            {r.TENANT_AGREEMENT_NAME}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <button
                                            onClick={() => setPreviewDocument({
                                              name: r.TENANT_AGREEMENT_NAME || "Agreement.pdf",
                                              url: r.TENANT_AGREEMENT_URL || ""
                                            })}
                                            className="py-1 px-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition text-[9px]"
                                          >
                                            <Eye className="w-3 h-3" />
                                            Preview SLA
                                          </button>
                                          <a
                                            href={r.TENANT_AGREEMENT_URL || "#"}
                                            download={r.TENANT_AGREEMENT_NAME || "agreement.pdf"}
                                            className="py-1 px-1.5 border border-slate-250 text-slate-700 hover:bg-slate-50 bg-white font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition text-[9px] text-center"
                                            onClick={(e) => {
                                              if (!r.TENANT_AGREEMENT_URL) e.preventDefault();
                                            }}
                                          >
                                            <Download className="w-3 h-3" />
                                            Download PDF
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-center mt-1">
                                        <p className="text-[9px] text-slate-400 font-medium leading-normal text-left">
                                          No agreement copy uploaded. Upload signed tenancy agreement inside property editing form.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Col 3: Detailed 2026 Monthly & Annual Fee Ledger */}
                                {(() => {
                                  const breakdown = getResidentDueBreakdown(r["OWNER ID"], r["HOUSE STATUS"]);
                                  return (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-center mb-2.5 pb-1 border-b border-slate-100">
                                          <span className="text-[10px] font-bold text-rose-500 block uppercase tracking-wider">Outstanding Dues Ledger</span>
                                          <span className="text-[9px] font-mono font-bold text-slate-400">YEAR 2026</span>
                                        </div>

                                        {breakdown.total === 0 ? (
                                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-155 p-3 rounded-xl text-center space-y-1 my-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
                                              <CheckCircle className="w-4 h-4 text-emerald-650" />
                                            </div>
                                            <p className="font-extrabold text-[10px] uppercase">Account Cleared</p>
                                            <p className="text-[9px] text-emerald-700 font-semibold leading-relaxed">Unit is fully paid up with no deficits recorded.</p>
                                          </div>
                                        ) : (
                                          <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl flex justify-between items-center my-2">
                                            <div className="space-y-0.5 text-left">
                                              <p className="text-[8.5px] uppercase font-bold text-rose-500 font-mono tracking-wider">Total Deficit</p>
                                              <span className="text-xs font-extrabold text-rose-950 font-mono">
                                                {currency} {(breakdown.total || 0).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="text-right space-y-0.5">
                                              {breakdown.monthlyDue > 0 && (
                                                <span className="block font-mono text-[8.5px] font-bold text-rose-800 bg-rose-100/50 px-1 py-0.2 rounded border border-rose-150/40">
                                                  Monthly: {currency} {breakdown.monthlyDue.toFixed(0)}
                                                </span>
                                              )}
                                              {breakdown.annualDue > 0 && (
                                                <span className="block font-mono text-[8.5px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-150/45">
                                                  Annual: {currency} {breakdown.annualDue.toFixed(0)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* 12-month mini grid */}
                                        {r["HOUSE STATUS"] !== "Vacant" && (
                                          <div className="mt-2.5">
                                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase font-mono mb-2">
                                              <span>Monthly Dues Coverage</span>
                                              <span>Paid: {breakdown.securityPaymentsCount}/12</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                              {breakdown.monthlyBreakdown.map((m) => (
                                                <div 
                                                  key={m.monthIndex} 
                                                  className={`p-1 rounded border text-[9px] flex flex-col justify-between h-9 transition ${
                                                    m.status === "Paid" 
                                                      ? "bg-emerald-50/40 border-emerald-100/60 text-emerald-800" 
                                                      : m.status === "Overdue"
                                                      ? "bg-rose-50 border-rose-150 text-rose-700 font-bold"
                                                      : "bg-slate-50/40 border-slate-150 text-slate-450"
                                                  }`}
                                                >
                                                  <span className="font-bold leading-none">{m.monthName.slice(0, 3)}</span>
                                                  <div className="flex justify-between items-center mt-0.5 text-[7px] font-mono">
                                                    {m.status === "Paid" ? (
                                                      <span className="text-emerald-600 font-black">OK</span>
                                                    ) : m.status === "Overdue" ? (
                                                      <span className="text-rose-600 font-black animate-pulse">DUE</span>
                                                    ) : (
                                                      <span className="text-slate-400">Upcoming</span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action link */}
                                      {breakdown.total > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                                          <span className="text-[9px] text-gray-400 font-semibold">Reminders:</span>
                                          <button
                                            onClick={() => {
                                              if (onTriggerReminder) {
                                                onTriggerReminder(r["OWNER ID"]);
                                              } else {
                                                alert(`To broadcast/notify Unit ${r["OWNER ID"]}, please navigate to the "Complaints & News" -> "Notices Desk" -> "🚨 Reminders" sub-tab to dispatch a targeted overdue notice instantly!`);
                                              }
                                            }}
                                            className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 animate-none"
                                          >
                                            <Megaphone className="w-3 h-3 text-rose-100" />
                                            Publish Notice
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalItems > pageSize && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{(displayPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800">{Math.min(displayPage * pageSize, totalItems)}</strong> of <strong className="text-slate-800">{totalItems}</strong> entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={displayPage === 1}
                onClick={() => setCurrentPage(displayPage - 1)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 enabled:hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 font-mono px-2">Page {displayPage} of {totalPages}</span>
              <button
                type="button"
                disabled={displayPage === totalPages}
                onClick={() => setCurrentPage(displayPage + 1)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 enabled:hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Non-blocking Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div id="delete-confirm-overlay" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Delete Occupant?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Are you sure you want to delete resident <span className="font-bold text-slate-800">{deleteConfirmId}</span>? This cannot be undone and will erase all occupancy settings.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-1.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Resident Modal Form */}
      {showAddModal && (
        <div id="resident-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto text-gray-900">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Contact className="w-5 h-5 text-indigo-600" />
              {editResident ? "Modify Occupancy details" : "Register New Property Occupant"}
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Owner ID (Housing Unit)</label>
                  <input
                    required
                    type="text"
                    id="new-resident-owner-id"
                    placeholder="e.g. R106"
                    disabled={editResident !== null} // Lock sheet key ID on edit
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none font-sans font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Occupancy status</label>
                  <select
                    value={houseStatus}
                    id="new-resident-house-status"
                    onChange={(e) => setHouseStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                  >
                    <option value="Occupied">Occupied</option>
                    <option value="Rented">Rented</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Owner Full Name</label>
                <input
                  required
                  type="text"
                  id="new-resident-owner-name"
                  placeholder="e.g. Sophia Tan"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Primary phone number</label>
                  <input
                    required
                    type="text"
                    id="new-resident-phone1"
                    placeholder="+601..."
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                    onBlur={(e) => setPhone1(formatPhoneNumber(e.target.value, state.settings.phoneCountryCode || "+60"))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Emergency contact (Optional)</label>
                  <input
                    type="text"
                    id="new-resident-phone2"
                    placeholder="+601..."
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    onBlur={(e) => setPhone2(e.target.value ? formatPhoneNumber(e.target.value, state.settings.phoneCountryCode || "+60") : "")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Email address</label>
                <input
                  required
                  type="email"
                  id="new-resident-email"
                  placeholder="sophia@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                />
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-inner">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200/40">
                  <span className="block font-semibold text-slate-700 text-[11px]">Registered RFID Cards (Up to 10)</span>
                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                    {cards.filter(c => String(c || "").trim()).length} / 10 Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {cards.map((c, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <label className="block text-[9px] text-gray-400 font-bold font-mono">Card {idx + 1}</label>
                      <input
                        type="text"
                        id={`new-resident-card-${idx+1}`}
                        placeholder={`AC-${3451 + idx}`}
                        value={c}
                        onChange={(e) => {
                          const updated = [...cards];
                          updated[idx] = e.target.value;
                          setCards(updated);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-slate-400 text-slate-850 outline-none font-mono text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tenant / Renter Info Block - dynamic styling if house is set to Rented */}
              <div className={`p-4 rounded-xl border transition-all duration-300 ${
                houseStatus === "Rented" 
                  ? "bg-indigo-55/10 border-indigo-200 shadow-xs" 
                  : "bg-slate-50/20 border-slate-200"
              }`}>
                <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-dashed border-slate-200">
                  <span className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Contact className="w-3.5 h-3.5 text-indigo-600" />
                    Renter / Tenant Information {houseStatus === "Rented" && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-extrabold ml-1">REQUIRED FOR RENTED</span>}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-gray-500 font-bold uppercase text-[9px] mb-1 font-mono">Tenant Full Name</label>
                      <input
                        type="text"
                        id="tenant-name-input"
                        placeholder="e.g. Marcus Lim"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 text-slate-850 outline-none text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 font-bold uppercase text-[9px] mb-1 font-mono">Tenant Phone Number</label>
                      <input
                        type="text"
                        id="tenant-phone-input"
                        placeholder="+601..."
                        value={tenantPhone}
                        onChange={(e) => setTenantPhone(e.target.value)}
                        onBlur={(e) => setTenantPhone(e.target.value ? formatPhoneNumber(e.target.value, state.settings.phoneCountryCode || "+60") : "")}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 text-slate-850 outline-none text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px] mb-1 font-mono">Tenancy agreement PDF copy</label>
                    
                    {isUploadingAgreement ? (
                      <div className="border border-dashed border-indigo-200 rounded-xl p-4 text-center bg-indigo-50/20 flex flex-col items-center justify-center min-h-[90px]">
                        <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2 block"></span>
                        <p className="text-[10px] text-indigo-700 font-semibold animate-pulse">Uploading PDF to Google Drive...</p>
                        <p className="text-[9px] text-indigo-400 font-mono">Generating shareable cloud link</p>
                      </div>
                    ) : tenantAgreementName ? (
                      <div className="flex items-center justify-between bg-white border border-indigo-100 p-2 rounded-xl">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <FileText className="w-6.5 h-6.5 text-indigo-600 shrink-0 bg-indigo-50 p-1 rounded-lg" />
                          <div className="overflow-hidden">
                            <p className="font-semibold text-slate-750 text-[10.5px] truncate font-mono" title={tenantAgreementName}>
                              {tenantAgreementName}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium">PDF Document Ready</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTenantAgreementName("");
                            setTenantAgreementUrl("");
                          }}
                          className="p-1 px-1.5 bg-rose-50 text-rose-600 hover:bg-rose-150 font-bold font-mono text-[9px] rounded-lg transition shrink-0 cursor-pointer"
                          title="Remove agreement copy"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                          isDragging 
                            ? "border-indigo-500 bg-indigo-50/40" 
                            : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/30"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".pdf"
                          onChange={handleFileChange}
                        />
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <p className="text-[10px] text-slate-700 font-semibold mb-0.5">Drag & drop tenancy agreement or <span className="text-indigo-600 font-bold hover:underline">browse files</span></p>
                        <p className="text-[9px] text-slate-400 font-mono">Supports PDF format copies</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Private admin Remarks</label>
                <textarea
                  id="new-resident-remark"
                  placeholder="Insert notes about special services or arrangements..."
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex items-center justify-between text-xs">
              <div>
                {editResident && (currentUser?.Role === "admin" || currentUser?.Role === "manager") && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editResident["OWNER ID"])}
                    className="py-2.5 px-4 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5 cursor-pointer transition.duration-150 animate-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Occupant</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="close-resident-form-btn"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-lg border border-slate-250 hover:bg-slate-50 font-semibold text-slate-650 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-resident-form-btn"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-lg bg-slate-900 border border-slate-950 text-white font-semibold hover:bg-slate-800 shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing..." : editResident ? "Update Details" : "Register Unit"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Visual SLA Tenancy PDF Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs text-slate-800">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Document Viewer header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-bold text-xs truncate max-w-[280px]" title={previewDocument.name}>
                    {previewDocument.name}
                  </h4>
                  <p className="text-[9.5px] text-slate-400">Secure Resident Portal PDF sandbox viewer</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {previewDocument.url && (
                  <a
                    href={previewDocument.url}
                    download={previewDocument.name}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold"
                  >
                    Download PDF
                  </a>
                )}
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document simulation container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-800 flex justify-center">
              {/* Paper simulation */}
              <div className="relative w-full max-w-xl bg-white min-h-[800px] p-8 md:p-12 shadow-xl border border-slate-700/30 rounded-xs text-[11px] leading-relaxed text-slate-850 flex flex-col justify-between font-serif">
                {/* PDF Stamp / Watermark seal */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.06] border-[6px] border-indigo-600 rounded-full w-64 h-64 flex flex-col items-center justify-center text-center rotate-12">
                  <span className="font-bold font-sans text-2xl tracking-widest text-indigo-600">NAZCUBE</span>
                  <span className="font-sans text-[10px] uppercase font-semibold text-indigo-600 mt-1">SLA Verified</span>
                </div>

                <div>
                  {/* Header Title */}
                  <div className="text-center pb-6 mb-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold uppercase tracking-wider font-sans text-slate-900">Standard Residential Tenancy Agreement</h2>
                    <p className="text-[9.5px] text-slate-500 font-sans mt-1">Conformed under RMUA Bylaws & Nazcube Escrow Assurance</p>
                  </div>

                  {/* Parties contract terms */}
                  <div className="space-y-4">
                    <section>
                      <h3 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-150 pb-0.5 mb-2">1. Contracting Parties</h3>
                      <p>
                        This Covenant of Lease has been executed and executed in compliance with land law guidelines by and between:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 mt-1 font-sans text-[10px]">
                        <li>
                          <strong className="text-slate-900">The Landlord/Proprietor:</strong> Property Title holder of record.
                        </li>
                        <li>
                          <strong className="text-slate-900">The Occupying Tenant:</strong> Active renter certified by management.
                        </li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-150 pb-0.5 mb-2">2. Demised Premises</h3>
                      <p>
                        The Landlord hereby demises to lease, and the Tenant covenants to occupy, that certain apartment unit and its associated private parking bays situated within the Nazcube private estate block.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-150 pb-0.5 mb-2">3. Rental Yields & Covenants</h3>
                      <p>
                        The tenant agrees to maintain peaceful occupancy and pay the agreed-upon security deposits, HOA common fees, and utility sums. Noise disturbances, unauthorized modifications, or failure to register RFID cards for security breaches will constitute direct default.
                      </p>
                    </section>

                    <section className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-sans text-[10px]">
                      <h4 className="font-bold text-slate-900 mb-1">Covenant Security Clause:</h4>
                      <p className="text-slate-650 leading-relaxed italic">
                        "The tenant acknowledges that the building's central guard house, RFID smart barriers, common corridors, and lift access structures require strict registration under HOA regulations. All occupants must carry valid verified passes and cards at all times."
                      </p>
                    </section>
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-8 text-[10px] font-sans">
                    <div>
                      <span className="block text-slate-400 font-mono">LANDLORD PROP SIGNATURE:</span>
                      <div className="h-10 flex items-end border-b border-dashed border-slate-350">
                        <span className="font-serif italic text-sm text-indigo-700 pl-2">Proprietor Sealed</span>
                      </div>
                      <span className="block text-[9px] text-slate-500 mt-1">Verified via Nazcube Portal Signature</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-mono">TENANT OCCUPANT SIGNATURE:</span>
                      <div className="h-10 flex items-end border-b border-dashed border-slate-350">
                        <span className="font-serif italic text-sm text-indigo-700 pl-2">Tenant Sealed</span>
                      </div>
                      <span className="block text-[9px] text-slate-500 mt-1">Acknowledged and Electronically Signed</span>
                    </div>
                  </div>

                  {/* Legal footer */}
                  <div className="text-center text-[8.5px] text-slate-400 mt-10 uppercase tracking-widest font-sans font-semibold">
                    End of Document • Nazcube Security Sandbox
                  </div>
                </div>

              </div>
            </div>

            {/* Document Visualizer Footer bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
              Verified & Secured Sandbox Environment
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
