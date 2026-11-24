import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, ArrowRight, ExternalLink, AlertCircle, Receipt } from 'lucide-react';
import type { RideDetails, Expense, SettlementPlan } from '../types';
import { RIDE_PHOTOS } from '../assets/ridePhotos';
import { addExpense, fetchExpenses, fetchSettlement } from '../api';

interface ExpensesTabProps {
  ride: RideDetails;
}

type ExpensesSubTab = 'ledger' | 'settlements';

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ ride }) => {
  const [subTab, setSubTab] = useState<ExpensesSubTab>('ledger');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlement, setSettlement] = useState<SettlementPlan | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [payerId, setPayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
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
  }, [ride.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerId || !amount) return;

    const payer = ride.riders.find((r) => r.id === payerId);
    const confirmedIds = ride.riders.filter((r) => r.status === 'confirmed').map((r) => r.id);

    try {
      setErrorMsg(null);
      await addExpense(ride.id, {
        payer_id: payerId,
        payer_name: payer?.name || 'Rider',
        amount: parseFloat(amount),
        category,
        description: description.trim() || 'Shared Ride Expense',
        split_type: 'EQUAL',
        split_among: confirmedIds,
      });

      setShowAddForm(false);
      setAmount('');
      setDescription('');
      loadData();
    } catch {
      setErrorMsg('Failed to save expense. Check the amount and try again.');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--ochre)]">
              04 · Shared Ledger
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Split Bills &amp; UPI Settlements
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              Log shared fuel, meals, and tolls, then settle up with minimal UPI transfers.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Expense sections"
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] self-start"
          >
            <button
              role="tab"
              aria-selected={subTab === 'ledger'}
              type="button"
              onClick={() => setSubTab('ledger')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'ledger'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Receipt className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.5} />
              <span>Expenses Ledger ({expenses.length})</span>
            </button>

            <button
              role="tab"
              aria-selected={subTab === 'settlements'}
              type="button"
              onClick={() => setSubTab('settlements')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'settlements'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[var(--forest)]" strokeWidth={1.5} />
              <span>Settle Up ({settlement?.settlements.length || 0})</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[180px] rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-inset)] group">
          <img
            src={RIDE_PHOTOS.convexMirror}
            alt="Roadside mountain safety mirror reflecting two motorcycle riders in fog"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex flex-col justify-end p-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80">
              Crew Settlement
            </span>
            <span className="text-sm font-semibold text-[#FAF9F6] tabular-nums">
              {ride.riders.filter((r) => r.status === 'confirmed').length} riders splitting ·{' '}
              {expenses.length} bills
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Summary Strip */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Total Group Spend</span>
            <div className="text-2xl font-semibold text-[var(--alpine)] font-mono tabular-nums mt-1">
              INR {settlement?.total_expenses.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-[var(--alpine-tint)] text-[var(--alpine)] flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Recorded Bills</span>
            <div className="text-2xl font-semibold text-[var(--accent)] font-mono tabular-nums mt-1">
              {expenses.length} bills
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Transfers Required</span>
            <div className="text-2xl font-semibold text-[var(--forest)] font-mono tabular-nums mt-1">
              {settlement?.settlements.length || 0} transfers
            </div>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-[var(--forest-tint)] text-[var(--forest)] flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-[var(--bg-surface)] border border-[var(--status-danger)]/50 rounded-[8px] px-4 py-3 text-xs text-[var(--status-danger)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUB-TAB 1: EXPENSES LEDGER */}
      {subTab === 'ledger' && (
        <div key="ledger" className="animate-panel-enter space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={ride.riders.length === 0}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-45 text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>{showAddForm ? 'Close Form' : 'Record Expense'}</span>
            </button>
          </div>

          {ride.riders.length === 0 && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 text-sm text-[var(--text-muted)]">
              Add confirmed riders in <strong className="text-[var(--text-primary)]">Riders &amp; Bikes</strong> before logging shared bills.
            </div>
          )}

          {showAddForm && (
            <form
              onSubmit={handleCreateExpense}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                  Add Group Expense
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1.5">
                    Paid By
                  </label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    required
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                  <label className="block text-[var(--text-secondary)] font-medium mb-1.5">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 1200"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-2.5 text-sm text-[var(--text-primary)] font-mono tabular-nums placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                  <label className="block text-[var(--text-secondary)] font-medium mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Group breakfast"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] cursor-pointer active:scale-[0.98]"
                >
                  Save &amp; Recalculate
                </button>
              </div>
            </form>
          )}

          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Recorded Bills
              </h2>
              <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                Split equally among confirmed riders
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] uppercase font-mono text-[11px] tracking-wider border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-3 px-5 font-medium">Description</th>
                    <th className="py-3 px-4 font-medium">Paid By</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-5 font-medium">Split Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-[var(--text-muted)]">
                        No expenses logged yet. Click Record Expense when your group splits a bill.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[var(--bg-hover)]/45">
                        <td className="py-3.5 px-5 font-medium text-[var(--text-primary)]">
                          {exp.description}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">{exp.payer_name}</td>
                        <td className="py-3.5 px-4 font-mono uppercase text-[11px] text-[var(--accent)]">
                          {exp.category}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[var(--text-primary)] tabular-nums text-right">
                          INR {exp.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-[var(--text-muted)]">
                          Equal among confirmed
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 2: SETTLE UP (UPI) */}
      {subTab === 'settlements' && (
        <section key="settlements" className="animate-panel-enter space-y-4">
          {!settlement || settlement.settlements.length === 0 ? (
            <div className="p-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] space-y-2">
              <CreditCard className="w-6 h-6 text-[var(--status-ok)]" strokeWidth={1.5} />
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                All accounts balanced
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                No outstanding transfers are needed right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settlement.settlements.map((item, idx) => (
                <div
                  key={idx}
                  className="card-interactive bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 space-y-4"
                >
                  <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-3">
                    <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                      Transfer #{idx + 1}
                    </span>
                    <span className="text-lg font-semibold text-[var(--status-ok)] font-mono tabular-nums">
                      INR {item.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                        From
                      </span>
                      <div className="font-semibold text-[var(--status-danger)]">
                        {item.from_rider_name}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} />

                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                        To
                      </span>
                      <div className="font-semibold text-[var(--status-ok)]">
                        {item.to_rider_name}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                      UPI: <span className="text-[var(--text-primary)]">{item.upi_id}</span>
                    </div>

                    <a
                      href={item.upi_link}
                      className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-xs rounded-[6px] flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
                    >
                      <span>Pay via UPI</span>
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
