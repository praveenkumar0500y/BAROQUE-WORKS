import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Languages,
  Send,
  MessageCircle,
  VolumeX,
  History,
  FolderOpen,
} from 'lucide-react';
import type { RideDetails } from '../types';
import { RIDE_PHOTOS } from '../assets/ridePhotos';
import { sendVoiceQuery, fetchBriefingText } from '../api';
import { ActionLogTab } from './ActionLogTab';

interface RideListItem {
  id: string;
  title: string;
  ride_date: string;
  riders_count: number;
}

interface RideModeTabProps {
  ride: RideDetails;
  ridesList: RideListItem[];
  onSelectRide: (id: string) => void;
  onRefreshRide: () => void;
  onRideDeleted: () => void;
}

type BriefingSubTab = 'briefing' | 'qa' | 'log' | 'manage';

export const RideModeTab: React.FC<RideModeTabProps> = ({
  ride,
  ridesList,
  onSelectRide,
  onRefreshRide,
  onRideDeleted,
}) => {
  const [subTab, setSubTab] = useState<BriefingSubTab>('briefing');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedQuery, setTypedQuery] = useState('');
  const [response, setResponse] = useState<string>(
    'Select a quick question, type your own, or use the microphone to ask about fuel stops, weather, or tank range.'
  );
  const [briefingText, setBriefingText] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn'>('en');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const speakText = (textToSpeak: string, langCode: string = language) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCode === 'hi' ? 'hi-IN' : langCode === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
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
    } catch {
      setResponse('Could not look up that detail for the current ride.');
    }
  };

  const toggleListening = () => {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResponse(
        'Voice input is not supported in this browser. Type your question or select one of the quick options below.'
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('Listening...');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        handleQuery(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setTranscript('Voice input paused.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleBriefMe = async () => {
    try {
      const briefing = await fetchBriefingText(ride.id, language);
      setBriefingText(briefing.text);
      speakText(briefing.text, language);
    } catch {
      setBriefingText('Failed to load briefing text.');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header + Sub-tabs + 16:9 Photo Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--accent)]">
              05 · Briefing &amp; Log
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Audio Briefing &amp; Ride Log
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              Play spoken ride announcements, query route checkpoints hands-free, or inspect ride
              history and switch rides.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {(subTab === 'briefing' || subTab === 'qa') && (
              <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-[6px]">
                <Languages className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
                <label htmlFor="briefing-lang" className="text-xs text-[var(--text-muted)]">
                  Language
                </label>
                <select
                  id="briefing-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'kn')}
                  className="bg-transparent text-[var(--text-primary)] text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-[6px] cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Briefing and log sections"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px]"
            >
              <button
                role="tab"
                aria-selected={subTab === 'briefing'}
                type="button"
                onClick={() => setSubTab('briefing')}
                className={`px-3 py-2 rounded-[6px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  subTab === 'briefing'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Volume2 className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.5} />
                <span>Audio Briefing</span>
              </button>

              <button
                role="tab"
                aria-selected={subTab === 'qa'}
                type="button"
                onClick={() => setSubTab('qa')}
                className={`px-3 py-2 rounded-[6px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  subTab === 'qa'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <MessageCircle className="w-4 h-4 text-[var(--alpine)]" strokeWidth={1.5} />
                <span>Route Q&amp;A</span>
              </button>

              <button
                role="tab"
                aria-selected={subTab === 'log'}
                type="button"
                onClick={() => setSubTab('log')}
                className={`px-3 py-2 rounded-[6px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  subTab === 'log'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <History className="w-4 h-4 text-[var(--ochre)]" strokeWidth={1.5} />
                <span>Activity Log</span>
              </button>

              <button
                role="tab"
                aria-selected={subTab === 'manage'}
                type="button"
                onClick={() => setSubTab('manage')}
                className={`px-3 py-2 rounded-[6px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  subTab === 'manage'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-[var(--forest)]" strokeWidth={1.5} />
                <span>Manage Rides ({ridesList.length || 1})</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[180px] rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-inset)] group">
          <img
            src={RIDE_PHOTOS.pineHeadlights}
            alt="Twin motorcycle headlights illuminating a misty pine forest road"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex flex-col justify-end p-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80">
              Rollout · {ride.pace}
            </span>
            <span className="text-sm font-semibold text-[#FAF9F6] truncate tabular-nums">
              {ride.title} · {ride.total_distance_km} km · {ride.start_time}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: SPOKEN BRIEFING */}
      {subTab === 'briefing' && (
        <section
          key="briefing"
          className="animate-panel-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
        >
          <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[260px] bg-[var(--bg-inset)] overflow-hidden group">
            <img
              src={RIDE_PHOTOS.mountainCurve}
              alt="Motorcyclists riding along a misty green mountain pass"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex items-end justify-between p-5 gap-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80 block">
                  Spoken Announcement
                </span>
                <span className="font-display text-lg font-semibold text-[#FAF9F6]">
                  {ride.start_location} &rarr; {ride.destination}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Pre-Ride Rollout Announcement
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-[62ch]">
                  Uses your browser&apos;s built-in speech synthesis to read distance, pace, and safety
                  reminders aloud for the group.
                </p>
              </div>
            </div>

            <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-5 min-h-[112px] flex items-center">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed max-w-[62ch]">
                {briefingText ||
                  `Route ready for ${ride.title} (${ride.total_distance_km} km, ${ride.pace}). Select "Play Ride Briefing" to hear the announcement in ${
                    language === 'hi' ? 'Hindi' : language === 'kn' ? 'Kannada' : 'English'
                  }.`}
              </p>
            </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBriefMe}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Volume2 className="w-4 h-4" strokeWidth={1.5} />
              <span>Play Ride Briefing</span>
            </button>

            {isPlayingAudio && (
              <button
                type="button"
                onClick={stopAudio}
                className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <VolumeX className="w-4 h-4" strokeWidth={1.5} />
                <span>Stop Audio</span>
              </button>
            )}
          </div>
          </div>
        </section>
      )}

      {/* SUB-TAB 2: ROUTE Q&A */}
      {subTab === 'qa' && (
        <section
          key="qa"
          className="animate-panel-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Hands-Free Route Query
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-[54ch]">
                Speak a question or enter one below to check tank margins, weather, or pending
                approvals.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleListening}
              className={`px-4 py-2.5 rounded-[6px] text-sm font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98] shrink-0 ${
                isListening
                  ? 'bg-[var(--status-danger)] text-[var(--accent-ink)]'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" strokeWidth={1.5} />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" strokeWidth={1.5} />
                  <span>Start Voice Input</span>
                </>
              )}
            </button>
          </div>

          {transcript && (
            <div className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-3.5 py-2 rounded-[6px] border border-[var(--border-subtle)] inline-block">
              &ldquo;{transcript}&rdquo;
            </div>
          )}

          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono flex items-center gap-1.5 text-[var(--text-muted)] uppercase tracking-[0.06em] text-[11px]">
                <Volume2 className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
                <span>Route Response</span>
              </span>
              {isPlayingAudio && (
                <button
                  type="button"
                  onClick={stopAudio}
                  className="text-xs font-medium text-[var(--status-ok)] hover:underline cursor-pointer"
                >
                  Speaking (Stop)
                </button>
              )}
            </div>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed max-w-[62ch]">
              {response}
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!typedQuery.trim()) return;
                setTranscript(typedQuery.trim());
                handleQuery(typedQuery.trim());
                setTypedQuery('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={typedQuery}
                onChange={(e) => setTypedQuery(e.target.value)}
                placeholder="Ask about next fuel stop, weather, or tank range..."
                className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={!typedQuery.trim()}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-45 text-[var(--accent-ink)] rounded-[6px] text-sm font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
                <span>Ask</span>
              </button>
            </form>

            <div>
              <span className="text-xs text-[var(--text-muted)] block mb-2">Quick Questions</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'How far is the next fuel stop?',
                  'Will it rain on this route?',
                  'Who has the smallest tank range?',
                  'Confirm next action',
                  'Cancel next action',
                ].map((query) => (
                  <button
                    key={query}
                    type="button"
                    onClick={() => {
                      setTranscript(query);
                      handleQuery(query);
                    }}
                    className="px-3 py-1.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[6px] text-xs cursor-pointer active:scale-[0.98]"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUB-TABS 3 & 4: ACTIVITY LOG & MANAGE RIDES */}
      {(subTab === 'log' || subTab === 'manage') && (
        <div key={subTab} className="animate-panel-enter">
          <ActionLogTab
            embedded
            activeSection={subTab}
            rideId={ride.id}
            ridesList={ridesList}
            onSelectRide={onSelectRide}
            onRideDeleted={onRideDeleted}
          />
        </div>
      )}
    </div>
  );
};
