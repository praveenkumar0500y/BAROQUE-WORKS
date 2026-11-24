import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
  ExternalLink,
  Shield
} from 'lucide-react';
import type { ActionLog } from '../types';
import { fetchActionLogs, deleteRide } from '../api';

interface ActionLogTabProps {
  rideId: string;
  onRideDeleted: () => void;
}

export const ActionLogTab: React.FC<ActionLogTabProps> = ({ rideId, onRideDeleted }) => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchActionLogs(rideId);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [rideId]);

  const handleDelete = async () => {
    try {
      await deleteRide(rideId);
      onRideDeleted();
    } catch (err) {
      alert('Failed to delete ride data');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      log.tool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.input_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.output_summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'BLOCKED_FOR_APPROVAL':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'EXECUTED_ON_APPROVAL':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                Append-Only Audit Ledger
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
              MCP Action Execution Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable record of all autonomous tool invocations, arguments, outcomes, and captain authorization decisions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-3.5 py-2 bg-[#18202d] hover:bg-[#202b3d] text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-[#253247]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>Refresh Trail</span>
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDelete}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-2 bg-[#18202d] text-slate-400 hover:text-white rounded-xl text-xs border border-[#253247]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 bg-[#18202d] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#253247] rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Wipe ride data and reset"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Ride</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'SUCCESS', 'BLOCKED_FOR_APPROVAL', 'EXECUTED_ON_APPROVAL', 'REJECTED'].map((status) => {
              const count = status === 'ALL'
                ? logs.length
                : logs.filter((l) => l.status === status).length;
              const isSelected = filterStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition border ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-[#0e1219] text-slate-400 border-[#1e2533] hover:text-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tools, inputs, outputs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0e1219] border border-[#232b3b] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Structured Table */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1219] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e2533]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Tool Operation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Input Summary</th>
                <th className="py-3 px-4">Output / Payload Summary</th>
                <th className="py-3 px-4 text-center">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2533] text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 font-mono">
                    No actions logged matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="hover:bg-[#161c27] transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          <span className="text-amber-400">{log.tool_name}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(
                              log.status
                            )}`}
                          >
                            {log.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate font-mono text-[11px]" title={log.input_summary}>
                          {log.input_summary}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-sm truncate font-mono text-[11px]" title={log.output_summary}>
                          {log.output_summary}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                          {log.approved_by || 'Auto/Agent'}
                        </td>
                      </tr>

                      {/* Expanded View */}
                      {isExpanded && (
                        <tr className="bg-[#0b0e14]">
                          <td colSpan={6} className="p-4 space-y-3 border-b border-[#1e2533]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                              <div className="p-3 bg-[#12161f] border border-[#1e2533] rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Input Arguments</span>
                                <p className="text-slate-300 text-[11px] whitespace-pre-wrap">{log.input_summary}</p>
                              </div>
                              <div className="p-3 bg-[#12161f] border border-[#1e2533] rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Execution Result</span>
                                <p className="text-slate-300 text-[11px] whitespace-pre-wrap">{log.output_summary}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
