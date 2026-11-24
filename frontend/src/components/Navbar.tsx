import React from 'react';
import { Compass, ShieldCheck, MapPin, CheckCircle2, History, CreditCard, Radio, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  currentRideTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  demoMode,
  setDemoMode,
  currentRideTitle
}) => {
  const tabs = [
    { id: 'home', label: '1. New Ride', icon: Compass },
    { id: 'parsed', label: '2. Parsed Roster', icon: MapPin },
    { id: 'plan', label: '3. Route & Stops', icon: Compass },
    { id: 'approvals', label: '4. Approvals', icon: CheckCircle2, badge: pendingCount },
    { id: 'logs', label: '5. Action Log', icon: History },
    { id: 'expenses', label: '6. Expenses & UPI', icon: CreditCard },
    { id: 'ridemode', label: '7. Ride Mode', icon: Radio, highlight: true },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800/60 text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
            🏍️ RIDE CAPTAIN'S COPILOT
          </span>
          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium">
            Make MCP Matter Track
          </span>
          {currentRideTitle && (
            <span className="text-slate-400 hidden sm:inline">
              Active: <strong className="text-slate-200">{currentRideTitle}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-1 sm:mt-0">
          {/* Controlled by You indicator */}
          <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Controlled by Captain</span>
            {pendingCount > 0 && (
              <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>

          {/* Demo Mode Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-slate-300 text-[11px] font-medium">Demo Mode (Offline)</span>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-amber-500 relative"></div>
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
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : isActive
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="ml-1 bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.2 font-bold animate-bounce">
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
