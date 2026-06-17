import React, { useState } from "react";
import { DatabaseState, Expense, User } from "../types";
import { formatPhoneNumber } from "../utils/phoneFormatter";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  TrendingDown,
  Building,
  HelpCircle
} from "lucide-react";

interface ExpensesTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onAddExpense: (newExpense: Expense) => Promise<any>;
  onUpdateExpense: (recordId: string, updatedExpense: Expense) => Promise<any>;
  onDeleteExpense: (recordId: string) => Promise<any>;
}

export default function ExpensesTab({
  state,
  currentUser,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}: ExpensesTabProps) {
  const { expenses } = state;
  const currency = state.settings.currencySymbol || "RM";

  const expenseCategories = React.useMemo(() => {
    if (state.settings?.expenseCategories) {
      return state.settings.expenseCategories
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    }
    return [
      "Payment to Security Company",
      "Stationery",
      "Claim",
      "Electronics & Electrical",
      "Access Card Order",
      "Property",
      "Maintenance",
      "Other (Specify)"
    ];
  }, [state.settings?.expenseCategories]);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Pagination State
  const [pageSize, setPageSize] = useState<number | "all">(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Inputs
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [typeOfPayment, setTypeOfPayment] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [payTo, setPayTo] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [searchKey, setSearchKey] = useState("");

  const handleShowAddModal = () => {
    setEditExpense(null);
    setDate(new Date().toISOString().substring(0, 10));
    setCategory(expenseCategories[0] || "Payment to Security Company");
    setDetails("");
    setAmount("");
    setTypeOfPayment("Bank Transfer");
    setReference("");
    setPayTo("");
    setContactNo("");
    setSearchKey("");
    setShowAddModal(true);
  };

  const handleShowEditModal = (exp: Expense) => {
    setEditExpense(exp);
    // Parse Date to YYYY-MM-DD
    const dateFormatted = exp.DATE ? exp.DATE.substring(0, 10) : new Date().toISOString().substring(0, 10);
    setDate(dateFormatted);
    setCategory(exp.CATEGORY);
    setDetails(exp.DETAILS);
    setAmount(exp.AMOUNT);
    setTypeOfPayment(exp["TYPE OF PAYMENT"]);
    setReference(exp.REFERENCE);
    setPayTo(exp["PAY TO"]);
    setContactNo(exp["CONTACT NO."]);
    setSearchKey(exp["SEARCH KEY"] || "");
    setShowAddModal(true);
  };

  const handleDelete = (recordId: string) => {
    setDeleteConfirmId(recordId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    try {
      await onDeleteExpense(deleteConfirmId);
      setShowAddModal(false);
      setEditExpense(null);
    } catch (err) {
      setErrorMessage("Delete failed. Check Sheets connection.");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const expenseAmount = amount === "" ? 0 : amount;
    const expenseDate = new Date(date);
    const m = expenseDate.getMonth() + 1; // 1-12
    const y = expenseDate.getFullYear();

    const defaultCountry = state.settings.phoneCountryCode || "+60";
    const formattedContactNo = contactNo ? formatPhoneNumber(contactNo, defaultCountry) : "";

    const expenseData: Expense = {
      "RECORD ID": editExpense ? editExpense["RECORD ID"] : `EXP-${Date.now()}`,
      DATE: date,
      CATEGORY: category,
      DETAILS: details,
      AMOUNT: expenseAmount,
      "TYPE OF PAYMENT": typeOfPayment,
      REFERENCE: reference,
      "PAY TO": payTo,
      "CONTACT NO.": formattedContactNo,
      "UPDATE DATE": new Date().toISOString(),
      "SEARCH KEY": searchKey || `${payTo} ${category} ${details}`.toUpperCase(),
      "SUBMIT DATE": editExpense ? (editExpense["SUBMIT DATE"] || new Date().toISOString()) : new Date().toISOString(),
      "SUBMIT BY": currentUser?.Email || "operator@nazcube.com",
      MONTH: m,
      YEAR: y
    };

    try {
      if (editExpense) {
        await onUpdateExpense(editExpense["RECORD ID"], expenseData);
      } else {
        await onAddExpense(expenseData);
      }
      setShowAddModal(false);
    } catch (err) {
      alert("Error saving expense record. Check Sheet config.");
    }

    setIsSubmitting(false);
  };

  // Filters & Sorting logic (recently first)
  const filteredExpenses = React.useMemo(() => {
    const list = expenses.filter((e) => {
      const searchString = `${e["RECORD ID"]} ${e.CATEGORY} ${e["PAY TO"]} ${e.DETAILS}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter ? e.CATEGORY === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });

    list.sort((a, b) => {
      const dateB = b.DATE ? new Date(b.DATE).getTime() : 0;
      const dateA = a.DATE ? new Date(a.DATE).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return b["RECORD ID"].localeCompare(a["RECORD ID"]);
    });

    return list;
  }, [expenses, searchTerm, categoryFilter]);

  // Math
  const totalExpenseVal = filteredExpenses.reduce((sum, e) => sum + (Number(e.AMOUNT) || 0), 0);

  // Pagination
  const totalItems = filteredExpenses.length;
  let paginatedExpenses = filteredExpenses;
  let totalPages = 1;

  if (pageSize !== "all") {
    totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + pageSize);
  }

  return (
    <div className="space-y-6" id="expenses-tab-view">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Operational Expenditures</h2>
          <p className="text-xs text-slate-500">Log security service payments, repairs, and management outlays</p>
        </div>
        <button
          id="trigger-add-expense-modal"
          onClick={handleShowAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log New Expense
        </button>
      </div>

      {/* Aggregate stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div className="p-3 bg-white rounded-lg border border-slate-200/50 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Filtered Outgoings</span>
          <p className="text-lg font-extrabold text-rose-600 mt-1">{currency} {totalExpenseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-slate-200/50 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Recorded Invoices</span>
          <p className="text-lg font-extrabold text-slate-800 mt-1">{totalItems} receipts</p>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-150 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              id="search-expenses"
              type="text"
              placeholder="Search pay to, details, record ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 font-sans transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-expense-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-xs"
              >
                <option value="">All Categories</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs">
              <span className="text-gray-400">Rows:</span>
              <select
                id="expense-page-size-selector"
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
                <th className="p-4 font-semibold text-[10px]">Record ID</th>
                <th className="p-4 font-semibold text-[10px]">Date</th>
                <th className="p-4 font-semibold text-[10px]">Vendor (Pay To)</th>
                <th className="p-4 font-semibold text-[10px]">Category</th>
                <th className="p-4 font-semibold text-[10px]">Details</th>
                <th className="p-4 font-semibold text-[10px]">Payment Type</th>
                <th className="p-4 font-semibold text-[10px] text-right">Amount</th>
                <th className="p-4 font-semibold text-[10px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No expense records found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((e) => {
                  return (
                    <tr key={e["RECORD ID"]} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="p-4 font-mono font-bold text-gray-800">{e["RECORD ID"]}</td>
                      <td className="p-4 font-mono text-gray-500">{e.DATE}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-slate-850 text-sm">{e["PAY TO"]}</p>
                          {e["CONTACT NO."] && <span className="text-[10px] text-gray-400 font-mono">{e["CONTACT NO."]}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">{e.CATEGORY}</span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-gray-600">{e.DETAILS}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-700 font-medium">{e["TYPE OF PAYMENT"]}</p>
                          {e.REFERENCE && <p className="text-[9px] text-gray-400 font-mono">Ref: {e.REFERENCE}</p>}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600">{currency} {(Number(e.AMOUNT) || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5 md:gap-2">
                          <button
                            onClick={() => handleShowEditModal(e)}
                            title="Edit Expense Record"
                            className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Expense Modal Dialog */}
      {showAddModal && (
        <div id="expense-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto text-gray-900">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              {editExpense ? "Modify Expense Record" : "New Expense Record"}
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Recorded Date</label>
                  <input
                    required
                    type="date"
                    id="new-expense-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Expenditure Category</label>
                  <select
                    value={category}
                    id="new-expense-category"
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Recipient Name (Pay To)</label>
                  <input
                    required
                    type="text"
                    id="new-expense-pay-to"
                    placeholder="e.g. Securitas Malaysia"
                    value={payTo}
                    onChange={(e) => setPayTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    id="new-expense-contact-no"
                    placeholder="e.g. +603-99..."
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    onBlur={(e) => setContactNo(e.target.value ? formatPhoneNumber(e.target.value, state.settings.phoneCountryCode || "+60") : "")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-505 text-slate-850 outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Itemized Details / Explanation */}
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Details / Description</label>
                <textarea
                  required
                  id="new-expense-details"
                  placeholder="Explain exactly what was purchased or cleared, and what housing unit handles it..."
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                />
              </div>

              {/* Row 4: Logged Amount & Transaction type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Amount (RM)</label>
                  <input
                    required
                    type="number"
                    step="any"
                    id="new-expense-amount"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 font-bold outline-none font-mono text-base"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Transaction Type</label>
                  <select
                    value={typeOfPayment}
                    id="new-expense-type-of-payment"
                    onChange={(e) => setTypeOfPayment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="QR Pay">QR Pay</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Dedit Card">Dedit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Reference / Cheque No. */}
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Reference / Cheque No.</label>
                <input
                  type="text"
                  id="new-expense-reference"
                  placeholder="TX-001002"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex items-center justify-between text-xs">
              <div>
                {editExpense && (currentUser?.Role === "admin" || currentUser?.Role === "manager") && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editExpense["RECORD ID"])}
                    className="py-2.5 px-4 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5 cursor-pointer transition duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="close-expense-form-btn"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-lg border border-slate-250 hover:bg-slate-50 font-semibold text-slate-650 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-expense-form-btn"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-lg bg-slate-900 border border-slate-950 text-white font-semibold hover:bg-slate-800 shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving record..." : editExpense ? "Update Expense" : "Log Expense"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Custom Non-blocking Expense Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div id="delete-expense-confirm-overlay" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Delete Expense Record?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Are you sure you want to delete expense record <span className="font-bold text-slate-800">{deleteConfirmId}</span>? This cannot be undone and will update lead balance reports.
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

      {/* Error Message Alert Modal */}
      {errorMessage && (
        <div id="expense-error-overlay" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Action Restricted</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer transition"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
