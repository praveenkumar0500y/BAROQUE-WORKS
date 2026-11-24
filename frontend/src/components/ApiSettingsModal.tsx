import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  X,
  Shield,
  Zap,
  SlidersHorizontal,
  Activity,
  Cpu
} from 'lucide-react';
import { fetchApiSettings, updateApiSettings, testApiKey } from '../api';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settingsData, setSettingsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { status: string; message: string; latency_ms?: number }>>({});
  const [testingService, setTestingService] = useState<string | null>(null);

  // Form input states
  const [orsKey, setOrsKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchApiSettings();
      setSettingsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (service: string, keyVal: string) => {
    if (!keyVal.trim()) {
      alert('Please enter an API key to test.');
      return;
    }
    setTestingService(service);
    try {
      const res = await testApiKey(service, keyVal);
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          status: res.status,
          message: res.message || 'Key verified',
          latency_ms: res.latency_ms
        }
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          status: 'error',
          message: err.message || 'Test connection failed'
        }
      }));
    } finally {
      setTestingService(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, string> = {};
      if (orsKey.trim()) payload.ors_api_key = orsKey.trim();
      if (geminiKey.trim()) {
        payload.gemini_api_key = geminiKey.trim();
        payload.llm_provider = 'gemini';
      }
      if (anthropicKey.trim()) {
        payload.anthropic_api_key = anthropicKey.trim();
        payload.llm_provider = 'anthropic';
      }
      if (elevenlabsKey.trim()) payload.elevenlabs_api_key = elevenlabsKey.trim();

      await updateApiSettings(payload);
      setSaveSuccess(true);
      await loadSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save API settings');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1e2533] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">External Engine &amp; API Credentials</h3>
              <p className="text-xs text-slate-400 font-mono">
                Connect external providers for live ORS routing, Gemini/Claude LLMs, and ElevenLabs speech
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

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2 font-mono">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>API credentials saved successfully and applied to active session.</span>
            </div>
          )}

          {/* Active Services Status Grid */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Live Engine Service Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {settingsData?.services?.map((svc: any) => (
                <div
                  key={svc.id}
                  className="p-3 bg-[#0e1219] border border-[#1e2533] rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{svc.name}</span>
                      {svc.connected ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{svc.purpose} ({svc.free_tier})</p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    svc.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {svc.connected ? 'Active' : 'Unset'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Input Section */}
          <div className="space-y-4 pt-2 border-t border-[#1e2533]">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Configure Custom API Keys
            </h4>

            {/* OpenRouteService */}
            <div className="space-y-1.5 bg-[#0e1219] p-3.5 rounded-xl border border-[#1e2533]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200">OpenRouteService API Key</label>
                <a
                  href="https://openrouteservice.org/dev/#/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>Free Key (2,000 req/day)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste ORS API key..."
                  value={orsKey}
                  onChange={(e) => setOrsKey(e.target.value)}
                  className="flex-1 bg-[#141923] border border-[#232b3b] rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleTest('ors', orsKey)}
                  disabled={testingService === 'ors' || !orsKey}
                  className="px-3.5 py-2 bg-[#18202d] hover:bg-[#222c3d] text-slate-200 rounded-xl text-xs font-semibold border border-[#253247] transition font-mono"
                >
                  {testingService === 'ors' ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {testResults.ors && (
                <div className={`text-[11px] font-mono mt-1 ${testResults.ors.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResults.ors.message} {testResults.ors.latency_ms ? `(${testResults.ors.latency_ms} ms)` : ''}
                </div>
              )}
            </div>

            {/* Google Gemini */}
            <div className="space-y-1.5 bg-[#0e1219] p-3.5 rounded-xl border border-[#1e2533]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200">Google Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>Free Key (AI Studio)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste Gemini API key..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="flex-1 bg-[#141923] border border-[#232b3b] rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleTest('gemini', geminiKey)}
                  disabled={testingService === 'gemini' || !geminiKey}
                  className="px-3.5 py-2 bg-[#18202d] hover:bg-[#222c3d] text-slate-200 rounded-xl text-xs font-semibold border border-[#253247] transition font-mono"
                >
                  {testingService === 'gemini' ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {testResults.gemini && (
                <div className={`text-[11px] font-mono mt-1 ${testResults.gemini.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResults.gemini.message} {testResults.gemini.latency_ms ? `(${testResults.gemini.latency_ms} ms)` : ''}
                </div>
              )}
            </div>

            {/* Anthropic Claude */}
            <div className="space-y-1.5 bg-[#0e1219] p-3.5 rounded-xl border border-[#1e2533]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200">Anthropic Claude API Key</label>
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>Console Anthropic</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste Anthropic API key..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  className="flex-1 bg-[#141923] border border-[#232b3b] rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleTest('anthropic', anthropicKey)}
                  disabled={testingService === 'anthropic' || !anthropicKey}
                  className="px-3.5 py-2 bg-[#18202d] hover:bg-[#222c3d] text-slate-200 rounded-xl text-xs font-semibold border border-[#253247] transition font-mono"
                >
                  {testingService === 'anthropic' ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {testResults.anthropic && (
                <div className={`text-[11px] font-mono mt-1 ${testResults.anthropic.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResults.anthropic.message} {testResults.anthropic.latency_ms ? `(${testResults.anthropic.latency_ms} ms)` : ''}
                </div>
              )}
            </div>

            {/* ElevenLabs Speech */}
            <div className="space-y-1.5 bg-[#0e1219] p-3.5 rounded-xl border border-[#1e2533]">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200">ElevenLabs Multilingual Speech API Key</label>
                <a
                  href="https://elevenlabs.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>Get Key (10k chars/mo free)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste ElevenLabs key..."
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  className="flex-1 bg-[#141923] border border-[#232b3b] rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleTest('elevenlabs', elevenlabsKey)}
                  disabled={testingService === 'elevenlabs' || !elevenlabsKey}
                  className="px-3.5 py-2 bg-[#18202d] hover:bg-[#222c3d] text-slate-200 rounded-xl text-xs font-semibold border border-[#253247] transition font-mono"
                >
                  {testingService === 'elevenlabs' ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {testResults.elevenlabs && (
                <div className={`text-[11px] font-mono mt-1 ${testResults.elevenlabs.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResults.elevenlabs.message} {testResults.elevenlabs.latency_ms ? `(${testResults.elevenlabs.latency_ms} ms)` : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#1e2533]">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition font-mono"
            >
              Save Credentials &amp; Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
