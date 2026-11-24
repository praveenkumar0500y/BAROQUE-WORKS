import { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  MessageSquare,
  CheckCircle2,
  Sun,
  Moon,
  Route,
  Calendar,
  Users,
  PlayCircle,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { RouteSetupTab } from './components/RouteSetupTab';
import { ParsedRideTab } from './components/ParsedRideTab';
import { ApprovalsTab } from './components/ApprovalsTab';
import { ExpensesTab } from './components/ExpensesTab';
import { RideModeTab } from './components/RideModeTab';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ChatImportModal } from './components/ChatImportModal';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { RIDE_PHOTOS } from './assets/ridePhotos';
import { fetchRideDetails, listRides } from './api';
import type { RideDetails } from './types';

interface RideListItem {
  id: string;
  title: string;
  ride_date: string;
  riders_count: number;
}

const TAB_BACKGROUNDS: Record<string, { src: string; alt: string }> = {
  route: {
    src: RIDE_PHOTOS.mountainCurve,
    alt: 'Motorcyclists riding along a misty mountain highway curve',
  },
  parsed: {
    src: RIDE_PHOTOS.forestBobber,
    alt: 'Motorcycle parked alongside tall misty pine trees on wet asphalt',
  },
  approvals: {
    src: RIDE_PHOTOS.cockpitPov,
    alt: 'Rider cockpit mirror view leading down a misty forest road',
  },
  expenses: {
    src: RIDE_PHOTOS.convexMirror,
    alt: 'Roadside mountain mirror reflecting two riders in fog',
  },
  ridemode: {
    src: RIDE_PHOTOS.pineHeadlights,
    alt: 'Twin motorcycle headlights illuminating a misty pine forest road',
  },
};

