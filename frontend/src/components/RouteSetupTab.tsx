import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  RotateCw,
  FileText,
  ArrowRight,
  ShieldAlert,
  Fuel,
  Utensils,
  Wrench,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import type { RideDetails } from '../types';
import { previewRoute, updateRideRoute } from '../api';

interface RouteSetupTabProps {
  ride: RideDetails | null;
  demoMode: boolean;
  onRideLoaded: (rideId: string) => void;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
  onOpenApiSettings: () => void;
  onOpenChatModal: () => void;
}

export const RouteSetupTab: React.FC<RouteSetupTabProps> = ({
  ride,
  demoMode,
  onRideLoaded,
  onRefreshRide,
  setActiveTab,
  onOpenApiSettings,
  onOpenChatModal
}) => {
  // Route input states
  const [startLocation, setStartLocation] = useState(
    ride?.start_location || 'Nelamangala Toll Plaza, Bangalore'
  );
  const [destination, setDestination] = useState(
    ride?.destination || 'Sakleshpur'
  );
  const [rideDate, setRideDate] = useState(ride?.ride_date || '2026-11-29');
  const [startTime, setStartTime] = useState(ride?.start_time || '05:30 am');

  // Preview data state (from live API)
  const [routeData, setRouteData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [updatingRide, setUpdatingRide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Leaflet Map Reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const destinationPresets = [
    { label: 'Sakleshpur', state: 'Karnataka' },
    { label: 'Ooty', state: 'Tamil Nadu' },
    { label: 'Coorg (Madikeri)', state: 'Karnataka' },
    { label: 'Chikmagalur', state: 'Karnataka' },
    { label: 'Nandi Hills', state: 'Karnataka' },
    { label: 'Mysore', state: 'Karnataka' },
    { label: 'Goa', state: 'Panaji' },
    { label: 'Wayanad', state: 'Kerala' },
  ];

  // Initialize or update Map with Start and Destination Pointers
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([13.0, 76.5], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Remove existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const activePolyline = routeData?.polyline || ride?.polyline;
    const activeStops = routeData?.timeline || ride?.stops || [];

    // Helper: Create professional teardrop map pin for Start (A) and Destination (B)
    const createLocationPin = (label: string, isStart: boolean, color: string) => {
      return L.divIcon({
        className: 'custom-location-pin',
        html: `
          <div style="position: relative; width: 34px; height: 44px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45)); cursor: pointer;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 29.5 17 44 17 44C17 44 34 29.5 34 17C34 7.61 26.39 0 17 0Z" fill="${color}"/>
              <circle cx="17" cy="17" r="11" fill="#0f172a" stroke="#ffffff" stroke-width="2.5"/>
              <text x="17" y="21" font-size="11" font-weight="900" font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">${label}</text>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -40]
      });
    };

    // Helper: Create subtle numbered circular checkpoint marker
    const createCheckpointIcon = (type: string, order: number) => {
      let bg = '#334155';
      if (type === 'fuel') bg = '#0284c7'; // sky blue
      else if (type === 'food') bg = '#10b981'; // emerald
      else if (type === 'restroom') bg = '#6366f1'; // indigo
      else if (type === 'repair') bg = '#e11d48'; // rose
      else if (type === 'checkpoint') bg = '#64748b'; // slate

      return L.divIcon({
        className: 'subtle-checkpoint-marker',
        html: `
          <div style="background-color: ${bg}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 800; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
            ${order}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
      });
    };

    // Draw Route Polyline
    if (activePolyline && activePolyline.length > 0) {
      const polyline = L.polyline(activePolyline, {
        color: '#0284c7', // Professional Sky Blue
        weight: 4.5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [35, 35] });

      // Add Start Marker (Point A)
      const startCoord = activePolyline[0];
      const startIcon = createLocationPin('A', true, '#10b981'); // Emerald green pin
      const startPopup = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 160px;">
          <div style="display: inline-block; background: #ecfdf5; color: #059669; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
            Start Location (Point A)
          </div>
          <h4 style="margin: 4px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;">${startLocation}</h4>
          <p style="margin: 0; color: #475569; font-size: 11px;">Departure: <strong>${startTime}</strong></p>
        </div>
      `;
      L.marker([startCoord[0], startCoord[1]], { icon: startIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(startPopup);

      // Add Destination Marker (Point B)
      const endCoord = activePolyline[activePolyline.length - 1];
      const endIcon = createLocationPin('B', false, '#e11d48'); // Rose/Crimson pin
      const endPopup = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 160px;">
          <div style="display: inline-block; background: #fff1f2; color: #e11d48; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
            Destination Goal (Point B)
          </div>
          <h4 style="margin: 4px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;">${destination}</h4>
          <p style="margin: 0; color: #475569; font-size: 11px;">Planned Arrival Zone</p>
        </div>
      `;
      L.marker([endCoord[0], endCoord[1]], { icon: endIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(endPopup);
    }

    // Add Intermediate Checkpoint Stops
    activeStops.forEach((stop: any, idx: number) => {
      const icon = createCheckpointIcon(stop.stop_type || stop.type, idx + 1);
      const name = stop.name || 'Checkpoint';
      const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
      const eta = stop.eta || '';
      const notes = stop.notes || '';
      const stopType = stop.stop_type || stop.type || 'checkpoint';

      const popup = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 3px; min-width: 150px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7;">
            Stop #${idx + 1}: ${stopType}
          </div>
          <h4 style="margin: 3px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;">${name}</h4>
          <p style="margin: 0; color: #475569; font-size: 11px;">Leg: ${km} km from start | ETA: <strong>${eta}</strong></p>
          ${notes ? `<p style="margin-top: 4px; font-size: 11px; color: #64748b; line-height: 1.3;">${notes}</p>` : ''}
        </div>
      `;

      L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(popup);
    });

  }, [routeData, ride, startLocation, destination, startTime]);

  // Initial preview calculation
  useEffect(() => {
    if (!ride && !routeData) {
      handleCalculateRoute();
    }
  }, []);

  const handleCalculateRoute = async () => {
    if (!startLocation.trim() || !destination.trim()) return;
    try {
      setCalculating(true);
      setStatusMessage(null);
      const data = await previewRoute({
        start_location: startLocation,
        destination: destination,
        start_time: startTime,
        target_date: rideDate,
        smallest_tank_range_km: 301.4,
      });
      setRouteData(data);
      setStatusMessage(`Route calculated via ${data.routing_provider || 'OpenStreetMap OSRM'}: ${data.total_distance_km} km`);
    } catch (err: any) {
      setStatusMessage(`Route calculation error: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateActiveRide = async () => {
    if (!ride) return;
    try {
      setUpdatingRide(true);
      setStatusMessage(null);
      await updateRideRoute(ride.id, {
        start_location: startLocation,
        destination: destination,
        ride_date: rideDate,
        start_time: startTime,
      });
      onRefreshRide();
      setStatusMessage('Active ride updated with newly calculated route and stops.');
    } catch (err: any) {
      setStatusMessage(`Failed to update ride: ${err.message}`);
    } finally {
      setUpdatingRide(false);
    }
  };

  const displayDistance = routeData?.total_distance_km || ride?.total_distance_km || 221.5;
  const displayDuration = routeData?.estimated_duration_minutes || ride?.duration_minutes || 235;
  const displayWeather = routeData?.weather?.overall_verdict || ride?.weather_verdict || 'GO';
  const displayStops = routeData?.timeline || ride?.stops || [];
  const routingEngine = routeData?.routing_provider || 'OpenStreetMap OSRM';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Route Setup & Destination Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                Route &amp; Destination Setup
              </span>
              <span className="text-xs text-slate-400">Live Highway Routing &amp; Fuel Safety</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Group Ride Highway Planner</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenChatModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Import WhatsApp Chat</span>
            </button>
            <button
              onClick={onOpenApiSettings}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>API Settings</span>
            </button>
          </div>
        </div>

        {/* Start & Destination Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs">
          {/* Start Point */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                A
              </span>
              <span>Start Location</span>
            </label>
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="e.g. Nelamangala Toll Plaza, Bangalore"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition"
            />
          </div>

          {/* Ride End Goal / Destination */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-[10px]">
                B
              </span>
              <span>Ride End Goal (Destination)</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Sakleshpur / Ooty / Coorg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition"
            />
          </div>

          {/* Date & Time */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ride Date</span>
            </label>
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Time</span>
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="05:30 am"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition"
            />
          </div>
        </div>

        {/* Quick Destination Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Popular Destinations:</span>
          {destinationPresets.map((p) => {
            const isSelected = destination.toLowerCase().includes(p.label.toLowerCase());
            return (
              <button
                key={p.label}
                onClick={() => {
                  setDestination(p.label);
                  setTimeout(handleCalculateRoute, 50);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                  isSelected
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            {statusMessage ? (
              <span className="text-slate-300 font-medium">{statusMessage}</span>
            ) : (
              <span>Routing Engine: <strong className="text-sky-400">{routingEngine}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCalculateRoute}
              disabled={calculating}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
              <span>{calculating ? 'Calculating...' : 'Recalculate Route'}</span>
            </button>

            {ride ? (
              <button
                onClick={handleUpdateActiveRide}
                disabled={updatingRide}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <span>{updatingRide ? 'Updating Plan...' : 'Apply to Active Ride'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenChatModal}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <span>Import Group Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Route Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Total Distance</span>
          <span className="text-lg font-bold text-sky-400 font-mono mt-0.5 block">{displayDistance} km</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Estimated Riding Time</span>
          <span className="text-lg font-bold text-white font-mono mt-0.5 block">
            ~{Math.floor(displayDuration / 60)}h {displayDuration % 60}m
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Route Weather Verdict</span>
          <span className={`text-base font-bold font-mono mt-0.5 block ${
            displayWeather === 'GO' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {displayWeather} Status
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Planned Stops</span>
          <span className="text-lg font-bold text-slate-200 font-mono mt-0.5 block">{displayStops.length} Checkpoints</span>
        </div>
      </div>

      {/* Map and Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaflet Map Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[540px]">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Highway Route Map</span>
              <span className="text-[11px] text-slate-500">|</span>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  Start (A)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  Goal (B)
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{destination}</span>
          </div>
          <div ref={mapContainerRef} className="flex-1 w-full rounded-xl overflow-hidden shadow-inner border border-slate-800" />
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[540px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-white font-bold text-xs uppercase tracking-wider">Timeline &amp; Checkpoints</h3>
              <p className="text-[11px] text-slate-400">Fuel stops optimized for group safe range limit</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              {displayStops.length} Stops
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {displayStops.map((stop: any, idx: number) => {
              const stopType = stop.stop_type || stop.type || 'checkpoint';
              const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
              return (
                <div
                  key={stop.id || idx}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                      #{idx + 1} {stopType}
                    </span>
                    <span className="font-mono text-sky-400 font-bold">{stop.eta || '08:00 AM'}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <h4 className="text-white font-semibold text-xs">{stop.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">{km} km</span>
                  </div>

                  {stop.notes && (
                    <p className="text-[11px] text-slate-400 leading-snug">{stop.notes}</p>
                  )}
                </div>
              );
            })}
          </div>

          {ride && (
            <div className="pt-3 border-t border-slate-800 mt-2">
              <button
                onClick={() => setActiveTab('approvals')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700/80"
              >
                <span>View Approvals &amp; Deliverables</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
