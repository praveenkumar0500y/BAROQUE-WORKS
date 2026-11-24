import React, { useState, useEffect } from 'react';
import { RefreshCw, UserPlus, Users, Fuel } from 'lucide-react';
import type { RideDetails, Rider, BikeSpec } from '../types';
import { RIDE_PHOTOS } from '../assets/ridePhotos';
import { updateRider, addRider, fetchBikes } from '../api';

interface ParsedRideTabProps {
  ride: RideDetails;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
}

type RidersSubTab = 'roster' | 'safety';

export const ParsedRideTab: React.FC<ParsedRideTabProps> = ({
  ride,
  onRefreshRide,
  setActiveTab,
}) => {
  const [subTab, setSubTab] = useState<RidersSubTab>('roster');
  const [bikes, setBikes] = useState<BikeSpec[]>([]);
  const [showAddRider, setShowAddRider] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBike, setNewBike] = useState('Royal Enfield Himalayan 450');
  const [newUpi, setNewUpi] = useState('');
  const [addingRider, setAddingRider] = useState(false);

  useEffect(() => {
    fetchBikes().then(setBikes).catch(console.error);
  }, []);

  const confirmedRiders = ride.riders.filter((r) => r.status === 'confirmed');
  const smallestRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const maxRangeKm = Math.max(450, ...ride.riders.map((r) => r.tank_range_km || 0));

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

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setAddingRider(true);
      await addRider(ride.id, {
        name: newName.trim(),
        bike_model: newBike,
        upi_id: newUpi.trim(),
        status: 'confirmed',
      });
      setNewName('');
      setNewUpi('');
      setShowAddRider(false);
      onRefreshRide();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingRider(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--alpine)]">
              02 · Pack &amp; Motorcycles
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Riders &amp; Motorcycles
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              {ride.start_location} to {ride.destination} · {ride.ride_date} · {ride.start_time}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Rider sections"
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] self-start"
          >
            <button
              role="tab"
              aria-selected={subTab === 'roster'}
              type="button"
              onClick={() => setSubTab('roster')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'roster'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="w-4 h-4 text-[var(--alpine)]" strokeWidth={1.5} />
              <span>Group Roster ({ride.riders.length})</span>
            </button>

            <button
              role="tab"
              aria-selected={subTab === 'safety'}
              type="button"
              onClick={() => setSubTab('safety')}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                subTab === 'safety'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Fuel className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.5} />
              <span>Fuel Range Safety</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[180px] rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-inset)] group">
          <img
            src={RIDE_PHOTOS.forestBobber}
            alt="Cruiser motorcycle parked along wet pine mountain road"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex flex-col justify-end p-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80">
              Pack Range Pace
            </span>
            <span className="text-sm font-semibold text-[#FAF9F6] tabular-nums">
              {smallestRider
                ? `${smallestRider.name} · ${((smallestRider.tank_range_km || 300) * 0.8).toFixed(0)} km safe leg`
                : `${confirmedRiders.length} confirmed riders`}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: GROUP ROSTER */}
      {subTab === 'roster' && (
        <section
          key="roster"
          className="animate-panel-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Rider Roster
              </h2>
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                {confirmedRiders.length} going · {ride.riders.length} total
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddRider(!showAddRider)}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] rounded-[6px] text-xs font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                <span>{showAddRider ? 'Close' : 'Add Rider'}</span>
              </button>
              <button
                type="button"
                onClick={onRefreshRide}
                className="px-3.5 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {showAddRider && (
            <form
              onSubmit={handleAddRider}
              className="p-5 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
            >
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">
                  Rider Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter rider name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">
                  Motorcycle
                </label>
                <select
                  value={newBike}
                  onChange={(e) => setNewBike(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {bikes.map((b) => (
                    <option key={b.model} value={b.model}>
                      {b.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="name@bank"
                  value={newUpi}
                  onChange={(e) => setNewUpi(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 text-sm text-[var(--text-primary)] font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={addingRider || !newName.trim()}
                  className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-medium text-sm rounded-[6px] cursor-pointer active:scale-[0.98]"
                >
                  {addingRider ? 'Adding...' : 'Save Rider'}
                </button>
              </div>
            </form>
          )}

          {ride.riders.length === 0 ? (
            <div className="p-10 space-y-3">
              <Users className="w-6 h-6 text-[var(--accent)]" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                No riders in this ride yet
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-[54ch]">
                Click Add Rider above to build your group roster and calculate your shortest tank
                interval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] text-xs font-medium border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-3 px-5">Rider</th>
                    <th className="py-3 px-4">RSVP</th>
                    <th className="py-3 px-4">Motorcycle</th>
                    <th className="py-3 px-4 text-right">Tank (L)</th>
                    <th className="py-3 px-4 text-right">Mileage</th>
                    <th className="py-3 px-4 text-right">Range</th>
                    <th className="py-3 px-4">UPI ID</th>
                    <th className="py-3 px-5">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {ride.riders.map((r) => {
                    const isBottleneck = smallestRider?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={
                          isBottleneck ? 'bg-[var(--accent-tint)]' : 'hover:bg-[var(--bg-hover)]/45'
                        }
                      >
                        <td className="py-3.5 px-5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                          <span>{r.name}</span>
                          {r.is_captain && (
                            <span className="ml-2 text-xs font-medium text-[var(--accent)]">
                              · Captain
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r, e.target.value)}
                            aria-label={`RSVP status for ${r.name}`}
                            className={`bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[var(--accent)] cursor-pointer ${
                              r.status === 'confirmed'
                                ? 'text-[var(--status-ok)]'
                                : r.status === 'undecided'
                                ? 'text-[var(--status-warn)]'
                                : 'text-[var(--status-danger)]'
                            }`}
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="undecided">Undecided</option>
                            <option value="declined">Declined</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={r.bike_model || ''}
                            onChange={(e) => handleBikeChange(r, e.target.value)}
                            aria-label={`Motorcycle model for ${r.name}`}
                            className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-[6px] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] max-w-[210px] cursor-pointer"
                          >
                            {bikes.map((b) => (
                              <option key={b.model} value={b.model}>
                                {b.model}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {r.tank_litres ? `${r.tank_litres.toFixed(1)}` : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {r.mileage_kmpl ? `${r.mileage_kmpl.toFixed(0)} km/L` : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                          {r.tank_range_km ? `${r.tank_range_km.toFixed(1)} km` : '—'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)]">
                          {r.upi_id || '—'}
                        </td>

                        <td className="py-3.5 px-5">
                          <button
                            type="button"
                            onClick={() => handleCaptainToggle(r)}
                            className={`px-2.5 py-1 rounded-[6px] text-xs font-medium border cursor-pointer whitespace-nowrap ${
                              r.is_captain
                                ? 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent)]'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
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
          )}
        </section>
      )}

      {/* SUB-TAB 2: FUEL RANGE SAFETY */}
      {subTab === 'safety' && (
        <div key="safety" className="animate-panel-enter space-y-6">
          {smallestRider ? (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
                <div className="p-6">
                  <div className="text-xs text-[var(--text-muted)]">Shortest Range Rider</div>
                  <div className="mt-1 font-display text-xl font-semibold text-[var(--alpine)]">
                    {smallestRider.name}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {smallestRider.bike_model}
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-xs text-[var(--text-muted)]">Full Tank Range</div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-[var(--forest)] tabular-nums">
                    {smallestRider.tank_range_km?.toFixed(1)} km
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {smallestRider.tank_litres?.toFixed(1)} L ×{' '}
                    {smallestRider.mileage_kmpl?.toFixed(0)} km/L
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-xs text-[var(--text-muted)]">Safe Refuel Limit (80%)</div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-[var(--accent)] tabular-nums">
                    {((smallestRider.tank_range_km || 300) * 0.8).toFixed(0)} km
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Max leg between fuel stations
                  </div>
                </div>
              </section>

              <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Confirmed Pack Tank Comparison
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('route')}
                    className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View Fuel Stops on Route
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  {[...confirmedRiders]
                    .sort((a, b) => (a.tank_range_km || 0) - (b.tank_range_km || 0))
                    .map((r) => {
                      const range = r.tank_range_km || 0;
                      const pct = Math.min(100, Math.round((range / maxRangeKm) * 100));
                      const isSmallest = smallestRider.id === r.id;
                      return (
                        <div key={r.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[var(--text-primary)]">
                              {r.name} ·{' '}
                              <span className="text-[var(--text-muted)] font-normal">
                                {r.bike_model}
                              </span>
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                              {range.toFixed(0)} km{' '}
                              {isSmallest && (
                                <span className="text-[var(--accent)] font-normal">
                                  (Sets pace)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-[var(--bg-canvas)] rounded-[4px] overflow-hidden border border-[var(--border-subtle)]">
                            <div
                              className="h-full rounded-[4px] animate-bar-grow"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isSmallest
                                  ? 'var(--accent)'
                                  : pct >= 75
                                  ? 'var(--forest)'
                                  : 'var(--alpine)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            </>
          ) : (
            <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-8 space-y-3">
              <Fuel className="w-6 h-6 text-[var(--accent)]" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Add confirmed riders to analyze fuel safety
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-[54ch]">
                Once riders and their motorcycles are listed in the Group Roster, the shortest tank
                range automatically sets your fuel stop intervals.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('roster')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-medium rounded-[6px] cursor-pointer"
              >
                Open Group Roster
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
