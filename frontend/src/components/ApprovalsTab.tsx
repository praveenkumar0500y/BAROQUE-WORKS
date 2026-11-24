import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  Clock,
  Shield,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  MessageSquare,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

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

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'SAVE_PLAN':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          icon: FileText,
          label: 'DATABASE COMMIT'
        };
      case 'CALENDAR_EXPORT':
        return {
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
          icon: Calendar,
          label: 'CALENDAR INVITE'
        };
      case 'GROUP_SUMMARY':
        return {
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          icon: MessageSquare,
          label: 'WHATSAPP BROADCAST'
        };
      case 'SETTLEMENT_LINKS':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          icon: CreditCard,
          label: 'DEBT SETTLEMENT'
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: Shield,
          label: type
        };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header & Policy Card */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                Controlled By Design Safety Policy
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
              Captain's Approval Gatekeeper
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict binary authorization: Autonomous agents may query and read freely, but <strong>zero state mutations execute without explicit Captain sign-off</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#0e1219] border border-[#232b3b] text-slate-300 text-xs px-3 py-1.5 rounded-xl font-mono">
              <strong className="text-amber-400">{pendingActions.length}</strong> Pending
            </span>
            <span className="bg-[#0e1219] border border-[#232b3b] text-slate-300 text-xs px-3 py-1.5 rounded-xl font-mono">
              <strong className="text-emerald-400">{approvedActions.length}</strong> Approved
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-[#0e1219] border border-[#1e2533] text-slate-300">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">1. Read Autonomy</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Nominatim geocoding, OSRM routing, and Open-Meteo run freely.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#0e1219] border border-[#1e2533] text-slate-300">
            <span className="text-[10px] uppercase font-mono text-amber-400 block">2. Gated Mutations</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Plan saves, calendar invites, broadcasts, and financial transactions are intercepted.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#0e1219] border border-[#1e2533] text-slate-300">
            <span className="text-[10px] uppercase font-mono text-emerald-400 block">3. Append-Only Audit</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Every captain decision is permanently logged in the SQLite audit trail.</p>
          </div>
        </div>
      </div>

      {/* Pending Actions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Pending Actions Awaiting Captain Sign-off ({pendingActions.length})
            </h3>
          </div>
        </div>

        {pendingActions.length === 0 ? (
          <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-8 text-center text-slate-400 space-y-2 shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-white font-bold text-sm">Gate Clear — All Actions Resolved</h4>
            <p className="text-xs max-w-md mx-auto text-slate-400">
              No pending state mutations require review right now. All proposed actions have been executed or reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const isProcessing = processingId === action.id;
              const badge = getActionBadge(action.action_type);
              const BadgeIcon = badge.icon;
              const isExpanded = expandedPayloadId === action.id;

              return (
                <div
                  key={action.id}
                  className="bg-[#12161f] border border-[#1e2533] hover:border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2533] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Tool: <strong className="text-slate-200">{action.tool_name}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Queued: {new Date(action.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold text-sm leading-snug">{action.description}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {action.action_type === 'SAVE_PLAN' && 'Commits highway route checkpoints, fuel stops, and timeline to the active ride database.'}
                      {action.action_type === 'CALENDAR_EXPORT' && 'Compiles an iCalendar (.ics) invite including departure, arrival, and all scheduled stops.'}
                      {action.action_type === 'GROUP_SUMMARY' && 'Generates the official group safety briefing and broadcast text ready to post to WhatsApp.'}
                      {action.action_type === 'SETTLEMENT_LINKS' && 'Computes greedy net-debt minimization transfers and publishes UPI deep links.'}
                    </p>
                  </div>

                  {/* Expandable Payload Inspector */}
                  {action.payload && Object.keys(action.payload).length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedPayloadId(isExpanded ? null : action.id)}
                        className="text-[11px] font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
                      >
                        <span>{isExpanded ? 'Hide Payload Parameters' : 'Inspect Input Parameters'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 p-3 rounded-xl bg-[#0b0e14] border border-[#1e2533] text-[11px] text-slate-300 font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(action.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1e2533]">
                    <button
                      onClick={() => handleReject(action)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-[#18202d] hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-[#253247] hover:border-rose-500/30 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Reject &amp; Discard</span>
                    </button>

                    <button
                      onClick={() => handleApprove(action)}
                      disabled={isProcessing}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
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
        <div className="space-y-4 pt-4 border-t border-[#1e2533]">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm flex items-center gap-2 uppercase font-mono tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approved &amp; Executed Deliverables ({approvedActions.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedActions.map((action) => {
              const res = action.result || {};
              const badge = getActionBadge(action.action_type);

              return (
                <div
                  key={action.id}
                  className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-4 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#1e2533] pb-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      Executed: {action.action_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {action.resolved_at ? new Date(action.resolved_at).toLocaleTimeString() : 'Approved'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium leading-relaxed">{action.description}</p>

                  {/* CALENDAR EXPORT (.ics download) */}
                  {action.action_type === 'CALENDAR_EXPORT' && res.ics_content && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleDownloadICS(res.ics_content, res.filename)}
                        className="w-full py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-sky-600/20"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Calendar (.ics) File</span>
                      </button>
                    </div>
                  )}

                  {/* GROUP SUMMARY BROADCAST */}
                  {action.action_type === 'GROUP_SUMMARY' && res.summary_text && (
                    <div className="space-y-2 pt-1">
                      <div className="bg-[#0b0e14] border border-[#1e2533] rounded-xl p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {res.summary_text}
                      </div>
                      <button
                        onClick={() => handleCopySummary(res.summary_text)}
                        className="w-full py-2 bg-[#18202d] hover:bg-[#202b3d] text-amber-400 border border-[#253247] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Broadcast Message</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* SAVE PLAN or OTHER */}
                  {action.action_type === 'SAVE_PLAN' && (
                    <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1e2533] text-[11px] text-emerald-400 flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Ride plan, stops and fuel checkpoints committed to database.</span>
                    </div>
                  )}

                  {action.action_type === 'SETTLEMENT_LINKS' && (
                    <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1e2533] text-[11px] text-slate-300">
                      Settlements generated. Check the <strong>Expenses &amp; UPI</strong> tab to view transfers.
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
