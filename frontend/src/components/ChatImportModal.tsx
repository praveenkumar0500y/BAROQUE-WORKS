import React, { useState } from 'react';
import {
  X,
  FileText,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  MessageSquare,
  Bike
} from 'lucide-react';
import { fetchSampleChat, parseChatAndPlan } from '../api';

interface ChatImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRideLoaded: (rideId: string) => void;
  demoMode: boolean;
  defaultDestination?: string;
  defaultStart?: string;
  defaultDate?: string;
  defaultTime?: string;
}

export const ChatImportModal: React.FC<ChatImportModalProps> = ({
  isOpen,
  onClose,
  onRideLoaded,
  demoMode,
  defaultDestination,
  defaultStart,
  defaultDate,
  defaultTime
}) => {
  const [chatText, setChatText] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setStatusMessage(null);
      const text = await fetchSampleChat();
      setChatText(text);
      setStatusMessage({ text: 'Loaded 45-message sample WhatsApp chat.' });
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load sample chat: ${err.message}`, isError: true });
    } finally {
      setLoadingSample(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setChatText((event.target?.result as string) || '');
      setStatusMessage({ text: `Imported file: ${file.name}` });
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
        demoMode: demoMode,
      });

      if (res.ride_id) {
        setStatusMessage({ text: 'Group chat parsed and synchronized successfully.' });
        setTimeout(() => {
          onRideLoaded(res.ride_id);
          onClose();
        }, 500);
      } else {
        setStatusMessage({ text: 'Failed to extract ride details from chat.', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Chat parsing error: ${err.message}`, isError: true });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2533] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Import WhatsApp Group Chat</h2>
              <p className="text-xs text-slate-400 font-mono">
                Extract confirmed riders, bike models, tank specs, and route constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a212e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Paste exported WhatsApp chat (.txt) below, or use the pre-built 45-message ride chat:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={loadingSample || parsing}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition font-mono"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{loadingSample ? 'Loading...' : 'Load Sample (45 msgs)'}</span>
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-[#18202d] hover:bg-[#202b3d] text-slate-300 border border-[#253247] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload .txt</span>
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <textarea
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            rows={10}
            placeholder="[24/11/26, 8:15:30 AM] Rahul: Weekend ride to Sakleshpur! I am on my Interceptor 650...&#10;[24/11/26, 8:16:10 AM] Amit: Count me in, Himalayan 450..."
            className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl p-3.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition resize-none leading-relaxed"
          />

          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-mono ${
              statusMessage.isError
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            }`}>
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2533] bg-[#0e1219] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {chatText.length > 0 ? `${chatText.split('\n').length} lines ready` : 'Awaiting input'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={parsing}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleParseChat}
              disabled={!chatText.trim() || parsing}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition font-mono"
            >
              {parsing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing Group Chat...</span>
                </>
              ) : (
                <>
                  <Bike className="w-3.5 h-3.5 text-slate-950" />
                  <span>Parse Chat &amp; Synchronize Ride</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
