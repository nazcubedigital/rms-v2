import React, { useState } from "react";
import { DatabaseState, AppSettings, User } from "../types";
import { Save, Sliders, Settings2, Info, Percent, Palette, Database, Upload, Trash2, Image, Loader2, CheckCircle2, Mail } from "lucide-react";

interface SettingsTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onUpdateSettings: (newSettings: AppSettings) => Promise<any>;
  onUploadLogo?: (base64Data: string, fileName: string) => Promise<string>;
}

export default function SettingsTab({ state, currentUser, onUpdateSettings, onUploadLogo }: SettingsTabProps) {
  const { settings } = state;

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form Inputs
  const [appName, setAppName] = useState(settings.appName || "Nazcube HMS");
  const [companyName, setCompanyName] = useState(settings.companyName || "Nazcube Solution");
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || "+60123456789");
  const [companyEmail, setCompanyEmail] = useState(settings.companyEmail || "nazcube.digital@gmail.com");
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress || "");
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || "INV-");
  const [receiptPrefix, setReceiptPrefix] = useState(settings.receiptPrefix || "REC-");
  const [taxRate, setTaxRate] = useState(settings.taxRate || "0");
  const [themeColor, setThemeColor] = useState(settings.themeColor || "indigo");
  const [startingBalance, setStartingBalance] = useState(settings.startingBalance || "16812.11");
  const [monthlySecurityFeeRate, setMonthlySecurityFeeRate] = useState(settings.monthlySecurityFeeRate || "50");
  const [annualMembershipFeeRate, setAnnualMembershipFeeRate] = useState(settings.annualMembershipFeeRate || "120");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [driveFolderUrl, setDriveFolderUrl] = useState(settings.driveFolderUrl || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(settings.phoneCountryCode || "+60");
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || "RM");
  const [defaultEmailSubject, setDefaultEmailSubject] = useState(settings.defaultEmailSubject || "");
  const [defaultEmailBody, setDefaultEmailBody] = useState(settings.defaultEmailBody || "");

  const [incomeCats, setIncomeCats] = useState<string[]>(() => {
    return (settings.incomeCategories || "Monthly Security Fee, Annual Membership Fee, Additional Access Card, Others, Maintenance, Card Replacement")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  });

  const [expenseCats, setExpenseCats] = useState<string[]>(() => {
    return (settings.expenseCategories || "Payment to Security Company, Stationery, Claim, Electronics & Electrical, Access Card Order, Property, Maintenance, Other (Specify)")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  });

  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState("");

  const handleAddIncomeCat = () => {
    const trimmed = newIncomeCat.trim();
    if (trimmed && !incomeCats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setIncomeCats([...incomeCats, trimmed]);
      setNewIncomeCat("");
    }
  };

  const handleRemoveIncomeCat = (index: number) => {
    setIncomeCats(incomeCats.filter((_, i) => i !== index));
  };

  const handleAddExpenseCat = () => {
    const trimmed = newExpenseCat.trim();
    if (trimmed && !expenseCats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setExpenseCats([...expenseCats, trimmed]);
      setNewExpenseCat("");
    }
  };

  const handleRemoveExpenseCat = (index: number) => {
    setExpenseCats(expenseCats.filter((_, i) => i !== index));
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  const handleLogoFile = async (file: File) => {
    setUploadError("");
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Invalid file type. Please upload a PNG, JPG, or SVG image.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) {
        setUploadError("Failed to convert image format.");
        setIsUploading(false);
        return;
      }

      try {
        if (onUploadLogo) {
          const finalUrl = await onUploadLogo(base64Data, file.name);
          setLogoUrl(finalUrl);
        } else {
          setLogoUrl(base64Data);
        }
      } catch (err: any) {
        setUploadError(err.message || "Failed to commit logo upload.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read image data.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    const data: AppSettings = {
      appName,
      companyName,
      companyPhone,
      companyEmail,
      companyAddress,
      invoicePrefix,
      receiptPrefix,
      taxRate,
      themeColor,
      startingBalance,
      monthlySecurityFeeRate,
      annualMembershipFeeRate,
      logoUrl,
      driveFolderUrl,
      incomeCategories: incomeCats.join(", "),
      expenseCategories: expenseCats.join(", "),
      phoneCountryCode,
      currencySymbol,
      defaultEmailSubject,
      defaultEmailBody
    };

    try {
      await onUpdateSettings(data);
      setSuccessMsg("Settings updated and synchronized to Google Sheet successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert("Settings failed to save. Verify Apps Script connectivity.");
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-6 text-gray-900" id="settings-tab-view">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">System Preferences</h2>
          <p className="text-xs text-gray-500">Amend company invoices details, tax rate percentages, and visual brand identity</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center gap-2 animate-in fade-in duration-200">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Organization preferences */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-100 pb-2 mb-3 text-slate-800 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              General Enterprise Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Web App Name</label>
                <input
                  required
                  type="text"
                  id="settings-appname"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Company Corporate Name</label>
                <input
                  required
                  type="text"
                  id="settings-companyname"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Contact Office Phone</label>
                <input
                  required
                  type="text"
                  id="settings-companyphone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Office Contact Email</label>
                <input
                  required
                  type="email"
                  id="settings-companyemail"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="text-xs font-sans">
              <label className="block text-gray-500 font-semibold mb-1">Physical Address (on Invoices/Headers)</label>
              <textarea
                required
                id="settings-companyaddress"
                rows={3}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850"
              />
            </div>
          </div>

          {/* Billing & Invoice Configs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-100 pb-2 mb-3 text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Invoicing & Finance Rate Constants
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Invoice Code Prefix</label>
                <input
                  required
                  type="text"
                  id="settings-invoiceprefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Receipt Code Prefix</label>
                <input
                  required
                  type="text"
                  id="settings-receiptprefix"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">SST Tax (%)</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="any"
                    id="settings-taxrate"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-right pr-6"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans pt-2 border-t border-slate-100/50">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Jan Starting Balance B/F ({currencySymbol})</label>
                <input
                  required
                  type="text"
                  id="settings-startingbalance"
                  placeholder="16812.11"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono text-indigo-600 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Monthly Security Fee ({currencySymbol})</label>
                <input
                  required
                  type="text"
                  id="settings-monthlyrate"
                  placeholder="50"
                  value={monthlySecurityFeeRate}
                  onChange={(e) => setMonthlySecurityFeeRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Annual Membership Fee ({currencySymbol})</label>
                <input
                  required
                  type="text"
                  id="settings-annualrate"
                  placeholder="120"
                  value={annualMembershipFeeRate}
                  onChange={(e) => setAnnualMembershipFeeRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans pt-3 border-t border-slate-100/50">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">System Base Currency Symbol</label>
                <input
                  type="text"
                  id="settings-currency-symbol"
                  placeholder="RM, $, USD, SGD, etc."
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1">This currency label is used for all cashbooks, invoice printing, and reports across Nazcube HMS.</p>
              </div>
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Default Phone Country Code Prefix</label>
                <input
                  type="text"
                  id="settings-phone-country-code"
                  placeholder="e.g. +60"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Automatically standardizes resident & contact phone inputs to this country code if none provided.</p>
              </div>
            </div>
          </div>

          {/* Email Receipt Template Defaults */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-100 pb-2 mb-3 text-slate-800 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-650" />
              Email Receipt Template Defaults
            </h3>
            
            <div className="grid grid-cols-1 gap-4 text-xs font-sans">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Default Email Subject Line</label>
                <input
                  type="text"
                  id="settings-default-email-subject"
                  value={defaultEmailSubject}
                  onChange={(e) => setDefaultEmailSubject(e.target.value)}
                  placeholder="e.g. [Receipt/Invoice] {RECEIPT_NO} from {COMPANY_NAME}"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium"
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Placeholders supported: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{RECEIPT_NO}`}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{COMPANY_NAME}`}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{RECIPIENT_NAME}`}</code>
                </p>
              </div>
              
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Default Email Introductory Body Message</label>
                <textarea
                  id="settings-default-email-body"
                  rows={4}
                  value={defaultEmailBody}
                  onChange={(e) => setDefaultEmailBody(e.target.value)}
                  placeholder="e.g. Hi {RECIPIENT_NAME},\n\nWe appreciate your prompt payment. Please find your detailed statement invoice appended below.\n\nThank you for choosing {COMPANY_NAME}."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-850 font-medium leading-relaxed"
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Configure default text. Placeholders like <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{RECIPIENT_NAME}`}</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{RECEIPT_NO}`}</code>, and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-indigo-600">{`{COMPANY_NAME}`}</code> will automatically expand during invoice generation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Branding & DB info */}
        <div className="space-y-6">
          {/* Logo Upload Box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-150 pb-2 mb-3 text-slate-950 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-650" />
              Company Header Logo
            </h3>

            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition ${
                  isDragActive
                    ? "border-slate-800 bg-slate-50 scale-[0.99]"
                    : "border-slate-200 bg-slate-50/20 hover:bg-slate-50/40"
                }`}
              >
                {/* Logo Preview */}
                {logoUrl ? (
                  <div className="relative group mb-3">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white shadow-s p-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:text-white hover:bg-rose-600 rounded-full shadow transition cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                    <Image className="w-8 h-8 text-indigo-600" />
                  </div>
                )}

                <div className="text-xs text-slate-500 max-w-xs space-y-1.5 font-sans leading-relaxed">
                  {isUploading ? (
                    <p className="font-semibold text-indigo-600 flex items-center justify-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving to Google Drive...
                    </p>
                  ) : logoUrl ? (
                    <>
                      <p className="font-bold text-gray-800 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Branding logo registered
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Square (1:1 aspect ratio). {logoUrl.startsWith("data:") ? "Offline Sandbox Storage" : "Google Drive Cloud Hosted"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="font-bold text-indigo-600 hover:underline cursor-pointer">
                          Click to upload logo
                        </span>{" "}
                        or drag &amp; drop file
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Square size, max 5MB (PNG, JPG, SVG)
                      </p>
                    </>
                  )}
                </div>

                <input
                  type="file"
                  id="settings-logo-upload-input"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFile(file);
                  }}
                />
                
                {!logoUrl && !isUploading && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("settings-logo-upload-input")?.click()}
                    className="mt-3 px-3 py-1.5 border border-slate-200 text-[10.5px] font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition cursor-pointer"
                  >
                    Select Logo File
                  </button>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-[10.5px] font-semibold border border-rose-100/60 leading-normal">
                  {uploadError}
                </div>
              )}

              {/* Paste Direct Shareable / Drive link option */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <label className="block text-slate-500 font-bold mb-1">Or Link Google Drive Image / Custom Logo URL</label>
                <input
                  type="text"
                  placeholder="Paste direct image or Google Drive share link..."
                  defaultValue={logoUrl && !logoUrl.startsWith("data:") ? logoUrl : ""}
                  onChange={(e) => {
                    const typed = e.target.value.trim();
                    if (typed) {
                      // Parse Google Drive links to raw direct accessible formats
                      let parsed = typed;
                      const dMatch = typed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                      const idMatch = typed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                      const id = dMatch ? dMatch[1] : (idMatch ? idMatch[1] : "");
                      
                      if (id) {
                        parsed = `https://lh3.googleusercontent.com/d/${id}`;
                      }
                      setLogoUrl(parsed);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Link your company logo using a shareable URL. Google Drive web links are automatically translated into high-performance cloud image URLs.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-205/60 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-150 pb-2 mb-3 text-slate-900 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-900" />
              Portal Visual Themes
            </h3>

            <div className="text-xs font-sans space-y-3">
              <label className="block text-slate-500 font-semibold">Primary Color scheme</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "indigo", label: "Midnight Indigo", bgClass: "bg-indigo-650" },
                  { id: "blue", label: "Classic Ocean Blue", bgClass: "bg-blue-650" },
                  { id: "emerald", label: "Forest Emerald", bgClass: "bg-emerald-650" },
                  { id: "slate", label: "Tech Dark Slate", bgClass: "bg-slate-700" }
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setThemeColor(th.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                      themeColor === th.id
                        ? "border-slate-850 bg-slate-50 ring-2 ring-slate-105"
                        : "border-slate-200 bg-slate-50/45 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${th.bgClass} shrink-0`} />
                    <span className="font-semibold text-[10px] text-gray-700 leading-tight">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold border-b border-slate-150 pb-2 mb-3 text-slate-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-650" />
              Google Drive Folder Upload Hub
            </h3>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Provide a public Google Drive folder URL. Complaint attachments and notices files upload directly into this secure workspace folder.
            </p>
            <div className="space-y-1">
              <label className="block text-slate-500 font-bold mb-1">Drive Folder URL Link</label>
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value.trim())}
                className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 leading-normal mt-1">
                Must look like: <code className="bg-slate-100 p-0.5 rounded text-[9.5px]">https://drive.google.com/drive/folders/FOLDER_ID</code>. Files are instantly shared publicly so residents can retrieve them.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold border-b border-slate-150 pb-2 mb-3 text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-900" />
              Connected Google Sheets Schema
            </h3>
            
            <p className="text-slate-500 leading-relaxed">
              Your configurations, payments, resident rosters, products, and users sync instantly to Google Sheets.
            </p>

            <div className="p-3 bg-slate-50 text-slate-800 rounded-lg border border-slate-200/60 shadow-sm space-y-1">
              <span className="font-bold block text-[10px] uppercase text-slate-400">Active database</span>
              <p className="font-mono text-[9px] break-all text-slate-650">{localStorage.getItem("naz_gas_url") || "Offline Sandbox Mode"}</p>
            </div>
          </div>
        </div>

        {/* Floating actions */}
        <div className="md:col-span-3 flex justify-end">
          {currentUser && (currentUser.Role === "admin" || currentUser.Role === "manager") ? (
            <button
              required
              type="submit"
              id="submit-settings-btn"
              disabled={isSaving}
              className="px-6 py-3 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {isSaving ? (
                <span>Writing to spreadsheet...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences Schema
                </>
              )}
            </button>
          ) : (
            <span className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
              Settings can only be adjusted by administrative users.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
