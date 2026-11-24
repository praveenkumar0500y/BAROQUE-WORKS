import React, { useState } from 'react';
import { MessageSquare, Upload, Play, CheckCircle2, ShieldCheck, Bike } from 'lucide-react';
import { parseChatAndPlan } from '../api';

interface HomeTabProps {
  onRideLoaded: (rideId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onRideLoaded, setActiveTab }) => {
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setChatText((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleParseAndPlan = async () => {
    if (!chatText.trim()) {
      setError('Please paste or upload a group chat transcript first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await parseChatAndPlan(chatText);
      if (res.ride_id) {
        onRideLoaded(res.ride_id);
        setActiveTab('parsed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating ride plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-[var(--bg-surface)] p-6 rounded-[8px] border border-[var(--border-subtle)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Group Motorcycle Trip Planner
            </h1>
            <p className="text-[var(--text-muted)] text-sm max-w-[62ch]">
              Extract confirmed riders, match motorcycle tank ranges, auto-place fuel &amp; food
              stops, and settle shared costs via UPI.
            </p>
          </div>

          <label className="px-4 py-2 rounded-[6px] bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0">
            <Upload className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
            <span>Upload .txt Export</span>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
        <div className="p-4 flex items-start gap-3">
          <MessageSquare className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h4 className="text-[var(--text-primary)] font-medium text-xs">Chat Import</h4>
            <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
              Reads riders, motorcycles, and UPI IDs locally.
            </p>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3">
          <Bike className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h4 className="text-[var(--text-primary)] font-medium text-xs">Tank Range Cap (80%)</h4>
            <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
              Places fuel stops for the lowest-range bike.
            </p>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[var(--status-ok)] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h4 className="text-[var(--text-primary)] font-medium text-xs">Captain Sign-Off</h4>
            <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
              Review every export before sharing with the pack.
            </p>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-[var(--status-ok)] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h4 className="text-[var(--text-primary)] font-medium text-xs">UPI Cost Split</h4>
            <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
              Minimizes transfers with ready payment links.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border-subtle)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
            <h3 className="font-display text-[var(--text-primary)] font-semibold text-sm">
              Group Chat Input
            </h3>
            {chatText && (
              <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
                · {chatText.split('\n').filter((l) => l.trim()).length} lines
              </span>
            )}
          </div>
          {chatText && (
            <button
              type="button"
              onClick={() => setChatText('')}
              className="text-xs text-[var(--status-danger)] hover:underline font-medium cursor-pointer"
            >
              Clear Text
            </button>
          )}
        </div>

        <textarea
          rows={10}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Paste exported group chat messages or upload a .txt file above..."
          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-3 text-xs text-[var(--text-primary)] font-mono focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        />

        {error && (
          <div className="bg-[var(--bg-canvas)] border border-[var(--status-danger)]/50 text-[var(--status-danger)] px-4 py-2.5 rounded-[6px] text-xs">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleParseAndPlan}
            disabled={loading || !chatText.trim()}
            className="px-4 py-2 rounded-[6px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
          >
            <Play className="w-4 h-4" strokeWidth={1.5} />
            <span>{loading ? 'Building Plan...' : 'Create Ride Plan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
