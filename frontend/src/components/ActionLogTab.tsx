import React, { useState, useEffect } from 'react';
import { History, Trash2, RefreshCw } from 'lucide-react';
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'BLOCKED_FOR_APPROVAL':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      case 'EXECUTED_ON_APPROVAL':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              <h2 className="text-base font-bold text-white">Action Audit Trail</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tool execution history, input arguments, output payloads, and approval decisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/80"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/80 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Ride Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400">Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
            >
              <option value="ALL">All Statuses ({logs.length})</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="BLOCKED_FOR_APPROVAL">BLOCKED FOR APPROVAL</option>
              <option value="EXECUTED_ON_APPROVAL">EXECUTED ON APPROVAL</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search tools, inputs, outputs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Tool Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Input Summary</th>
                <th className="py-3 px-4">Output / Payload Summary</th>
                <th className="py-3 px-4">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No actions logged matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {log.tool_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.input_summary}>
                      {log.input_summary}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={log.output_summary}>
                      {log.output_summary}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.approved_by || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
