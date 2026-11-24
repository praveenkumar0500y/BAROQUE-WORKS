import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  MapPin,
  Fuel,
  ShieldCheck,
  CreditCard,
  Bike,
  CheckCircle2,
  ArrowRight,
  CloudSun,
} from 'lucide-react';
import { RIDE_PHOTOS } from '../assets/ridePhotos';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tabId: string) => void;
}

interface DemoChapter {
  id: string;
  targetTab: string;
  durationLabel: string;
  title: string;
  subtitle: string;
  narration: string;
  ctaLabel: string;
  colorVar: string;
  tintVar: string;
  photo: string;
}

const CHAPTERS: DemoChapter[] = [
  {
    id: 'route',
    targetTab: 'route',
    durationLabel: '0:00',
    title: '1. Plot Your Highway Corridor',
    subtitle: 'Enter departure & destination or pick a corridor preset to check live Open-Meteo weather and highway curves.',
    narration:
      'Step one: Pick a preset or enter your departure and destination city. RIDESYNC maps the OpenStreetMap highway polyline and checks real-time weather along the route.',
    ctaLabel: 'Open Route & Map',
    colorVar: 'var(--accent)',
    tintVar: 'var(--accent-tint)',
    photo: RIDE_PHOTOS.mountainCurve,
  },
  {
    id: 'riders',
    targetTab: 'parsed',
    durationLabel: '0:06',
    title: '2. Match Pack Tank Ranges',
    subtitle: 'Add riders and bikes manually or import a group chat. The bike with the shortest fuel range sets an 80% safe leg limit.',
    narration:
      'Step two: Add riders and motorcycles or import your group chat. RIDESYNC automatically spots the smallest tank range and caps every leg at eighty percent.',
    ctaLabel: 'Open Riders & Bikes',
    colorVar: 'var(--alpine)',
    tintVar: 'var(--alpine-tint)',
    photo: RIDE_PHOTOS.forestBobber,
  },
  {
    id: 'stops',
    targetTab: 'route',
    durationLabel: '0:12',
    title: '3. Auto-Place Fuel & Meal Breaks',
    subtitle: 'Fuel stations appear before anyone runs dry, paired with highway breakfast stops, washrooms, and repair checkpoints.',
    narration:
      'Step three: Inspect scheduled fuel pumps, breakfast dhabas, and rest stops placed right along your highway corridor with live arrival times.',
    ctaLabel: 'View Stops & Map',
    colorVar: 'var(--ochre)',
    tintVar: 'var(--ochre-tint)',
    photo: RIDE_PHOTOS.pineHeadlights,
  },
  {
    id: 'approvals',
    targetTab: 'approvals',
    durationLabel: '0:18',
    title: '4. Captain Sign-Off & Exports',
    subtitle: 'The ride captain approves the plan to unlock a downloadable Calendar invite (.ics) and copyable WhatsApp briefing.',
    narration:
      'Step four: Review items in Captain Approvals. One click locks the stops, creates a downloadable calendar file, and prepares a ready-to-paste group briefing.',
    ctaLabel: 'Open Approvals',
    colorVar: 'var(--forest)',
    tintVar: 'var(--forest-tint)',
    photo: RIDE_PHOTOS.cockpitPov,
  },
  {
    id: 'expenses',
    targetTab: 'expenses',
    durationLabel: '0:24',
    title: '5. Split Group Bills & Pay via UPI',
    subtitle: 'Log breakfast, fuel, or toll bills during the ride. Transfers are minimized automatically into direct UPI payment links.',
    narration:
      'Step five: Log shared fuel and meal bills under Split Bills. RIDESYNC calculates the minimum transfers needed and generates ready UPI payment links.',
    ctaLabel: 'Open Split Bills',
    colorVar: 'var(--accent)',
    tintVar: 'var(--accent-tint)',
    photo: RIDE_PHOTOS.convexMirror,
  },
];

