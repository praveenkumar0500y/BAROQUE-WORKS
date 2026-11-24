import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Download, Copy, AlertTriangle, FileText, Check, Mic } from 'lucide-react';
import { PendingAction, RideDetails } from '../types';
import { approvePendingAction, rejectPendingAction } from '../api';

interface ApprovalsTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ ride, onRefreshRide, setActiveTab }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const pendingActions = ride.pending_actions.filter((a) => a.status === 'PENDING');
  const approvedActions = ride.pending_actions.filter((a) => a.status === 'APPROVED');
  const rejectedActions = ride.pending_actions.filter((a) => a.status === 'REJECTED');

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
      {/* Controlled by You Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl shadow-lg flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 mt-0.5">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-base">Ride Captain's Approval Gate</h2>
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Controlled by You
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The MCP agent safely ran all discovery tools (parsing chats, querying OSM routes, evaluating Open-Meteo forecasts). 
            <strong> All state mutations, calendar exports, financial settlements, and chat broadcasts are blocked here until you authorize them.</strong>
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Command Enabled: Say "confirm" or "cancel" on the Ride Mode screen to decide hands-free!</span>
          </div>
        </div>
      </div>

      {/* Pending Actions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span>Pending Approvals</span>
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
              {pendingActions.length} Pending
            </span>
          </h3>
          {pendingActions.length === 0 && (
            <span className="text-xs text-emerald-400 font-medium">✓ All pending agent actions resolved!</span>
          )}
        </div>

        {pendingActions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-white font-semibold text-sm">No Pending Approvals</h4>
            <p className="text-xs max-w-md mx-auto">
              All planned actions have been reviewed. View executed deliverables below or switch to Ride Mode for live voice updates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const isProcessing = processingId === action.id;
              return (
                <div
                  key={action.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                        {action.action_type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Tool: <strong className="text-slate-300">{action.tool_name}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Created: {new Date(action.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-white font-bold text-sm">{action.description}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {action.action_type === 'SAVE_PLAN' && 'Will lock the itinerary stops, fuel stops, and timeline to the ride record.'}
                      {action.action_type === 'CALENDAR_EXPORT' && 'Will generate standard .ics iCalendar file ready for import into Apple/Google Calendar.'}
                      {action.action_type === 'GROUP_SUMMARY' && 'Will prepare the official ride safety briefing and timeline for WhatsApp.'}
                      {action.action_type === 'SETTLEMENT_LINKS' && 'Will generate minimal transfer debt graph and UPI deep payment links.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReject(action)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-500 text-slate-300 border border-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Reject Action</span>
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
                          <span>Approve & Execute</span>
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
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Approved & Executed Deliverables</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedActions.map((action) => {
              const res = action.result || {};
              return (
                <div
                  key={action.id}
                  className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ {action.action_type} EXECUTED
                    </span>
                    <span className="text-[10px] text-slate-400">Authorized by Captain</span>
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
                        {res.summary_text}
                      </div>
                      <button
                        onClick={() => handleCopySummary(res.summary_text)}
                        className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                      >
                        {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedSummary ? 'Copied to Clipboard!' : 'Copy WhatsApp Announcement'}</span>
                      </button>
                    </div>
                  )}

                  {action.action_type === 'SAVE_PLAN' && (
                    <div className="p-2 bg-slate-950 rounded-lg text-[11px] text-emerald-400 flex items-center gap-2 border border-slate-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{res.saved_stops_count || ride.stops.length} stops saved & itinerary locked.</span>
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
