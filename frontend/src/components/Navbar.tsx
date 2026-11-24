import React from 'react';
import { Compass, Users, CheckCircle2, History, CreditCard, Radio, Key, SlidersHorizontal, FileText } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  currentRideTitle?: string;
  onOpenApiSettings: () => void;
  onOpenChatModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  demoMode,
  setDemoMode,
  currentRideTitle,
  onOpenApiSettings,
  onOpenChatModal
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
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm"></div>
            <span className="font-bold tracking-wider text-slate-100 text-sm">
              RIDE CAPTAIN'S COPILOT
            </span>
          </div>
          {currentRideTitle && (
            <span className="text-slate-400 hidden sm:inline text-xs">
              | Active Plan: <strong className="text-slate-200 font-medium">{currentRideTitle}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2.5 mt-1 sm:mt-0">
          {/* Import WhatsApp Chat Button */}
          <button
            onClick={onOpenChatModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Import Chat</span>
          </button>

          {/* API Connections Manager Button */}
          <button
            onClick={onOpenApiSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>APIs</span>
          </button>

          {/* Pending Approvals count */}
          {pendingCount > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            >
              <span>{pendingCount} Pending</span>
            </button>
          )}

          {/* Demo Mode Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px] font-medium">Demo Mode</span>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 relative"></div>
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab.highlight
                  ? isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20'
                  : isActive
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="ml-1 bg-sky-500 text-slate-950 rounded-full text-[10px] px-1.5 py-0.2 font-bold">
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
