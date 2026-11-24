import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { OverviewTab } from './components/OverviewTab';
import { RouteSetupTab } from './components/RouteSetupTab';
import { ParsedRideTab } from './components/ParsedRideTab';
import { ApprovalsTab } from './components/ApprovalsTab';
import { ActionLogTab } from './components/ActionLogTab';
import { ExpensesTab } from './components/ExpensesTab';
import { RideModeTab } from './components/RideModeTab';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ChatImportModal } from './components/ChatImportModal';
import { fetchRideDetails, listRides } from './api';
import type { RideDetails } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview'); // Command Center / Dashboard
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);

  const loadRide = async (id: string) => {
    try {
      const data = await fetchRideDetails(id);
      setRideDetails(data);
      setActiveRideId(id);
    } catch (err) {
      console.error('Failed to load ride:', err);
    }
  };

  useEffect(() => {
    listRides()
      .then((rides) => {
        if (rides && rides.length > 0) {
          loadRide(rides[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const pendingCount =
    rideDetails?.pending_actions.filter((a) => a.status === 'PENDING').length || 0;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenChatModal={() => setIsChatModalOpen(true)}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        currentRideTitle={rideDetails?.title}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          ride={rideDetails}
          onOpenApiSettings={() => setIsApiSettingsOpen(true)}
          onOpenChatModal={() => setIsChatModalOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Tab Content View */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <OverviewTab
              ride={rideDetails}
              setActiveTab={setActiveTab}
              onOpenChatModal={() => setIsChatModalOpen(true)}
            />
          )}

          {activeTab === 'route' && (
            <RouteSetupTab
              ride={rideDetails}
              demoMode={demoMode}
              onRideLoaded={(id) => {
                loadRide(id);
                setActiveTab('overview');
              }}
              onRefreshRide={() => {
                if (rideDetails) loadRide(rideDetails.id);
              }}
              setActiveTab={setActiveTab}
              onOpenApiSettings={() => setIsApiSettingsOpen(true)}
              onOpenChatModal={() => setIsChatModalOpen(true)}
            />
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

              {activeTab === 'expenses' && (
                <ExpensesTab ride={rideDetails} />
              )}

              {activeTab === 'logs' && (
                <ActionLogTab
                  rideId={rideDetails.id}
                  onRideDeleted={() => {
                    setRideDetails(null);
                    setActiveRideId(null);
                    setActiveTab('overview');
                  }}
                />
              )}

              {activeTab === 'ridemode' && (
                <RideModeTab
                  ride={rideDetails}
                  onRefreshRide={() => loadRide(rideDetails.id)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* WhatsApp Chat Import Modal */}
      <ChatImportModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onRideLoaded={(id) => {
          loadRide(id);
          setActiveTab('overview');
        }}
        demoMode={demoMode}
        defaultDestination={rideDetails?.destination}
        defaultStart={rideDetails?.start_location}
        defaultDate={rideDetails?.ride_date}
        defaultTime={rideDetails?.start_time}
      />

      {/* External Engine & API Settings Modal */}
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
