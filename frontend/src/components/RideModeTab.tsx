import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Radio, AlertTriangle, Languages, CheckCircle2 } from 'lucide-react';
import type { RideDetails } from '../types';
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
    const alertMsg = 'Alert: Approaching next highway fuel stop. Safe riding conditions confirmed.';
    setAlertBanner(alertMsg);
    setResponse(alertMsg);
    speakText(alertMsg);
    setTimeout(() => setAlertBanner(null), 8000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cockpit Mode Top Status */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white tracking-wider uppercase">Cockpit Voice Mode</h2>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Languages className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-slate-300 font-medium">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-sky-400 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900">English</option>
              <option value="hi" className="bg-slate-900">Hindi</option>
              <option value="kn" className="bg-slate-900">Kannada</option>
            </select>
          </div>
        </div>

        {/* Live Alert Banner */}
        {alertBanner && (
          <div className="mt-4 p-3 bg-sky-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{alertBanner}</span>
          </div>
        )}

        {/* Center Big Voice Control Button */}
        <div className="my-8 flex flex-col items-center justify-center space-y-4">
          <button
            onClick={toggleListening}
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
              isListening
                ? 'bg-rose-600 text-white ring-8 ring-rose-500/30'
                : 'bg-sky-600 hover:bg-sky-500 text-white ring-8 ring-sky-500/20'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-bold uppercase mt-1">Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-bold uppercase mt-1">Tap To Speak</span>
              </>
            )}
          </button>

          {transcript && (
            <div className="text-xs font-mono text-sky-400 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
              "{transcript}"
            </div>
          )}
        </div>

        {/* Spoken Response Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5 text-sky-400 uppercase tracking-wider text-[10px]">
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'text-emerald-400 animate-pulse' : ''}`} />
              Copilot Audio Response
            </span>
            {isPlayingAudio && (
              <span className="text-emerald-400 font-mono text-[11px]">Speaking...</span>
            )}
          </div>
          <p className="text-sm text-slate-100 font-medium leading-relaxed">{response}</p>
        </div>

        {/* Action Controls & Quick Queries */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleBriefMe}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Spoken Ride Briefing</span>
            </button>

            <button
              onClick={triggerWeatherAlert}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
            >
              Simulate Highway Alert
            </button>
          </div>

          {/* Quick Query Chips */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-500 font-medium block mb-2">Hands-Free Quick Queries:</span>
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
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl text-xs transition"
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
