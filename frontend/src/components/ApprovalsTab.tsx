import React, { useState } from 'react';
import { CheckCircle2, XCircle, Download, Copy, Check, Mic, Clock, Shield } from 'lucide-react';
import type { PendingAction, RideDetails } from '../types';
import { approvePendingAction, rejectPendingAction } from '../api';

interface ApprovalsTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ ride, onRefreshRide }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const pendingActions = ride.pending_actions.filter((a) => a.status === 'PENDING');
  const approvedActions = ride.pending_actions.filter((a) => a.status === 'APPROVED');

  const handleApprove = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      await approvePendingAction(action.id);
      onRefreshRide();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      await rejectPendingAction(action.id);
      onRefreshRide();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadICS = (icsContent: string, filename: string) => {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'ride_calendar.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Pending Actions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Pending Approvals Queue</h2>
            <p className="text-xs text-slate-400">Review and authorize ride plan mutations, calendar schedules, and broadcasts</p>
          </div>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-mono font-semibold">
            {pendingActions.length} Pending Actions
          </span>
        </div>

        {pendingActions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
            <h4 className="text-white font-semibold text-sm">All Pending Actions Resolved</h4>
            <p className="text-xs max-w-md mx-auto">
              All proposed actions have been authorized or reviewed. Check executed outputs below or use Cockpit for voice interaction.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const isProcessing = processingId === action.id;
              return (
                <div
                  key={action.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-3 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                        {action.action_type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Tool: <strong className="text-slate-200">{action.tool_name}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(action.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-white font-bold text-sm">{action.description}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {action.action_type === 'SAVE_PLAN' && 'Locks the stops, fuel thresholds, and timeline to the ride record.'}
                      {action.action_type === 'CALENDAR_EXPORT' && 'Generates standard iCalendar (.ics) file with all stops and arrival times.'}
                      {action.action_type === 'GROUP_SUMMARY' && 'Prepares the official group safety briefing and timeline broadcast.'}
                      {action.action_type === 'SETTLEMENT_LINKS' && 'Generates minimal settlement transactions and UPI payment links.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReject(action)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(action)}
                      disabled={isProcessing}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                    >
                      {isProcessing ? (
                        <span>Executing...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Approve &amp; Execute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approved Deliverables Section */}
      {approvedActions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approved &amp; Executed Deliverables</span>
            </h3>
            <span className="text-xs text-slate-400">{approvedActions.length} outputs ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedActions.map((action) => {
              const res = action.result || {};
              return (
                <div
                  key={action.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {action.action_type} EXECUTED
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {action.resolved_at ? new Date(action.resolved_at).toLocaleTimeString() : ''}
                    </span>
                  </div>

                  <h4 className="text-white font-semibold text-xs">{action.description}</h4>

                  {action.action_type === 'CALENDAR_EXPORT' && res.ics_content && (
                    <button
                      onClick={() => handleDownloadICS(res.ics_content, res.filename)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .ics Calendar File</span>
                    </button>
                  )}

                  {action.action_type === 'GROUP_SUMMARY' && res.summary_text && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-slate-950 rounded-lg text-[11px] text-slate-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                        {res.summary_text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[🚨🏍️📍📅🛣️⛅💰🛑⚠️•]/g, '-')}
                      </div>
                      <button
                        onClick={() => handleCopySummary(res.summary_text)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                      >
                        {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedSummary ? 'Copied' : 'Copy Broadcast Announcement'}</span>
                      </button>
                    </div>
                  )}

                  {action.action_type === 'SAVE_PLAN' && (
                    <div className="p-2.5 bg-slate-950 rounded-lg text-[11px] text-emerald-400 flex items-center gap-2 border border-slate-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{res.saved_stops_count || ride.stops.length} checkpoints and fuel stops committed to database.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
