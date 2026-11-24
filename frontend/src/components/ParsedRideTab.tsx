import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, AlertTriangle, Bike, Fuel, Sparkles, RefreshCw, Save } from 'lucide-react';
import { RideDetails, Rider, BikeSpec } from '../types';
import { updateRider, fetchBikes } from '../api';

interface ParsedRideTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

export const ParsedRideTab: React.FC<ParsedRideTabProps> = ({ ride, onRefreshRide, setActiveTab }) => {
  const [bikes, setBikes] = useState<BikeSpec[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBikes().then(setBikes).catch(console.error);
  }, []);

  // Find lowest tank range among confirmed riders
  const confirmedRiders = ride.riders.filter((r) => r.status === 'confirmed');
  const smallestRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const handleStatusChange = async (rider: Rider, newStatus: string) => {
    setSavingId(rider.id);
    try {
      await updateRider(rider.id, { status: newStatus });
      onRefreshRide();
    } finally {
      setSavingId(null);
    }
  };

  const handleBikeChange = async (rider: Rider, bikeModel: string) => {
    setSavingId(rider.id);
    try {
      await updateRider(rider.id, { bike_model: bikeModel });
      onRefreshRide();
    } finally {
      setSavingId(null);
    }
  };

  const handleCaptainToggle = async (rider: Rider) => {
    setSavingId(rider.id);
    try {
      await updateRider(rider.id, { is_captain: !rider.is_captain });
      onRefreshRide();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Ride Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Extracted Ride Spec</span>
            <h2 className="text-xl sm:text-2xl font-black text-white">{ride.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ride.start_location} ➡️ {ride.destination} | Date: <strong className="text-slate-200">{ride.ride_date}</strong> | Start: <strong className="text-slate-200">{ride.start_time}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('plan')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md"
            >
              View Route & Map ➡️
            </button>
          </div>
        </div>

        {/* Smallest Tank Range Alert */}
        {smallestRider && (
          <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="text-amber-300 font-bold">Group Bottleneck Tank Range: </span>
                <span className="text-slate-200">
                  {smallestRider.name} ({smallestRider.bike_model}) has {smallestRider.tank_range_km?.toFixed(1)} km range.
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Safe Refuel Leg Limit: {((smallestRider.tank_range_km || 300) * 0.8).toFixed(1)} km (0.8x Rule)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Riders Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-bold text-sm">Riders & Motorcycle Specifications</h3>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {ride.riders.length} extracted from chat
            </span>
          </div>

          <button
            onClick={onRefreshRide}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Rider Name</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Motorcycle Model</th>
                <th className="py-3 px-3">Tank (L)</th>
                <th className="py-3 px-3">Mileage</th>
                <th className="py-3 px-3">Tank Range</th>
                <th className="py-3 px-3">UPI ID</th>
                <th className="py-3 px-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {ride.riders.map((r) => {
                const isBottleneck = smallestRider?.id === r.id;
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isBottleneck ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-1.5">
                      <span>{r.name}</span>
                      {r.is_captain && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                          Captain
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r, e.target.value)}
                        className={`bg-slate-950 border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${
                          r.status === 'confirmed'
                            ? 'text-emerald-400 border-emerald-500/40'
                            : r.status === 'declined'
                            ? 'text-rose-400 border-rose-500/40'
                            : 'text-amber-400 border-amber-500/40'
                        }`}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="undecided">Undecided</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={r.bike_model || ''}
                        onChange={(e) => handleBikeChange(r, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500 max-w-[200px]"
                      >
                        <option value="">Select Motorcycle</option>
                        {bikes.map((b) => (
                          <option key={b.model} value={b.model}>
                            {b.model} ({b.tank_range_km.toFixed(0)} km)
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 font-mono">{r.tank_litres?.toFixed(1) || '-'} L</td>
                    <td className="py-3 px-3 font-mono">{r.mileage_kmpl?.toFixed(0) || '-'} km/l</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold ${isBottleneck ? 'text-amber-400' : 'text-slate-200'}`}>
                          {r.tank_range_km?.toFixed(0) || '-'} km
                        </span>
                        {isBottleneck && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">
                            Lowest
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {r.upi_id || 'Not shared'}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleCaptainToggle(r)}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border transition ${
                          r.is_captain
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {r.is_captain ? 'Captain' : 'Make Captain'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
