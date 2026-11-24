import React, { useState, useEffect, useCallback } from 'react';
import { History, Trash2, RefreshCw, Search, AlertCircle, FolderOpen } from 'lucide-react';
import type { ActionLog } from '../types';
import { fetchActionLogs, deleteRide } from '../api';

interface RideListItem {
  id: string;
  title: string;
  ride_date: string;
  riders_count: number;
}

interface ActionLogTabProps {
  rideId: string;
  ridesList?: RideListItem[];
  onSelectRide?: (id: string) => void;
  onRideDeleted: () => void;
  embedded?: boolean;
  activeSection?: 'log' | 'manage';
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'SUCCESS', label: 'Completed' },
  { value: 'BLOCKED_FOR_APPROVAL', label: 'Queued' },
  { value: 'EXECUTED_ON_APPROVAL', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

type HistorySubTab = 'log' | 'manage';

export const ActionLogTab: React.FC<ActionLogTabProps> = ({
  rideId,
  ridesList = [],
  onSelectRide,
  onRideDeleted,
  embedded = false,
  activeSection,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<HistorySubTab>('log');
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subTab = embedded && activeSection ? activeSection : internalSubTab;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchActionLogs(rideId);
      setLogs(data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Unable to load activity log entries.');
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDelete = async () => {
    try {
      setErrorMsg(null);
      await deleteRide(rideId);
      onRideDeleted();
    } catch {
      setErrorMsg('Failed to delete ride data. Please try again.');
      setConfirmDelete(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      log.tool_name.toLowerCase().includes(q) ||
      log.input_summary.toLowerCase().includes(q) ||
      log.output_summary.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { text: 'text-[var(--status-ok)]', label: 'Completed' };
      case 'BLOCKED_FOR_APPROVAL':
        return { text: 'text-[var(--text-secondary)]', label: 'Awaiting Sign-Off' };
      case 'EXECUTED_ON_APPROVAL':
        return { text: 'text-[var(--status-warn)]', label: 'Approved' };
      case 'REJECTED':
        return { text: 'text-[var(--status-danger)]', label: 'Rejected' };
      default:
        return { text: 'text-[var(--text-muted)]', label: status };
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'w-full space-y-6'}>
      {!embedded && (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">
              05 · History &amp; Storage
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Ride History &amp; Management
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              Track route updates, weather checks, and captain sign-offs, or switch between rides.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="History sections"
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] self-start lg:self-auto"
          >
            <button
              role="tab"
              aria-selected={subTab === 'log'}
              type="button"
              onClick={() => setInternalSubTab('log')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'log'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-4 h-4" strokeWidth={1.5} />
              <span>Activity Log ({logs.length})</span>
            </button>

            <button
              role="tab"
              aria-selected={subTab === 'manage'}
              type="button"
              onClick={() => setInternalSubTab('manage')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'manage'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
              <span>Manage Rides ({ridesList.length || 1})</span>
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[var(--bg-surface)] border border-[var(--status-danger)]/50 rounded-[8px] px-4 py-3 text-xs text-[var(--status-danger)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ACTIVITY LOG */}
      {subTab === 'log' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = filterStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      active
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-mono text-[var(--text-muted)] tabular-nums">
                {filteredLogs.length} / {logs.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search
                  className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder="Search log entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                />
              </div>
              <button
                type="button"
                onClick={loadLogs}
                disabled={loading}
                aria-label="Refresh log"
                className="px-2.5 py-1.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-[6px] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-inset)] text-[var(--text-muted)] uppercase font-mono text-[11px] tracking-[0.06em] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-4 font-medium">Time</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium">Result</th>
                  <th className="py-3 px-4 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-[var(--text-muted)]">
                      No activity entries match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const st = getStatusStyle(log.status);
                    return (
                      <tr key={log.id} className="hover:bg-[var(--bg-hover)]/45">
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)] whitespace-nowrap">
                          {log.tool_name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-mono text-[11px] font-semibold ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 text-[var(--text-muted)] max-w-xs truncate"
                          title={log.input_summary}
                        >
                          {log.input_summary}
                        </td>
                        <td
                          className="py-3 px-4 text-[var(--text-primary)] max-w-sm truncate"
                          title={log.output_summary}
                        >
                          {log.output_summary}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {log.approved_by || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGE RIDES */}
      {subTab === 'manage' && (
        <div className="space-y-5">
          {ridesList.length > 0 && (
            <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] divide-y divide-[var(--border-subtle)]">
              {ridesList.map((r) => {
                const isCurrent = r.id === rideId;
                return (
                  <div
                    key={r.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-display text-base font-semibold text-[var(--text-primary)]">
                        {r.title}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono tabular-nums">
                        {r.ride_date} · {r.riders_count} riders
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCurrent ? (
                        <span className="text-xs font-semibold text-[var(--status-ok)]">
                          Active Ride
                        </span>
                      ) : (
                        onSelectRide && (
                          <button
                            type="button"
                            onClick={() => onSelectRide(r.id)}
                            className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-semibold rounded-[6px] cursor-pointer active:scale-[0.98]"
                          >
                            Switch to Ride
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Delete Current Ride
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[54ch]">
                Permanently removes this ride&apos;s stops, rider roster, expenses, and log
                entries.
              </p>
            </div>

            {confirmDelete ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-[var(--status-danger)] text-[var(--accent-ink)] rounded-[6px] text-xs font-semibold cursor-pointer active:scale-[0.98]"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-medium cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--status-danger)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-semibold flex items-center gap-2 cursor-pointer active:scale-[0.98] shrink-0"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                <span>Delete Ride</span>
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
