import React, { useState } from "react";
import { Payment, Resident, AppSettings } from "../types";
import { X, Printer, Mail, Download, CheckCircle, Loader2 } from "lucide-react";

// Get html2pdf from global window scope as loaded in index.html (eliminates ES modules import errors inside Apps Script)
const html2pdf = (window as any).html2pdf;

interface InvoiceModalProps {
  payment: Payment | null;
  payments: Payment[];
  residents: Resident[];
  settings: AppSettings;
  onClose: () => void;
  onSendEmail?: (email: string, subject: string, htmlBody: string) => Promise<boolean>;
}

export default function InvoiceModal({ payment: rawPayment, payments, residents, settings, onClose, onSendEmail }: InvoiceModalProps) {
  if (!rawPayment) return null;

  const currency = settings.currencySymbol || "RM";

  const siblingPayments = React.useMemo(() => {
    return payments
      .filter((p) => p["RECEIPT NO."] === rawPayment["RECEIPT NO."])
      .map(p => ({
        ...p,
        AMOUNT: Number(p.AMOUNT) || 0,
        QUANTITY: Number(p.QUANTITY) || 0,
        DISCOUNT: Number(p.DISCOUNT) || 0,
        TAX: Number(p.TAX) || 0,
      }));
  }, [rawPayment, payments]);

  const payment = siblingPayments[0] || {
    ...rawPayment,
    AMOUNT: Number(rawPayment.AMOUNT) || 0,
    QUANTITY: Number(rawPayment.QUANTITY) || 0,
    DISCOUNT: Number(rawPayment.DISCOUNT) || 0,
    TAX: Number(rawPayment.TAX) || 0,
  };

  const subtotalSumByReceipt = siblingPayments.reduce((sum, p) => sum + (p.AMOUNT * p.QUANTITY), 0);
  const discountSumByReceipt = siblingPayments.reduce((sum, p) => sum + p.DISCOUNT, 0);
  const taxSumByReceipt = siblingPayments.reduce((sum, p) => sum + p.TAX, 0);
  const totalAmount = subtotalSumByReceipt - discountSumByReceipt + taxSumByReceipt;

  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Email confirmation states
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);
  const [targetRecipient, setTargetRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [customIntroMessage, setCustomIntroMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState("");

  // Cross-reference resident Info
  const resident = residents.find((r) => r["OWNER ID"] === payment["OWNER ID"]);
  const recipientName = payment.TYPE === "Resident" && resident ? resident["OWNER NAME"] : (payment["NON-RESIDENT NAME"] || "Valued Client");
  const recipientPhone = payment.TYPE === "Resident" && resident ? resident["PHONE 1"] : (payment["NON-RESIDENT PHONE"] || "N/A");
  const recipientEmail = payment.TYPE === "Resident" && resident ? resident.EMAIL : (payment["NON-RESIDENT EMAIL"] || "N/A");

  React.useEffect(() => {
    if (payment) {
      const emailVal = payment.TYPE === "Resident" && resident ? (resident.EMAIL || "") : (payment["NON-RESIDENT EMAIL"] || "");
      setTargetRecipient(emailVal === "N/A" ? "" : emailVal);

      // Helper to dynamically replace email placeholders
      const replacePlaceholders = (text: string, params: { receiptNo: string; companyName: string; recipientName: string }) => {
        if (!text) return "";
        return text
          .replace(/\{RECEIPT_NO\}/g, params.receiptNo)
          .replace(/\{COMPANY_NAME\}/g, params.companyName)
          .replace(/\{RECIPIENT_NAME\}/g, params.recipientName);
      };

      const placeholders = {
        receiptNo: payment["RECEIPT NO."] || "N/A",
        companyName: settings.companyName || "Nazcube",
        recipientName: recipientName
      };

      const defaultSubjectTemplate = settings.defaultEmailSubject || "[Receipt/Invoice] {RECEIPT_NO} from {COMPANY_NAME}";
      const defaultBodyTemplate = settings.defaultEmailBody || `Hi {RECIPIENT_NAME},\n\nWe appreciate your prompt payment. Please find your detailed statement invoice for transactions registered under No. {RECEIPT_NO} appended below.\n\nThank you for choosing {COMPANY_NAME}.`;

      setEmailSubject(replacePlaceholders(defaultSubjectTemplate, placeholders));
      setCustomIntroMessage(replacePlaceholders(defaultBodyTemplate, placeholders));
    }
  }, [payment, resident, recipientName, settings.companyName, settings.defaultEmailSubject, settings.defaultEmailBody]);

  const handlePrint = () => {
    const element = document.getElementById("printable-invoice-body");
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${payment["RECEIPT NO."]}</title>
            <!-- Load Font -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <!-- Load Tailwind CSS -->
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                    },
                    colors: {
                      slate: {
                        150: '#e2e8f0',
                        450: '#94a3b8',
                      }
                    }
                  }
                }
              }
            </script>
            <style>
              body {
                font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif;
                background-color: white;
                color: #1e293b;
                margin: 0;
                padding: 16px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-container {
                max-width: 800px;
                margin: 0 auto;
              }
              @media print {
                body {
                  background-color: white;
                  padding: 0;
                  margin: 0;
                }
                .print-container {
                  max-width: 100%;
                  width: 100%;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${element.outerHTML}
            </div>
            <script>
              // Wait for fonts and Tailwind to compile before triggering dialog
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                  setTimeout(function() { window.close(); }, 1500);
                }, 800);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // Fallback direct execution when popup is blocked
      window.print();
    }
  };

  const handleSendEmail = () => {
    setShowConfirmEmail(true);
  };

  const generateEmailHtml = (customMsg: string) => {
    const itemsRows = siblingPayments.map(p => `
      <tr style="border-b: 1px solid #f1f5f9; color: #334155; font-weight: 500;">
        <td style="padding: 12px 10px 12px 0; text-align: left; font-size: 13px; color: #0f172a; font-family: 'Poppins', Arial, sans-serif;">${p.PRODUCT}</td>
        <td style="padding: 12px 10px; text-align: right; font-family: 'Poppins', Arial, sans-serif;">${currency} ${p.AMOUNT.toFixed(2)}</td>
        <td style="padding: 12px 10px; text-align: center; font-family: 'Poppins', Arial, sans-serif;">${p.QUANTITY}</td>
        <td style="padding: 12px 0 12px 10px; text-align: right; font-weight: bold; color: #0f172a; font-family: 'Poppins', Arial, sans-serif;">${currency} ${(p.AMOUNT * p.QUANTITY).toFixed(2)}</td>
      </tr>
    `).join("");

    return `
      <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f1f5f9; padding: 40px 15px; color: #1e293b; line-height: 1.6; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 650px; margin: 0 auto;">
          
          <!-- Customizable introductory message panel -->
          <div style="background-color: #ffffff; border-radius: 12px; padding: 25px; margin-bottom: 20px; border: 1px solid #e2e8f0; font-size: 14px; color: #334155; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); white-space: pre-wrap;">${customMsg}</div>
          
          <!-- Master interactive receipt container -->
          <div style="background-color: #ffffff; border-radius: 12px; padding: 35px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
            
            <!-- Company & Receipt details table grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr>
                <td style="vertical-align: top; text-align: left;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    ${settings.logoUrl ? `
                      <img src="${settings.logoUrl}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; margin-right: 12px; background-color: #ffffff;" />
                    ` : `
                      <span style="display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 6px; background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 14px; margin-right: 10px;">N</span>
                    `}
                    <span style="font-weight: 700; font-size: 18px; color: #0f172a; letter-spacing: -0.025em; font-family: 'Poppins', Arial, sans-serif;">${settings.companyName || "Nazcube Solution"}</span>
                  </div>
                  <div style="font-size: 12px; color: #64748b; max-width: 320px; white-space: pre-line; line-height: 1.5; margin-top: 4px; font-family: 'Poppins', Arial, sans-serif;">${settings.companyAddress || "No. 12, Jalan Nazcube, Selangor, Malaysia"}</div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: 'Poppins', Arial, sans-serif;">
                    ${settings.companyPhone ? `Tel: ${settings.companyPhone}` : ""}
                    ${settings.companyEmail ? ` &bull; Email: ${settings.companyEmail}` : ""}
                  </div>
                </td>
                <td style="vertical-align: top; text-align: right; width: 45%;">
                  <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; text-transform: uppercase; font-family: 'Poppins', Arial, sans-serif;">RECEIPT</h1>
                  <p style="margin: 4px 0 0 0; font-size: 12px; font-family: monospace; color: #64748b; font-weight: 500;">No: ${payment["RECEIPT NO."]}</p>
                  <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: 'Poppins', Arial, sans-serif;">Date: ${new Date(payment.TIMESTAMP).toLocaleString()}</p>
                  <div style="margin-top: 10px;">
                    <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Poppins', Arial, sans-serif;">PAID SUCCESS</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Customer & payment parameters table grid -->
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding-top: 15px; padding-bottom: 15px; margin-bottom: 25px;">
              <tr>
                <td style="width: 50%; padding: 15px 10px 15px 0; vertical-align: top; line-height: 1.5; font-size: 12px; color: #475569; font-family: 'Poppins', Arial, sans-serif;">
                  <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 600; letter-spacing: 0.05em; display: block; margin-bottom: 4px; font-family: 'Poppins', Arial, sans-serif;">BILL TO:</strong>
                  <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">${recipientName}</div>
                  ${payment.TYPE === "Resident" ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Owner ID: ${payment["OWNER ID"]}</div>` : ""}
                  ${recipientPhone && recipientPhone !== "N/A" ? `<div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Contact: ${recipientPhone}</div>` : ""}
                  ${targetRecipient ? `<div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Email: ${targetRecipient}</div>` : ""}
                </td>
                <td style="width: 50%; padding: 15px 0 15px 10px; vertical-align: top; text-align: right; line-height: 1.5; font-size: 12px; color: #475569; font-family: 'Poppins', Arial, sans-serif;">
                  <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 600; letter-spacing: 0.05em; display: block; margin-bottom: 4px; font-family: 'Poppins', Arial, sans-serif;">PAYMENT DETAILS:</strong>
                  <div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Method: <strong style="color: #0f172a; font-family: 'Poppins', Arial, sans-serif;">${payment["PAYMENT TYPE"]}</strong></div>
                  ${payment.REFERENCE ? `
                    <div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Ref/Cheque No: <strong style="color: #4f46e5; font-family: monospace;">${payment.REFERENCE}</strong></div>
                  ` : ""}
                  <div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Category: ${payment.TYPE}</div>
                  <div style="margin-bottom: 2px; font-family: 'Poppins', Arial, sans-serif;">Processed By: <span style="font-family: monospace;">${payment["SUBMIT BY"]}</span></div>
                </td>
              </tr>
            </table>

            <!-- Products matching app table columns -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
              <thead>
                <tr style="border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; font-weight: 600; color: #64748b; letter-spacing: 0.05em;">
                  <th style="padding: 8px 10px 8px 0; text-align: left; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">Description</th>
                  <th style="padding: 8px 10px; text-align: right; width: 20%; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">Price</th>
                  <th style="padding: 8px 10px; text-align: center; width: 15%; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">Qty</th>
                  <th style="padding: 8px 0 8px 10px; text-align: right; width: 25%; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Totals box logic matching app display -->
            <div style="width: 100%; max-width: 250px; margin-left: auto; margin-bottom: 30px; font-size: 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; text-align: left; font-family: 'Poppins', Arial, sans-serif;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155; font-weight: 500; font-family: 'Poppins', Arial, sans-serif;">${currency} ${subtotalSumByReceipt.toFixed(2)}</td>
                </tr>
                ${discountSumByReceipt > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #e11d48; text-align: left; font-weight: 500; font-family: 'Poppins', Arial, sans-serif;">Discount:</td>
                    <td style="padding: 4px 0; text-align: right; color: #e11d48; font-weight: bold; font-family: 'Poppins', Arial, sans-serif;">-${currency} ${discountSumByReceipt.toFixed(2)}</td>
                  </tr>
                ` : ""}
                ${taxSumByReceipt > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; text-align: left; font-family: 'Poppins', Arial, sans-serif;">SST (${settings.taxRate}%):</td>
                    <td style="padding: 4px 0; text-align: right; color: #334155; font-weight: 500; font-family: 'Poppins', Arial, sans-serif;">${currency} ${taxSumByReceipt.toFixed(2)}</td>
                  </tr>
                ` : ""}
                <tr style="border-top: 1px solid #cbd5e1;">
                  <td style="padding: 10px 0 0 0; font-weight: bold; font-size: 13px; color: #0f172a; text-align: left; font-family: 'Poppins', Arial, sans-serif;">TOTAL PAID:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; color: #0f172a; font-weight: 850; font-size: 15px; font-family: 'Poppins', Arial, sans-serif;">${currency} ${totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <!-- Centered bottom decorative notes -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 25px; text-align: center;">
              <p style="margin: 0; font-size: 12px; font-weight: bold; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'Poppins', Arial, sans-serif;">THANK YOU FOR YOUR PAYMENT</p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; font-family: 'Poppins', Arial, sans-serif;">Nazcube HMS &bull; Verified Transaction Sheet</p>
            </div>

          </div>

          <!-- Bottom email system info block -->
          <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: 'Poppins', Arial, sans-serif;">
            <span>Need support? Contact system administrator.</span>
            <span style="font-weight: bold; color: #0f172a; text-transform: uppercase;">${settings.companyName || "NAZCUBE SOLUTION"}</span>
          </div>
        </div>
      </div>
    `;
  };

  const triggerSubmitEmail = async () => {
    if (!targetRecipient || !targetRecipient.includes("@")) {
      setErrorDialogMsg("Email address is empty or invalid. Please check recipient email.");
      return;
    }
    setEmailing(true);
    setErrorDialogMsg("");
    try {
      const bodyHtml = generateEmailHtml(customIntroMessage);
      if (onSendEmail) {
        await onSendEmail(targetRecipient, emailSubject, bodyHtml);
      } else {
        // Fallback simulation delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setEmailing(false);
      setEmailSent(true);
      setShowConfirmEmail(false);
      setShowSuccessDialog(true);
    } catch (err: any) {
      setEmailing(false);
      setErrorDialogMsg(err.toString() || "Email delivery failed via API callback.");
    }
  };

  const handleDownloadTxtFallback = () => {
    const itemsDescription = siblingPayments.map(
      (p) => `Product: ${p.PRODUCT}\n  Qty: ${p.QUANTITY} @ ${currency} ${p.AMOUNT.toFixed(2)} | Subtotal: ${currency} ${(p.AMOUNT * p.QUANTITY).toFixed(2)}\n  Discount: -${currency} ${p.DISCOUNT.toFixed(2)} | SST: ${currency} ${p.TAX.toFixed(2)}`
    ).join("\n------------------------\n");

    const totalSub = siblingPayments.reduce((sum, p) => sum + (p.AMOUNT * p.QUANTITY), 0);
    const totalDisc = siblingPayments.reduce((sum, p) => sum + p.DISCOUNT, 0);
    const totalTaxVal = siblingPayments.reduce((sum, p) => sum + p.TAX, 0);
    const finalReceiptTotal = totalSub - totalDisc + totalTaxVal;

    const element = document.createElement("a");
    const file = new Blob([
      `NAZCUBE SOLUTION OFFICIAL RECEIPT\n` +
      `========================\n` +
      `Receipt No: ${payment["RECEIPT NO."]}\n` +
      `Date: ${new Date(payment.TIMESTAMP).toLocaleDateString()}\n` +
      `Company: ${settings.companyName}\n` +
      `------------------------\n` +
      `Customer: ${recipientName}\n` +
      `------------------------\n` +
      `ITEMS:\n` +
      `${itemsDescription}\n` +
      `------------------------\n` +
      `Subtotal: ${currency} ${totalSub.toFixed(2)}\n` +
      `Discount: ${currency} ${totalDisc.toFixed(2)}\n` +
      `Tax (SST): ${currency} ${totalTaxVal.toFixed(2)}\n` +
      `Total Paid Net: ${currency} ${finalReceiptTotal.toFixed(2)}\n` +
      `Payment Type: ${payment["PAYMENT TYPE"]}\n` +
      (payment.REFERENCE ? `Reference No: ${payment.REFERENCE}\n` : "") +
      `========================\n` +
      `Generated via Nazcube HMS`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Receipt-${payment["RECEIPT NO."]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownload = async () => {
    const element = document.getElementById("printable-invoice-body");
    if (!element) {
      handleDownloadTxtFallback();
      return;
    }

    setDownloadingPdf(true);

    // Helper to convert OKLCH color values to browser-native RGBA values using a temporary 1x1 canvas
    const oklchToRgb = (colorStr: string): string => {
      if (!colorStr || !colorStr.includes("oklch")) return colorStr;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return colorStr;
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      } catch (e) {
        return "rgba(0, 0, 0, 1)";
      }
    };

    // Temporarily intercept window.getComputedStyle to translate any OKLCH colors into standard RGBA format
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle.call(window, elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === "getPropertyValue") {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === "string" && val.includes("oklch")) {
                return oklchToRgb(val);
              }
              return val;
            };
          }
          const val = Reflect.get(target, prop, target); // Crucial context correction to avoid "Illegal Invocation"
          if (typeof val === "function") {
            return val.bind(target);
          }
          if (typeof val === "string" && val.includes("oklch")) {
            return oklchToRgb(val);
          }
          return val;
        }
      });
    };

    const opt = {
      margin:       0.4,
      filename:     `Receipt-${payment["RECEIPT NO."] || "statement"}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error("PDF generation failed, using TXT fallback:", err);
      handleDownloadTxtFallback();
    } finally {
      // Restore standard window.getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
      setDownloadingPdf(false);
    }
  };

  return (
    <div id="invoice-modal-overlay" className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto no-print pt-6 pb-6 md:pt-12 md:pb-12">
      <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Transaction Receipt</h3>
          <div className="flex items-center gap-2">
            <button
              id="print-invoice-btn"
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
              title="Print Receipt / Save as PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              id="send-invoice-email-btn"
              onClick={handleSendEmail}
              disabled={emailing}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition disabled:opacity-50"
              title="Email Receipt to Resident"
            >
              {emailing ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              ) : emailSent ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </button>
            <button
              id="close-invoice-modal-btn"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="border border-gray-150 rounded-xl p-8 bg-slate-50 print-container" id="printable-invoice-body">
          <div className="flex flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={`${settings.companyName} Logo`}
                    className="w-12 h-12 object-contain rounded-lg bg-white border border-slate-200 shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white font-bold text-sm tracking-wider">N</span>
                )}
                <span className="font-bold tracking-tight text-lg text-slate-900">{settings.companyName || "Nazcube Solution"}</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed whitespace-pre-line">
                {settings.companyAddress || "No. 12, Jalan Nazcube, Kajang, Selangor, Malaysia"}
              </p>
              <p className="text-[10.5px] text-slate-450 mt-1">Tel: {settings.companyPhone} | Email: {settings.companyEmail}</p>
            </div>
            <div className="text-right">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">RECEIPT</h1>
              <p className="text-xs font-mono text-slate-500 mt-1">No: {payment["RECEIPT NO."]}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(payment.TIMESTAMP).toLocaleString()}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold ${payment.AMOUNT > 0 ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-slate-100 text-slate-800"}`}>
                PAID SUCCESS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-150 py-4 mb-6 text-xs text-gray-650">
            <div>
              <h4 className="font-medium text-gray-500 uppercase tracking-wider mb-1">BILL TO:</h4>
              <p className="font-semibold text-gray-900 text-sm">{recipientName}</p>
              {payment.TYPE === "Resident" && (
                <p className="text-xs text-gray-500 mt-1">Owner ID: {payment["OWNER ID"]}</p>
              )}
              {recipientPhone !== "N/A" && <p className="mt-0.5">Contact: {recipientPhone}</p>}
              {recipientEmail !== "N/A" && <p className="mt-0.5">Email: {recipientEmail}</p>}
            </div>
            <div className="text-right">
              <h4 className="font-medium text-gray-500 uppercase tracking-wider mb-1">PAYMENT DETAILS:</h4>
              <p className="mt-0.5">Method: <strong className="text-gray-900">{payment["PAYMENT TYPE"]}</strong></p>
              {payment.REFERENCE && (
                <p className="mt-0.5">Ref/Cheque No: <strong className="text-gray-900 font-mono text-indigo-600">{payment.REFERENCE}</strong></p>
              )}
              <p className="mt-0.5">Category: {payment.TYPE}</p>
              <p className="mt-0.5">Processed By: <span className="font-mono">{payment["SUBMIT BY"]}</span></p>
              <p className="mt-0.5 text-gray-400 text-[10px]">ID: {payment["RECORD ID"]}</p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-left font-medium">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {siblingPayments.map((p, index) => (
                <tr key={p["RECORD ID"] || index} className="border-b border-gray-100 text-gray-800 font-medium">
                  <td className="py-3 text-sm">{p.PRODUCT}</td>
                  <td className="py-3 text-right">{currency} {p.AMOUNT.toFixed(2)}</td>
                  <td className="py-3 text-center">{p.QUANTITY}</td>
                  <td className="py-3 text-right">{currency} {(p.AMOUNT * p.QUANTITY).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-6">
            <div className="w-64 text-xs space-y-2 text-gray-650">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{currency} {subtotalSumByReceipt.toFixed(2)}</span>
              </div>
              {discountSumByReceipt > 0 && (
                <div className="flex justify-between text-rose-500 font-medium">
                  <span>Discount:</span>
                  <span>-{currency} {discountSumByReceipt.toFixed(2)}</span>
                </div>
              )}
              {taxSumByReceipt > 0 && (
                <div className="flex justify-between">
                  <span>SST ({settings.taxRate}%):</span>
                  <span>{currency} {taxSumByReceipt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2 text-slate-800">
                <span>TOTAL PAID:</span>
                <span>{currency} {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-4 mt-8 text-center">
            <p className="text-xs text-slate-500 font-bold font-sans">THANK YOU FOR YOUR PAYMENT</p>
            <p className="text-[10px] text-slate-400 mt-1">Nazcube HMS &bull; Verified Transaction Sheet</p>
          </div>
        </div>

        {/* Footer Notes in Modal */}
        <div className="mt-4 flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
          <span>Need support? Contact system administrator.</span>
          <span className="font-bold text-slate-900">NAZCUBE SOLUTION</span>
        </div>
      </div>

      {/* Email Invoice Confirmation Dialog Overlay */}
      {showConfirmEmail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200">
          <div className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setShowConfirmEmail(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 border-b border-gray-100 pb-3 mb-4">
              <Mail className="w-5 h-5 font-bold" />
              <h4 className="font-bold text-gray-900 text-base">Send Receipt via Email</h4>
            </div>

            <div className="space-y-4">
              {errorDialogMsg && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-900">Delivery Status:</span>
                    <span className="leading-relaxed">{errorDialogMsg}</span>
                  </div>
                  
                  {errorDialogMsg.toLowerCase().includes("unknown action") && (
                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 space-y-2 mt-1">
                      <p className="font-bold text-amber-900 leading-tight">Action Required: Update Google Apps Script</p>
                      <p className="text-amber-800 leading-relaxed text-[11px]">
                        Your Google Spreadsheet runs an older version of the script which does not understand email requests. Follow these steps to unlock automatic receipts:
                      </p>
                      
                      <ol className="text-[10.5px] text-amber-950 space-y-1 pl-4 list-decimal list-outside font-medium leading-relaxed">
                        <li>Open your tied Google Spreadsheet.</li>
                        <li>Go to <strong>Extensions &gt; Apps Script</strong> at the top menu.</li>
                        <li>Replace the old script code with the contents of your updated <strong>google-apps-script.js</strong> file.</li>
                        <li>Click <strong>Deploy &gt; Manage Deployments</strong>. Select the active deployment, click the <strong>Pencil icon (Edit)</strong>, choose <strong>Version: New Version</strong>, and click <strong>Deploy</strong>.</li>
                      </ol>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/40">
                    <a
                      href={`mailto:${targetRecipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
                        `${customIntroMessage}\n\n=========================\nRECEIPT DETAILS\n=========================\n` +
                        `Receipt No: ${payment["RECEIPT NO."]}\n` +
                        `Date: ${new Date(payment.TIMESTAMP).toLocaleString()}\n` +
                        `Amount Paid: ${currency} ${totalAmount.toFixed(2)}\n` +
                        `Payment Mechanism: ${payment["PAYMENT TYPE"]}\n` +
                        (payment.REFERENCE ? `Reference Key: ${payment.REFERENCE}\n` : "") +
                        `-------------------------\n` +
                        siblingPayments.map(p => `• ${p.PRODUCT} x${p.QUANTITY} (${currency} ${(p.AMOUNT * p.QUANTITY).toFixed(2)})`).join("\n") +
                        `\n=========================\nThank you for choosing ${settings.companyName || "us"}.`
                      )}`}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition text-[11px] inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Send via Device Mail Client
                    </a>
                    
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${customIntroMessage}\n\n=========================\nRECEIPT DETAILS\n=========================\n` +
                          `Receipt No: ${payment["RECEIPT NO."]}\n` +
                          `Date: ${new Date(payment.TIMESTAMP).toLocaleString()}\n` +
                          `Amount Paid: ${currency} ${totalAmount.toFixed(2)}\n` +
                          `Payment Mechanism: ${payment["PAYMENT TYPE"]}\n` +
                          (payment.REFERENCE ? `Reference Key: ${payment.REFERENCE}\n` : "") +
                          `-------------------------\n` +
                          siblingPayments.map(p => `• ${p.PRODUCT} x${p.QUANTITY} (${currency} ${(p.AMOUNT * p.QUANTITY).toFixed(2)})`).join("\n") +
                          `\n=========================\nThank you for choosing ${settings.companyName || "us"}.`
                        );
                        alert("Receipt details successfully copied to clipboard!");
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-200 text-slate-800 rounded-lg hover:bg-amber-100/60 font-semibold transition text-[11px]"
                    >
                      Copy Copyable Text
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Recipient Name</label>
                <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  {recipientName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">To Email Address</label>
                <input
                  type="email"
                  required
                  value={targetRecipient}
                  onChange={(e) => setTargetRecipient(e.target.value)}
                  placeholder="resident@example.com"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Introductory Message (Customizable)</label>
                <textarea
                  rows={4}
                  value={customIntroMessage}
                  onChange={(e) => setCustomIntroMessage(e.target.value)}
                  placeholder="Add a friendly custom message..."
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-slate-500 text-[11px] leading-relaxed">
                <span className="font-semibold block mb-1 text-slate-800">What's included in the email?</span>
                A beautifully responsive HTML transaction sheet listing products ({siblingPayments.length} items totaling {currency} {totalAmount.toFixed(2)}), payment type, dates, discounts, tax, and company branding headers will be appended.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmEmail(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                disabled={emailing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={triggerSubmitEmail}
                disabled={emailing}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:bg-indigo-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {emailing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Confirm Send Email"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Sent Success Dialog Overlay */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="bg-white text-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">Receipt Dispatched!</h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              The receipt statement was sent successfully to <span className="font-semibold text-gray-800">{targetRecipient}</span> via Gmail Delivery Service.
            </p>
            <button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Got it, Thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
