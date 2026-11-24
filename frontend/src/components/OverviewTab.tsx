import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Compass,
  Users,
  ShieldCheck,
  CreditCard,
  CloudSun,
  Fuel,
  ArrowRight,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Sparkles,
  Zap,
  Bike,
  Activity,
  History
} from 'lucide-react';
import type { RideDetails, Rider } from '../types';

interface OverviewTabProps {
  ride: RideDetails | null;
  setActiveTab: (tab: string) => void;
  onOpenChatModal: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  ride,
  setActiveTab,
  onOpenChatModal,
}) => {
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);

  // Derive stats if ride is loaded
  const confirmedRiders = ride?.riders.filter((r) => r.status === 'confirmed') || [];
  const undecidedRiders = ride?.riders.filter((r) => r.status === 'undecided') || [];
  const declinedRiders = ride?.riders.filter((r) => r.status === 'declined') || [];

  // Bottleneck Rider & Safe Range
  const bottleneckRider = confirmedRiders.reduce<Rider | null>((min, cur) => {
    if (!min) return cur;
    return (cur.tank_range_km || 999) < (min.tank_range_km || 999) ? cur : min;
  }, null);

  const safeRangeKm = bottleneckRider?.tank_range_km
    ? (bottleneckRider.tank_range_km * 0.8).toFixed(1)
    : '241.1';

  const pendingCount = ride?.pending_actions.filter((a) => a.status === 'PENDING').length || 0;

  // Mini-map initialization
  useEffect(() => {
    if (!miniMapContainerRef.current || !ride) return;

    const defaultCenter: [number, number] = [ride.start_lat || 12.97, ride.start_lng || 77.59];

    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView(defaultCenter, 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      miniMapInstanceRef.current = map;
    }

    const map = miniMapInstanceRef.current;

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (ride.polyline && ride.polyline.length > 0) {
      const polyline = L.polyline(ride.polyline, {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }

    // Add start and end dots
    if (ride.start_lat && ride.start_lng) {
      L.circleMarker([ride.start_lat, ride.start_lng], {
        radius: 6,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 1,
      }).addTo(map);
    }
    if (ride.dest_lat && ride.dest_lng) {
      L.circleMarker([ride.dest_lat, ride.dest_lng], {
        radius: 6,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 1,
      }).addTo(map);
    }
  }, [ride]);

  if (!ride) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-xl">
          <Bike className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">No Active Ride Plan Loaded</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Import an exported WhatsApp ride group chat or plan a new highway route to initiate autonomous group telemetry.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onOpenChatModal}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Import WhatsApp Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('route')}
            className="px-5 py-2.5 rounded-xl bg-[#161c27] hover:bg-[#1e2636] text-slate-200 border border-[#273245] font-semibold text-xs flex items-center gap-2 transition"
          >
            <Compass className="w-4 h-4 text-slate-300" />
            <span>Open Route Planner</span>
          </button>
        </div>
      </div>
    );
  }

  // Weather verdict color
  const getWeatherBadge = (verdict?: string) => {
    switch (verdict) {
      case 'GO':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'GO — CLEAR FOR RIDE'
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          label: 'CAUTION — SCATTERED SHOWERS'
        };
      case 'NO-GO':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          dot: 'bg-rose-400',
          label: 'NO-GO — HAZARD WARNING'
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          label: 'MONITORED'
        };
    }
  };

  const weatherStyle = getWeatherBadge(ride.weather_verdict);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Overview Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121722] via-[#0f141d] to-[#1a1510] border border-[#222a3a] p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                ACTIVE RIDE MISSION
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${weatherStyle.bg}`}>
                <span className={`w-2 h-2 rounded-full ${weatherStyle.dot} animate-pulse`}></span>
                {weatherStyle.label}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {ride.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200">{ride.start_location}</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-slate-200">{ride.destination}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Date: <strong className="text-slate-200">{ride.ride_date}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Wheels Roll: <strong className="text-slate-200">{ride.start_time}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Pace: <strong className="text-slate-200">{ride.pace || 'Brisk Tourer'}</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('ridemode')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition group"
            >
              <Radio className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Launch Cockpit Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('route')}
              className="px-5 py-2.5 rounded-xl bg-[#18202d] hover:bg-[#202b3d] text-slate-200 border border-[#253247] font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Explore Interactive Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Group Safe Riding Range */}
        <div className="bg-[#12161f] border border-[#1e2533] hover:border-amber-500/30 rounded-2xl p-4 shadow-lg transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
              Safe Leg Cap (0.8x)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {safeRangeKm} <span className="text-sm font-normal text-slate-400">km</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Bottleneck: <strong className="text-slate-200">{bottleneckRider?.name || 'Group Limit'}</strong> ({bottleneckRider?.bike_model || 'Smallest Tank'})
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1e2533] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Tank Cap Rule:</span>
            <span className="text-amber-400 font-mono font-medium">Mandatory Fuel Stop &lt; {safeRangeKm} km</span>
          </div>
        </div>

        {/* Metric 2: Roster Status */}
        <div className="bg-[#12161f] border border-[#1e2533] hover:border-[#2a3649] rounded-2xl p-4 shadow-lg transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Riders Confirmed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {confirmedRiders.length} <span className="text-sm font-normal text-slate-400">/ {ride.riders.length} Riders</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {undecidedRiders.length} Undecided • {declinedRiders.length} Declined
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1e2533] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Roster Capacity:</span>
            <span className="text-emerald-400 font-mono font-medium">
              {Math.round((confirmedRiders.length / (ride.riders.length || 1)) * 100)}% Locked
            </span>
          </div>
        </div>

        {/* Metric 3: Route Distance & Travel Duration */}
        <div className="bg-[#12161f] border border-[#1e2533] hover:border-[#2a3649] rounded-2xl p-4 shadow-lg transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Distance &amp; ETA
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {ride.total_distance_km?.toFixed(1) || '224.5'} <span className="text-sm font-normal text-slate-400">km</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Est. Duration: <strong className="text-slate-200">{Math.floor((ride.duration_minutes || 210) / 60)}h {(ride.duration_minutes || 210) % 60}m</strong>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1e2533] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Highway Stops:</span>
            <span className="text-sky-400 font-mono font-medium">{ride.stops.length} Planned Checkpoints</span>
          </div>
        </div>

        {/* Metric 4: Pending Approvals Gate */}
        <div className="bg-[#12161f] border border-[#1e2533] hover:border-amber-500/30 rounded-2xl p-4 shadow-lg transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
              Captain Gatekeeper
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
              {pendingCount}
              <span className="text-xs font-normal text-slate-400">
                {pendingCount === 1 ? 'Action Pending' : 'Actions Pending'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {pendingCount > 0 ? 'Mutations blocked awaiting sign-off' : 'All safe actions authorized'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1e2533] flex items-center justify-between text-[11px]">
            <button
              onClick={() => setActiveTab('approvals')}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
            >
              <span>{pendingCount > 0 ? 'Review Approvals' : 'View Audit Log'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-slate-500 font-mono text-[10px]">Zero-Risk Gate</span>
          </div>
        </div>
      </div>

      {/* Route & Waypoint Overview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Route Snapshot & Timeline Preview */}
        <div className="lg:col-span-2 bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2533] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                Highway Route &amp; Stop Telemetry
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('route')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Full Interactive Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Route Map Preview */}
          <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#1e2533] bg-[#0b0e14]">
            <div ref={miniMapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-20 bg-[#0e1219]/90 backdrop-blur-sm border border-[#222a3a] px-2.5 py-1 rounded-md text-[10px] text-slate-300 font-mono">
              Live Highway Polyline • {ride.total_distance_km} km
            </div>
          </div>

          {/* Key Stops Timeline Preview */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Key Highway Stops ({ride.stops.length})
            </h3>
            <div className="space-y-2">
              {ride.stops.slice(0, 4).map((stop, idx) => {
                const isFuel = stop.stop_type === 'fuel';
                const isFood = stop.stop_type === 'food';
                const isRestroom = stop.stop_type === 'restroom';
                const isRepair = stop.stop_type === 'repair';

                const badgeColor = isFuel
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : isFood
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : isRestroom
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

                return (
                  <div
                    key={stop.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#161c27] border border-[#222a38] text-xs hover:border-[#2a374c] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                        {stop.stop_type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{stop.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {stop.distance_from_start_km} km • ETA: {stop.eta} • {stop.duration_minutes} min stop
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-[#1e2736]">
                      {stop.source === 'osm' ? 'Live OSM' : stop.source === 'cached' ? 'Cached' : 'Est'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Weather & Action Log Digest */}
        <div className="space-y-6">
          {/* Weather Digest Card */}
          <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e2533] pb-3">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Open-Meteo Weather Verdict
                </h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${weatherStyle.bg}`}>
                {ride.weather_verdict || 'GO'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {ride.weather_summary || 'Target conditions optimal along corridor. Low rain risk (<20%), winds under 25 km/h across departure and arrival coordinates.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-[#161c27] border border-[#222a38]">
                <span className="text-slate-400 block text-[10px]">VERDICT THRESHOLD</span>
                <span className="font-bold text-slate-200">&lt; 40% Rain (Safe)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#161c27] border border-[#222a38]">
                <span className="text-slate-400 block text-[10px]">TIME WINDOW</span>
                <span className="font-bold text-slate-200">{ride.start_time} - 12:30 PM</span>
              </div>
            </div>
          </div>

          {/* Quick Roster Spotlight */}
          <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e2533] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Roster Spotlight
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('parsed')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2">
              {confirmedRiders.slice(0, 3).map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#161c27] border border-[#222a38] text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      {rider.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-slate-200 truncate">{rider.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{rider.bike_model || 'Motorcycle'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 bg-[#1e2736] px-2 py-0.5 rounded">
                    {rider.tank_range_km?.toFixed(0) || '300'} km
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
