import React, { useState } from "react";
import { DatabaseState, Payment, Resident, Product, User } from "../types";
import { formatPhoneNumber } from "../utils/phoneFormatter";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Edit2,
  Check,
  UserCheck,
  Building,
  DollarSign,
  Users
} from "lucide-react";

interface BillingTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onAddPayment: (newPayment: Payment) => Promise<any>;
  onUpdatePayment: (recordId: string, updatedPayment: Payment) => Promise<any>;
  onAddPaymentsBatch?: (newPayments: Payment[]) => Promise<any>;
  onUpdatePaymentsBatch?: (dataArray: { recordId: string; data: Payment }[]) => Promise<any>;
  onSelectPaymentForInvoice: (payment: Payment) => void;
}

export default function BillingTab({
  state,
  currentUser,
  onAddPayment,
  onUpdatePayment,
  onAddPaymentsBatch,
  onUpdatePaymentsBatch,
  onSelectPaymentForInvoice
}: BillingTabProps) {
  const { payments, residents, products, settings } = state;
  const currency = settings.currencySymbol || "RM";

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Pagination State
  const [pageSize, setPageSize] = useState<number | "all">(20);
  const [currentPage, setCurrentPage] = useState(1);

  // New Payment Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editPayment, setEditPayment] = useState<Payment | null>(null);

  // Add Form Inputs
  const [pmtType, setPmtType] = useState<"Resident" | "Non-Resident">("Resident");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [nonResName, setNonResName] = useState("");
  const [nonResPhone, setNonResPhone] = useState("");
  const [nonResEmail, setNonResEmail] = useState("");
  const [paymentType, setPaymentType] = useState("Online Transfer");
  const [reference, setReference] = useState("");

  // Dynamic receipt items state
  interface FormRowItem {
    product: string;
    amount: number | "";
    quantity: number;
    discount: number;
    tax: number;
  }
  const [formRows, setFormRows] = useState<FormRowItem[]>([]);

  // Filter products that are active. For Resident-Owner payments, ensure Monthly Security Fee and Annual Membership Fee are available & synced with dynamic settings rates.
  const activeProducts = (() => {
    let list = [...products.filter((p) => p.STATUS === "Active" || !p.STATUS)];

    if (pmtType === "Resident") {
      const monthlyRate = parseFloat(settings.monthlySecurityFeeRate) || 50;
      const annualRate = parseFloat(settings.annualMembershipFeeRate) || 120;

      // Ensure Monthly Security Fee is included and synchronized
      const monthlyIdx = list.findIndex(p => p.DESCIPTION === "Monthly Security Fee");
      if (monthlyIdx >= 0) {
        list[monthlyIdx] = { ...list[monthlyIdx], AMOUNT: monthlyRate };
      } else {
        list.unshift({
          ID: "P_MONTHLY",
          DESCIPTION: "Monthly Security Fee",
          AMOUNT: monthlyRate,
          STATUS: "Active",
          TIMESTAMP: new Date().toISOString(),
          CATEGORY: "Monthly Security Fee"
        });
      }

      // Ensure Annual Membership Fee is included and synchronized
      const annualIdx = list.findIndex(p => p.DESCIPTION === "Annual Membership Fee");
      if (annualIdx >= 0) {
        list[annualIdx] = { ...list[annualIdx], AMOUNT: annualRate };
      } else {
        list.unshift({
          ID: "P_ANNUAL",
          DESCIPTION: "Annual Membership Fee",
          AMOUNT: annualRate,
          STATUS: "Active",
          TIMESTAMP: new Date().toISOString(),
          CATEGORY: "Annual Membership Fee"
        });
      }
    }

    return list;
  })();

  // Sequential Receipt Generator
  const generateReceiptNo = () => {
    const totalPayments = payments.length;
    const prefix = settings.receiptPrefix || "REC-";
    const nextNum = (totalPayments + 1).toString().padStart(6, "0");
    return `${prefix}${nextNum}`;
  };

  const handleAddRow = () => {
    if (formRows.length >= 10) {
      alert("You can add up to a maximum of 10 items in a single receipt.");
      return;
    }
    const nextProduct = activeProducts[0];
    const nextDesc = nextProduct?.DESCIPTION || "Others";
    const nextAmount = nextProduct ? Number(nextProduct.AMOUNT) : 0;
    const taxRate = parseFloat(settings.taxRate) || 0;
    const computedTax = taxRate > 0 ? parseFloat(((nextAmount * taxRate) / 100).toFixed(2)) : 0;

    setFormRows(prev => [
      ...prev,
      {
        product: nextDesc,
        amount: nextAmount,
        quantity: 1,
        discount: 0,
        tax: computedTax
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (formRows.length <= 1) {
      alert("A receipt must contain at least one product line item.");
      return;
    }
    setFormRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowFieldChange = (index: number, field: keyof FormRowItem, value: any) => {
    setFormRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [field]: value };

      if (field === "product") {
        const matched = activeProducts.find(p => p.DESCIPTION === value);
        if (matched) {
          updated.amount = Number(matched.AMOUNT) || 0;
          const taxRate = parseFloat(settings.taxRate) || 0;
          updated.tax = taxRate > 0 ? parseFloat(((Number(matched.AMOUNT) * taxRate) / 100).toFixed(2)) : 0;
        }
      } else if (field === "amount") {
        const parsedAmount = value === "" ? 0 : parseFloat(value) || 0;
        const taxRate = parseFloat(settings.taxRate) || 0;
        updated.tax = taxRate > 0 ? parseFloat(((parsedAmount * taxRate) / 100).toFixed(2)) : 0;
      }
      return updated;
    }));
  };

  const handleShowAddModal = () => {
    // Reset state
    setPmtType("Resident");
    setSelectedOwnerId("");
    setNonResName("");
    setNonResPhone("");
    setNonResEmail("");
    
    // Choose first product from tab
    const initialProduct = activeProducts[0];
    const initialDesc = initialProduct?.DESCIPTION || "Others";
    const initialAmount = initialProduct ? Number(initialProduct.AMOUNT) : 0;
    const taxRate = parseFloat(settings.taxRate) || 0;
    const computedTax = taxRate > 0 ? parseFloat(((initialAmount * taxRate) / 100).toFixed(2)) : 0;

    setFormRows([
      {
        product: initialDesc,
        amount: initialAmount,
        quantity: 1,
        discount: 0,
        tax: computedTax
      }
    ]);

    setPaymentType("Online Transfer");
    setReference("");
    setEditPayment(null);
    setShowAddModal(true);
  };

  const handleShowEditModal = (gr: {
    receiptNo: string;
    type: "Resident" | "Non-Resident";
    ownerId: string;
    paymentType: string;
    timestamp: string;
    submitBy: string;
    nonResidentName?: string;
    nonResidentPhone?: string;
    nonResidentEmail?: string;
    items: Payment[];
  }) => {
    // Fill state with first payment values
    const payment = gr.items[0] || ({} as Payment);
    setEditPayment(payment);
    setPmtType(payment.TYPE);
    setSelectedOwnerId(payment["OWNER ID"]);
    setNonResName(payment["NON-RESIDENT NAME"] || "");
    setNonResPhone(payment["NON-RESIDENT PHONE"] || "");
    setNonResEmail(payment["NON-RESIDENT EMAIL"] || "");
    setFormRows(
      gr.items.map((it) => ({
        product: it.PRODUCT,
        amount: it.AMOUNT,
        quantity: it.QUANTITY,
        discount: it.DISCOUNT,
        tax: it.TAX
      }))
    );
    setPaymentType(payment["PAYMENT TYPE"]);
    setReference(payment.REFERENCE || "");
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitByEmail = currentUser?.Email || "operator@nazcube.com";

    if (editPayment) {
      try {
        const parentRecordId = editPayment["RECORD ID"].split("-")[0] || editPayment["RECORD ID"];
        const receiptNo = editPayment["RECEIPT NO."];
        const timestamp = editPayment.TIMESTAMP;

        // Get all original records that match this receipt number to find extra rows to update
        const originalSiblings = payments.filter((p) => p["RECEIPT NO."] === receiptNo);

        const paymentsToUpdate = formRows.map((rowItem, i) => {
          const recordId = `${parentRecordId}-${i}`;
          const normProd = (rowItem.product || "").toLowerCase().trim();
          let incCat = "Others";
          if (normProd === "monthly security fee" || normProd === "weekly security fee" || normProd === "monthly fee") {
            incCat = "Monthly Security Fee";
          } else if (normProd === "annual membership fee" || normProd === "annual fee") {
            incCat = "Annual Membership Fee";
          } else {
            const matchProd = products.find(p => (p.DESCIPTION || "").toLowerCase().trim() === normProd);
            incCat = matchProd ? (matchProd.CATEGORY || matchProd.DESCIPTION || "Others") : "Others";
          }
          const formattedPhone = pmtType === "Non-Resident" ? formatPhoneNumber(nonResPhone, state.settings.phoneCountryCode || "+60") : undefined;

          let finalName = "";
          let finalPhone = "";
          let finalEmail = "";
          if (pmtType === "Non-Resident") {
            finalName = nonResName;
            finalPhone = formattedPhone || "";
            finalEmail = nonResEmail;
          } else {
            const resRec = residents.find(r => r["OWNER ID"] === selectedOwnerId);
            if (resRec) {
              finalName = resRec["OWNER NAME"] || "";
              finalPhone = resRec["PHONE 1"] || resRec["PHONE 2"] || "";
              finalEmail = resRec.EMAIL || "";
            }
          }

          const rowPmt: Payment = {
            "RECORD ID": recordId,
            TYPE: pmtType,
            "OWNER ID": pmtType === "Resident" ? selectedOwnerId : "N/A",
            PRODUCT: rowItem.product,
            QUANTITY: rowItem.quantity,
            AMOUNT: rowItem.amount === "" ? 0 : rowItem.amount,
            TAX: rowItem.tax,
            DISCOUNT: rowItem.discount,
            "PAYMENT TYPE": paymentType,
            REFERENCE: reference || undefined,
            TIMESTAMP: timestamp,
            "RECEIPT NO.": receiptNo,
            "SUBMIT BY": submitByEmail,
            "NON-RESIDENT NAME": pmtType === "Non-Resident" ? nonResName : undefined,
            "NON-RESIDENT PHONE": pmtType === "Non-Resident" ? formattedPhone : undefined,
            "NON-RESIDENT EMAIL": pmtType === "Non-Resident" ? nonResEmail : undefined,
            NAME: finalName || undefined,
            PHONE: finalPhone || undefined,
            EMAIL: finalEmail || undefined,
            "INCOME CATEGORY": incCat
          };
          return { recordId, data: rowPmt };
        });

        // Use batch update if available
        try {
          if (onUpdatePaymentsBatch) {
            await onUpdatePaymentsBatch(paymentsToUpdate);
          } else {
            // Sequential synchronous fallback (eliminates write clashes)
            for (const item of paymentsToUpdate) {
              const exists = originalSiblings.some(s => s["RECORD ID"] === item.recordId);
              if (exists) {
                await onUpdatePayment(item.recordId, item.data);
              } else {
                await onAddPayment(item.data);
              }
            }
          }
        } catch (batchErr: any) {
          const errString = String(batchErr?.message || batchErr || "");
          if (errString.includes("updatePaymentsBatch") || errString.includes("Unknown Action") || errString.includes("not found")) {
            console.warn("Batch updates failed/unsupported. Carrying out sequential updates.", batchErr);
            for (const item of paymentsToUpdate) {
              const exists = originalSiblings.some(s => s["RECORD ID"] === item.recordId);
              if (exists) {
                await onUpdatePayment(item.recordId, item.data);
              } else {
                await onAddPayment(item.data);
              }
            }
          } else {
            throw batchErr;
          }
        }

        setShowAddModal(false);
        // Auto-show receipt immediately after edit saving completes
        if (paymentsToUpdate.length > 0) {
          onSelectPaymentForInvoice(paymentsToUpdate[0].data);
        }
      } catch (err) {
        alert("Update failed. Verify Sheets connection.");
      }
    } else {
      const parentRecordId = `PMT-${Date.now()}`;
      const receiptNo = generateReceiptNo();
      const timestamp = new Date().toISOString();

      try {
        const paymentsToCreate: Payment[] = formRows.map((rowItem, i) => {
          const recordId = `${parentRecordId}-${i}`;
          const normProd = (rowItem.product || "").toLowerCase().trim();
          let incCat = "Others";
          if (normProd === "monthly security fee" || normProd === "weekly security fee" || normProd === "monthly fee") {
            incCat = "Monthly Security Fee";
          } else if (normProd === "annual membership fee" || normProd === "annual fee") {
            incCat = "Annual Membership Fee";
          } else {
            const matchProd = products.find(p => (p.DESCIPTION || "").toLowerCase().trim() === normProd);
            incCat = matchProd ? (matchProd.CATEGORY || matchProd.DESCIPTION || "Others") : "Others";
          }
          const formattedPhone = pmtType === "Non-Resident" ? formatPhoneNumber(nonResPhone, state.settings.phoneCountryCode || "+60") : undefined;

          let finalName = "";
          let finalPhone = "";
          let finalEmail = "";
          if (pmtType === "Non-Resident") {
            finalName = nonResName;
            finalPhone = formattedPhone || "";
            finalEmail = nonResEmail;
          } else {
            const resRec = residents.find(r => r["OWNER ID"] === selectedOwnerId);
            if (resRec) {
              finalName = resRec["OWNER NAME"] || "";
              finalPhone = resRec["PHONE 1"] || resRec["PHONE 2"] || "";
              finalEmail = resRec.EMAIL || "";
            }
          }

          return {
            "RECORD ID": recordId,
            TYPE: pmtType,
            "OWNER ID": pmtType === "Resident" ? selectedOwnerId : "N/A",
            PRODUCT: rowItem.product,
            QUANTITY: rowItem.quantity,
            AMOUNT: rowItem.amount === "" ? 0 : rowItem.amount,
            TAX: rowItem.tax,
            DISCOUNT: rowItem.discount,
            "PAYMENT TYPE": paymentType,
            REFERENCE: reference || undefined,
            TIMESTAMP: timestamp,
            "RECEIPT NO.": receiptNo,
            "SUBMIT BY": submitByEmail,
            "NON-RESIDENT NAME": pmtType === "Non-Resident" ? nonResName : undefined,
            "NON-RESIDENT PHONE": pmtType === "Non-Resident" ? formattedPhone : undefined,
            "NON-RESIDENT EMAIL": pmtType === "Non-Resident" ? nonResEmail : undefined,
            NAME: finalName || undefined,
            PHONE: finalPhone || undefined,
            EMAIL: finalEmail || undefined,
            "INCOME CATEGORY": incCat
          };
        });

        // Use batch insert if available
        try {
          if (onAddPaymentsBatch) {
            await onAddPaymentsBatch(paymentsToCreate);
          } else {
            // Sequential synchronous fallback (eliminates write clashes)
            for (const newPmt of paymentsToCreate) {
              await onAddPayment(newPmt);
            }
          }
        } catch (batchErr: any) {
          const errString = String(batchErr?.message || batchErr || "");
          if (errString.includes("addPaymentsBatch") || errString.includes("Unknown Action") || errString.includes("not found")) {
            console.warn("Batch insert failed/unsupported. Carrying out sequential inserts.", batchErr);
            for (const newPmt of paymentsToCreate) {
              await onAddPayment(newPmt);
            }
          } else {
            throw batchErr;
          }
        }

        setShowAddModal(false);
        // Auto-show receipt immediately after creation completes
        if (paymentsToCreate.length > 0) {
          onSelectPaymentForInvoice(paymentsToCreate[0]);
        }
      } catch (err) {
        alert("Failed to insert payment. Verify Sheets URL is active.");
      }
    }
    
    setIsSubmitting(false);
  };

  // Group payments by Receipt No. and sort by Timestamp (recently first)
  const groupedReceipts = React.useMemo(() => {
    const map = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const rNo = p["RECEIPT NO."] || "UNKNOWN";
      if (!map.has(rNo)) {
        map.set(rNo, []);
      }
      map.get(rNo)!.push(p);
    });

    const list = Array.from(map.entries()).map(([receiptNo, items]) => {
      const first = items[0] || ({} as Payment);
      return {
        receiptNo,
        type: first.TYPE,
        ownerId: first["OWNER ID"],
        paymentType: first["PAYMENT TYPE"],
        timestamp: first.TIMESTAMP,
        submitBy: first["SUBMIT BY"],
        nonResidentName: first["NON-RESIDENT NAME"],
        nonResidentPhone: first["NON-RESIDENT PHONE"],
        nonResidentEmail: first["NON-RESIDENT EMAIL"],
        items: items
      };
    });

    // Sort all base tables base on timestamp (recently first)
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return list;
  }, [payments]);

  // Perform Filters on grouped receipts
  const filteredReceipts = React.useMemo(() => {
    return groupedReceipts.filter((gr) => {
      const residentObj = residents.find((r) => r["OWNER ID"] === gr.ownerId);
      const clientName = gr.type === "Resident" && residentObj ? residentObj["OWNER NAME"] : (gr.nonResidentName || "");
      
      const productTitles = gr.items.map(it => it.PRODUCT).join(" ");
      const searchString = `${gr.receiptNo} ${productTitles} ${clientName} ${gr.ownerId}`.toLowerCase();
      
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      const matchesProduct = productFilter ? gr.items.some(it => it.PRODUCT === productFilter) : true;
      const matchesMethod = methodFilter ? gr.paymentType === methodFilter : true;
      const matchesType = typeFilter ? gr.type === typeFilter : true;
      
      return matchesSearch && matchesProduct && matchesMethod && matchesType;
    });
  }, [groupedReceipts, residents, searchTerm, productFilter, methodFilter, typeFilter]);

  // Calculate stats based on filtered selection
  const filteredTotalPaid = React.useMemo(() => {
    return filteredReceipts.reduce((sum, gr) => {
      const receiptSum = gr.items.reduce((rSum, p) => {
        const pAmt = Number(p.AMOUNT) || 0;
        const pQty = Number(p.QUANTITY) || 0;
        const pDisc = Number(p.DISCOUNT) || 0;
        const pTax = Number(p.TAX) || 0;
        return rSum + (pAmt * pQty - pDisc + pTax);
      }, 0);
      return sum + receiptSum;
    }, 0);
  }, [filteredReceipts]);

  // Pagination Math
  const totalItems = filteredReceipts.length;
  let paginatedReceipts = filteredReceipts;
  let totalPages = 1;

  if (pageSize !== "all") {
    totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + pageSize);
  }

  // Categories list for filter dropdown
  const uniqueProducts = Array.from(new Set(payments.map((p) => p.PRODUCT)));
  const uniqueMethods = Array.from(new Set(payments.map((p) => p["PAYMENT TYPE"])));

  return (
    <div className="space-y-6" id="billing-tab-view">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Billing Transactions</h2>
          <p className="text-xs text-slate-500">Track and generate compliant corporate receipt statements</p>
        </div>
        <button
          id="trigger-add-payment-modal"
          onClick={handleShowAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-850 shadow-sm transition duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Payment
        </button>
      </div>

      {/* Stats Summary of list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div className="p-3 bg-white rounded-lg border border-slate-200/50 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Filtered Revenue</span>
          <p className="text-lg font-extrabold text-slate-900 mt-1">{currency} {filteredTotalPaid.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200/50 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Cashbook Entries count</span>
          <p className="text-lg font-extrabold text-slate-800 mt-1">{totalItems} receipts</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200/50 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Security Clearance</span>
          <p className="text-lg font-extrabold text-emerald-600 mt-1">100% Sheet Synced</p>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter Controls */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-150 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              id="search-payments"
              type="text"
              placeholder="Search receipt, resident name, or Owner ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 font-sans transition"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-product"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-600 outline-none pr-2 font-sans"
              >
                <option value="">All Products</option>
                {uniqueProducts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-method"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-600 outline-none pr-2 font-sans"
              >
                <option value="">All Payments</option>
                {uniqueMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-gray-600 outline-none pr-2 font-sans"
              >
                <option value="">All Types</option>
                <option value="Resident">Resident</option>
                <option value="Non-Resident">Non-Resident</option>
              </select>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs">
              <span className="text-gray-400">Rows:</span>
              <select
                id="page-size-selector"
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === "all" ? "all" : parseInt(val));
                  setCurrentPage(1);
                }}
                className="outline-none bg-transparent font-medium text-slate-800"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="p-4 font-semibold text-[10px]">Receipt No.</th>
                <th className="p-4 font-semibold text-[10px]">Resident Name / Category</th>
                <th className="p-4 font-semibold text-[10px]">Purchased Products</th>
                <th className="p-4 font-semibold text-[10px]">Total Qty</th>
                <th className="p-4 font-semibold text-[10px]">Payment Method</th>
                <th className="p-4 font-semibold text-[10px]">Timestamp</th>
                <th className="p-4 font-semibold text-[10px] text-right">Paid Net</th>
                <th className="p-4 font-semibold text-[10px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No billing transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((gr) => {
                  const res = residents.find((r) => r["OWNER ID"] === gr.ownerId);
                  const customerName = gr.type === "Resident" && res ? res["OWNER NAME"] : (gr.nonResidentName || "N/A");
                  
                  const receiptNetTotal = gr.items.reduce((sum, item) => {
                    const pAmt = Number(item.AMOUNT) || 0;
                    const pQty = Number(item.QUANTITY) || 0;
                    const pDisc = Number(item.DISCOUNT) || 0;
                    const pTax = Number(item.TAX) || 0;
                    return sum + (pAmt * pQty - pDisc + pTax);
                  }, 0);

                  const totalQuantity = gr.items.reduce((sum, item) => sum + Number(item.QUANTITY), 0);

                  return (
                    <tr key={gr.receiptNo} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="p-4 font-mono font-bold text-gray-800">{gr.receiptNo}</td>
                      <td className="p-4">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-900 text-sm">{customerName}</p>
                            {gr.type === "Non-Resident" && (
                              <span className="text-[9px] font-bold text-slate-400 border border-slate-200 px-1 py-0.2 rounded bg-slate-50 uppercase tracking-wider scale-[0.9]">
                                Guest
                              </span>
                            )}
                          </div>
                          {gr.type === "Non-Resident" && (gr.nonResidentPhone || gr.nonResidentEmail) && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[240px] truncate" title={`${gr.nonResidentPhone || ""} ${gr.nonResidentEmail || ""}`}>
                              {gr.nonResidentPhone}{gr.nonResidentPhone && gr.nonResidentEmail ? " | " : ""}{gr.nonResidentEmail}
                            </p>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded ${gr.type === "Resident" ? "bg-slate-100 text-slate-800 border border-slate-205/60" : "bg-emerald-50 text-emerald-700 border border-emerald-100/50"}`}>
                            {gr.type === "Resident" ? <Building className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                            {gr.type} &bull; {gr.ownerId}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="space-y-1">
                          {gr.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex flex-col xl:flex-row xl:items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-150/40 rounded-md px-1.5 py-0.5 max-w-xs shrink-0 select-text">
                              <span className="truncate">{it.PRODUCT}</span>
                              <span className="text-slate-450 font-mono text-[9px] xl:ml-auto">
                                ({it.QUANTITY}x &bull; {currency} {Number(it.AMOUNT).toFixed(2)})
                              </span>
                            </div>
                          ))}
                          {gr.items.length > 2 && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/80 rounded-md px-2 py-0.5 mt-1 select-none animate-pulse">
                              +{gr.items.length - 2} more item{gr.items.length - 2 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-650 font-semibold font-mono">{totalQuantity}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 font-sans rounded bg-slate-50 text-slate-705 border border-slate-200/50 text-[10px] font-bold block w-fit">
                            {gr.paymentType}
                          </span>
                          {gr.items[0]?.REFERENCE && (
                            <p className="text-[10px] font-mono font-bold text-indigo-600 mt-1 uppercase max-w-[120px] truncate" title={gr.items[0].REFERENCE}>
                              Ref: {gr.items[0].REFERENCE}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{new Date(gr.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-right font-extrabold text-slate-900">{currency} {receiptNetTotal.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5 md:gap-2">
                          <button
                            onClick={() => onSelectPaymentForInvoice(gr.items[0])}
                            title="Print / View Invoice Statement"
                            className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {currentUser?.Role === "admin" && (
                            <button
                              onClick={() => handleShowEditModal(gr)}
                              title="Modify Historical Record (Admin)"
                              className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {pageSize !== "all" && totalItems > pageSize && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong className="text-slate-800">{totalItems}</strong> entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 enabled:hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 font-mono px-2">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 enabled:hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Payment Modal Dialog */}
      {showAddModal && (
        <div id="payment-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-gray-900"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editPayment ? "Edit Payment Record" : "Add New Payment Receipt"}
            </h3>

            <div className="space-y-4 text-xs font-sans">
              {/* Type toggle */}
              <div>
                <label className="block text-gray-500 font-semibold mb-2">Payer Residence Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPmtType("Resident")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${pmtType === "Resident" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-slate-50 border-slate-200 text-gray-600"}`}
                  >
                    <Building className="w-4 h-4" />
                    Resident-Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmtType("Non-Resident")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${pmtType === "Non-Resident" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-slate-50 border-slate-200 text-gray-600"}`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Outside Guest / Brand
                  </button>
                </div>
              </div>

              {/* Dynamic Customer fields */}
              {pmtType === "Resident" ? (
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Select Resident Name</label>
                  <select
                    required
                    id="member-owner-id"
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                  >
                    <option value="">-- Choose verified housing occupant --</option>
                    {residents.map((r) => (
                      <option key={r["OWNER ID"]} value={r["OWNER ID"]}>
                        {r["OWNER NAME"]} ({r["OWNER ID"]})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Full Client Name</label>
                    <input
                      required
                      type="text"
                      id="non-res-name-field"
                      placeholder="e.g. John Doe Developer"
                      value={nonResName}
                      onChange={(e) => setNonResName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-500 font-semibold mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+601..."
                        id="non-res-phone-field"
                        value={nonResPhone}
                        onChange={(e) => setNonResPhone(e.target.value)}
                        onBlur={(e) => setNonResPhone(e.target.value ? formatPhoneNumber(e.target.value, state.settings.phoneCountryCode || "+60") : "")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        id="non-res-email-field"
                        value={nonResEmail}
                        onChange={(e) => setNonResEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Product and details dynamic listing */}
              <div className="space-y-3">
                <label className="block text-gray-500 font-semibold">Product Items &amp; Accounting Pricing</label>
                
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                  {formRows.map((row, idx) => (
                    <div key={idx} className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/50 space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Product Item #{idx + 1}</span>
                        {!editPayment && formRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition cursor-pointer"
                            title="Remove transaction row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] text-gray-400 font-semibold mb-0.5">Title (PRODUCT TAB)</label>
                          <select
                            disabled={!!editPayment}
                            value={row.product}
                            onChange={(e) => handleRowFieldChange(idx, "product", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 text-slate-800 outline-none"
                          >
                            {activeProducts.map((p) => (
                              <option key={p.ID} value={p.DESCIPTION}>
                                {p.DESCIPTION} ({currency} {p.AMOUNT.toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-gray-400 font-semibold mb-0.5">Price ({currency})</label>
                          <input
                            required
                            type="number"
                            step="any"
                            value={row.amount}
                            onChange={(e) => handleRowFieldChange(idx, "amount", e.target.value === "" ? "" : parseFloat(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 text-slate-850 outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-gray-400 font-semibold mb-0.5">Qty</label>
                          <input
                            required
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleRowFieldChange(idx, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-400 text-slate-850 outline-none text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-gray-400 font-semibold mb-0.5">Discount (RM)</label>
                          <input
                            type="number"
                            step="any"
                            value={row.discount}
                            onChange={(e) => handleRowFieldChange(idx, "discount", parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-400 text-slate-850 outline-none text-center font-mono text-rose-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-gray-400 font-semibold mb-0.5">SST SST Tax (RM)</label>
                          <input
                            type="number"
                            step="any"
                            value={row.tax}
                            onChange={(e) => handleRowFieldChange(idx, "tax", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-gray-500 outline-none text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!editPayment && formRows.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product Item ({formRows.length}/10)
                  </button>
                )}
              </div>

              {/* Payment Type selection */}
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Select Payment Type</label>
                <select
                  value={paymentType}
                  id="billing-paytype-field"
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                >
                  <option value="Online Transfer">Online Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Reference number field */}
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Reference No. / Payment No. (Optional)</label>
                <input
                  type="text"
                  id="billing-reference-field"
                  placeholder="e.g. TX-984210, CHQ-0284"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none uppercase font-mono"
                />
              </div>

              {/* Net Pay Calculator */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Total Receipt Cost:</span>
                  <p className="text-[10px] text-slate-440">Sum of (Qty x Price - Discount + Tax) for all rows</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 text-base font-mono">
                    {currency} {formRows.reduce((sum, r) => sum + ((r.amount === "" ? 0 : r.amount) * r.quantity - r.discount + r.tax), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                id="close-payment-form-btn"
                onClick={() => setShowAddModal(false)}
                className="py-2.5 px-4 rounded-lg border border-slate-250 hover:bg-slate-50 font-semibold text-slate-650 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-payment-form-btn"
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-lg bg-slate-900 border border-slate-950 text-white font-semibold hover:bg-slate-800 shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    Saving to Sheet...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editPayment ? "Update Record" : "Approve & Generate"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
