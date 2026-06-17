import React from "react";
import { DatabaseState, Payment, Expense } from "../types";
import { FileDown, Printer, Calculator } from "lucide-react";

interface CashbookTabProps {
  state: DatabaseState;
}

export default function CashbookTab({ state }: CashbookTabProps) {
  const { payments, expenses, settings, products = [] } = state;
  const currency = settings.currencySymbol || "RM";

  const months = [
    { label: "JAN", code: 0 },
    { label: "FEB", code: 1 },
    { label: "MAR", code: 2 },
    { label: "APR", code: 3 },
    { label: "MAY", code: 4 },
    { label: "JUN", code: 5 },
    { label: "JUL", code: 6 },
    { label: "AUG", code: 7 },
    { label: "SEP", code: 8 },
    { label: "OCT", code: 9 },
    { label: "NOV", code: 10 },
    { label: "DEC", code: 11 }
  ];

  // Dynamically extract available years from payments and expenses
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    years.add(2026); // Default fallback year
    payments.forEach(p => {
      const yr = new Date(p.TIMESTAMP).getFullYear();
      if (yr && !isNaN(yr)) years.add(yr);
    });
    expenses.forEach(e => {
      if (e.YEAR) years.add(e.YEAR);
      if (e.DATE) {
        const yr = new Date(e.DATE).getFullYear();
        if (yr && !isNaN(yr)) years.add(yr);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments, expenses]);

  const [selectedYear, setSelectedYear] = React.useState(2026);

  // 1. Map Income Categories (derived dynamically from Settings or defaults)
  const incomeLines = React.useMemo(() => {
    const cats = (settings.incomeCategories || "Monthly Security Fee, Annual Membership Fee, Additional Access Card, Others, Maintenance, Card Replacement")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    return cats.map(cat => ({
      label: cat.toUpperCase(),
      match: cat
    }));
  }, [settings.incomeCategories]);

  // 2. Map Expenditure Categories (derived dynamically from Settings or defaults)
  const expenseLines = React.useMemo(() => {
    const cats = (settings.expenseCategories || "Payment to Security Company, Stationery, Claim, Electronics & Electrical, Access Card Order, Property, Maintenance, Other (Specify)")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    return cats.map(cat => ({
      label: cat.toUpperCase(),
      match: cat
    }));
  }, [settings.expenseCategories]);

  // Starting balance B/F for January
  const startingBalanceJan = parseFloat(settings.startingBalance) || 16812.11;

  // Compute cell values for months 0 to 11
  const incomeCellValues: Record<string, number[]> = {};
  incomeLines.forEach(line => {
    incomeCellValues[line.label] = Array(12).fill(0);
  });

  const expenseCellValues: Record<string, number[]> = {};
  expenseLines.forEach(line => {
    expenseCellValues[line.label] = Array(12).fill(0);
  });

  // Calculate Income Cell Values
  payments.forEach(p => {
    const d = new Date(p.TIMESTAMP);
    const mIndex = d.getMonth();
    const yr = d.getFullYear();

    if (yr === selectedYear && mIndex >= 0 && mIndex <= 11) {
      const netAmount = p.AMOUNT * p.QUANTITY - (p.DISCOUNT || 0) + (p.TAX || 0);
      
      // Categorize
      let matched = false;

      // 1. Check if there's a defined direct INCOME CATEGORY or Product map that maps to an explicit Cashbook Category
      const directCat = p["INCOME CATEGORY"] || (p as any).CATEGORY || "";
      if (directCat) {
        for (const line of incomeLines) {
          if (directCat.toLowerCase().trim() === line.match.toLowerCase().trim()) {
            incomeCellValues[line.label][mIndex] += netAmount;
            matched = true;
            break;
          }
        }
      }

      // Check product-to-category mapping if not already matched
      if (!matched) {
        const matchedProduct = products.find(prod => (prod.DESCIPTION || "").toLowerCase().trim() === p.PRODUCT.toLowerCase().trim());
        if (matchedProduct && matchedProduct.CATEGORY) {
          for (const line of incomeLines) {
            if (matchedProduct.CATEGORY.toLowerCase().trim() === line.match.toLowerCase().trim()) {
              incomeCellValues[line.label][mIndex] += netAmount;
              matched = true;
              break;
            }
          }
        }
      }

      // 2. Fallback: match by p.PRODUCT description name directly
      if (!matched) {
        for (const line of incomeLines) {
          if (p.PRODUCT.toLowerCase().trim() === line.match.toLowerCase().trim()) {
            incomeCellValues[line.label][mIndex] += netAmount;
            matched = true;
            break;
          }
        }
      }

      // 3. Put in others if not matched
      if (!matched) {
        const othersLabel = incomeLines.find(l => l.label.includes("OTHER"))?.label || incomeLines[incomeLines.length - 1]?.label || "OTHERS";
        if (incomeCellValues[othersLabel]) {
          incomeCellValues[othersLabel][mIndex] += netAmount;
        }
      }
    }
  });

  // Calculate Expense Cell Values
  expenses.forEach(e => {
    // Determine Month and Year
    let mIndex = -1;
    let yr = selectedYear;
    
    if (e.MONTH !== undefined) {
      mIndex = e.MONTH - 1;
      yr = e.YEAR || selectedYear;
    } else if (e.DATE) {
      const d = new Date(e.DATE);
      mIndex = d.getMonth();
      yr = d.getFullYear();
    }

    if (yr === selectedYear && mIndex >= 0 && mIndex <= 11) {
      let matched = false;
      for (const line of expenseLines) {
        if (e.CATEGORY.toLowerCase().trim() === line.match.toLowerCase().trim()) {
          expenseCellValues[line.label][mIndex] += e.AMOUNT;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const otherExpenseLabel = expenseLines.find(l => l.label.includes("OTHER"))?.label || expenseLines[expenseLines.length - 1]?.label || "OTHER (SPECIFY)";
        if (expenseCellValues[otherExpenseLabel]) {
          expenseCellValues[otherExpenseLabel][mIndex] += e.AMOUNT;
        }
      }
    }
  });

  // Compute Total Income & Total Expenditures per month
  const totalIncomeByMonth = Array(12).fill(0);
  const totalExpenditureByMonth = Array(12).fill(0);

  for (let m = 0; m < 12; m++) {
    incomeLines.forEach(line => {
      totalIncomeByMonth[m] += incomeCellValues[line.label][m];
    });
    expenseLines.forEach(line => {
      totalExpenditureByMonth[m] += expenseCellValues[line.label][m];
    });
  }

  // Compute Profit/Loss, Balance B/F, and Balance C/F
  const netProfitByMonth = Array(12).fill(0);
  const balanceBF = Array(12).fill(0);
  const balanceCF = Array(12).fill(0);

  for (let m = 0; m < 12; m++) {
    netProfitByMonth[m] = totalIncomeByMonth[m] - totalExpenditureByMonth[m];

    if (m === 0) {
      balanceBF[m] = startingBalanceJan;
    } else {
      balanceBF[m] = balanceCF[m - 1];
    }

    balanceCF[m] = balanceBF[m] + netProfitByMonth[m];
  }

  // Calculate annual row totals
  const getLineTotal = (recordValues: number[]) => {
    return recordValues.reduce((sum, val) => sum + val, 0);
  };

  const handleExportCSV = () => {
    let csv = "CATEGORY,MONTH_SOURCE,JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,TOTAL\n";
    
    incomeLines.forEach(line => {
      const vals = incomeCellValues[line.label].map(v => v.toFixed(2)).join(",");
      const tot = getLineTotal(incomeCellValues[line.label]).toFixed(2);
      csv += `INCOME,${line.label},${vals},${tot}\n`;
    });
    csv += `INCOME,TOTAL INCOME,${totalIncomeByMonth.map(v => v.toFixed(2)).join(",")},${getLineTotal(totalIncomeByMonth).toFixed(2)}\n`;

    expenseLines.forEach(line => {
      const vals = expenseCellValues[line.label].map(v => v.toFixed(2)).join(",");
      const tot = getLineTotal(expenseCellValues[line.label]).toFixed(2);
      csv += `EXPENDITURE,${line.label},${vals},${tot}\n`;
    });
    csv += `EXPENDITURE,TOTAL EXPENDITURE,${totalExpenditureByMonth.map(v => v.toFixed(2)).join(",")},${getLineTotal(totalExpenditureByMonth).toFixed(2)}\n`;

    csv += `SUMMARY,PROFIT/LOSS,${netProfitByMonth.map(v => v.toFixed(2)).join(",")},${getLineTotal(netProfitByMonth).toFixed(2)}\n`;
    csv += `SUMMARY,BALANCE B/F,${balanceBF.map(v => v.toFixed(2)).join(",")},-\n`;
    csv += `SUMMARY,BALANCE C/F,${balanceCF.map(v => v.toFixed(2)).join(",")},-\n`;

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nazcube-HMS-Cashbook-Report-${selectedYear}.csv`;
    link.click();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="cashbook-tab-view">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dynamic Cashbook Ledger</h2>
          <p className="text-xs text-gray-500">Annual continuous balance statement showing B/F, C/F, and monthly net turnovers of {selectedYear}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Filter Dropdown Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-250 hover:bg-slate-50 transition rounded-lg px-3 py-2 text-xs font-semibold text-slate-705">
            <span className="text-slate-500">Financial Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none outline-none font-bold text-slate-900 cursor-pointer text-xs"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            id="print-cashbook-btn"
            onClick={handlePrintReport}
            className="flex items-center justify-center gap-1 px-3.5 py-2 border border-slate-250 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </button>
          <button
            id="export-cashbook-csv"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1 px-4 py-2 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-sm transition cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Cashbook Table Wrapper with scrolling */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden print-container">
        
        {/* Printable view Header */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-slate-900 tracking-wider">ANNUAL STATISTICAL REPORT</span>
            <h3 className="font-bold text-slate-900 text-base">{settings.companyName || "Nazcube Solution"} Ledger</h3>
            <p className="text-xs text-slate-450 mt-1 font-mono">Financial Year: {selectedYear}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3.5 py-1.5 rounded border border-slate-205 text-slate-800 font-semibold font-sans">
            <Calculator className="w-4 h-4 text-slate-600" />
            Continuous Auto Balancing Enabled
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Main detailed cash table */}
          <table className="w-full text-left text-[10.5px] border-collapse min-w-[1250px]">
            {/* Header row Months */}
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-850">
                <th className="p-3 font-semibold uppercase tracking-wider text-center text-zinc-300 w-36">MONTH</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-slate-100 w-52 max-w-[200px]">SOURCE</th>
                {months.map(m => (
                  <th key={m.label} className="p-2.5 text-center font-bold font-mono tracking-tighter text-zinc-100 hover:bg-slate-800 transition">{m.label}</th>
                ))}
                <th className="p-3 text-right bg-slate-800 text-emerald-300 font-bold uppercase tracking-wider w-36">TOTAL</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              
              {/* === INCOME SECTION === */}
              {incomeLines.map((line, idx) => {
                const vals = incomeCellValues[line.label];
                return (
                  <tr key={line.label} className="border-b border-gray-100 hover:bg-slate-50 transition">
                    {/* Span column visual indicator for first row */}
                    {idx === 0 && (
                      <td rowSpan={incomeLines.length + 1} className="border-r border-gray-200 bg-emerald-900 text-emerald-100 p-3 font-bold uppercase vertical-text tracking-widest text-center text-[10px]" style={{ writingMode: 'vertical-lr', textTransform: 'uppercase' }}>
                        INCOME
                      </td>
                    )}
                    <td className="p-3 font-medium text-slate-700 bg-emerald-50/10 border-r border-gray-100">{line.label}</td>
                    {vals.map((val, mIdx) => (
                      <td key={mIdx} className="p-2.5 text-center font-mono text-gray-500 font-medium font-sans">
                        {val > 0 ? `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                    ))}
                    <td className="p-3 text-right font-bold text-slate-800 bg-slate-50 font-mono">
                      {currency} {getLineTotal(vals).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL INCOME ROW */}
              <tr className="border-b-2 border-slate-800 bg-emerald-50 text-emerald-900 font-bold uppercase">
                <td className="p-3 border-r border-emerald-100">TOTAL INCOME</td>
                {totalIncomeByMonth.map((tot, idx) => (
                  <td key={idx} className="p-2.5 text-center font-bold font-mono">
                    {tot > 0 ? `${currency} ${tot.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                  </td>
                ))}
                <td className="p-3 text-right border-l border-emerald-100 bg-emerald-100 font-mono">
                  {currency} {getLineTotal(totalIncomeByMonth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* === EXPENDITURE SECTION === */}
              {expenseLines.map((line, idx) => {
                const vals = expenseCellValues[line.label];
                return (
                  <tr key={line.label} className="border-b border-gray-100 hover:bg-slate-50 transition">
                    {idx === 0 && (
                      <td rowSpan={expenseLines.length + 1} className="border-r border-gray-200 bg-rose-900 text-rose-100 p-3 font-bold uppercase vertical-text tracking-widest text-center text-[10px]" style={{ writingMode: 'vertical-lr', textTransform: 'uppercase' }}>
                        EXPENDITURE
                      </td>
                    )}
                    <td className="p-3 font-medium text-slate-700 bg-rose-50/10 border-r border-gray-100">{line.label}</td>
                    {vals.map((val, mIdx) => (
                      <td key={mIdx} className="p-2.5 text-center font-mono text-gray-500 font-medium font-sans">
                        {val > 0 ? `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                    ))}
                    <td className="p-3 text-right font-bold text-slate-800 bg-slate-50 font-mono">
                      {currency} {getLineTotal(vals).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL EXPENDITURE ROW */}
              <tr className="border-b-2 border-slate-800 bg-rose-50 text-rose-950 font-bold uppercase">
                <td className="p-3 border-r border-rose-100">TOTAL EXPENDITURE</td>
                {totalExpenditureByMonth.map((tot, idx) => (
                  <td key={idx} className="p-2.5 text-center font-bold font-mono">
                    {tot > 0 ? `${currency} ${tot.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                  </td>
                ))}
                <td className="p-3 text-right border-l border-rose-100 bg-rose-100 font-mono">
                  {currency} {getLineTotal(totalExpenditureByMonth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* === Bottom KPI Balances === */}
              
              {/* PROFIT / LOSS ROW */}
              <tr className="border-b border-slate-900 bg-slate-900 text-slate-100 font-bold uppercase text-[11px]">
                <td colSpan={2} className="p-3 text-left pl-6 tracking-wide select-none">PROFIT / LOSS</td>
                {netProfitByMonth.map((v, idx) => {
                  const isNeg = v < 0;
                  return (
                    <td key={idx} className={`p-2.5 text-center font-mono ${isNeg ? "text-rose-400" : "text-emerald-400"}`}>
                      {v !== 0 ? `${isNeg ? "-" : ""}${currency} ${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                    </td>
                  );
                })}
                <td className="p-3 text-right bg-slate-800 border-l border-slate-700 text-emerald-400 font-mono font-extrabold text-sm">
                  {currency} {getLineTotal(netProfitByMonth).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* BALANCE B/F */}
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-medium">
                <td colSpan={2} className="p-3 text-left pl-6 select-none font-bold">BALANCE B/F (Brought Forward)</td>
                {balanceBF.map((v, idx) => (
                  <td key={idx} className="p-2.5 text-center font-mono font-bold text-slate-800 text-[11px]">
                    {currency} {v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="p-3 text-right bg-zinc-100 text-gray-400 font-mono">-</td>
              </tr>

              {/* BALANCE C/F */}
              <tr className="bg-slate-900 text-white uppercase font-bold text-[11px] border-b border-slate-950">
                <td colSpan={2} className="p-3.5 text-left pl-6 tracking-wide select-none">BALANCE C/F (Carried Forward)</td>
                {balanceCF.map((v, idx) => (
                  <td key={idx} className="p-3 text-center font-mono font-extrabold text-slate-105 text-[12px]">
                    {currency} {v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="p-3.5 text-right bg-slate-950 font-mono text-white font-extrabold text-sm">
                  {currency} {balanceCF[11].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
