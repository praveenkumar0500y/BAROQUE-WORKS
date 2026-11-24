import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Radio, AlertTriangle, ShieldCheck, Fuel, CloudSun, CheckCircle2, Languages } from 'lucide-react';
import { RideDetails } from '../types';
import { sendVoiceQuery, fetchBriefingText } from '../api';

interface RideModeTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
}

export const RideModeTab: React.FC<RideModeTabProps> = ({ ride, onRefreshRide }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<string>('Ride Captain Copilot standby. Tap the microphone or select a quick query.');
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn'>('en');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  // Next fuel stop info
  const fuelStop = ride.stops.find((s) => s.stop_type === 'fuel');

  // Text-to-speech helper (ElevenLabs backend API with browser speechSynthesis fallback)
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
      console.warn('Backend TTS call failed, falling back to Web Speech API', e);
    }

    // Fallback: Web Speech API
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

  // Web Speech API for voice input
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
        setTranscript('Listening...');
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
    const alertMsg = 'Alert: Approaching Hassan bypass fuel stop. Mountain rain probability in Sakleshpur is 15%. Safe to proceed.';
    setAlertBanner(alertMsg);
    setResponse(alertMsg);
    speakText(alertMsg);
    setTimeout(() => setAlertBanner(null), 8000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cockpit Mode Top Status */}
      <div className="bg-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-xl font-black text-white tracking-wider uppercase">Ride Mode Cockpit</h2>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
            <Languages className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-bold">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-amber-400 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900">English</option>
              <option value="hi" className="bg-slate-900">Hindi (हिंदी)</option>
              <option value="kn" className="bg-slate-900">Kannada (ಕನ್ನಡ)</option>
            </select>
          </div>
        </div>

        {/* Live Alert Banner */}
        {alertBanner && (
          <div className="mt-4 p-3 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4" />
            <span>{alertBanner}</span>
          </div>
        )}

        {/* Center Big Voice Control Button */}
        <div className="my-8 flex flex-col items-center justify-center space-y-4">
          <button
            onClick={toggleListening}
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-8 ring-amber-500/20'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-black uppercase mt-1">Listening...</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-black uppercase mt-1">Tap To Speak</span>
              </>
            )}
          </button>

          {transcript && (
            <div className="text-xs font-mono text-amber-400 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
              "{transcript}"
            </div>
          )}
        </div>

        {/* Copilot Spoken Response Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5 text-amber-400 uppercase tracking-wider text-[10px]">
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce text-emerald-400' : ''}`} />
              Copilot Voice Response
            </span>
            {isPlayingAudio && (
              <span className="text-emerald-400 font-semibold text-[10px]">Playing Audio...</span>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
            "{response}"
          </p>
        </div>

        {/* Action Controls & Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button
            onClick={handleBriefMe}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
          >
            <Volume2 className="w-4 h-4" />
            <span>"Brief Me" Spoken Overview</span>
          </button>

          <button
            onClick={triggerWeatherAlert}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Simulate Spoken Alert</span>
          </button>
        </div>
      </div>

      {/* Quick Tap Query Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Hands-Free Query Chips (One-Tap Prompts)
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => handleQuery('How far is the next fuel stop?')}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition flex items-center gap-1.5"
          >
            <Fuel className="w-3.5 h-3.5 text-orange-400" />
            <span>"How far is the next fuel stop?"</span>
          </button>

          <button
            onClick={() => handleQuery('Will it rain before lunch?')}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition flex items-center gap-1.5"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400" />
            <span>"Will it rain before lunch?"</span>
          </button>

          <button
            onClick={() => handleQuery('Who has the smallest tank?')}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition flex items-center gap-1.5"
          >
            <span>"Who has the smallest tank?"</span>
          </button>

          <button
            onClick={() => handleQuery('confirm')}
            className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl transition flex items-center gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voice Command: "Confirm"</span>
          </button>

          <button
            onClick={() => handleQuery('cancel')}
            className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-xl transition flex items-center gap-1.5 font-bold"
          >
            <span>Voice Command: "Cancel"</span>
          </button>
        </div>
      </div>
    </div>
  );
};
