import React from 'react';
import { Compass, Users, CheckCircle2, History, CreditCard, Radio, Key, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  currentRideTitle?: string;
  onOpenApiSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  demoMode,
  setDemoMode,
  currentRideTitle,
  onOpenApiSettings
}) => {
  const tabs = [
    { id: 'route', label: '1. Route & Map', icon: Compass },
    { id: 'parsed', label: '2. Riders & Bikes', icon: Users },
    { id: 'approvals', label: '3. Approvals', icon: CheckCircle2, badge: pendingCount },
    { id: 'logs', label: '4. Action Log', icon: History },
    { id: 'expenses', label: '5. Expenses & UPI', icon: CreditCard },
    { id: 'ridemode', label: '6. Cockpit', icon: Radio, highlight: true },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800/60 text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-bold tracking-wider text-amber-400 text-sm">
            RIDE CAPTAIN'S COPILOT
          </span>
          {currentRideTitle && (
            <span className="text-slate-400 hidden sm:inline">
              Active: <strong className="text-slate-200 font-medium">{currentRideTitle}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          {/* API Connections Manager Button */}
          <button
            onClick={onOpenApiSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>API Connections</span>
          </button>

          {/* Pending Approvals count (subtle, no emoji) */}
          {pendingCount > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium"
            >
              <span>{pendingCount} Pending</span>
            </button>
          )}

          {/* Demo Mode Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-slate-400 text-[11px]">Demo Mode</span>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 relative"></div>
          </label>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-2 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                tab.highlight
                  ? isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : isActive
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 rounded-full text-[10px] px-1.5 py-0.2 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
