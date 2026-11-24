import React, { useState } from 'react';
import { CheckCircle2, XCircle, Download, Copy, Check, ShieldCheck, FileCheck } from 'lucide-react';
import type { PendingAction, RideDetails } from '../types';
import { RIDE_PHOTOS } from '../assets/ridePhotos';
import { approvePendingAction, rejectPendingAction } from '../api';

interface ApprovalsTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

const ACTION_TITLES: Record<string, string> = {
  SAVE_PLAN: 'Lock Ride Plan & Stops',
  CALENDAR_EXPORT: 'Calendar Invite (.ics)',
  GROUP_SUMMARY: 'Group Chat Announcement',
  SETTLEMENT_LINKS: 'UPI Settlement Links',
};

type ApprovalsSubTab = 'pending' | 'approved';

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ ride, onRefreshRide }) => {
  const [subTab, setSubTab] = useState<ApprovalsSubTab>('pending');
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
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--forest)]">
              03 · Sign-off &amp; Exports
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Captain Approvals
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              Review and authorize ride saves, calendar files, and group announcements before export.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Approval sections"
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] self-start"
          >
            <button
              role="tab"
              aria-selected={subTab === 'pending'}
              type="button"
              onClick={() => setSubTab('pending')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'pending'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[var(--ochre)]" strokeWidth={1.5} />
              <span>Pending Review ({pendingActions.length})</span>
            </button>

            <button
              role="tab"
              aria-selected={subTab === 'approved'}
              type="button"
              onClick={() => setSubTab('approved')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'approved'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[var(--forest)]" strokeWidth={1.5} />
              <span>Approved Exports ({approvedActions.length})</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[180px] rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-inset)] group">
          <img
            src={RIDE_PHOTOS.cockpitPov}
            alt="Motorcycle handlebar view riding through foggy mountain trees"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex flex-col justify-end p-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80">
              Ride Captain Gate
            </span>
            <span className="text-sm font-semibold text-[#FAF9F6] tabular-nums">
              {pendingActions.length} pending · {approvedActions.length} approved
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: PENDING REVIEW */}
      {subTab === 'pending' && (
        <section key="pending" className="animate-panel-enter">
          {pendingActions.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-8 space-y-3">
              <CheckCircle2 className="w-6 h-6 text-[var(--status-ok)]" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                All items reviewed
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-[54ch]">
                There are no pending actions left to approve. Open Approved Exports for your
                calendar invite and group announcement.
              </p>
              {approvedActions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubTab('approved')}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-medium rounded-[6px] cursor-pointer"
                >
                  Open Approved Exports
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] divide-y divide-[var(--border-subtle)]">
              {pendingActions.map((action) => {
                const isProcessing = processingId === action.id;
                return (
                  <div key={action.id} className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-[4px] ${
                          action.action_type === 'SAVE_PLAN'
                            ? 'bg-[var(--forest-tint)] text-[var(--forest)]'
                            : action.action_type === 'CALENDAR_EXPORT'
                            ? 'bg-[var(--alpine-tint)] text-[var(--alpine)]'
                            : action.action_type === 'SETTLEMENT_LINKS'
                            ? 'bg-[var(--ochre-tint)] text-[var(--ochre)]'
                            : 'bg-[var(--accent-tint)] text-[var(--accent)]'
                        }`}
                      >
                        {ACTION_TITLES[action.action_type] || action.action_type}
                      </span>
                      <span className="font-mono tabular-nums">
                        {new Date(action.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-medium text-[var(--text-primary)]">
                        {action.description}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[62ch]">
                        {action.action_type === 'SAVE_PLAN' &&
                          'Locks planned fuel distances, meal stops, and checkpoints to this ride.'}
                        {action.action_type === 'CALENDAR_EXPORT' &&
                          'Generates a downloadable iCalendar (.ics) file with all route stops.'}
                        {action.action_type === 'GROUP_SUMMARY' &&
                          'Formats a clean ride briefing message ready to copy into your group chat.'}
                        {action.action_type === 'SETTLEMENT_LINKS' &&
                          'Publishes minimal settlement transfers and UPI payment links.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleReject(action)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <XCircle className="w-4 h-4 text-[var(--status-danger)]" strokeWidth={1.5} />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(action)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                        <span>{isProcessing ? 'Approving...' : 'Approve'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SUB-TAB 2: APPROVED EXPORTS */}
      {subTab === 'approved' && (
        <section key="approved" className="animate-panel-enter">
          {approvedActions.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-8 space-y-3">
              <FileCheck className="w-6 h-6 text-[var(--accent)]" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                No approved exports yet
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-[54ch]">
                Approve items in Pending Review to generate your calendar invite and group briefing.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('pending')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-medium rounded-[6px] cursor-pointer"
              >
                Review Pending Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedActions.map((action) => {
                const res = action.result || {};
                return (
                  <div
                    key={action.id}
                    className="card-interactive bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border-subtle)]">
                      <span className="font-semibold text-[var(--status-ok)]">
                        {ACTION_TITLES[action.action_type] || action.action_type}
                      </span>
                      <span className="text-[var(--text-muted)] font-mono tabular-nums">
                        {action.resolved_at
                          ? new Date(action.resolved_at).toLocaleTimeString()
                          : 'Approved'}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">{action.description}</p>

                    {action.action_type === 'CALENDAR_EXPORT' && res.ics_content && (
                      <button
                        type="button"
                        onClick={() => handleDownloadICS(res.ics_content, res.filename)}
                        className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" strokeWidth={1.5} />
                        <span>Download Calendar (.ics)</span>
                      </button>
                    )}

                    {action.action_type === 'GROUP_SUMMARY' && res.summary_text && (
                      <div className="space-y-2.5">
                        <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-3 text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                          {res.summary_text}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySummary(res.summary_text)}
                          className="w-full py-2 px-4 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm rounded-[6px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          {copiedSummary ? (
                            <>
                              <Check className="w-4 h-4 text-[var(--status-ok)]" strokeWidth={1.5} />
                              <span className="text-[var(--status-ok)]">Copied to clipboard</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" strokeWidth={1.5} />
                              <span>Copy Group Briefing</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {action.action_type === 'SAVE_PLAN' && (
                      <div className="text-xs text-[var(--status-ok)] flex items-center gap-2 pt-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                        <span>Stops and fuel intervals locked to this ride.</span>
                      </div>
                    )}

                    {action.action_type === 'SETTLEMENT_LINKS' && (
                      <div className="text-xs text-[var(--text-muted)] pt-1">
                        Settlement links ready in Split Bills.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
