import React from 'react';
import { PlayCircle } from 'lucide-react';
import { MotoRouteLogo } from './MotoRouteLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  onOpenChatModal: () => void;
  onOpenDemoModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  onOpenChatModal,
  onOpenDemoModal,
}) => {
  const navItems = [
    { id: 'route', label: 'Route & Map', accent: 'var(--accent)' },
    { id: 'parsed', label: 'Riders & Bikes', accent: 'var(--alpine)' },
    {
      id: 'approvals',
      label: pendingCount > 0 ? `Approvals (${pendingCount})` : 'Approvals',
      accent: 'var(--forest)',
    },
    { id: 'expenses', label: 'Split Bills', accent: 'var(--ochre)' },
    { id: 'ridemode', label: 'Briefing & Log', accent: 'var(--accent)' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 lg:gap-8">
        {/* Zone 1: Brand Mark + Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('route')}
          className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent)] whitespace-nowrap shrink-0 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-[6px]"
        >
          <MotoRouteLogo className="w-7 h-7 transition-transform duration-200 group-hover:scale-105" />
          <span>MotoRoute</span>
        </button>

        {/* Zone 2: 5 Primary Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 lg:gap-6 overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-[6px] ${
                  isActive
                    ? 'text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 -bottom-[1px] h-[2px] transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  style={{ backgroundColor: item.accent }}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Demo Video Guide Icon + Primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenDemoModal}
            title="Watch interactive app guide"
            aria-label="Open interactive app walkthrough demo"
            className="px-3 py-2 bg-[var(--alpine-tint)] hover:bg-[var(--alpine)] text-[var(--alpine)] hover:text-[var(--accent-ink)] border border-[var(--alpine)]/30 font-medium text-xs sm:text-sm rounded-[6px] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--alpine)]"
          >
            <PlayCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">Demo</span>
          </button>

          <button
            type="button"
            onClick={onOpenChatModal}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-xs sm:text-sm rounded-[6px] whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Import Chat
          </button>
        </div>
      </div>
    </header>
  );
};
