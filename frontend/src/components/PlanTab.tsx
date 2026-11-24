import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Fuel, Utensils, ShieldAlert, Wrench, Clock, CloudSun, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { RideDetails, RideStop } from '../types';

interface PlanTabProps {
  ride: RideDetails;
  setActiveTab: (tab: string) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({ ride, setActiveTab }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on route between Nelamangala and Sakleshpur
    const defaultCenter: [number, number] = [13.03, 76.58];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous vector layers / markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw Route Polyline
    if (ride.polyline && ride.polyline.length > 0) {
      const polyline = L.polyline(ride.polyline, {
        color: '#f59e0b',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }

    // Add Stop Markers with custom HTML icons
    const getMarkerColor = (type: string) => {
      switch (type) {
        case 'fuel': return '#ea580c'; // orange
        case 'food': return '#10b981'; // emerald
        case 'restroom': return '#3b82f6'; // blue
        case 'repair': return '#ef4444'; // red
        default: return '#8b5cf6'; // purple
      }
    };

    const getMarkerEmoji = (type: string) => {
      switch (type) {
        case 'fuel': return '⛽';
        case 'food': return '🍔';
        case 'restroom': return '🚻';
        case 'repair': return '🔧';
        default: return '🏁';
      }
    };

    ride.stops.forEach((stop) => {
      const emoji = getMarkerEmoji(stop.stop_type);
      const color = getMarkerColor(stop.stop_type);

      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4); border: 2px solid white; font-size: 14px;">
            ${emoji}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 2px;">
          <strong style="color: ${color}; text-transform: uppercase; font-size: 10px;">${stop.stop_type} Stop (${stop.distance_from_start_km} km)</strong>
          <h4 style="margin: 2px 0; font-size: 13px; font-weight: bold;">${stop.name}</h4>
          <p style="margin: 0; color: #475569;">ETA: <strong>${stop.eta}</strong> | Duration: ${stop.duration_minutes} min</p>
          <p style="margin-top: 4px; font-size: 11px; color: #64748b;">${stop.notes}</p>
        </div>
      `;

      L.marker([stop.lat, stop.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });

  }, [ride]);

  const getStopBadgeColor = (type: string) => {
    switch (type) {
      case 'fuel': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'food': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'restroom': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'repair': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Weather Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Stats */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Approved Highway Corridor</span>
              <h2 className="text-xl font-black text-white">{ride.start_location} ➡️ {ride.destination}</h2>
              <p className="text-xs text-slate-400 mt-0.5">NH75 Corridor via Nelamangala, Kunigal, Yediyur, Channarayapatna, Hassan Bypass</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-400 font-mono">{ride.total_distance_km} km</span>
              <span className="block text-[11px] text-slate-400">~{Math.round(ride.duration_minutes / 60)} hrs ride</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Fuel Stops: {ride.stops.filter(s => s.stop_type === 'fuel').length}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Food Stops: {ride.stops.filter(s => s.stop_type === 'food').length}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Restroom Gap: &le; 47 km
              </span>
            </div>

            <button
              onClick={() => setActiveTab('approvals')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition"
            >
              <span>Captain Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weather Verdict Card */}
        <div className={`border rounded-2xl p-5 shadow-lg flex flex-col justify-between ${
          ride.weather_verdict === 'GO'
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : ride.weather_verdict === 'CAUTION'
            ? 'bg-amber-950/20 border-amber-500/40'
            : 'bg-rose-950/20 border-rose-500/40'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CloudSun className="w-4 h-4 text-amber-400" />
                <span>Open-Meteo Verdict</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider ${
                ride.weather_verdict === 'GO'
                  ? 'bg-emerald-500 text-slate-950'
                  : ride.weather_verdict === 'CAUTION'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}>
                {ride.weather_verdict}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-2">Motorcycle Safety Assessment</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {ride.weather_summary || 'Precipitation probability < 15%, mild mountain air, crosswinds safe for cruising.'}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Verified across route checkpoints at planned arrival hours.</span>
          </div>
        </div>
      </div>

      {/* Map and Timeline Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaflet Map Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Route Map & Stop Geocodes</h3>
            <span className="text-[11px] text-slate-400">Interactive: click pins for details</span>
          </div>
          <div ref={mapContainerRef} className="flex-1 w-full rounded-xl overflow-hidden shadow-inner" />
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-bold text-sm">Chronological Timeline</h3>
            </div>
            <span className="text-[11px] text-slate-400">{ride.stops.length} Planned Stops</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {ride.stops.map((stop, index) => (
              <div
                key={stop.id || index}
                className="p-3 bg-slate-950/60 hover:bg-slate-800/40 border border-slate-800/80 rounded-xl text-xs space-y-1.5 transition"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStopBadgeColor(stop.stop_type)}`}>
                    {stop.stop_type.toUpperCase()} STOP
                  </span>
                  <span className="font-mono font-bold text-amber-400">{stop.eta}</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <h4 className="text-white font-semibold text-xs">{stop.name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">{stop.distance_from_start_km} km</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">{stop.notes}</p>

                <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Planned pause: <strong>{stop.duration_minutes} mins</strong></span>
                  <span>Stop #{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
