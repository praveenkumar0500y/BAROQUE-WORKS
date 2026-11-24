import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  RotateCw,
  ArrowRight,
  X,
  Map as MapIcon,
  ListChecks,
  SlidersHorizontal,
  ArrowLeftRight,
  Route,
  CloudSun,
  Fuel,
} from 'lucide-react';
import type { RideDetails } from '../types';
import { RIDE_PHOTOS } from '../assets/ridePhotos';
import {
  createRide,
  previewRoute,
  updateRideRoute,
  fetchLocationSuggestions,
} from '../api';

interface RouteSetupTabProps {
  ride: RideDetails | null;
  theme: 'light' | 'dark';
  onRideLoaded: (rideId: string) => void;
  onRefreshRide: () => void;
  setActiveTab: (tab: string) => void;
  onOpenChatModal: () => void;
}

type RouteSubTab = 'setup' | 'map' | 'stops';

export const RouteSetupTab: React.FC<RouteSetupTabProps> = ({
  ride,
  theme,
  onRideLoaded,
  onRefreshRide,
  setActiveTab,
  onOpenChatModal,
}) => {
  const [todayStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [subTab, setSubTab] = useState<RouteSubTab>(() => (ride ? 'map' : 'setup'));

  const [startLocation, setStartLocation] = useState(ride?.start_location || '');
  const [destination, setDestination] = useState(ride?.destination || '');
  const [rideDate, setRideDate] = useState(ride?.ride_date || todayStr);
  const [startTime, setStartTime] = useState(ride?.start_time || '06:00 am');

  const [startSuggestions, setStartSuggestions] = useState<
    Array<{ name: string; description: string }>
  >([]);
  const [destSuggestions, setDestSuggestions] = useState<
    Array<{ name: string; description: string }>
  >([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<
    'all' | 'fuel' | 'food' | 'restroom' | 'repair'
  >('all');

  const startSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  const [routeData, setRouteData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [savingRide, setSavingRide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersRef = useRef<L.FeatureGroup | null>(null);
  const stopMarkersRef = useRef<Record<number, L.Marker>>({});
  const lastSyncedRideIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (ride && ride.id !== lastSyncedRideIdRef.current) {
      lastSyncedRideIdRef.current = ride.id;
      setStartLocation(ride.start_location);
      setDestination(ride.destination);
      setRideDate(ride.ride_date);
      setStartTime(ride.start_time);
      setRouteData(null);
      setSelectedStopIndex(null);
      setSubTab('map');
    } else if (!ride && lastSyncedRideIdRef.current !== null) {
      lastSyncedRideIdRef.current = null;
      setStartLocation('');
      setDestination('');
      setRideDate(todayStr);
      setStartTime('06:00 am');
      setRouteData(null);
      setSelectedStopIndex(null);
    }
  }, [ride, todayStr]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startDropdownRef.current && !startDropdownRef.current.contains(event.target as Node)) {
        setShowStartDropdown(false);
      }
      if (destDropdownRef.current && !destDropdownRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (subTab !== 'map') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
      }).setView([13.0, 76.5], 7);

      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      }).addTo(map);

      routeLayersRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    } else {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        routeLayersRef.current = null;
      }
    };
  }, [subTab]);

  useEffect(() => {
    if (subTab !== 'map') return;
    const map = mapInstanceRef.current;
    const layerGroup = routeLayersRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    stopMarkersRef.current = {};

    const activePolyline = routeData?.polyline || ride?.polyline;
    const activeStops = routeData?.timeline || ride?.stops || [];
    const activeStart = routeData?.start_location || ride?.start_location || startLocation || 'Start';
    const activeDest = routeData?.destination || ride?.destination || destination || 'Destination';
    const activeTime = ride?.start_time || startTime;

    if (!activePolyline || activePolyline.length === 0) return;

    const pinBg = theme === 'dark' ? '#161615' : '#FAF9F6';
    const pinInk = theme === 'dark' ? '#EDEDEC' : '#141413';
    const popupInk = theme === 'dark' ? '#EDEDEC' : '#141413';
    const popupMuted = theme === 'dark' ? '#8E8E88' : '#66655F';
    const popupAccent = theme === 'dark' ? '#D86E42' : '#B85228';

    const createLocationPin = (label: string, fillColor: string) => {
      return L.divIcon({
        className: 'custom-location-pin',
        html: `
          <div style="position: relative; width: 30px; height: 40px; cursor: pointer;">
            <svg width="30" height="40" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 29.5 17 44 17 44C17 44 34 29.5 34 17C34 7.61 26.39 0 17 0Z" fill="${fillColor}"/>
              <circle cx="17" cy="17" r="10.5" fill="${pinBg}" stroke="${pinInk}" stroke-width="2"/>
              <text x="17" y="21" font-size="11" font-weight="700" font-family="DM Sans, sans-serif" fill="${pinInk}" text-anchor="middle">${label}</text>
            </svg>
          </div>
        `,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -36],
      });
    };

    const createCheckpointIcon = (type: string, order: number, isSelected: boolean) => {
      let bg = theme === 'dark' ? '#43423E' : '#66655F';
      let fg = '#FAF9F6';
      if (type === 'fuel') {
        bg = popupAccent;
        fg = theme === 'dark' ? '#111110' : '#FAF9F6';
      } else if (type === 'food') {
        bg = '#2D6A4F';
        fg = '#FAF9F6';
      } else if (type === 'repair') {
        bg = '#A63636';
        fg = '#FAF9F6';
      }

      const border = isSelected ? `2.5px solid ${pinInk}` : `1.5px solid ${pinBg}`;

      return L.divIcon({
        className: 'subtle-checkpoint-marker',
        html: `
          <div style="background-color: ${bg}; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${fg}; font-size: 11px; font-weight: 600; font-family: IBM Plex Mono, monospace; border: ${border};">
            ${order}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });
    };

    const casing = L.polyline(activePolyline, {
      color: theme === 'dark' ? '#000000' : '#141413',
      weight: 7,
      opacity: theme === 'dark' ? 0.35 : 0.14,
      lineJoin: 'round',
    });
    const polyline = L.polyline(activePolyline, {
      color: popupAccent,
      weight: 4,
      opacity: 0.95,
      lineJoin: 'round',
    });
    layerGroup.addLayer(casing);
    layerGroup.addLayer(polyline);

    const startCoord = activePolyline[0];
    const startIcon = createLocationPin('A', '#2D6A4F');
    const startPopup = `
      <div style="font-family: DM Sans, sans-serif; font-size: 12px; color: ${popupInk}; min-width: 170px;">
        <div style="color: #2D6A4F; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Start Point A</div>
        <div style="font-size: 13px; font-weight: 600; color: ${popupInk};">${activeStart}</div>
        <div style="margin-top: 3px; color: ${popupMuted}; font-size: 11px;">Rollout · <span style="font-family: IBM Plex Mono, monospace;">${activeTime}</span></div>
      </div>
    `;
    layerGroup.addLayer(
      L.marker([startCoord[0], startCoord[1]], { icon: startIcon, zIndexOffset: 1000 }).bindPopup(
        startPopup
      )
    );

    const endCoord = activePolyline[activePolyline.length - 1];
    const endIcon = createLocationPin('B', popupAccent);
    const endPopup = `
      <div style="font-family: DM Sans, sans-serif; font-size: 12px; color: ${popupInk}; min-width: 170px;">
        <div style="color: ${popupAccent}; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Destination B</div>
        <div style="font-size: 13px; font-weight: 600; color: ${popupInk};">${activeDest}</div>
        <div style="margin-top: 3px; color: ${popupMuted}; font-size: 11px;">Arrival point</div>
      </div>
    `;
    layerGroup.addLayer(
      L.marker([endCoord[0], endCoord[1]], { icon: endIcon, zIndexOffset: 1000 }).bindPopup(
        endPopup
      )
    );

    activeStops.forEach((stop: any, idx: number) => {
      const isSelected = selectedStopIndex === idx;
      const stopTypeRaw = stop.stop_type || stop.type || 'checkpoint';
      const icon = createCheckpointIcon(stopTypeRaw, idx + 1, isSelected);
      const name = stop.name || 'Checkpoint';
      const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
      const eta = stop.eta || '';
      const notes = stop.notes || '';
      const stopLabel = stopTypeRaw.charAt(0).toUpperCase() + stopTypeRaw.slice(1);
      const amenities: string[] = stop.amenities || [];

      const popup = `
        <div style="font-family: DM Sans, sans-serif; font-size: 12px; color: ${popupInk}; min-width: 200px; max-width: 250px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; color: ${popupAccent}; font-size: 11px; font-weight: 600;">
            <span>Stop ${idx + 1} · ${stopLabel}</span>
            <span style="font-family: IBM Plex Mono, monospace; color: ${popupMuted};">${eta}</span>
          </div>
          <div style="margin: 4px 0 2px 0; font-size: 13px; font-weight: 600; color: ${popupInk}; line-height: 1.3;">${name}</div>
          <div style="color: ${popupMuted}; font-size: 11px; font-family: IBM Plex Mono, monospace;">${km} km · ${stop.duration_minutes || 15} min pause</div>
          ${notes ? `<p style="margin-top: 6px; font-size: 11px; color: ${popupMuted}; line-height: 1.4; border-top: 1px solid ${popupMuted}33; padding-top: 6px;">${notes}</p>` : ''}
          ${amenities.length > 0 ? `<div style="margin-top: 6px; font-size: 10px; color: ${popupMuted};">${amenities.join(' · ')}</div>` : ''}
        </div>
      `;

      const stopMarker = L.marker([stop.lat, stop.lng], { icon }).bindPopup(popup);
      stopMarker.on('click', () => {
        setSelectedStopIndex(idx);
      });

      layerGroup.addLayer(stopMarker);
      stopMarkersRef.current[idx] = stopMarker;
    });

    if (selectedStopIndex === null) {
      try {
        map.fitBounds(layerGroup.getBounds(), { padding: [45, 45], maxZoom: 13 });
        map.invalidateSize();
      } catch {
        // Ignore bounds error
      }
    } else if (stopMarkersRef.current[selectedStopIndex]) {
      const st = activeStops[selectedStopIndex];
      if (st) {
        map.setView([st.lat, st.lng], 12);
        setTimeout(() => stopMarkersRef.current[selectedStopIndex]?.openPopup(), 120);
      }
    }
  }, [subTab, routeData, ride, startLocation, destination, startTime, selectedStopIndex, theme]);

  const handleCalculatePreview = useCallback(
    async (start: string, dest: string) => {
      if (!start.trim() || !dest.trim()) {
        setStatusMessage('Enter both a start location and a destination.');
        return;
      }
      try {
        setCalculating(true);
        setStatusMessage('Calculating route and weather...');
        const data = await previewRoute({
          start_location: start.trim(),
          destination: dest.trim(),
          start_time: startTime,
          target_date: rideDate,
          smallest_tank_range_km: 300.0,
        });

        setRouteData(data);
        setSelectedStopIndex(null);
        setSubTab('map');
        setStatusMessage(
          `Preview ready · ${data.total_distance_km} km (${Math.floor(
            data.estimated_duration_minutes / 60
          )}h ${data.estimated_duration_minutes % 60}m)`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to calculate route';
        setStatusMessage(`Route error: ${msg}`);
      } finally {
        setCalculating(false);
      }
    },
    [startTime, rideDate]
  );

  const handleCreateOrSaveRide = async () => {
    if (!startLocation.trim() || !destination.trim()) {
      setStatusMessage('Enter both a start location and destination first.');
      return;
    }

    try {
      setSavingRide(true);
      if (ride) {
        setStatusMessage('Saving updated route...');
        await updateRideRoute(ride.id, {
          start_location: startLocation.trim(),
          destination: destination.trim(),
          ride_date: rideDate,
          start_time: startTime,
        });
        setRouteData(null);
        onRefreshRide();
        setSubTab('map');
        setStatusMessage('Ride route and stops updated.');
      } else {
        setStatusMessage('Creating ride plan...');
        const created = await createRide({
          start_location: startLocation.trim(),
          destination: destination.trim(),
          ride_date: rideDate,
          start_time: startTime,
        });
        setRouteData(null);
        onRideLoaded(created.ride_id);
        setSubTab('map');
        setStatusMessage(`Ride created: ${created.title}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save ride';
      setStatusMessage(msg);
    } finally {
      setSavingRide(false);
    }
  };

  const handleStartChange = (val: string) => {
    setStartLocation(val);
    setShowStartDropdown(true);

    if (startSearchTimer.current) clearTimeout(startSearchTimer.current);
    startSearchTimer.current = setTimeout(async () => {
      if (val.trim().length >= 1) {
        const results = await fetchLocationSuggestions(val);
        setStartSuggestions(results);
      } else {
        setStartSuggestions([]);
      }
    }, 180);
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    setShowDestDropdown(true);

    if (destSearchTimer.current) clearTimeout(destSearchTimer.current);
    destSearchTimer.current = setTimeout(async () => {
      if (val.trim().length >= 1) {
        const results = await fetchLocationSuggestions(val);
        setDestSuggestions(results);
      } else {
        setDestSuggestions([]);
      }
    }, 180);
  };

  const displayDistance = routeData?.total_distance_km ?? ride?.total_distance_km ?? 0;
  const displayDuration = routeData?.estimated_duration_minutes ?? ride?.duration_minutes ?? 0;
  const displayWeather = routeData?.weather?.overall_verdict ?? ride?.weather_verdict ?? '—';
  const displayWeatherSummary =
    routeData?.weather?.summary ??
    ride?.weather_summary ??
    'Preview or create a ride to inspect live route conditions and checkpoints.';
  const displayStops = routeData?.timeline ?? ride?.stops ?? [];
  const hasPolyline = Boolean(
    (routeData?.polyline && routeData.polyline.length > 0) ||
      (ride?.polyline && ride.polyline.length > 0)
  );

  const filteredStops = displayStops.filter((stop: any) => {
    const type = stop.stop_type || stop.type || 'checkpoint';
    if (timelineFilter === 'all') return true;
    return type === timelineFilter;
  });

  const routePresets = [
    { label: 'Bangalore to Sakleshpur', start: 'Nelamangala Toll Plaza, Bangalore', dest: 'Sakleshpur' },
    { label: 'Bangalore to Coorg', start: 'Nelamangala Toll Plaza, Bangalore', dest: 'Coorg (Madikeri)' },
    { label: 'Bangalore to Ooty', start: 'Electronic City Toll Plaza, Bangalore', dest: 'Ooty (Udhagamandalam)' },
    { label: 'Mumbai to Lonavala', start: 'Mumbai', dest: 'Lonavala' },
    { label: 'Pune to Mahabaleshwar', start: 'Pune', dest: 'Mahabaleshwar' },
  ];

  const getStopAccent = (stopType: string) => {
    switch (stopType) {
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

  const subTabs: Array<{ id: RouteSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'map', label: 'Interactive Map', icon: <MapIcon className="w-4 h-4" strokeWidth={1.5} /> },
    {
      id: 'setup',
      label: 'Route & Weather',
      icon: <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      id: 'stops',
      label: `Stops & Fuel (${displayStops.length})`,
      icon: <ListChecks className="w-4 h-4" strokeWidth={1.5} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Section Tabs + Corridor Preview Photo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-[0.06em] text-[var(--accent)]">
              01 · Corridor Planning
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              Route &amp; Map Planner
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-[62ch]">
              Set departure and destination coordinates, inspect the highway map, and check scheduled
              fuel and rest stops.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Route sections"
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] self-start overflow-x-auto max-w-full"
          >
            {subTabs.map((t) => {
              const active = subTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setSubTab(t.id)}
                  className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                    active
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          onClick={() => setSubTab('map')}
          className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[180px] rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-inset)] group cursor-pointer hover:border-[var(--accent)] transition-colors"
          title="Click to view interactive highway map"
        >
          <img
            src={RIDE_PHOTOS.mountainCurve}
            alt="Two motorcyclists carving a misty green mountain highway curve"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/85 via-[#111110]/30 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#FAF9F6]/80 flex items-center gap-1.5">
                <MapIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Active Corridor · Open Map &rarr;</span>
              </span>
            </div>
            <span className="text-sm font-semibold text-[#FAF9F6] truncate mt-0.5">
              {startLocation && destination
                ? `${startLocation.split(',')[0]} to ${destination.split(',')[0]}`
                : 'Select a highway preset or custom route'}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: ROUTE & WEATHER SETUP */}
      {subTab === 'setup' && (
        <div key="setup" className="animate-panel-enter space-y-6">
          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-muted)] mr-1">
                Presets:
              </span>
              {routePresets.map((preset) => {
                const active =
                  destination.toLowerCase().includes(preset.dest.split(' ')[0].toLowerCase()) &&
                  startLocation.toLowerCase().includes(preset.start.split(' ')[0].toLowerCase());
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStartLocation(preset.start);
                      setDestination(preset.dest);
                      setShowStartDropdown(false);
                      setShowDestDropdown(false);
                      handleCalculatePreview(preset.start, preset.dest);
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium border cursor-pointer active:scale-[0.98] ${
                      active
                        ? 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Start Location */}
              <div className="md:col-span-4 space-y-1.5 relative" ref={startDropdownRef}>
                <label
                  htmlFor="route-start-input"
                  className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"
                >
                  <span className="font-mono font-semibold text-[var(--status-ok)]">A</span>
                  <span>Start Location</span>
                </label>
                <div className="relative">
                  <input
                    id="route-start-input"
                    type="text"
                    value={startLocation}
                    onChange={(e) => handleStartChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowStartDropdown(false);
                        handleCalculatePreview(startLocation, destination);
                      }
                    }}
                    placeholder="City or highway toll plaza"
                    className="w-full min-h-[42px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-3 pr-8 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  {startLocation && (
                    <button
                      type="button"
                      aria-label="Clear start location"
                      onClick={() => {
                        setStartLocation('');
                        setStartSuggestions([]);
                        setShowStartDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {showStartDropdown && startSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[6px] z-50 max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                    {startSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStartLocation(item.name);
                          setShowStartDropdown(false);
                          if (destination.trim()) handleCalculatePreview(item.name, destination);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-hover)] flex flex-col gap-0.5 cursor-pointer"
                      >
                        <div className="font-medium text-[var(--text-primary)] flex items-center gap-2 text-xs">
                          <Navigation className="w-4 h-4 text-[var(--status-ok)] shrink-0" strokeWidth={1.5} />
                          <span>{item.name}</span>
                        </div>
                        {item.description && (
                          <span className="text-[11px] text-[var(--text-muted)] pl-6">
                            {item.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="md:col-span-4 space-y-1.5 relative" ref={destDropdownRef}>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="route-dest-input"
                    className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"
                  >
                    <span className="font-mono font-semibold text-[var(--accent)]">B</span>
                    <span>Destination</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prevStart = startLocation;
                      const prevDest = destination;
                      setStartLocation(prevDest);
                      setDestination(prevStart);
                      setShowStartDropdown(false);
                      setShowDestDropdown(false);
                      if (prevStart.trim() && prevDest.trim()) {
                        handleCalculatePreview(prevDest, prevStart);
                      }
                    }}
                    title="Swap start and destination"
                    className="text-[11px] font-medium text-[var(--alpine)] hover:underline inline-flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                  >
                    <ArrowLeftRight className="w-3 h-3" strokeWidth={1.75} />
                    <span>Swap A/B</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="route-dest-input"
                    type="text"
                    value={destination}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowDestDropdown(false);
                        handleCalculatePreview(startLocation, destination);
                      }
                    }}
                    placeholder="Hill station, town, or city"
                    className="w-full min-h-[42px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-3 pr-8 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  {destination && (
                    <button
                      type="button"
                      aria-label="Clear destination"
                      onClick={() => {
                        setDestination('');
                        setDestSuggestions([]);
                        setShowDestDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {showDestDropdown && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[6px] z-50 max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                    {destSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDestination(item.name);
                          setShowDestDropdown(false);
                          if (startLocation.trim()) handleCalculatePreview(startLocation, item.name);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-hover)] flex flex-col gap-0.5 cursor-pointer"
                      >
                        <div className="font-medium text-[var(--text-primary)] flex items-center gap-2 text-xs">
                          <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" strokeWidth={1.5} />
                          <span>{item.name}</span>
                        </div>
                        {item.description && (
                          <span className="text-[11px] text-[var(--text-muted)] pl-6">
                            {item.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ride Date */}
              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="route-date-input"
                  className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" strokeWidth={1.5} />
                  <span>Ride Date</span>
                </label>
                <input
                  id="route-date-input"
                  type="date"
                  value={rideDate}
                  onChange={(e) => setRideDate(e.target.value)}
                  className="w-full min-h-[42px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 text-sm text-[var(--text-primary)] font-mono tabular-nums focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Rollout Time */}
              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="route-time-input"
                  className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" strokeWidth={1.5} />
                  <span>Rollout Time</span>
                </label>
                <input
                  id="route-time-input"
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="06:00 am"
                  className="w-full min-h-[42px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 text-sm text-[var(--text-primary)] font-mono tabular-nums focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="text-xs text-[var(--text-muted)]">
                {calculating ? (
                  <span className="text-[var(--text-primary)] font-medium">
                    Calculating highway route via OpenStreetMap...
                  </span>
                ) : (
                  <span>
                    {statusMessage || 'Enter locations above to preview or create your ride.'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCalculatePreview(startLocation, destination)}
                  disabled={calculating || !startLocation.trim() || !destination.trim()}
                  className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] disabled:opacity-45 text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-sm rounded-[6px] flex items-center gap-2 cursor-pointer active:scale-[0.98] whitespace-nowrap"
                >
                  <RotateCw className="w-4 h-4" strokeWidth={1.5} />
                  <span>{calculating ? 'Calculating...' : 'Preview Route'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateOrSaveRide}
                  disabled={savingRide || calculating || !startLocation.trim() || !destination.trim()}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-45 text-[var(--accent-ink)] font-medium text-sm rounded-[6px] cursor-pointer active:scale-[0.98] whitespace-nowrap"
                >
                  {savingRide
                    ? 'Saving...'
                    : ride
                    ? 'Save Changes to Ride'
                    : 'Create Ride Plan'}
                </button>
              </div>
            </div>
          </section>

          {/* 4-Column Summary Strip */}
          <section className="grid grid-cols-2 md:grid-cols-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Distance</div>
                <div className="mt-1 font-mono text-xl font-semibold text-[var(--accent)] tabular-nums">
                  {displayDistance > 0 ? `${displayDistance} km` : '—'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-[6px] bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <Route className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>

            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Riding Time</div>
                <div className="mt-1 font-mono text-xl font-semibold text-[var(--alpine)] tabular-nums">
                  {displayDuration > 0
                    ? `${Math.floor(displayDuration / 60)}h ${displayDuration % 60}m`
                    : '—'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-[6px] bg-[var(--alpine-tint)] text-[var(--alpine)] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>

            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Weather Verdict</div>
                <div
                  className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                    displayWeather === 'GO'
                      ? 'text-[var(--forest)]'
                      : displayWeather === 'CAUTION'
                      ? 'text-[var(--ochre)]'
                      : displayWeather === 'NO-GO'
                      ? 'text-[var(--crimson)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {displayWeather}
                </div>
              </div>
              <div
                className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${
                  displayWeather === 'NO-GO'
                    ? 'bg-[var(--crimson-tint)] text-[var(--crimson)]'
                    : displayWeather === 'CAUTION'
                    ? 'bg-[var(--ochre-tint)] text-[var(--ochre)]'
                    : 'bg-[var(--forest-tint)] text-[var(--forest)]'
                }`}
              >
                <CloudSun className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>

            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Checkpoints</div>
                <div className="mt-1 font-mono text-xl font-semibold text-[var(--ochre)] tabular-nums">
                  {displayStops.length > 0 ? `${displayStops.length} stops` : '—'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-[6px] bg-[var(--ochre-tint)] text-[var(--ochre)] flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
          </section>

          {/* Weather Summary & Next Action */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div className="md:col-span-4 relative aspect-[16/9] md:aspect-auto md:min-h-[150px] bg-[var(--bg-inset)] overflow-hidden group">
              <img
                src={RIDE_PHOTOS.pineHeadlights}
                alt="Motorcycle headlights shining through tall misty pine forest"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/80 via-[#111110]/25 to-transparent flex items-end p-4">
                <span className="font-mono text-[11px] font-medium text-[#FAF9F6]">
                  Live Weather Check
                </span>
              </div>
            </div>

            <div className="md:col-span-8 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-[var(--ochre)]" strokeWidth={1.5} />
                  <span>Weather &amp; Highway Readiness</span>
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[62ch]">
                  {displayWeatherSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {hasPolyline && (
                  <button
                    type="button"
                    onClick={() => setSubTab('map')}
                    className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[6px] text-sm font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <MapIcon className="w-4 h-4 text-[var(--alpine)]" strokeWidth={1.5} />
                    <span>Open Map View</span>
                  </button>
                )}
                {ride ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('parsed')}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] rounded-[6px] text-sm font-medium flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <span>Riders &amp; Bikes</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenChatModal}
                    className="px-4 py-2 bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[6px] text-sm font-medium cursor-pointer active:scale-[0.98]"
                  >
                    Import Group Chat
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 2: MAP VIEW */}
      {subTab === 'map' && (
        <section
          key="map"
          className="animate-panel-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)] text-sm">
                Interactive Highway Map
              </span>
              <span aria-hidden="true">/</span>
              <span>Start A</span>
              <span aria-hidden="true">/</span>
              <span>Destination B</span>
            </div>

            <div className="flex items-center gap-3">
              {selectedStopIndex !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedStopIndex(null)}
                  className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Reset Zoom
                </button>
              )}
              <button
                type="button"
                onClick={() => setSubTab('stops')}
                className="px-3 py-1.5 bg-transparent hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-medium text-[var(--text-primary)] cursor-pointer"
              >
                View Stops List
              </button>
            </div>
          </div>

          <div className="h-[540px] w-full rounded-[6px] overflow-hidden border border-[var(--border-subtle)] relative">
            <div ref={mapContainerRef} className="w-full h-full" />
            {!hasPolyline && (
              <div className="absolute inset-0 bg-[var(--bg-canvas)]/75 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center p-8 text-center space-y-3">
                <MapPin className="w-8 h-8 text-[var(--accent)]" strokeWidth={1.5} />
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Interactive OpenStreetMap Ready
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-[46ch]">
                  Select a preset corridor or enter departure &amp; destination in Route &amp; Weather to plot the live corridor and fuel stops.
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('setup')}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-medium rounded-[6px] cursor-pointer"
                >
                  Configure Route
                </button>
              </div>
            )}
            {calculating && (
              <div className="absolute top-3 right-3 z-[1001] bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] px-3 py-1.5 rounded-[6px] text-xs font-medium shadow-md">
                Updating corridor...
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUB-TAB 3: STOPS & FUEL */}
      {subTab === 'stops' && (
        <section
          key="stops"
          className="animate-panel-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Planned Stops &amp; Fuel Checkpoints
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Filter by category or jump straight to any checkpoint on the map.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[8px] overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'fuel', label: 'Fuel' },
                { id: 'food', label: 'Food' },
                { id: 'restroom', label: 'Washrooms' },
                { id: 'repair', label: 'Repairs' },
              ].map((f) => {
                const active = timelineFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTimelineFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-subtle)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredStops.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                {displayStops.length === 0
                  ? 'No stops calculated yet. Enter a route in Route & Weather first.'
                  : 'No stops match this filter.'}
              </p>
              {displayStops.length === 0 && (
                <button
                  type="button"
                  onClick={() => setSubTab('setup')}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-medium rounded-[6px] cursor-pointer"
                >
                  Open Route Setup
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredStops.map((stop: any, idx: number) => {
                const originalIndex = displayStops.findIndex(
                  (s: any) => s.id === stop.id || s.name === stop.name
                );
                const stopType = stop.stop_type || stop.type || 'checkpoint';
                const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
                const amenities: string[] = stop.amenities || [];
                const typeLabel = stopType.charAt(0).toUpperCase() + stopType.slice(1);

                return (
                  <div
                    key={stop.id || idx}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono tabular-nums">
                        <span className={`font-semibold ${getStopAccent(stopType)}`}>
                          {typeLabel}
                        </span>
                        <span aria-hidden="true">/</span>
                        <span>Stop {stop.order || idx + 1}</span>
                        <span aria-hidden="true">/</span>
                        <span>{stop.eta || '—'}</span>
                        <span aria-hidden="true">/</span>
                        <span>{km} km</span>
                      </div>

                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {stop.name}
                      </h3>

                      {stop.notes && (
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[62ch]">
                          {stop.notes}
                        </p>
                      )}

                      {amenities.length > 0 && (
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {amenities.join(' · ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStopIndex(originalIndex !== -1 ? originalIndex : idx);
                        setSubTab('map');
                      }}
                      className="px-3.5 py-2 bg-transparent hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-[6px] text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center active:scale-[0.98]"
                    >
                      Inspect on Map
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
