import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Receipt,
  Wallet,
  TrendingUp,
  User,
  Coffee,
  Fuel,
  Wrench,
  Hotel,
  Tag
} from 'lucide-react';
import type { RideDetails, Expense, SettlementPlan } from '../types';
import { addExpense, fetchExpenses, fetchSettlement } from '../api';

interface ExpensesTabProps {
  ride: RideDetails;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ ride }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<SettlementPlan | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // New expense form state
  const [payerId, setPayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const loadData = async () => {
    try {
      const [expList, setPlan] = await Promise.all([
        fetchExpenses(ride.id),
        fetchSettlement(ride.id),
      ]);
      setExpenses(expList);
      setSettlement(setPlan);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const existing = await fetchExpenses(ride.id);
      if (existing.length === 0 && ride.riders.length > 0) {
        const captain = ride.riders.find((r) => r.is_captain) || ride.riders[0];
        const confirmedIds = ride.riders.filter((r) => r.status === 'confirmed').map((r) => r.id);

        await addExpense(ride.id, {
          payer_id: captain.id,
          payer_name: captain.name,
          amount: 2800.0,
          category: 'food',
          description: 'Highway Breakfast & Snacks for Group',
          split_type: 'EQUAL',
          split_among: confirmedIds,
        });

        if (ride.riders.length > 1) {
          const secondRider = ride.riders[1];
          await addExpense(ride.id, {
            payer_id: secondRider.id,
            payer_name: secondRider.name,
            amount: 700.0,
            category: 'toll',
            description: 'Highway FASTag & Chain Lube',
            split_type: 'EQUAL',
            split_among: confirmedIds,
          });
        }
      }
      loadData();
    };
    init();
  }, [ride.id]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerId || !amount) return;

    const payer = ride.riders.find((r) => r.id === payerId);
    const confirmedIds = ride.riders.filter((r) => r.status === 'confirmed').map((r) => r.id);

    try {
      setSavingExpense(true);
      await addExpense(ride.id, {
        payer_id: payerId,
        payer_name: payer?.name || 'Rider',
        amount: parseFloat(amount),
        category,
        description: description || 'Group Expense',
        split_type: 'EQUAL',
        split_among: confirmedIds,
      });

      setShowAddForm(false);
      setAmount('');
      setDescription('');
      loadData();
    } catch (err) {
      alert('Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(upiId);
    setTimeout(() => setCopiedUpi(null), 2500);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'food':
        return <Coffee className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fuel':
        return <Fuel className="w-3.5 h-3.5 text-amber-400" />;
      case 'toll':
        return <Receipt className="w-3.5 h-3.5 text-sky-400" />;
      case 'repair':
        return <Wrench className="w-3.5 h-3.5 text-rose-400" />;
      case 'stay':
        return <Hotel className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header & KPI Summary */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                Indian UPI Settlement Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
              Group Expenses &amp; Debt Minimization
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Net cash-flow algorithm resolves all member debts in at most $N-1$ transfers with instant <strong className="text-slate-200 font-mono">upi://pay</strong> deep links.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Totals Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-[#0e1219] border border-[#1e2533] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Group Spend</span>
              <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                ₹{settlement?.total_expenses.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-[#0e1219] border border-[#1e2533] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Bills Recorded</span>
              <div className="text-2xl font-extrabold text-slate-200 font-mono mt-0.5">
                {expenses.length} <span className="text-xs font-normal text-slate-400">receipts</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-[#0e1219] border border-[#1e2533] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Optimal Transfers</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {settlement?.settlements.length || 0} <span className="text-xs font-normal text-slate-400">transfers</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Form Modal/Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateExpense} className="bg-[#12161f] border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#1e2533] pb-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Record New Group Highway Expense</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              &times; Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-mono text-[11px] uppercase">Paid By</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                required
                className="w-full bg-[#0e1219] border border-[#232b3b] rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Rider...</option>
                {ride.riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono text-[11px] uppercase">Amount (INR ₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#0e1219] border border-[#232b3b] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono text-[11px] uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0e1219] border border-[#232b3b] rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="food">Food &amp; Breakfast</option>
                <option value="fuel">Fuel Refill</option>
                <option value="toll">Highway Toll / FASTag</option>
                <option value="repair">Puncture &amp; Repair</option>
                <option value="stay">Lodging / Homestay</option>
                <option value="other">Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono text-[11px] uppercase">Description</label>
              <input
                type="text"
                placeholder="e.g. Swathi Delicacy Thatte Idli"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0e1219] border border-[#232b3b] rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#1e2533]">
            <button
              type="submit"
              disabled={savingExpense}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
            >
              {savingExpense ? 'Calculating...' : 'Save & Recalculate Net Split'}
            </button>
          </div>
        </form>
      )}

      {/* Settlements & UPI Deep Links Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Optimal Settlement Transfers (UPI Deep Links)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {settlement?.settlements.length || 0} transfers required
          </span>
        </div>

        {settlement?.settlements.length === 0 ? (
          <div className="p-8 bg-[#12161f] border border-[#1e2533] rounded-2xl text-center text-slate-400 text-xs shadow-lg space-y-1">
            <p className="text-white font-semibold">All accounts settled up!</p>
            <p className="text-slate-400">All member balances sum to zero with zero remaining debt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settlement?.settlements.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#12161f] border border-[#1e2533] hover:border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3 transition"
              >
                <div className="flex items-center justify-between border-b border-[#1e2533] pb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    Transfer #{idx + 1}
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ₹{item.amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Debtor (Payer)</span>
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{item.from_rider_name}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600" />

                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Creditor (Receiver)</span>
                    <div className="font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                      <span>{item.to_rider_name}</span>
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1e2533] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 truncate">
                    <button
                      type="button"
                      onClick={() => handleCopyUpi(item.upi_id)}
                      className="hover:text-amber-400 transition"
                      title="Copy UPI ID"
                    >
                      {copiedUpi === item.upi_id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500 inline mr-1" />
                      )}
                    </button>
                    <span className="truncate">UPI: <strong className="text-slate-200">{item.upi_id}</strong></span>
                  </div>

                  <a
                    href={item.upi_link}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition whitespace-nowrap shadow-md shadow-emerald-600/20"
                  >
                    <span>Pay via UPI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses Ledger Table */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl shadow-xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm uppercase font-mono tracking-wider">
            Expenses Ledger ({expenses.length} Records)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1219] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e2533]">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Paid By</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Split Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2533] text-slate-300">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-[#161c27] transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{e.description}</td>
                  <td className="py-2.5 px-3 text-slate-300">{e.payer_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 bg-[#1a212e] text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border border-[#273245]">
                      {getCategoryIcon(e.category)}
                      <span>{e.category}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400 text-right">
                    ₹{e.amount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    Equal split among confirmed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
