import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Clock, CloudSun, ArrowRight } from 'lucide-react';
import type { RideDetails } from '../types';

interface PlanTabProps {
  ride: RideDetails;
  setActiveTab: (tab: string) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({ ride, setActiveTab }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const defaultCenter: [number, number] = [ride.start_lat || 13.0, ride.start_lng || 76.5];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (ride.polyline && ride.polyline.length > 0) {
      const polyline = L.polyline(ride.polyline, {
        color: '#B85228',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }

    const getMarkerColor = (type: string) => {
      switch (type) {
        case 'fuel':
          return '#B85228';
        case 'food':
          return '#2D6A4F';
        case 'restroom':
          return '#43423E';
        case 'repair':
          return '#A63636';
        default:
          return '#141413';
      }
    };

    const getMarkerLabel = (type: string) => {
      switch (type) {
        case 'fuel':
          return 'F';
        case 'food':
          return 'M';
        case 'restroom':
          return 'R';
        case 'repair':
          return 'S';
        default:
          return 'P';
      }
    };

    ride.stops.forEach((stop) => {
      const label = getMarkerLabel(stop.stop_type);
      const color = getMarkerColor(stop.stop_type);

      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div style="background-color: ${color}; color: #FAF9F6; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid #FAF9F6; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600;">
            ${label}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const popupContent = `
        <div style="font-size: 12px; padding: 2px;">
          <strong style="text-transform: uppercase; font-size: 10px;">${stop.stop_type} Stop (${stop.distance_from_start_km} km)</strong>
          <h4 style="margin: 2px 0; font-size: 13px; font-weight: 600;">${stop.name}</h4>
          <p style="margin: 0;">ETA: <strong>${stop.eta}</strong> · ${stop.duration_minutes} min</p>
          <p style="margin-top: 4px; font-size: 11px;">${stop.notes}</p>
        </div>
      `;

      L.marker([stop.lat, stop.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });
  }, [ride]);

  const getStopTextColor = (type: string) => {
    switch (type) {
      case 'fuel':
        return 'text-[var(--accent)]';
      case 'food':
        return 'text-[var(--status-ok)]';
      case 'repair':
        return 'text-[var(--status-danger)]';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Highway Corridor
              </span>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mt-0.5">
                {ride.start_location} &rarr; {ride.destination}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold text-[var(--text-primary)] font-mono tabular-nums">
                {ride.total_distance_km} km
              </span>
              <span className="block text-xs text-[var(--text-muted)] font-mono tabular-nums">
                ~{Math.round(ride.duration_minutes / 60)} hrs ride
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-[var(--text-muted)] font-mono tabular-nums">
              <span>Fuel: {ride.stops.filter((s) => s.stop_type === 'fuel').length}</span>
              <span>Food: {ride.stops.filter((s) => s.stop_type === 'food').length}</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium rounded-[6px] text-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <span>Captain Approvals</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.06em] text-[var(--text-muted)] flex items-center gap-1.5">
                <CloudSun className="w-4 h-4 text-[var(--status-warn)]" strokeWidth={1.5} />
                <span>Open-Meteo Verdict</span>
              </span>
              <span
                className={`font-mono text-xs font-semibold ${
                  ride.weather_verdict === 'GO'
                    ? 'text-[var(--status-ok)]'
                    : ride.weather_verdict === 'CAUTION'
                    ? 'text-[var(--status-warn)]'
                    : 'text-[var(--status-danger)]'
                }`}
              >
                {ride.weather_verdict}
              </span>
            </div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] mt-2">
              Weather Assessment
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed max-w-[54ch]">
              {ride.weather_summary || 'Forecast checked across planned route checkpoints.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Route Map &amp; Stops
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">Click pins for details</span>
          </div>
          <div ref={mapContainerRef} className="flex-1 w-full rounded-[6px] overflow-hidden" />
        </div>

        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] flex flex-col h-[520px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <h3 className="font-display text-[var(--text-primary)] font-semibold text-sm">
                Chronological Timeline
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
              {ride.stops.length} stops
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {ride.stops.map((stop, index) => (
              <div
                key={stop.id || index}
                className="p-4 text-xs space-y-1.5 hover:bg-[var(--bg-hover)]/45"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[11px] font-semibold uppercase ${getStopTextColor(
                      stop.stop_type
                    )}`}
                  >
                    {stop.stop_type} stop
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                    {stop.eta}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[var(--text-primary)] font-medium text-sm">{stop.name}</h4>
                  <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums shrink-0">
                    {stop.distance_from_start_km} km
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-snug">{stop.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
