import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/HomeTab';
import { ParsedRideTab } from './components/ParsedRideTab';
import { PlanTab } from './components/PlanTab';
import { ApprovalsTab } from './components/ApprovalsTab';
import { ActionLogTab } from './components/ActionLogTab';
import { ExpensesTab } from './components/ExpensesTab';
import { RideModeTab } from './components/RideModeTab';
import { fetchRideDetails, listRides } from './api';
import { RideDetails } from './types';
import { AlertTriangle, Compass } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadRide = async (id: string) => {
    try {
      setLoading(true);
      const data = await fetchRideDetails(id);
      setRideDetails(data);
      setActiveRideId(id);
    } catch (err) {
      console.error('Failed to load ride:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load existing ride on start if available
  useEffect(() => {
    listRides().then((rides) => {
      if (rides && rides.length > 0) {
        loadRide(rides[0].id);
      }
    }).catch(console.error);
  }, []);

  const pendingCount = rideDetails?.pending_actions.filter((a) => a.status === 'PENDING').length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        currentRideTitle={rideDetails?.title}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'home' && (
          <HomeTab
            demoMode={demoMode}
            onRideLoaded={(id) => {
              loadRide(id);
              setActiveTab('parsed');
            }}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab !== 'home' && !rideDetails && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
            <Compass className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
            <h3 className="text-white font-bold text-base">No Active Ride Selected</h3>
            <p className="text-slate-400 text-xs">
              Please start by pasting a WhatsApp group chat or loading the 45-message sample chat on the Home tab.
            </p>
            <button
              onClick={() => setActiveTab('home')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Go to Tab 1 (New Ride)
            </button>
          </div>
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

            {activeTab === 'plan' && (
              <PlanTab
                ride={rideDetails}
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
                  setActiveTab('home');
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

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Ride Captain's Copilot &bull; Built with FastMCP, React, Vite, Leaflet &amp; Python &bull; Make MCP Matter Track
      </footer>
    </div>
  );
}

export default App;