const CHAPTER_DURATION_MS = 6000;

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab,
}) => {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [tickProgress, setTickProgress] = useState(0);

  const chapter = CHAPTERS[chapterIndex];

  // Auto-advance timer when playing
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const stepMs = 100;
    const timer = setInterval(() => {
      setTickProgress((prev) => {
        const next = prev + (stepMs / CHAPTER_DURATION_MS) * 100;
        if (next >= 100) {
          setChapterIndex((idx) => (idx + 1) % CHAPTERS.length);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying]);

  // Voice narration per chapter when unmuted
  useEffect(() => {
    if (!isOpen || !voiceEnabled) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(chapter.narration);
      utter.lang = 'en-IN';
      utter.rate = 1.03;
      window.speechSynthesis.speak(utter);
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [isOpen, voiceEnabled, chapter]);

  if (!isOpen) return null;

  const selectChapter = (idx: number) => {
    setChapterIndex(idx);
    setTickProgress(0);
  };

  const handleClose = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setVoiceEnabled(false);
    onClose();
  };

  const totalSeconds = CHAPTERS.length * 6;
  const elapsedSeconds = Math.min(
    totalSeconds,
    Math.floor(chapterIndex * 6 + (tickProgress / 100) * 6)
  );
  const formatTime = (sec: number) => `0:${sec.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#141413]/70 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        className="animate-modal-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--alpine-tint)] text-[var(--alpine)] flex items-center justify-center shrink-0">
              <Play className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="demo-modal-title"
                className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)]"
              >
                How RIDESYNC Works · Interactive Walkthrough
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                5-step interactive guide — click any chapter or press play
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close walkthrough"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-[6px] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Simulated Video Viewport */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div
            key={chapter.id}
            className="animate-panel-enter relative bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden"
          >
            {/* Subtle Atmospheric Photo Backdrop Strip */}
            <div className="relative h-36 sm:h-44 w-full bg-[var(--bg-inset)] overflow-hidden">
              <img
                src={chapter.photo}
                alt={chapter.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/90 via-[#111110]/45 to-transparent flex items-end justify-between px-5 py-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-[#FAF9F6]">
                  Chapter {chapterIndex + 1} of {CHAPTERS.length} · {chapter.durationLabel}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onJumpToTab(chapter.targetTab);
                  }}
                  className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-medium rounded-[6px] flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-[0.98]"
                >
                  <span>{chapter.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 min-h-[210px] flex flex-col justify-between gap-4">
              {/* Stage Header */}
              <div className="space-y-1">
                <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                  {chapter.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-[62ch] leading-relaxed">
                  {chapter.subtitle}
                </p>
              </div>

            {/* Animated Interactive Visual Scene per Chapter */}
            {chapter.id === 'route' && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2 relative h-28 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-3 flex items-center justify-between overflow-hidden">
                  <svg viewBox="0 0 280 80" className="w-full h-full">
                    <path
                      d="M 24 60 Q 95 16, 145 44 T 256 20"
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 24 60 Q 95 16, 145 44 T 256 20"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-route-draw"
                    />
                    <circle cx="24" cy="60" r="6" fill="var(--forest)" />
                    <circle cx="145" cy="44" r="5" fill="var(--ochre)" />
                    <circle cx="256" cy="20" r="6" fill="var(--accent)" />
                  </svg>
                  <span className="absolute bottom-2 left-3 font-mono text-[11px] font-semibold text-[var(--forest)]">
                    A · Bangalore
                  </span>
                  <span className="absolute top-2 right-3 font-mono text-[11px] font-semibold text-[var(--accent)]">
                    B · Coorg (252 km)
                  </span>
                </div>

                <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--forest)]">
                    <CloudSun className="w-4 h-4" strokeWidth={1.5} />
                    <span>Open-Meteo: GO</span>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                    23°C · Clear
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Light crosswind, dry tarmac expected.
                  </p>
                </div>
              </div>
            )}

            {chapter.id === 'riders' && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-4 space-y-3">
                {[
                  { name: 'Rohan · Duke 390', range: 310, pct: 74, color: 'var(--accent)', note: 'Sets 80% safe leg (248 km)' },
                  { name: 'Vikram · Himalayan 450', range: 420, pct: 100, color: 'var(--forest)', note: 'Full range' },
                  { name: 'Ananya · Interceptor 650', range: 340, pct: 81, color: 'var(--alpine)', note: 'Comfortable margin' },
                ].map((b) => (
                  <div key={b.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5" style={{ color: b.color }} strokeWidth={1.5} />
                        <span>{b.name}</span>
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                        {b.range} km · <span style={{ color: b.color }}>{b.note}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-canvas)] rounded-[4px] overflow-hidden border border-[var(--border-subtle)]">
                      <div
                        className="h-full rounded-[4px] animate-bar-grow"
                        style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chapter.id === 'stops' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { kind: 'Food · Stop 1', name: 'Highway Breakfast Dhaba', meta: '07:20 am · 68 km', color: 'var(--forest)', tint: 'var(--forest-tint)' },
                  { kind: 'Fuel · Stop 2', name: 'IndianOil Highway Pump', meta: '09:10 am · 178 km', color: 'var(--ochre)', tint: 'var(--ochre-tint)' },
                  { kind: 'Rest · Stop 3', name: 'Kushalnagar Viewpoint', meta: '10:35 am · 228 km', color: 'var(--alpine)', tint: 'var(--alpine-tint)' },
                ].map((stop) => (
                  <div
                    key={stop.name}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-3.5 space-y-1.5"
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-semibold"
                      style={{ color: stop.color, backgroundColor: stop.tint }}
                    >
                      {stop.kind.startsWith('Fuel') ? (
                        <Fuel className="w-3.5 h-3.5" strokeWidth={1.5} />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                      )}
                      <span>{stop.kind}</span>
                    </span>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{stop.name}</div>
                    <div className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                      {stop.meta}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chapter.id === 'approvals' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--forest)] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                      <span>Calendar Invite (.ics)</span>
                    </span>
                    <span className="font-mono text-[11px] text-[var(--forest)]">Approved</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Downloadable schedule with rollout time and every fuel stop coordinate.
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--accent)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                      <span>Group Briefing Copy</span>
                    </span>
                    <span className="font-mono text-[11px] text-[var(--forest)]">Ready</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    One-tap formatted itinerary ready to drop in your riders chat group.
                  </p>
                </div>
              </div>
            )}

            {chapter.id === 'expenses' && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ochre)]">
                    Minimized UPI Transfer #1
                  </span>
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <span className="text-[var(--crimson)]">Rohan</span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                    <span className="text-[var(--forest)]">Vikram</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    Equal split across breakfast + highway fuel
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-lg font-semibold text-[var(--forest)] tabular-nums">
                    INR 480.00
                  </span>
                  <span className="px-3 py-1.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-medium inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>UPI Link Ready</span>
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Video Timeline Scrubber */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-5 gap-1.5">
              {CHAPTERS.map((ch, idx) => {
                const isDone = idx < chapterIndex;
                const isCurrent = idx === chapterIndex;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => selectChapter(idx)}
                    aria-label={`Jump to ${ch.title}`}
                    className="group text-left space-y-1.5 cursor-pointer"
                  >
                    <div className="h-1.5 w-full bg-[var(--bg-inset)] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: isDone ? '100%' : isCurrent ? `${tickProgress}%` : '0%',
                          backgroundColor: isCurrent || isDone ? ch.colorVar : 'transparent',
                        }}
                      />
                    </div>
                    <div
                      className={`text-[11px] font-medium truncate ${
                        isCurrent
                          ? 'text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {idx + 1}. {ch.id.charAt(0).toUpperCase() + ch.id.slice(1)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectChapter((chapterIndex - 1 + CHAPTERS.length) % CHAPTERS.length)}
              aria-label="Previous chapter"
              className="p-2 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
            >
              <SkipBack className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause walkthrough' : 'Play walkthrough'}
              className="px-3.5 py-2 rounded-[6px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" strokeWidth={1.5} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" strokeWidth={1.5} />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => selectChapter((chapterIndex + 1) % CHAPTERS.length)}
              aria-label="Next chapter"
              className="p-2 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
            >
              <SkipForward className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => {
                selectChapter(0);
                setIsPlaying(true);
              }}
              aria-label="Restart walkthrough"
              className="p-2 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <span className="ml-2 font-mono text-xs text-[var(--text-muted)] tabular-nums">
              {formatTime(elapsedSeconds)} / {formatTime(totalSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-[6px] border text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                voiceEnabled
                  ? 'bg-[var(--forest-tint)] border-[var(--forest)]/40 text-[var(--forest)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {voiceEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Narration On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" strokeWidth={1.5} />
                  <span>Voice Off</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-[6px] bg-transparent hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
