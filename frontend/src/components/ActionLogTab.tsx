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
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'EXECUTED_ON_APPROVAL':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Ride Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search tool name, input or payload..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Auto-Executed Reads (SUCCESS)</option>
            <option value="BLOCKED_FOR_APPROVAL">Blocked for Approval</option>
            <option value="EXECUTED_ON_APPROVAL">Executed on Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Log Entries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Tool Invocations</th>
                <th className="py-3 px-4">Status &amp; Gate</th>
                <th className="py-3 px-4">Input Summary</th>
                <th className="py-3 px-4">Output / Result</th>
                <th className="py-3 px-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No action logs matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {log.tool_name}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.input_summary}>
                      {log.input_summary}
                    </td>

                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={log.output_summary}>
                      {log.output_summary}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-slate-400">
                        {log.approved_by}
                      </span>
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
