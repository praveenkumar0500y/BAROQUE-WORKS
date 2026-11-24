import React, { useState } from 'react';
import { X, FileText, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import WhatsApp Chat</h2>
              <p className="text-xs text-slate-400">
                Extract confirmed riders, bike models, tank specs, and route constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Exported WhatsApp Chat Text</span>
            <button
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold rounded-lg transition"
            >
              {loadingSample ? 'Loading...' : 'Load Sample Chat'}
            </button>
          </div>

          <textarea
            rows={10}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Paste exported WhatsApp group chat text here (e.g., '12/11/26, 9:41 pm - Name: message')..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition resize-none"
          />

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }`}
            >
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
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleParseChat}
              disabled={parsing || !chatText.trim()}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <RotateCw className={`w-3.5 h-3.5 ${parsing ? 'animate-spin' : ''}`} />
              <span>{parsing ? 'Parsing Roster & Specs...' : 'Parse Chat & Create Plan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
