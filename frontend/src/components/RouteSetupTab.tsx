import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  RotateCw,
  FileText,
  ArrowRight,
  SlidersHorizontal,
  Fuel,
  Utensils,
  Wrench,
  CheckCircle2,
  Crosshair,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Search,
  Compass
} from 'lucide-react';
import type { RideDetails } from '../types';
import { previewRoute, updateRideRoute, fetchLocationSuggestions, fetchGeocodeCandidates } from '../api';

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

  // Autocomplete suggestion states
  const [startSuggestions, setStartSuggestions] = useState<Array<{ name: string; description: string }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ name: string; description: string }>>([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Selected stop inspection state
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'fuel' | 'food' | 'restroom' | 'repair'>('all');

  const startSearchTimer = useRef<any>(null);
  const destSearchTimer = useRef<any>(null);
  const routeDebounceTimer = useRef<any>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  // Preview data state (from live API)
  const [routeData, setRouteData] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [updatingRide, setUpdatingRide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Candidate picker state
  const [candidatesList, setCandidatesList] = useState<Array<{ name: string; display_name: string; lat: number; lon: number }>>([]);
  const [candidateTarget, setCandidateTarget] = useState<'start' | 'dest' | null>(null);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  // Leaflet Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.FeatureGroup | null>(null);
  const stopMarkersRef = useRef<Record<number, L.Marker>>({});

  // Track if user has manually edited inputs
  const hasUserEditedRef = useRef(false);

  // Synchronize with active ride if ride changes and user hasn't edited
  useEffect(() => {
    if (ride && !hasUserEditedRef.current) {
      if (ride.start_location) setStartLocation(ride.start_location);
      if (ride.destination) setDestination(ride.destination);
      if (ride.ride_date) setRideDate(ride.ride_date);
      if (ride.start_time) setStartTime(ride.start_time);
    }
  }, [ride]);

  // Close suggestion dropdowns when clicking outside
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

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
      }).setView([13.0, 76.5], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      }).addTo(map);

      // Create a dedicated feature group for route polyline and all markers
      routeLayersRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Update map polyline, pointers and checkpoints whenever routeData or ride changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = routeLayersRef.current;
    if (!map || !layerGroup) return;

    // Clear all existing markers and lines
    layerGroup.clearLayers();
    stopMarkersRef.current = {};

    const activePolyline = routeData?.polyline || ride?.polyline;
    const activeStops = routeData?.timeline || ride?.stops || [];

    if (!activePolyline || activePolyline.length === 0) return;

    // Helper: Create custom teardrop map pin for Start (A) and Destination (B)
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
    const createCheckpointIcon = (type: string, order: number, isSelected: boolean) => {
      let bg = '#334155';
      if (type === 'fuel') bg = '#f59e0b'; // Amber
      else if (type === 'food') bg = '#10b981'; // Emerald
      else if (type === 'restroom') bg = '#0284c7'; // Sky
      else if (type === 'repair') bg = '#e11d48'; // Rose
      else if (type === 'checkpoint') bg = '#6366f1'; // Indigo

      const border = isSelected ? '3px solid #f59e0b' : '2px solid #ffffff';
      const scale = isSelected ? 'transform: scale(1.3); z-index: 9999;' : '';
      const shadow = isSelected ? 'box-shadow: 0 0 14px rgba(245, 158, 11, 0.9);' : 'box-shadow: 0 2px 4px rgba(0,0,0,0.4);';

      return L.divIcon({
        className: 'subtle-checkpoint-marker',
        html: `
          <div style="background-color: ${bg}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800; border: ${border}; ${shadow} ${scale}">
            ${order}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
      });
    };

    // 1. Draw highway polyline
    const polyline = L.polyline(activePolyline, {
      color: '#f59e0b',
      weight: 5,
      opacity: 0.95,
      lineJoin: 'round',
    });
    layerGroup.addLayer(polyline);

    // 2. Add Start Pointer (Point A)
    const startCoord = activePolyline[0];
    const startIcon = createLocationPin('A', true, '#10b981');
    const startPopup = `
      <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #f1f5f9; padding: 4px; min-width: 170px;">
        <div style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
          Start Location (Point A)
        </div>
        <h4 style="margin: 4px 0 2px 0; font-size: 13px; font-weight: 700; color: #ffffff;">${startLocation}</h4>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">Departure: <strong>${startTime}</strong></p>
      </div>
    `;
    const startMarker = L.marker([startCoord[0], startCoord[1]], { icon: startIcon, zIndexOffset: 1000 })
      .bindPopup(startPopup);
    layerGroup.addLayer(startMarker);

    // 3. Add Destination Pointer (Point B)
    const endCoord = activePolyline[activePolyline.length - 1];
    const endIcon = createLocationPin('B', false, '#e11d48');
    const endPopup = `
      <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #f1f5f9; padding: 4px; min-width: 170px;">
        <div style="display: inline-block; background: rgba(225, 29, 72, 0.2); color: #fb7185; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
          Destination Goal (Point B)
        </div>
        <h4 style="margin: 4px 0 2px 0; font-size: 13px; font-weight: 700; color: #ffffff;">${destination}</h4>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">Target Arrival Zone</p>
      </div>
    `;
    const endMarker = L.marker([endCoord[0], endCoord[1]], { icon: endIcon, zIndexOffset: 1000 })
      .bindPopup(endPopup);
    layerGroup.addLayer(endMarker);

    // 4. Add intermediate checkpoint markers and store references
    activeStops.forEach((stop: any, idx: number) => {
      const isSelected = selectedStopIndex === idx;
      const icon = createCheckpointIcon(stop.stop_type || stop.type, idx + 1, isSelected);
      const name = stop.name || 'Checkpoint';
      const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
      const eta = stop.eta || '';
      const notes = stop.notes || '';
      const stopType = (stop.stop_type || stop.type || 'checkpoint').toUpperCase();
      const amenities = stop.amenities || [];

      const amenitiesHtml = amenities.length > 0
        ? `<div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px;">
            ${amenities.map((a: string) => `<span style="background: #1e2533; color: #e2e8f0; font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 4px; border: 1px solid #2d3748;">${a}</span>`).join('')}
          </div>`
        : '';

      const popup = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #f1f5f9; padding: 4px; min-width: 190px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 4px;">
              Stop #${idx + 1}: ${stopType}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #f59e0b; font-family: monospace;">${eta}</span>
          </div>
          <h4 style="margin: 4px 0 2px 0; font-size: 13px; font-weight: 700; color: #ffffff; line-height: 1.25;">${name}</h4>
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">Distance: <strong>${km} km</strong> from start | ${stop.duration_minutes || 15}m stop</p>
          ${notes ? `<p style="margin-top: 4px; font-size: 11px; color: #cbd5e1; line-height: 1.35; border-top: 1px solid #1e2533; padding-top: 4px;">${notes}</p>` : ''}
          ${amenitiesHtml}
        </div>
      `;

      const stopMarker = L.marker([stop.lat, stop.lng], { icon }).bindPopup(popup);

      // On marker click: select stop and sync timeline
      stopMarker.on('click', () => {
        setSelectedStopIndex(idx);
      });

      layerGroup.addLayer(stopMarker);
      stopMarkersRef.current[idx] = stopMarker;
    });

    // Fit map bounds to view the full journey if no specific stop is currently being inspected
    if (selectedStopIndex === null) {
      try {
        map.fitBounds(layerGroup.getBounds(), { padding: [45, 45], maxZoom: 13 });
        map.invalidateSize();
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    }

  }, [routeData, ride, startLocation, destination, startTime, selectedStopIndex]);

  // Core route calculation function
  const handleCalculateRouteWith = useCallback(async (start: string, dest: string) => {
    if (!start.trim() || !dest.trim()) return;
    try {
      setCalculating(true);
      setErrorMessage(null);
      setStatusMessage('Calculating real-time highway route...');
      const data = await previewRoute({
        start_location: start.trim(),
        destination: dest.trim(),
        start_time: startTime,
        target_date: rideDate,
        smallest_tank_range_km: 301.4,
      });

      setRouteData(data);
      setSelectedStopIndex(null);
      setStatusMessage(`Route calculated: ${data.total_distance_km} km via ${data.routing_provider || 'car routing (demo server)'}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Routing failed');
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  }, [startTime, rideDate]);

  const handleOpenCandidatePicker = async (target: 'start' | 'dest') => {
    const q = target === 'start' ? startLocation : destination;
    if (!q.trim()) return;
    try {
      setSearchingCandidates(true);
      setErrorMessage(null);
      const candidates = await fetchGeocodeCandidates(q.trim());
      setCandidatesList(candidates);
      setCandidateTarget(target);
    } catch (err: any) {
      setErrorMessage(err.message || 'Geocoding failed');
    } finally {
      setSearchingCandidates(false);
    }
  };

  const handleSelectCandidate = (cand: { name: string; display_name: string; lat: number; lon: number }) => {
    if (candidateTarget === 'start') {
      hasUserEditedRef.current = true;
      setStartLocation(cand.display_name);
      setCandidateTarget(null);
      handleCalculateRouteWith(cand.display_name, destination);
    } else if (candidateTarget === 'dest') {
      hasUserEditedRef.current = true;
      setDestination(cand.display_name);
      setCandidateTarget(null);
      handleCalculateRouteWith(startLocation, cand.display_name);
    }
  };

  // Initial calculation on component mount
  useEffect(() => {
    handleCalculateRouteWith(startLocation, destination);
  }, []);

  // Real-time automatic route recalculation when startLocation or destination changes
  useEffect(() => {
    if (!startLocation.trim() || !destination.trim()) return;
    if (startLocation.trim().length < 2 || destination.trim().length < 2) return;

    if (routeDebounceTimer.current) {
      clearTimeout(routeDebounceTimer.current);
    }

    routeDebounceTimer.current = setTimeout(() => {
      handleCalculateRouteWith(startLocation, destination);
    }, 600);

    return () => {
      if (routeDebounceTimer.current) clearTimeout(routeDebounceTimer.current);
    };
  }, [startLocation, destination, handleCalculateRouteWith]);

  // Interactive Stop click handler from the Timeline list
  const handleInspectStop = (stop: any, idx: number) => {
    setSelectedStopIndex(idx);
    const map = mapInstanceRef.current;
    if (!map) return;

    // Smoothly fly map to the selected stop coordinates
    map.flyTo([stop.lat, stop.lng], 14, { duration: 1.1 });

    // Open popup for this marker
    setTimeout(() => {
      if (stopMarkersRef.current[idx]) {
        stopMarkersRef.current[idx].openPopup();
      }
    }, 350);
  };

  const handleUpdateActiveRide = async () => {
    if (!ride) return;
    try {
      setUpdatingRide(true);
      setStatusMessage('Updating active ride plan with new route and stops...');
      await updateRideRoute(ride.id, {
        start_location: startLocation,
        destination: destination,
        ride_date: rideDate,
        start_time: startTime,
      });
      onRefreshRide();
      setStatusMessage('Active ride updated and synchronized.');
    } catch (err: any) {
      setStatusMessage(`Failed to update ride: ${err.message}`);
    } finally {
      setUpdatingRide(false);
    }
  };

  // Autocomplete suggestion fetchers
  const handleStartChange = (val: string) => {
    hasUserEditedRef.current = true;
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

  const selectStartLocation = (loc: { name: string; description: string }) => {
    hasUserEditedRef.current = true;
    setStartLocation(loc.name);
    setShowStartDropdown(false);
    handleCalculateRouteWith(loc.name, destination);
  };

  const handleDestChange = (val: string) => {
    hasUserEditedRef.current = true;
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

  const selectDestLocation = (loc: { name: string; description: string }) => {
    hasUserEditedRef.current = true;
    setDestination(loc.name);
    setShowDestDropdown(false);
    handleCalculateRouteWith(startLocation, loc.name);
  };

  const displayDistance = routeData?.total_distance_km ?? ride?.total_distance_km ?? 224.5;
  const displayDuration = routeData?.estimated_duration_minutes ?? ride?.duration_minutes ?? 210;
  const displayWeather = routeData?.weather_verdict ?? ride?.weather_verdict ?? 'GO';
  const displayStops = routeData?.timeline ?? ride?.stops ?? [];
  const routingEngine = routeData?.routing_provider ?? 'car routing (demo server)';

  // Filtered stops for the timeline sidebar
  const filteredStops = displayStops.filter((s: any) => {
    if (timelineFilter === 'all') return true;
    const type = (s.stop_type || s.type || '').toLowerCase();
    return type === timelineFilter;
  });

  const selectedStop = selectedStopIndex !== null ? displayStops[selectedStopIndex] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Route Inputs Card */}
      <div className="bg-[#12161f] border border-[#1e2533] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2533] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                Live Highway Navigation &amp; Corridor Search
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
              Route Planner &amp; Stop Inspector
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Change waypoints to recalculate live highway polylines, Overpass OSM fuel/food checkpoints, and safe range limits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenChatModal}
              className="px-3.5 py-2 bg-[#18202d] hover:bg-[#202b3d] text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Chat</span>
            </button>
            <button
              onClick={onOpenApiSettings}
              className="px-3.5 py-2 bg-[#12161f] hover:bg-[#18202d] text-slate-300 border border-[#232b38] rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>API Settings</span>
            </button>
          </div>
        </div>

        {/* Location or Routing Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 flex items-start justify-between gap-2.5 text-xs text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-300">Location / Routing Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold text-sm px-1">&times;</button>
          </div>
        )}

        {/* Candidate Picker Modal/Drawer */}
        {candidateTarget && candidatesList.length > 0 && (
          <div className="bg-[#0e1219] border border-amber-500/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 font-mono">
                Select Exact Mapped Location for {candidateTarget === 'start' ? 'Start (A)' : 'Destination (B)'}:
              </span>
              <button onClick={() => setCandidateTarget(null)} className="text-slate-400 hover:text-white text-xs">
                &times; Close
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {candidatesList.map((cand, cidx) => (
                <button
                  key={cidx}
                  type="button"
                  onClick={() => handleSelectCandidate(cand)}
                  className="w-full text-left p-2 rounded-lg bg-[#141923] hover:bg-[#1a212e] text-xs text-slate-200 border border-[#222a38] hover:border-amber-500/50 transition flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">{cand.name}</span>
                    <span className="text-[10px] text-slate-400 leading-tight block">{cand.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start & Destination Inputs with Autocomplete Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs">
          {/* Start Point Input with Dropdown Suggestions */}
          <div className="md:col-span-4 space-y-1.5 relative" ref={startDropdownRef}>
            <label className="text-slate-300 font-medium flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                  A
                </span>
                <span>Start Location</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCandidatePicker('start')}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>{searchingCandidates && candidateTarget === 'start' ? 'Searching...' : 'Candidate Picker'}</span>
                </button>
                {showStartDropdown && startSuggestions.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono">{startSuggestions.length} suggestions</span>
                )}
              </div>
            </label>
            <div className="relative">
              <input
                type="text"
                value={startLocation}
                onChange={(e) => handleStartChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowStartDropdown(false);
                    handleCalculateRouteWith(startLocation, destination);
                  }
                }}
                onFocus={() => {
                  if (startSuggestions.length > 0) setShowStartDropdown(true);
                  else if (startLocation.trim().length >= 1) handleStartChange(startLocation);
                }}
                placeholder="Type departure city, hub, or toll..."
                className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-xs font-mono"
              />
              {startLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setStartLocation('');
                    setStartSuggestions([]);
                    setShowStartDropdown(false);
                  }}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Start Location Autocomplete Dropdown */}
            {showStartDropdown && startSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#12161f] border border-[#242e40] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-[#1e2533]">
                {startSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectStartLocation(item)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1a212e] transition flex flex-col gap-0.5 group"
                  >
                    <div className="font-semibold text-slate-100 group-hover:text-amber-400 flex items-center gap-1.5 text-xs">
                      <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 pl-4 leading-tight">{item.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ride End Goal / Destination Input with Dropdown Suggestions */}
          <div className="md:col-span-4 space-y-1.5 relative" ref={destDropdownRef}>
            <label className="text-slate-300 font-medium flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-[10px]">
                  B
                </span>
                <span>Ride Destination (Point B)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCandidatePicker('dest')}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>{searchingCandidates && candidateTarget === 'dest' ? 'Searching...' : 'Candidate Picker'}</span>
                </button>
                {showDestDropdown && destSuggestions.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono">{destSuggestions.length} suggestions</span>
                )}
              </div>
            </label>
            <div className="relative">
              <input
                type="text"
                value={destination}
                onChange={(e) => handleDestChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowDestDropdown(false);
                    handleCalculateRouteWith(startLocation, destination);
                  }
                }}
                onFocus={() => {
                  if (destSuggestions.length > 0) setShowDestDropdown(true);
                  else if (destination.trim().length >= 1) handleDestChange(destination);
                }}
                placeholder="Type destination, hill station, or pass..."
                className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-xs font-mono"
              />
              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    setDestination('');
                    setDestSuggestions([]);
                    setShowDestDropdown(false);
                  }}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Destination Autocomplete Dropdown */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#12161f] border border-[#242e40] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-[#1e2533]">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDestLocation(item)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1a212e] transition flex flex-col gap-0.5 group"
                  >
                    <div className="font-semibold text-slate-100 group-hover:text-amber-400 flex items-center gap-1.5 text-xs">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 pl-4 leading-tight">{item.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ride Date and Start Time */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ride Date</span>
            </label>
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition text-xs font-mono"
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
              className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition text-xs font-mono"
            />
          </div>
        </div>

        {/* Route Safety Warnings Banner */}
        {routeData?.warnings && routeData.warnings.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Route Safety &amp; Coverage Warnings</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300 font-mono">
              {routeData.warnings.map((w: string, widx: number) => (
                <li key={widx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e2533]">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {calculating ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5 font-mono">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Calculating real-time highway route...</span>
              </span>
            ) : statusMessage ? (
              <span className="text-slate-300 font-medium font-mono text-[11px]">{statusMessage}</span>
            ) : (
              <span className="font-mono text-[11px]">Routing Provider: <strong className="text-amber-400">{routingEngine}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCalculateRouteWith(startLocation, destination)}
              disabled={calculating}
              className="px-4 py-2 bg-[#18202d] hover:bg-[#222c3d] text-slate-200 border border-[#253247] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin text-amber-400' : ''}`} />
              <span>{calculating ? 'Updating Map...' : 'Recalculate Route'}</span>
            </button>

            {ride ? (
              <button
                onClick={handleUpdateActiveRide}
                disabled={updatingRide || calculating}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
              >
                <span>{updatingRide ? 'Saving Plan...' : 'Apply to Active Ride'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenChatModal}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
              >
                <span>Import Group Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Route Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#12161f] border border-[#1e2533] p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] uppercase font-mono text-slate-400 block font-medium">Total Distance</span>
          <span className="text-xl font-extrabold text-amber-400 font-mono mt-0.5 block">{displayDistance} km</span>
        </div>
        <div className="bg-[#12161f] border border-[#1e2533] p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] uppercase font-mono text-slate-400 block font-medium">Estimated Riding Time</span>
          <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
            ~{Math.floor(displayDuration / 60)}h {displayDuration % 60}m
          </span>
        </div>
        <div className="bg-[#12161f] border border-[#1e2533] p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] uppercase font-mono text-slate-400 block font-medium">Weather Status</span>
          <span className={`text-base font-bold font-mono mt-0.5 block ${
            displayWeather === 'GO' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {displayWeather} Verdict
          </span>
        </div>
        <div className="bg-[#12161f] border border-[#1e2533] p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] uppercase font-mono text-slate-400 block font-medium">Highway Stops</span>
          <span className="text-xl font-extrabold text-slate-200 font-mono mt-0.5 block">{displayStops.length} Checkpoints</span>
        </div>
      </div>

      {/* Map and Interactive Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaflet Map Column */}
        <div className="lg:col-span-7 bg-[#12161f] border border-[#1e2533] rounded-2xl p-4 shadow-xl flex flex-col h-[600px] relative">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">Live Highway Map</span>
              <span className="text-[11px] text-slate-600">|</span>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
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
            <span className="text-[11px] text-amber-400 font-mono hidden sm:inline truncate max-w-[240px]">
              {selectedStop ? `Inspecting: ${selectedStop.name}` : destination}
            </span>
          </div>

          {/* Interactive Map */}
          <div className="flex-1 w-full rounded-xl overflow-hidden shadow-inner border border-[#1e2533] relative">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Live calculation overlay on the map */}
            {calculating && (
              <div className="absolute top-3 right-3 z-[1000] bg-[#0e1219]/90 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-sm font-mono">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Updating live route...</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Column with Click-to-Inspect Stops */}
        <div className="lg:col-span-5 bg-[#12161f] border border-[#1e2533] rounded-2xl p-4 shadow-xl flex flex-col h-[600px]">
          <div className="flex flex-col gap-2 mb-3 border-b border-[#1e2533] pb-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-xs uppercase tracking-wider font-mono">Timeline Checkpoints</h3>
                <p className="text-[11px] text-slate-400">Click any stop to locate and inspect on map</p>
              </div>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 font-mono">
                {filteredStops.length} Stops
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'fuel', label: 'Fuel' },
                { id: 'food', label: 'Food' },
                { id: 'restroom', label: 'Washrooms' },
                { id: 'repair', label: 'Repairs' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimelineFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition whitespace-nowrap ${
                    timelineFilter === f.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-[#0e1219] text-slate-400 border-[#1e2533] hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable list of stops */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredStops.map((stop: any, idx: number) => {
              const originalIndex = displayStops.findIndex((s: any) => s.id === stop.id || s.name === stop.name);
              const stopType = stop.stop_type || stop.type || 'checkpoint';
              const km = stop.distance_from_start_km ?? stop.km_from_start ?? 0;
              const isSelected = selectedStopIndex === (originalIndex !== -1 ? originalIndex : idx);
              const amenities = stop.amenities || [];

              return (
                <div
                  key={stop.id || idx}
                  onClick={() => handleInspectStop(stop, originalIndex !== -1 ? originalIndex : idx)}
                  className={`p-3 rounded-xl text-xs space-y-1.5 transition cursor-pointer border ${
                    isSelected
                      ? 'bg-[#18202d] border-amber-500 ring-1 ring-amber-500/40 shadow-lg'
                      : 'bg-[#0e1219] border-[#1e2533] hover:border-[#2a374c] hover:bg-[#141a24]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${
                        stopType === 'fuel'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : stopType === 'food'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : stopType === 'restroom'
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                          : stopType === 'repair'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        #{stop.order || idx + 1} {stopType}
                      </span>
                      {stop.source === 'osm' && (
                        <span className="text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          Live OSM
                        </span>
                      )}
                      {stop.source === 'cached' && (
                        <span className="text-[9px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded">
                          Cached OSM
                        </span>
                      )}
                      {stop.is_optional && (
                        <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                          Optional Top-up
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-0.5">
                          <Crosshair className="w-3 h-3" />
                          <span>FOCUSED</span>
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-amber-400 font-bold">{stop.eta || '08:00 AM'}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <h4 className="text-white font-semibold text-xs leading-snug">{stop.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">{km} km</span>
                  </div>

                  {stop.brand && (
                    <div className="text-[10px] text-amber-400 font-mono">Brand: {stop.brand}</div>
                  )}

                  {stop.notes && (
                    <p className="text-[11px] text-slate-400 leading-snug">{stop.notes}</p>
                  )}

                  {/* Real-time amenities pills */}
                  {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {amenities.map((a: string, aidx: number) => (
                        <span
                          key={aidx}
                          className="bg-[#141923] text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded border border-[#222a38]"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-[#1e2533] mt-1 font-mono">
                    <span>Offset: {stop.offset_km !== undefined ? `${stop.offset_km} km` : 'on route'}</span>
                    <a
                      href={stop.maps_url || `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 font-semibold"
                    >
                      <span>Open in Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {ride && (
            <div className="pt-3 border-t border-[#1e2533] mt-2">
              <button
                onClick={() => setActiveTab('approvals')}
                className="w-full py-2.5 bg-[#18202d] hover:bg-[#202b3d] text-amber-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition border border-[#253247]"
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
