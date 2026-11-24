import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
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
  const [activeTab, setActiveTab] = useState<string>('route'); // Route Setup is Tab 1
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
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
    listRides().then((rides) => {
      if (rides && rides.length > 0) {
        loadRide(rides[0].id);
      }
    }).catch(console.error);
  }, []);

  const pendingCount = rideDetails?.pending_actions.filter((a) => a.status === 'PENDING').length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        currentRideTitle={rideDetails?.title}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
        onOpenChatModal={() => setIsChatModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'route' && (
          <RouteSetupTab
            ride={rideDetails}
            demoMode={demoMode}
            onRideLoaded={(id) => {
              loadRide(id);
              setActiveTab('route');
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

            {activeTab === 'logs' && (
              <ActionLogTab
                rideId={rideDetails.id}
                onRideDeleted={() => {
                  setRideDetails(null);
                  setActiveRideId(null);
                  setActiveTab('route');
                }}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                ride={rideDetails}
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

      {/* WhatsApp Chat Import Modal */}
      <ChatImportModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onRideLoaded={(id) => loadRide(id)}
        demoMode={demoMode}
        defaultDestination={rideDetails?.destination}
        defaultStart={rideDetails?.start_location}
        defaultDate={rideDetails?.ride_date}
        defaultTime={rideDetails?.start_time}
      />

      {/* External API Settings Modal */}
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
