import React from 'react';
import {
  Menu,
  Sparkles,
  SlidersHorizontal,
  ShieldAlert,
  Activity,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { RideDetails } from '../types';

interface TopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  ride: RideDetails | null;
  onOpenApiSettings: () => void;
  onOpenChatModal: () => void;
  onToggleMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  demoMode,
  setDemoMode,
  ride,
  onOpenApiSettings,
  onOpenChatModal,
  onToggleMobileMenu,
}) => {
  const getTabMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Mission Command Center',
          subtitle: 'Holistic ride telemetry, safe range bottle-necking, and live status'
        };
      case 'route':
        return {
          title: 'Route & Highway Stops',
          subtitle: 'Live OpenStreetMap corridor search with verified fuel, food, and restroom points'
        };
      case 'parsed':
        return {
          title: 'Riders & Motorcycle Fleet',
          subtitle: 'Indian motorcycle fuel specifications and group safe-range limit calculation'
        };
      case 'approvals':
        return {
          title: 'Captain Approval Gate',
          subtitle: 'Controlled-by-design policy: No state mutation executes without captain sign-off'
        };
      case 'expenses':
        return {
          title: 'Group Expenses & UPI',
          subtitle: 'Greedy cash-flow debt minimization with instant UPI deep links'
        };
      case 'logs':
        return {
          title: 'Action Audit Log',
          subtitle: 'Append-only chronological record of all MCP tool executions and captain decisions'
        };
      case 'ridemode':
        return {
          title: 'Motorcycle Cockpit (HUD)',
          subtitle: 'High-contrast hands-free voice interface with multilingual spoken briefings'
        };
      default:
        return {
          title: "Ride Captain's Copilot",
          subtitle: 'MCP-powered autonomous motorcycle group ride orchestration'
        };
    }
  };

  const meta = getTabMeta();

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0e1219]/90 backdrop-blur-md border-b border-[#1e2533] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-[#141923] border border-[#222a3a] text-slate-300 hover:text-white transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {meta.title}
            </h1>
            {ride && (
              <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161d2a] border border-[#242f44] text-[10px] font-mono text-slate-300">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span className="truncate max-w-[200px]">{ride.destination}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate hidden sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Telemetry & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Pending Approvals Badge Alert */}
        {pendingCount > 0 && (
          <button
            onClick={() => setActiveTab('approvals')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingCount} Pending</span>
          </button>
        )}

        {/* Demo Mode / Live Mode Switch */}
        <div className="flex items-center gap-2 bg-[#141923] px-2.5 py-1 rounded-xl border border-[#222a3a] text-xs">
          <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
            {demoMode ? 'Demo Cache' : 'Live OSM'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-[#232b3b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950"></div>
          </label>
        </div>

        {/* Quick Import Button */}
        <button
          onClick={onOpenChatModal}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18202d] hover:bg-[#202b3d] text-slate-200 border border-[#253247] text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Import Chat</span>
        </button>

        {/* API Settings Button */}
        <button
          onClick={onOpenApiSettings}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#141923] hover:bg-[#1c2331] text-slate-300 border border-[#222a3a] text-xs font-semibold transition flex items-center gap-1.5"
          title="Configure API Keys & Providers"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
};
