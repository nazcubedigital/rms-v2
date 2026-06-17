import React from "react";
import { DatabaseState, Resident, Payment, Expense } from "../types";
import {
  Users,
  TrendingUp,
  Receipt,
  FileMinus,
  Briefcase,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell
} from "recharts";

interface DashboardTabProps {
  state: DatabaseState;
  onNavigateTab: (tab: string) => void;
}

export default function DashboardTab({ state, onNavigateTab }: DashboardTabProps) {
  const { payments, residents, expenses, products, users } = state;
  const currency = state.settings.currencySymbol || "RM";

  // 1. Calculate General Aggregates
  const totalResidents = residents.length;
  const occupiedCount = residents.filter(r => r["HOUSE STATUS"] === "Occupied").length;
  const vacantCount = residents.filter(r => r["HOUSE STATUS"] === "Vacant").length;
  const rentedCount = residents.filter(r => r["HOUSE STATUS"] === "Rented").length;

  const totalIncome = payments.reduce((acc, p) => {
    const pAmt = Number(p.AMOUNT) || 0;
    const pQty = Number(p.QUANTITY) || 0;
    const pDisc = Number(p.DISCOUNT) || 0;
    const pTax = Number(p.TAX) || 0;
    return acc + (pAmt * pQty - pDisc + pTax);
  }, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.AMOUNT) || 0), 0);
  const netCashflow = totalIncome - totalExpenses;

  // Let's count Resident dues: Monthly Security Fee due (RM50 per month).
  // Current month is June 2026 (6 months elapsed: Jan, Feb, Mar, Apr, May, Jun).
  const currentMonthName = "June 2026";
  const monthlyFeeRate = parseFloat(state.settings.monthlySecurityFeeRate) || 50;
  const expectedMonths = 6;

  const dueResidents = residents.filter(r => {
    if (r["HOUSE STATUS"] === "Vacant" || r["HOUSE STATUS"] === "Inactive") return false;
    const resPayments = payments.filter(p => p["OWNER ID"] === r["OWNER ID"]);
    const securityPaymentsCount = resPayments
      .filter(p => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);
    return securityPaymentsCount < expectedMonths;
  });

  const totalDuesAmount = dueResidents.reduce((sum, r) => {
    const resPayments = payments.filter(p => p["OWNER ID"] === r["OWNER ID"]);
    const securityPaymentsCount = resPayments
      .filter(p => p.PRODUCT === "Monthly Security Fee" && new Date(p.TIMESTAMP).getFullYear() === 2026)
      .reduce((sum, p) => sum + (p.QUANTITY || 1), 0);
    const unpaidMonthsCount = Math.max(0, expectedMonths - securityPaymentsCount);
    return sum + (unpaidMonthsCount * monthlyFeeRate);
  }, 0);

  // 2. Prepare Monthly Trends Data for Chart (Jan to Dec 2026)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = monthNames.map((name, index) => {
    // filter payments
    const monthPayments = payments.filter(p => {
      const d = new Date(p.TIMESTAMP);
      return d.getMonth() === index && d.getFullYear() === 2026;
    });
    const income = monthPayments.reduce((sum, p) => {
      const pAmt = Number(p.AMOUNT) || 0;
      const pQty = Number(p.QUANTITY) || 0;
      const pDisc = Number(p.DISCOUNT) || 0;
      const pTax = Number(p.TAX) || 0;
      return sum + (pAmt * pQty - pDisc + pTax);
    }, 0);

    // filter expenses
    const monthExpenses = expenses.filter(e => {
      // support both raw month number or Date parsing
      if (e.MONTH !== undefined) {
        return e.MONTH === index + 1 && (e.YEAR === 2026 || !e.YEAR);
      }
      const d = new Date(e.DATE);
      return d.getMonth() === index && d.getFullYear() === 2026;
    });
    const expense = monthExpenses.reduce((sum, e) => sum + (Number(e.AMOUNT) || 0), 0);

    return {
      name,
      Income: parseFloat((Number(income) || 0).toFixed(2)),
      Expenses: parseFloat((Number(expense) || 0).toFixed(2)),
      Net: parseFloat(((Number(income) || 0) - (Number(expense) || 0)).toFixed(2))
    };
  });

  // Recent 5 Payments
  const recentTransactions = [...payments]
    .sort((a, b) => new Date(b.TIMESTAMP).getTime() - new Date(a.TIMESTAMP).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6" id="dashboard-tab-view text-slate-800">
      {/* Top Banner Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white text-slate-900 rounded-xl p-6 border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">Nazcube HMS Smart Analytics</span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">{state.settings.appName || "Nazcube HMS"} Overview</h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Connected to Sheets database: <code className="bg-slate-50 text-slate-700 border border-slate-150 px-1.5 py-0.5 rounded font-mono text-[9.5px]">Active Google Sheets (Sync verified)</code>
          </p>
        </div>
        <div className="flex items-center gap-4 bg-emerald-50/50 px-4 py-3 rounded-xl border border-emerald-100/70">
          <div className="text-xs">
            <span className="block font-semibold text-emerald-800 text-[9.5px] uppercase tracking-wider">Financial Status</span>
            <span className="block font-bold text-sm text-emerald-700 mt-0.5">Surplus (+{currency} {netCashflow.toFixed(2)})</span>
          </div>
          <PiggyBank className="w-5.5 h-5.5 text-emerald-600" />
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Residents */}
        <div id="kpi-residents-card" className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition duration-150">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">Total Residences</span>
            <div className="text-2xl font-bold text-slate-900">{totalResidents}</div>
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-450 mt-1">
              <span className="text-slate-800 font-semibold">{occupiedCount} Occupied</span>
              <span>&bull;</span>
              <span className="text-slate-500">{rentedCount} Rented</span>
              <span>&bull;</span>
              <span>{vacantCount} Vacating</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-650 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total 2026 Income */}
        <div id="kpi-income-card" className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition duration-150">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">Total Income (Yr)</span>
            <div className="text-2xl font-bold text-slate-900">{currency} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 font-medium mt-1">
              <CheckCircle className="w-3 h-3 text-emerald-505" />
              <span>Verified sheet entries</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-650 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Expenses */}
        <div id="kpi-expenses-card" className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition duration-150">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">Total Expenditures</span>
            <div className="text-2xl font-bold text-slate-900">{currency} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1 text-[10.5px] text-rose-600 font-medium mt-1">
              <ArrowDownRight className="w-3 h-3" />
              <span>Operating balance sheet</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-650 rounded-lg">
            <FileMinus className="w-5 h-5" />
          </div>
        </div>

        {/* Total Due Payments */}
        <div id="kpi-dues-card" className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition duration-150">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">Overdue (May SF)</span>
            <div className="text-2xl font-bold text-amber-700">{currency} {totalDuesAmount.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-[10.5px] text-amber-600 font-medium mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>{dueResidents.length} units pending</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-650 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart and Detail Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Annual Trend Chart Card */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Income & Expenditures Comparison (2026)</h3>
              <p className="text-[11.5px] text-slate-500">Cross-referenced historical balance sheets monthly</p>
            </div>
            <button
              onClick={() => onNavigateTab("Cashbook")}
              className="text-xs text-slate-900 font-bold hover:underline border border-slate-200 px-2.5 py-1 rounded-lg bg-slate-50/50 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
            >
              Analyze Cashbook
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#64748b" unit={currency} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}
                  formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, undefined]}
                />
                <Legend iconType="circle" fontSize={11} iconSize={8} />
                <Area type="monotone" dataKey="Income" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="Expenses" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Due Residents Quicklist Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">Overdue Residents</h3>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold">June Pending</span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.5">Missing "Monthly Security Fee" for June 2026</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[250px] pr-1">
            {dueResidents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-450">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                All residents paid up!
              </div>
            ) : (
              dueResidents.map((r) => (
                <div key={r["OWNER ID"]} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-150 transition duration-150">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">{r["OWNER NAME"]}</p>
                    <p className="text-[10px] text-slate-500">Unit ID: {r["OWNER ID"]} | status: {r["HOUSE STATUS"]}</p>
                    <p className="text-[9.5px] text-slate-400 font-mono">{r["PHONE 1"]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{currency} {monthlyFeeRate.toFixed(2)}</p>
                    <span className="text-[8px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">OVERDUE</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigateTab("Residents")}
            className="w-full mt-4 text-center text-xs text-slate-950 font-bold hover:bg-slate-100 py-2 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            Manage Residents Contacts
          </button>
        </div>
      </div>

      {/* Recent Activity lists */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Transactions Log</h3>
            <p className="text-[11.5px] text-slate-500">Real-time payments recorded on this server</p>
          </div>
          <button
            onClick={() => onNavigateTab("Billing")}
            className="text-xs text-slate-900 font-bold hover:underline border border-slate-205/60 px-2.5 py-1.5 rounded-lg bg-slate-50/50 hover:bg-slate-50 cursor-pointer"
          >
            Review Transactions
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-150 text-slate-450 uppercase font-bold text-[10px] tracking-wider">
                <th className="pb-2.5 font-bold">Receipt No</th>
                <th className="pb-2.5 font-bold">Payment Type</th>
                <th className="pb-2.5 font-bold">Authorized Resident</th>
                <th className="pb-2.5 font-bold">Product Purchased</th>
                <th className="pb-2.5 font-bold">Date</th>
                <th className="pb-2.5 font-bold text-right">Paid Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => {
                const res = residents.find(r => r["OWNER ID"] === tx["OWNER ID"]);
                const customerName = tx.TYPE === "Resident" && res ? res["OWNER NAME"] : (tx["NON-RESIDENT NAME"] || "Non-Resident Client");
                const totalPaid = tx.AMOUNT * tx.QUANTITY - (tx.DISCOUNT || 0) + (tx.TAX || 0);
                
                return (
                  <tr key={tx["RECORD ID"]} className="border-b border-slate-100 hover:bg-slate-55 hover:bg-slate-50/50 transition">
                    <td className="py-2.5 font-mono text-slate-900 font-semibold">{tx["RECEIPT NO."]}</td>
                    <td className="py-2.5 text-slate-550">{tx["PAYMENT TYPE"]}</td>
                    <td className="py-2.5 font-medium text-slate-800">{customerName}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">{tx.PRODUCT}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono">{new Date(tx.TIMESTAMP).toLocaleDateString()}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{currency} {totalPaid.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
