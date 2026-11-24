import React, { useState, useEffect } from 'react';
import { UserCheck, RefreshCw, Fuel, ArrowRight } from 'lucide-react';
import type { RideDetails, Rider, BikeSpec } from '../types';
import { updateRider, fetchBikes } from '../api';

interface ParsedRideTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

export const ParsedRideTab: React.FC<ParsedRideTabProps> = ({ ride, onRefreshRide, setActiveTab }) => {
  const [bikes, setBikes] = useState<BikeSpec[]>([]);

  useEffect(() => {
    fetchBikes().then(setBikes).catch(console.error);
  }, []);

  const confirmedRiders = ride.riders.filter((r) => r.status === 'confirmed');
  const smallestRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const handleStatusChange = async (rider: Rider, newStatus: string) => {
    try {
      await updateRider(rider.id, { status: newStatus });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBikeChange = async (rider: Rider, bikeModel: string) => {
    try {
      await updateRider(rider.id, { bike_model: bikeModel });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCaptainToggle = async (rider: Rider) => {
    try {
      await updateRider(rider.id, { is_captain: !rider.is_captain });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
              Rider Roster Specifications
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{ride.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ride.start_location} to {ride.destination} | Date: <strong className="text-slate-200">{ride.ride_date}</strong> | Start: <strong className="text-slate-200">{ride.start_time}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('route')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              Route &amp; Map Planner
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl transition shadow-sm"
            >
              Approvals Queue
            </button>
          </div>
        </div>

        {/* Smallest Tank Range Alert */}
        {smallestRider && (
          <div className="mt-4 p-3.5 bg-slate-950 border border-sky-500/30 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sky-400 font-bold">Group Bottleneck Range: </span>
                <span className="text-slate-300">
                  {smallestRider.name} ({smallestRider.bike_model}) has {smallestRider.tank_range_km?.toFixed(1)} km range.
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold">
                Safe Leg Cap: {((smallestRider.tank_range_km || 300) * 0.8).toFixed(1)} km (0.8x Rule)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Riders Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-400" />
            <h3 className="text-white font-bold text-sm">Participants &amp; Motorcycle Specifications</h3>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {ride.riders.length} riders
            </span>
          </div>

          <button
            onClick={onRefreshRide}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
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
                      isBottleneck ? 'bg-sky-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-1.5">
                      <span>{r.name}</span>
                      {r.is_captain && (
                        <span className="bg-sky-500/10 text-sky-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-sky-500/20">
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
                            ? 'text-emerald-400 border-emerald-500/30'
                            : r.status === 'undecided'
                            ? 'text-amber-400 border-amber-500/30'
                            : 'text-rose-400 border-rose-500/30'
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
                        className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-sky-500 max-w-[180px]"
                      >
                        {bikes.map((b) => (
                          <option key={b.model} value={b.model}>
                            {b.model}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">
                      {r.tank_litres ? `${r.tank_litres} L` : '-'}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">
                      {r.mileage_kmpl ? `${r.mileage_kmpl} km/L` : '-'}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span
                        className={
                          isBottleneck
                            ? 'text-sky-400 font-bold underline decoration-sky-500'
                            : 'text-slate-300'
                        }
                      >
                        {r.tank_range_km ? `${r.tank_range_km.toFixed(1)} km` : '-'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {r.upi_id || 'Not provided'}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleCaptainToggle(r)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                          r.is_captain
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {r.is_captain ? 'Ride Captain' : 'Make Captain'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <span>
            Tank specs update automatically when bike model changes.
          </span>
          <button
            onClick={() => setActiveTab('route')}
            className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold transition"
          >
            <span>Back to Map View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
