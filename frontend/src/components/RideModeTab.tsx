import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Radio,
  AlertTriangle,
  Languages,
  CheckCircle2,
  Fuel,
  Compass,
  CloudSun,
  ShieldAlert,
  Zap,
  Activity,
  AudioWaveform as Waveform
} from 'lucide-react';
import type { RideDetails, Rider } from '../types';
import { sendVoiceQuery, fetchBriefingText } from '../api';

interface RideModeTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
}

export const RideModeTab: React.FC<RideModeTabProps> = ({ ride, onRefreshRide }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<string>('Copilot standby. Tap microphone or select a quick query.');
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn'>('en');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const confirmedRiders = ride.riders.filter((r) => r.status === 'confirmed');
  const bottleneckRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const safeRangeKm = bottleneckRider?.tank_range_km
    ? (bottleneckRider.tank_range_km * 0.8).toFixed(1)
    : '241.1';

  const speakText = async (textToSpeak: string, langCode: string = language) => {
    try {
      setIsPlayingAudio(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, language: langCode }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('audio/mpeg')) {
          const blob = await res.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onended = () => setIsPlayingAudio(false);
          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('Backend TTS call fallback', e);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCode === 'hi' ? 'hi-IN' : langCode === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('Listening to voice query...');
      };

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        handleQuery(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setTranscript('Voice recognition paused.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const handleQuery = async (queryText: string) => {
    try {
      const res = await sendVoiceQuery(ride.id, queryText);
      setResponse(res.answer);
      speakText(res.answer);
      if (queryText.toLowerCase().includes('confirm') || queryText.toLowerCase().includes('cancel')) {
        onRefreshRide();
      }
    } catch (err) {
      setResponse('Failed to process voice query.');
    }
  };

  const handleBriefMe = async () => {
    try {
      const briefing = await fetchBriefingText(ride.id, language);
      setResponse(briefing.text);
      speakText(briefing.text, language);
    } catch (err) {
      setResponse('Failed to load briefing.');
    }
  };

  const triggerWeatherAlert = () => {
    const alertMsg = 'Alert: Approaching next highway fuel stop. Safe riding conditions confirmed.';
    setAlertBanner(alertMsg);
    setResponse(alertMsg);
    speakText(alertMsg);
    setTimeout(() => setAlertBanner(null), 8000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Cockpit Digital Instrument HUD */}
      <div className="bg-[#0b0e14] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top HUD Telemetry Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-widest uppercase font-mono">
                  COCKPIT HUD
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Hands-Free Helmet Voice Telemetry
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-[#12161f] border border-[#222a38] px-3 py-1.5 rounded-xl">
            <Languages className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-amber-400 text-xs font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-[#0e1219]">English (en)</option>
              <option value="hi" className="bg-[#0e1219]">Hindi (hi)</option>
              <option value="kn" className="bg-[#0e1219]">Kannada (kn)</option>
            </select>
          </div>
        </div>

        {/* Live Gauges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="bg-[#12161f] border border-[#1e2533] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Corridor Length</span>
            <span className="text-lg font-bold text-white font-mono">{ride.total_distance_km} km</span>
          </div>

          <div className="bg-[#12161f] border border-[#1e2533] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-mono text-amber-400 block">Safe Leg Cap</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{safeRangeKm} km</span>
          </div>

          <div className="bg-[#12161f] border border-[#1e2533] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Weather Status</span>
            <span className={`text-base font-bold font-mono ${
              ride.weather_verdict === 'GO' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {ride.weather_verdict || 'GO'}
            </span>
          </div>

          <div className="bg-[#12161f] border border-[#1e2533] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Group Pace</span>
            <span className="text-base font-bold text-slate-200 font-mono truncate">{ride.pace || 'Brisk'}</span>
          </div>
        </div>

        {/* Highway Alert Banner */}
        {alertBanner && (
          <div className="mb-6 p-3.5 bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold rounded-xl text-xs flex items-center gap-2.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{alertBanner}</span>
          </div>
        )}

        {/* Huge Glove-Friendly Tactile Voice Button */}
        <div className="my-8 flex flex-col items-center justify-center space-y-4">
          <button
            onClick={toggleListening}
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl relative ${
              isListening
                ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 scale-105'
                : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 ring-8 ring-amber-500/20 hover:scale-105'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-12 h-12 sm:w-14 sm:h-14 animate-pulse" />
                <span className="text-[11px] font-mono font-extrabold uppercase mt-1 tracking-wider">
                  Listening
                </span>
              </>
            ) : (
              <>
                <Mic className="w-12 h-12 sm:w-14 sm:h-14" />
                <span className="text-[11px] font-mono font-extrabold uppercase mt-1 tracking-wider">
                  Tap To Speak
                </span>
              </>
            )}
          </button>

          {transcript && (
            <div className="text-xs font-mono text-amber-400 bg-[#12161f] px-4 py-2 rounded-full border border-amber-500/30 shadow-md">
              "{transcript}"
            </div>
          )}
        </div>

        {/* Spoken Response Box */}
        <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5 text-amber-400 uppercase tracking-wider text-[10px] font-mono">
              <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              Copilot Audio Response
            </span>
            {isPlayingAudio && (
              <span className="text-amber-400 font-mono text-[11px] animate-pulse">
                Audio Synthesizing...
              </span>
            )}
          </div>
          <p className="text-sm text-slate-100 font-medium leading-relaxed font-sans">{response}</p>
        </div>

        {/* Actions & Quick Query Chips */}
        <div className="mt-6 pt-5 border-t border-[#1e2533] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleBriefMe}
              className="px-5 py-2.5 bg-[#18202d] hover:bg-[#222c3d] text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Volume2 className="w-4 h-4" />
              <span>Play Spoken Ride Briefing</span>
            </button>

            <button
              onClick={triggerWeatherAlert}
              className="px-4 py-2 bg-[#12161f] hover:bg-[#18202d] text-slate-300 border border-[#232b38] rounded-xl text-xs font-medium transition"
            >
              Simulate Highway Alert
            </button>
          </div>

          {/* Quick Query Chips */}
          <div>
            <span className="text-[11px] text-slate-400 font-mono block mb-2 uppercase tracking-wider">
              Quick Hands-Free Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'How far is the next fuel stop?',
                'Will it rain before lunch?',
                'Who has the smallest tank range?',
                'Confirm next action',
                'Cancel next action',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setTranscript(chip);
                    handleQuery(chip);
                  }}
                  className="px-3 py-1.5 bg-[#12161f] hover:bg-[#18202d] text-slate-300 border border-[#222a38] hover:border-amber-500/40 rounded-xl text-xs font-mono transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
