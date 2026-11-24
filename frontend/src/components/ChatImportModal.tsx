import React, { useState } from 'react';
import { X, FileText, RotateCw, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { parseChatAndPlan } from '../api';

interface ChatImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRideLoaded: (rideId: string) => void;
  defaultDestination?: string;
  defaultStart?: string;
  defaultDate?: string;
  defaultTime?: string;
}

export const ChatImportModal: React.FC<ChatImportModalProps> = ({
  isOpen,
  onClose,
  onRideLoaded,
  defaultDestination,
  defaultStart,
  defaultDate,
  defaultTime,
}) => {
  const [chatText, setChatText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setChatText((event.target?.result as string) || '');
      setStatusMessage({ text: `Loaded "${file.name}".` });
    };
    reader.readAsText(file);
  };

  const handleParseChat = async () => {
    if (!chatText.trim()) return;
    try {
      setParsing(true);
      setStatusMessage(null);
      const res = await parseChatAndPlan(chatText, {
        customDestination: defaultDestination,
        customStart: defaultStart,
        customDate: defaultDate,
        customTime: defaultTime,
      });

      if (res.ride_id) {
        setStatusMessage({ text: 'Group chat parsed and ride plan created.' });
        setTimeout(() => {
          onRideLoaded(res.ride_id);
          onClose();
        }, 350);
      } else {
        setStatusMessage({ text: 'Could not extract ride details from chat.', isError: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-import-title"
        className="animate-modal-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2
                id="chat-import-title"
                className="font-display text-lg font-semibold text-[var(--text-primary)]"
              >
                Import Group Chat
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Paste a chat export or enter one rider per line (e.g. &ldquo;Name - Bike Model&rdquo;)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-[6px] hover:bg-[var(--bg-hover)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="chat-import-textarea"
              className="text-sm text-[var(--text-primary)] font-medium"
            >
              Chat Transcript
            </label>
            <label className="px-3 py-1.5 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-medium rounded-[6px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              <span>Upload .txt File</span>
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            id="chat-import-textarea"
            rows={10}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Paste exported group chat messages here, or type riders and route details (e.g., 'Ride to Coorg from Bangalore on 2026-12-05, roll out 06:00 am')..."
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--accent)] resize-none"
          />

          {statusMessage && (
            <div
              className={`p-3 rounded-[6px] border text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-[var(--bg-canvas)] border-[var(--status-danger)]/45 text-[var(--status-danger)]'
                  : 'bg-[var(--bg-canvas)] border-[var(--status-ok)]/45 text-[var(--status-ok)]'
              }`}
            >
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-[6px] cursor-pointer active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleParseChat}
            disabled={parsing || !chatText.trim()}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <RotateCw className="w-4 h-4" strokeWidth={1.5} />
            <span>{parsing ? 'Creating Ride...' : 'Parse & Create Plan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
