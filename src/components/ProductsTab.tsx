import React, { useState } from "react";
import { DatabaseState, Product, User } from "../types";
import { Plus, Edit2, Trash2, Tag, Check, X, AlertCircle, Sparkles, Layers, ToggleLeft, ToggleRight } from "lucide-react";

interface ProductsTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onAddProduct: (newProduct: Product) => Promise<any>;
  onUpdateProduct: (id: string, updatedProduct: Product) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
}

export default function ProductsTab({
  state,
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductsTabProps) {
  const { products } = state;
  const currency = state.settings.currencySymbol || "RM";

  // Group products by category and sort them inside each group
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const cat = p.CATEGORY || "Others";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(p);
    });

    // Sort products inside each group by timestamp/ID
    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => {
        const timeB = b.TIMESTAMP ? new Date(b.TIMESTAMP).getTime() : 0;
        const timeA = a.TIMESTAMP ? new Date(a.TIMESTAMP).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return b.ID.localeCompare(a.ID);
      });
    });

    return groups;
  }, [products]);

  // Sort groups placing common priority ones first
  const sortedCategories = React.useMemo(() => {
    const cats = Object.keys(groupedProducts);
    return cats.sort((a, b) => {
      const isA_Monthly = a.toLowerCase().includes("monthly");
      const isB_Monthly = b.toLowerCase().includes("monthly");
      if (isA_Monthly && !isB_Monthly) return -1;
      if (!isA_Monthly && isB_Monthly) return 1;

      const isA_Annual = a.toLowerCase().includes("annual");
      const isB_Annual = b.toLowerCase().includes("annual");
      if (isA_Annual && !isB_Annual) return -1;
      if (!isA_Annual && isB_Annual) return 1;

      if (a === "Others" && b !== "Others") return 1;
      if (a !== "Others" && b === "Others") return -1;

      return a.localeCompare(b);
    });
  }, [groupedProducts]);

  // Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse cashbook income ledger categories dynamically
  const incomeCategoriesList = React.useMemo(() => {
    const cats = (state.settings.incomeCategories || "Monthly Security Fee, Annual Membership Fee, Additional Access Card, Others, Maintenance, Card Replacement")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return cats;
  }, [state.settings.incomeCategories]);

  // Form Inputs
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [category, setCategory] = useState("");

  const handleShowAddModal = () => {
    setEditProduct(null);
    setId(`P${(products.length + 1).toString().padStart(3, "0")}`);
    setDescription("");
    setAmount("");
    setStatus("Active");
    setCategory(incomeCategoriesList[0] || "Others");
    setShowAddModal(true);
  };

  const handleShowEditModal = (prod: Product) => {
    setEditProduct(prod);
    setId(prod.ID);
    setDescription(prod.DESCIPTION || "");
    setAmount(prod.AMOUNT);
    setStatus(prod.STATUS || "Active");
    setCategory(prod.CATEGORY || "Others");
    setShowAddModal(true);
  };

  const handleDelete = (prodId: string) => {
    setDeleteConfirmId(prodId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    try {
      await onDeleteProduct(deleteConfirmId);
      setShowAddModal(false);
      setEditProduct(null);
    } catch (err) {
      setErrorMessage("Delete failed. Check Google Sheets connection.");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const prodAmount = amount === "" ? 0 : amount;

    const productData: Product = {
      TIMESTAMP: editProduct?.TIMESTAMP || new Date().toISOString(),
      ID: id,
      DESCIPTION: description,
      AMOUNT: prodAmount,
      STATUS: status,
      CATEGORY: category
    };

    try {
      if (editProduct) {
        await onUpdateProduct(editProduct.ID, productData);
      } else {
        await onAddProduct(productData);
      }
      setShowAddModal(false);
    } catch (err) {
      alert("Error saving product record. Check Sheets API URL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-gray-900" id="products-tab-view">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fee Products & Tariffs</h2>
          <p className="text-xs text-slate-500">Configure corporate rates, security levies, card charges and maintenance packages</p>
        </div>
        {currentUser?.Role === "admin" && (
          <button
            id="trigger-add-product-modal"
            onClick={handleShowAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Base Tariff Item
          </button>
        )}
      </div>

      {/* Grouped Products Lists */}
      <div className="space-y-10">
        {sortedCategories.map((catKey) => {
          const items = groupedProducts[catKey];
          if (!items || items.length === 0) return null;

          return (
            <div key={catKey} className="space-y-4" id={`tariff-section-${catKey.replace(/\s+/g, "-")}`}>
              {/* Category Subheader */}
              <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{catKey} Categories</h3>
                    <span className="inline-flex items-center justify-center bg-slate-100 border border-slate-205/60 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-450 mt-0.5 leading-tight">
                    Applicable billing tariffs integrated under cashbook ledger ledger classification
                  </p>
                </div>
              </div>

              {/* Grid block */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((p) => {
                  const isActive = p.STATUS === "Active" || !p.STATUS;
                  return (
                    <div
                      key={p.ID}
                      className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between hover:shadow transition duration-200 ${
                        isActive ? "border-slate-205/60" : "border-slate-100 opacity-60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-[10px] font-bold text-slate-400">ID: {p.ID}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {isActive ? "Active Rate" : "Discontinued"}
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isActive
                                ? "bg-slate-50 text-slate-700 border border-slate-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.DESCIPTION}</h4>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-normal">
                              Levy applied in invoicing suite
                            </p>
                            <div className="mt-2.5 flex">
                              <span className="inline-flex items-center gap-1 text-[9.5px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                                <Layers className="w-2.5 h-2.5 text-slate-400" />
                                {p.CATEGORY || "Unassigned"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price and actions footer - balanced structure */}
                      <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider">
                            Base Price
                          </span>
                          <span className="text-lg font-extrabold text-slate-900 font-mono">
                            {currency} {(Number(p.AMOUNT) || 0).toFixed(2)}
                          </span>
                        </div>
                        {currentUser?.Role === "admin" && (
                          <button
                            onClick={() => handleShowEditModal(p)}
                            title="Manage Product Tariff"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Manage Product</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Tariffs Modal Dialog */}
      {showAddModal && (
        <div id="product-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-slate-800"
          >
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              {editProduct ? "Modify Product/Item" : "Register New Product/Item"}
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Product ID (Unique Key)</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. P006"
                    id="product-key-id-field"
                    disabled={editProduct !== null}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-bold disabled:bg-slate-100 disabled:text-slate-450"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Activation Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      id="new-product-status"
                      onClick={() => setStatus(status === "Active" ? "Inactive" : "Active")}
                      className="text-slate-500 hover:text-slate-900 transition focus:outline-none cursor-pointer"
                    >
                      {status === "Active" ? (
                        <ToggleRight className="w-10 h-10 text-slate-900" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-300" />
                      )}
                    </button>
                    <div>
                      <span className="font-semibold text-slate-900 text-[11px] block">
                        {status === "Active" ? "Tariff Active" : "Tariff Inactive"}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {status === "Active" ? "Active for invoicing" : "Disabled from new bills"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Product Title</label>
                <input
                  required
                  type="text"
                  id="product-description-field"
                  placeholder="e.g. Card Replacement Fee"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Category (Cashbook)</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium text-[11px]"
                  >
                    <option value="">-- Choose Category --</option>
                    {incomeCategoriesList.map((catOpt) => (
                      <option key={catOpt} value={catOpt}>
                        {catOpt}
                      </option>
                    ))}
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Base Price ({currency})</label>
                  <input
                    required
                    type="number"
                    step="any"
                    id="product-amount-field"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 outline-none font-sans font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal pl-1 border-l-2 border-indigo-200">
                This configures the base billing rate and mapped category dynamically inside the Annual Cashbook ledger sheets.
              </p>
            </div>

            {/* Modal actions - balanced buttons section */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                {editProduct && currentUser?.Role === "admin" && (
                  <button
                    type="button"
                    onClick={() => editProduct.ID && handleDelete(editProduct.ID)}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Tariff</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="close-product-form-btn"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-product-form-btn"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing..." : editProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Custom Name-safe Product Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div id="delete-product-confirm-overlay" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Fee Product?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Are you sure you want to delete product tariff <span className="font-bold text-slate-900">{deleteConfirmId}</span>? This cannot be undone and will modify fee ledger billing definitions.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Alert Modal */}
      {errorMessage && (
        <div id="product-error-overlay" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Action Restricted</h3>
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
