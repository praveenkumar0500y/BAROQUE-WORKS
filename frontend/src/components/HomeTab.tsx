import React, { useState } from 'react';
import { MessageSquare, Upload, Play, Sparkles, CheckCircle2, ShieldCheck, Zap, Bike } from 'lucide-react';
import { fetchSampleChat, parseChatAndPlan } from '../api';

interface HomeTabProps {
  demoMode: boolean;
  onRideLoaded: (rideId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ demoMode, onRideLoaded, setActiveTab }) => {
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      setError(null);
      const text = await fetchSampleChat();
      setChatText(text);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample chat');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setChatText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleParseAndPlan = async () => {
    if (!chatText.trim()) {
      setError('Please paste or load a WhatsApp chat export first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await parseChatAndPlan(chatText, demoMode);
      if (res.ride_id) {
        onRideLoaded(res.ride_id);
        setActiveTab('parsed');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing ride planning workflow.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>MCP-Powered Group Ride Automation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Turn Messy WhatsApp Chats Into Safe, Approved Rides
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Extract confirmed riders, match Indian motorcycle tank ranges, auto-place fuel & food stops, and calculate UPI split debts. <strong>The Ride Captain always approves every action before execution.</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleLoadSample}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Load 45-Msg Sample Chat</span>
            </button>
            <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition">
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Upload .txt Export</span>
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs">Chat Parser (MCP)</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Understands banter, dropouts, breakfast requests & UPI IDs.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs">Smallest Tank Range (0.8x)</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Safeguards lowest-range bikes (e.g. Rahul's Interceptor 650).</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs">Approval Gate</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Read tools run freely; write/pay/post actions pause for Captain.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs">Settlement & UPI</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Minimizes transactions and creates deep links (upi://pay).</p>
          </div>
        </div>
      </div>

      {/* Chat Input Area */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-bold text-sm">WhatsApp Chat Input</h3>
            {chatText && (
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {chatText.split('\n').filter(l => l.trim()).length} lines loaded
              </span>
            )}
          </div>
          {chatText && (
            <button
              onClick={() => setChatText('')}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              Clear Text
            </button>
          )}
        </div>

        <textarea
          rows={12}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Paste exported WhatsApp group chat here... (e.g. '24/11/26, 7:15 pm - Rohan: Hey folks! Let's do a day ride to Sakleshpur!') or click 'Load 45-Msg Sample Chat' above."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none transition"
        />

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-slate-400 text-xs">
            {demoMode ? (
              <span className="text-emerald-400 font-medium">✓ Demo Mode Active: Offline deterministic mock LLM & cached high-fidelity OSM/Weather</span>
            ) : (
              <span className="text-amber-400 font-medium">Live Mode: Connects to external APIs</span>
            )}
          </div>

          <button
            onClick={handleParseAndPlan}
            disabled={loading || !chatText.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>MCP Agent Orchestrating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Parse & Run Ride Copilot</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
