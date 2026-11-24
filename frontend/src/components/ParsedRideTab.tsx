import React, { useState, useEffect } from 'react';
import {
  Users,
  Fuel,
  ArrowRight,
  ShieldAlert,
  Gauge,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Star,
  Bike,
  Activity,
  Zap,
  Info
} from 'lucide-react';
import type { RideDetails, Rider, BikeSpec } from '../types';
import { updateRider, fetchBikes } from '../api';

interface ParsedRideTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

export const ParsedRideTab: React.FC<ParsedRideTabProps> = ({
  ride,
  onRefreshRide,
  setActiveTab,
}) => {
  const [bikes, setBikes] = useState<BikeSpec[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBikes().then(setBikes).catch(console.error);
  }, []);

  const confirmedRiders = ride.riders.filter((r) => r.status === 'confirmed');
  const undecidedRiders = ride.riders.filter((r) => r.status === 'undecided');
  const declinedRiders = ride.riders.filter((r) => r.status === 'declined');

  // Find rider with smallest tank range in confirmed riders
  const bottleneckRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const safeRangeKm = bottleneckRider?.tank_range_km
    ? (bottleneckRider.tank_range_km * 0.8).toFixed(1)
    : '241.1';

  const handleStatusChange = async (rider: Rider, newStatus: string) => {
    try {
      setUpdatingId(rider.id);
      await updateRider(rider.id, { status: newStatus });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBikeChange = async (rider: Rider, bikeModel: string) => {
    try {
      setUpdatingId(rider.id);
      await updateRider(rider.id, { bike_model: bikeModel });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCaptainToggle = async (rider: Rider) => {
    try {
      setUpdatingId(rider.id);
      await updateRider(rider.id, { is_captain: !rider.is_captain });
      onRefreshRide();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Bottleneck Spotlight Banner */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                Fleet Telemetry &amp; Tank Specifications
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
              {ride.title} — Rider Roster
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracted from group chat: <strong className="text-slate-200">{ride.riders.length} riders total</strong> ({confirmedRiders.length} confirmed, {undecidedRiders.length} undecided)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('route')}
              className="px-4 py-2 bg-[#18202d] hover:bg-[#202b3d] text-slate-200 font-semibold text-xs rounded-xl border border-[#253247] transition"
            >
              Route Planner
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20"
            >
              Approvals Gate
            </button>
          </div>
        </div>

        {/* Bottleneck Motorcycle Callout Card */}
        {bottleneckRider && (
          <div className="p-4 bg-gradient-to-r from-[#171410] via-[#151821] to-[#12161f] border border-amber-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                <Fuel className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                    GROUP BOTTLENECK VEHICLE IDENTIFIED
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold">
                    Limits Group Range
                  </span>
                </div>
                <p className="text-sm text-white font-semibold">
                  {bottleneckRider.name}'s <span className="text-amber-400">{bottleneckRider.bike_model}</span> has the shortest tank range ({bottleneckRider.tank_range_km?.toFixed(1)} km).
                </p>
                <p className="text-xs text-slate-400">
                  Tank: {bottleneckRider.tank_litres}L • Highway Mileage: {bottleneckRider.mileage_kmpl} kmpl
                </p>
              </div>
            </div>

            <div className="bg-[#0e1219] p-3 rounded-xl border border-amber-500/30 text-right shrink-0">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                0.8x Safe Highway Cap
              </span>
              <span className="text-xl font-extrabold text-amber-400 font-mono">
                {safeRangeKm} km
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Roster Table / Card Grid */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-[#1e2533] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Fleet Specifications ({ride.riders.length} Motorcycles)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click status or bike model to override extracted values
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1219] text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-[#1e2533]">
              <tr>
                <th className="py-3 px-4">Rider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Motorcycle Model</th>
                <th className="py-3 px-4 text-center">Tank</th>
                <th className="py-3 px-4 text-center">Mileage</th>
                <th className="py-3 px-4 text-right">Max Range</th>
                <th className="py-3 px-4 text-right">0.8x Safe Range</th>
                <th className="py-3 px-4 text-center">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2533]">
              {ride.riders.map((rider) => {
                const isConfirmed = rider.status === 'confirmed';
                const isUndecided = rider.status === 'undecided';
                const isDeclined = rider.status === 'declined';
                const isBottleneck = isConfirmed && rider.id === bottleneckRider?.id;

                return (
                  <tr
                    key={rider.id}
                    className={`hover:bg-[#161c27] transition ${
                      isBottleneck ? 'bg-amber-500/[0.04]' : ''
                    }`}
                  >
                    {/* Rider Name */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          rider.is_captain
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-[#1a212e] text-slate-300'
                        }`}>
                          {rider.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-100 font-bold">{rider.name}</span>
                            {rider.is_captain && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase font-mono">
                                Captain
                              </span>
                            )}
                            {isBottleneck && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase font-mono">
                                Limiting Bike
                              </span>
                            )}
                          </div>
                          {rider.phone && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {rider.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Select */}
                    <td className="py-3.5 px-4">
                      <select
                        value={rider.status}
                        onChange={(e) => handleStatusChange(rider, e.target.value)}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer transition ${
                          isConfirmed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isUndecided
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="confirmed" className="bg-[#0e1219] text-emerald-400">Confirmed</option>
                        <option value="undecided" className="bg-[#0e1219] text-amber-400">Undecided</option>
                        <option value="declined" className="bg-[#0e1219] text-slate-400">Declined</option>
                      </select>
                    </td>

                    {/* Bike Model Select */}
                    <td className="py-3.5 px-4">
                      <select
                        value={rider.bike_model || ''}
                        onChange={(e) => handleBikeChange(rider, e.target.value)}
                        className="bg-[#0e1219] border border-[#232b3b] rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition max-w-[200px] truncate"
                      >
                        <option value="">Select Motorcycle...</option>
                        {bikes.map((b) => (
                          <option key={b.model} value={b.model}>
                            {b.model} ({b.tank_litres}L, {b.mileage_kmpl} kmpl)
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Tank Litres */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {rider.tank_litres ? `${rider.tank_litres} L` : '—'}
                    </td>

                    {/* Mileage */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {rider.mileage_kmpl ? `${rider.mileage_kmpl} kmpl` : '—'}
                    </td>

                    {/* Max Range */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">
                      {rider.tank_range_km ? `${rider.tank_range_km.toFixed(1)} km` : '—'}
                    </td>

                    {/* 0.8x Safe Range */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {rider.tank_range_km ? (
                        <span className={isBottleneck ? 'text-amber-400' : 'text-slate-300'}>
                          {(rider.tank_range_km * 0.8).toFixed(1)} km
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Captain Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleCaptainToggle(rider)}
                        className={`p-1.5 rounded-lg border transition ${
                          rider.is_captain
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-[#18202d] text-slate-500 border-[#242e40] hover:text-slate-300'
                        }`}
                        title={rider.is_captain ? 'Captain (Click to revoke)' : 'Designate as Ride Captain'}
                      >
                        <Star className={`w-3.5 h-3.5 ${rider.is_captain ? 'fill-amber-400' : ''}`} />
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
