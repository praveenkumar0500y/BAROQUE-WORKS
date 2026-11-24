import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  Compass,
  Sparkles,
  Upload,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Fuel,
  Utensils,
  Wrench,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import type { RideDetails } from '../types';
import { previewRoute, updateRideRoute, fetchSampleChat, parseChatAndPlan } from '../api';

interface RouteSetupTabProps {
  ride: RideDetails | null;
  demoMode: boolean;
  onRideLoaded: (rideId: string) => void;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
  onOpenApiSettings: () => void;
}

export const RouteSetupTab: React.FC<RouteSetupTabProps> = ({
  ride,
  demoMode,
  onRideLoaded,
  onRefreshRide,
  setActiveTab,
  onOpenApiSettings
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

  // Chat input state
  const [showChatSection, setShowChatSection] = useState(!ride);
  const [chatText, setChatText] = useState('');
  const [parsingChat, setParsingChat] = useState(false);

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

  // Initialize or update Map
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

    // Draw Polyline
    if (activePolyline && activePolyline.length > 0) {
      const polyline = L.polyline(activePolyline, {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }

    // Custom subtle SVG markers
    const createSubtleIcon = (type: string, order: number) => {
      let bg = '#475569';
      let label = `${order}`;

      if (type === 'fuel') bg = '#ea580c';
      else if (type === 'food') bg = '#10b981';
      else if (type === 'restroom') bg = '#3b82f6';
      else if (type === 'repair') bg = '#e11d48';
      else if (type === 'checkpoint') bg = '#8b5cf6';

      return L.divIcon({
        className: 'subtle-map-marker',
        html: `
          <div style="background-color: ${bg}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; border: 2px solid #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
            ${label}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    activeStops.forEach((stop: any, idx: number) => {
      const icon = createSubtleIcon(stop.stop_type || stop.type, idx + 1);
      const name = stop.name || 'Stop';
      const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
      const eta = stop.eta || '';
      const notes = stop.notes || '';

      const popup = `
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 2px;">
          <strong style="text-transform: uppercase; font-size: 10px; color: #475569;">${stop.stop_type || stop.type} Stop</strong>
          <h4 style="margin: 2px 0; font-size: 12px; font-weight: bold;">${name}</h4>
          <p style="margin: 0; color: #334155;">Distance: ${km} km | ETA: ${eta}</p>
          ${notes ? `<p style="margin-top: 4px; font-size: 11px; color: #64748b;">${notes}</p>` : ''}
        </div>
      `;

      L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(popup);
    });

  }, [routeData, ride]);

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

  const handleLoadSampleChat = async () => {
    try {
      const text = await fetchSampleChat();
      setChatText(text);
      setShowChatSection(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleParseChat = async () => {
    if (!chatText.trim()) return;
    try {
      setParsingChat(true);
      const res = await parseChatAndPlan(chatText, {
        customDestination: destination,
        customStart: startLocation,
        customDate: rideDate,
        customTime: startTime,
        demoMode: demoMode,
      });
      if (res.ride_id) {
        onRideLoaded(res.ride_id);
        setShowChatSection(false);
        setStatusMessage('Chat imported and synced with active route.');
      }
    } catch (err: any) {
      setStatusMessage(`Chat parsing failed: ${err.message}`);
    } finally {
      setParsingChat(false);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Route &amp; Destination Setup</span>
            <h1 className="text-xl sm:text-2xl font-black text-white">Interactive Highway Planner</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live OpenStreetMap routing, geocoding, and fuel stop safety calculation. Change your start point or destination anytime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenApiSettings}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <span>API Connections</span>
            </button>
            <button
              onClick={() => setShowChatSection(!showChatSection)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showChatSection ? 'Hide Chat Input' : 'Import WhatsApp Chat'}</span>
            </button>
          </div>
        </div>

        {/* Start & Destination Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Start Point */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Location</span>
            </label>
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="e.g. Nelamangala Toll Plaza, Bangalore"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ride End Goal / Destination */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Ride End Goal (Destination)</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Sakleshpur / Ooty / Coorg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Date & Time */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ride Date</span>
            </label>
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Time</span>
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="05:30 am"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Quick Destination Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Popular Destinations:</span>
          {destinationPresets.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setDestination(p.label);
                setTimeout(handleCalculateRoute, 50);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                destination.toLowerCase().includes(p.label.toLowerCase())
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            {statusMessage ? (
              <span className="text-slate-300 font-medium">{statusMessage}</span>
            ) : (
              <span>Engine: <strong className="text-amber-400">{routingEngine}</strong> (Live OSM API)</span>
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
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <span>{updatingRide ? 'Updating Plan...' : 'Apply to Active Ride'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowChatSection(true)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <span>Sync with Group Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Optional WhatsApp Chat Import Drawer */}
      {showChatSection && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Import Group Chat for Roster &amp; Fuel Optimization</h3>
              <p className="text-[11px] text-slate-400">Extracts rider bike models to set the group's safe tank range limit</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSampleChat}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition"
              >
                Load Sample Chat
              </button>
              <button
                onClick={() => setShowChatSection(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Close
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Paste exported WhatsApp group chat text here... or click 'Load Sample Chat' above."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
          />

          <div className="flex justify-end">
            <button
              onClick={handleParseChat}
              disabled={parsingChat || !chatText.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <span>{parsingChat ? 'Parsing & Optimizing...' : 'Parse Chat & Calculate Safe Legs'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Route Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 block">Total Distance</span>
          <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">{displayDistance} km</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 block">Riding Time</span>
          <span className="text-lg font-black text-white font-mono mt-0.5 block">
            ~{Math.floor(displayDuration / 60)}h {displayDuration % 60}m
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 block">Route Weather</span>
          <span className={`text-base font-black font-mono mt-0.5 block ${
            displayWeather === 'GO' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {displayWeather} Status
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 block">Planned Stops</span>
          <span className="text-lg font-black text-slate-200 font-mono mt-0.5 block">{displayStops.length} Checkpoints</span>
        </div>
      </div>

      {/* Map and Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaflet Map Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Highway Map View</span>
            <span className="text-[11px] text-slate-500 font-mono">{startLocation} to {destination}</span>
          </div>
          <div ref={mapContainerRef} className="flex-1 w-full rounded-xl overflow-hidden shadow-inner" />
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Timeline &amp; Checkpoints</h3>
            <span className="text-[11px] text-slate-400">{displayStops.length} Stops Planned</span>
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
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      #{idx + 1} {stopType}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{stop.eta || '08:00 AM'}</span>
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
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
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