export function App() {
  const [activeTab, setActiveTab] = useState<string>('route');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('motoroute_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'light';
  });

  const [ridesList, setRidesList] = useState<RideListItem[]>([]);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('motoroute_theme', theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const refreshRidesList = useCallback(async () => {
    try {
      const rides = await listRides();
      setRidesList(rides || []);
      return rides || [];
    } catch (err) {
      console.error('Failed to list rides:', err);
      return [];
    }
  }, []);

  const loadRide = useCallback(
    async (id: string) => {
      try {
        const data = await fetchRideDetails(id);
        setRideDetails(data);
        setActiveRideId(id);
        refreshRidesList();
      } catch (err) {
        console.error('Failed to load ride:', err);
      }
    },
    [refreshRidesList]
  );

  useEffect(() => {
    refreshRidesList().then((rides) => {
      if (rides.length > 0) {
        loadRide(rides[0].id);
      }
    });
  }, [refreshRidesList, loadRide]);

  const pendingCount =
    rideDetails?.pending_actions.filter((a) => a.status === 'PENDING').length || 0;

  const activeBackdrop = TAB_BACKGROUNDS[activeTab] || TAB_BACKGROUNDS.route;

  return (
    <div className="relative min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-ink)]">
      {/* Subtle Atmospheric Photography Canvas Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <img
          key={activeBackdrop.src}
          src={activeBackdrop.src}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-[0.075] dark:opacity-[0.14] transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-canvas)]/35 via-[var(--bg-canvas)]/75 to-[var(--bg-canvas)]" />
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onOpenChatModal={() => setIsChatModalOpen(true)}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
      />

      <main className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Toolbar Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)] text-sm">
          <div className="flex flex-wrap items-center gap-3 text-[var(--text-muted)]">
            {rideDetails ? (
              <>
                {ridesList.length > 1 ? (
                  <select
                    aria-label="Select active ride"
                    value={rideDetails.id}
                    onChange={(e) => loadRide(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer"
                  >
                    {ridesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-[var(--text-primary)]">
                    {rideDetails.title}
                  </span>
                )}
                <span aria-hidden="true">/</span>
                <span className="tabular-nums font-mono text-xs inline-flex items-center gap-1.5 text-[var(--alpine)] font-medium">
                  <Route className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{rideDetails.total_distance_km} km</span>
                </span>
                <span aria-hidden="true">/</span>
                <span className="tabular-nums font-mono text-xs inline-flex items-center gap-1.5 text-[var(--ochre)] font-medium">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{rideDetails.ride_date}</span>
                </span>
                <span aria-hidden="true">/</span>
                <span className="text-xs font-medium inline-flex items-center gap-1.5 text-[var(--forest)]">
                  <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    {rideDetails.riders.filter((r) => r.status === 'confirmed').length} confirmed
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--text-primary)]">No active ride</span>
                <span aria-hidden="true">/</span>
                <span className="text-xs">
                  Enter a departure and destination below or import a chat transcript.
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsApiSettingsOpen(true)}
              className="px-2.5 py-1.5 rounded-[6px] bg-[var(--forest-tint)] hover:bg-[var(--forest)]/15 flex items-center gap-1.5 text-xs font-medium text-[var(--forest)] whitespace-nowrap cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--forest)]"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
              <span>Open Maps &amp; Weather</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="px-3 py-1.5 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-[var(--ochre)]" strokeWidth={1.5} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[var(--alpine)]" strokeWidth={1.5} />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div key={activeTab} className="animate-panel-enter">
          {activeTab === 'route' && (
            <RouteSetupTab
              ride={rideDetails}
              theme={theme}
              onRideLoaded={(id) => {
                loadRide(id);
              }}
              onRefreshRide={() => {
                if (activeRideId) loadRide(activeRideId);
              }}
              setActiveTab={setActiveTab}
              onOpenChatModal={() => setIsChatModalOpen(true)}
            />
          )}

          {activeTab !== 'route' && !rideDetails && (
            <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden w-full grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-6 relative aspect-[16/9] lg:aspect-auto lg:min-h-[300px] bg-[var(--bg-inset)] overflow-hidden">
                <img
                  src={RIDE_PHOTOS.pineHeadlights}
                  alt="Twin motorcycle headlights illuminating a misty pine forest road"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/80 via-[#111110]/20 to-transparent flex items-end p-5">
                  <span className="font-mono text-xs text-[#FAF9F6] tracking-wide">
                    Ready for rollout · Open routing &amp; weather
                  </span>
                </div>
              </div>

              <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center space-y-6">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-[6px] bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center">
                    <Compass className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
                    Create or import a ride first
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[62ch]">
                    Set your departure city and destination in Route &amp; Map, or paste an exported
                    group chat transcript to populate riders, fuel stops, and expenses.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('route')}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] cursor-pointer active:scale-[0.98]"
                  >
                    Plan a Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(true)}
                    className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4 text-[var(--alpine)]" strokeWidth={1.5} />
                    <span>Import Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="px-4 py-2 bg-[var(--alpine-tint)] hover:bg-[var(--alpine)] text-[var(--alpine)] hover:text-[var(--accent-ink)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <PlayCircle className="w-4 h-4" strokeWidth={1.5} />
                    <span>Demo</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {rideDetails && (
            <>
              {activeTab === 'parsed' && (
                <ParsedRideTab
                  ride={rideDetails}
                  onRefreshRide={() => loadRide(rideDetails.id)}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'approvals' && (
                <ApprovalsTab
                  ride={rideDetails}
                  onRefreshRide={() => loadRide(rideDetails.id)}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'expenses' && <ExpensesTab ride={rideDetails} />}

              {activeTab === 'ridemode' && (
                <RideModeTab
                  ride={rideDetails}
                  ridesList={ridesList}
                  onSelectRide={(id) => loadRide(id)}
                  onRefreshRide={() => loadRide(rideDetails.id)}
                  onRideDeleted={() => {
                    setRideDetails(null);
                    setActiveRideId(null);
                    refreshRidesList().then((rides) => {
                      if (rides.length > 0) loadRide(rides[0].id);
                      else setActiveTab('route');
                    });
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>

      <ChatImportModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onRideLoaded={(id) => loadRide(id)}
        defaultDestination={rideDetails?.destination}
        defaultStart={rideDetails?.start_location}
        defaultDate={rideDetails?.ride_date}
        defaultTime={rideDetails?.start_time}
      />

      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />

      <DemoWalkthroughModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onJumpToTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}

export default App;
