import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import type { RideDetails, Expense, SettlementPlan } from '../types';
import { addExpense, fetchExpenses, fetchSettlement } from '../api';

interface ExpensesTabProps {
  ride: RideDetails;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ ride }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<SettlementPlan | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New expense form state
  const [payerId, setPayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');

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
        const captain = ride.riders.find(r => r.is_captain) || ride.riders[0];
        const confirmedIds = ride.riders.filter(r => r.status === 'confirmed').map(r => r.id);
        
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

    const payer = ride.riders.find(r => r.id === payerId);
    const confirmedIds = ride.riders.filter(r => r.status === 'confirmed').map(r => r.id);

    try {
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
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Expense Split &amp; UPI Ledger</span>
            <h2 className="text-xl font-black text-white">Cost Split &amp; Settlement Transfers</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Net cash-flow debt minimization algorithm resolves group debts with instant UPI payment deep links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Totals Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-1">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400">Total Group Spend</span>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              INR {settlement?.total_expenses.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400">Recorded Bills</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              {expenses.length} bills
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400">Optimal Transfers</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {settlement?.settlements.length || 0} transfers
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Form Modal/Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateExpense} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-white font-bold text-sm">Add Group Expense</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 text-xs">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Paid By</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="">Select Rider</option>
                {ride.riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Amount (INR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="food">Food &amp; Breakfast</option>
                <option value="fuel">Fuel Refill</option>
                <option value="toll">Highway Toll</option>
                <option value="repair">Puncture &amp; Repair</option>
                <option value="stay">Lodging</option>
                <option value="other">Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Breakfast stop"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Save &amp; Recalculate
            </button>
          </div>
        </form>
      )}

      {/* Settlements & UPI Deep Links Grid */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Recommended Settlement Transfers (UPI Deep Links)</span>
        </h3>

        {settlement?.settlements.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
            All accounts are settled up. No outstanding balances.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settlement?.settlements.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg space-y-3 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Transfer #{idx + 1}
                  </span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    INR {item.amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase">Debtor</span>
                    <div className="font-bold text-rose-400">{item.from_rider_name}</div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600" />

                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] text-slate-400 uppercase">Creditor</span>
                    <div className="font-bold text-emerald-400">{item.to_rider_name}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    UPI: <strong className="text-slate-300">{item.upi_id}</strong>
                  </div>

                  <a
                    href={item.upi_link}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition whitespace-nowrap"
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden space-y-3 p-4">
        <h3 className="text-white font-bold text-sm">Expenses Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Paid By</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Split Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-medium text-white">{e.description}</td>
                  <td className="py-2.5 px-3 text-slate-300">{e.payer_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                    INR {e.amount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Equal among confirmed</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
