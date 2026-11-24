import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Users,
  ShieldCheck,
  CreditCard,
  History,
  Radio,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Bike,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  onOpenChatModal: () => void;
  onOpenApiSettings: () => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
  currentRideTitle?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  collapsed,
  setCollapsed,
  onOpenChatModal,
  onOpenApiSettings,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard, badge: null },
    { id: 'route', label: 'Route & Stops', icon: Compass, badge: null },
    { id: 'parsed', label: 'Riders & Bikes', icon: Users, badge: null },
    {
      id: 'approvals',
      label: 'Approvals Gate',
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500 text-black font-bold'
    },
    { id: 'expenses', label: 'Expenses & UPI', icon: CreditCard, badge: null },
    { id: 'logs', label: 'Action Audit Log', icon: History, badge: null },
    {
      id: 'ridemode',
      label: 'Cockpit Mode',
      icon: Radio,
      badge: 'HUD',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0e1219] border-r border-[#1e2533] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e2533]">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-3 cursor-pointer group select-none overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Bike className="w-5 h-5 text-slate-950" />
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-xs tracking-wider text-white uppercase truncate flex items-center gap-1.5">
                  RIDE COPILOT
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                </span>
                <span className="text-[10px] text-slate-400 tracking-tight font-mono truncate">
                  Motorcycle Group Telemetry
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a212e] transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action: Import Chat */}
        <div className="p-3 border-b border-[#1e2533]/80">
          <button
            onClick={() => {
              onOpenChatModal();
              if (mobileOpen) setMobileOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent hover:from-amber-500/25 hover:via-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition group shadow-sm ${
              collapsed ? 'px-0' : ''
            }`}
            title="Import WhatsApp Chat"
          >
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:rotate-12 transition-transform" />
            {!collapsed && <span className="truncate">Import Chat Export</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#18202d] text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131822]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
                )}

                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate text-left flex-1 font-medium tracking-tight">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-semibold ${
                      item.badgeColor || 'bg-[#222b3b] text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed mode */}
                {collapsed && item.badge !== null && (
                  <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Settings & Telemetry */}
        <div className="p-3 border-t border-[#1e2533] space-y-1">
          <button
            onClick={() => {
              onOpenApiSettings();
              if (mobileOpen) setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#131822] transition ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="API Keys & Telemetry Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {!collapsed && <span className="truncate">Engine &amp; APIs</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
