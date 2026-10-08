/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import {
  Compass,
  MapPin,
  Maximize2,
  Navigation,
  Radar,
  Radio,
  Shield,
  Crosshair,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';

export const TacticalRadarMap: React.FC = () => {
  const {
    position,
    attitude,
    velocity,
    waypoints,
    activeWaypointIndex,
    threats,
    addWaypoint,
    clearWaypoints,
    sendCommand,
  } = useTactical();

  const [mapScale, setMapScale] = useState(1); // 1x to 3x zoom
  const [mapType, setMapType] = useState<'VECTOR_GRID' | 'TACTICAL_DARK' | 'CONTOUR'>('VECTOR_GRID');
  const [clickToAddWaypoint, setClickToAddWaypoint] = useState(false);

  // Base coordinate reference for map projection
  const baseLat = 34.0522;
  const baseLng = -118.2437;
  const mapCenterLat = baseLat + 0.003;
  const mapCenterLng = baseLng;
  const mapSpanKm = 6 / mapScale;

  // Convert lat/lng to canvas percentage (0-100%)
  const toMapCoords = (lat: number, lng: number) => {
    const dLat = (lat - mapCenterLat) * 111.32; // km
    const dLng = (lng - mapCenterLng) * 111.32 * Math.cos((baseLat * Math.PI) / 180); // km

    const xPct = 50 + (dLng / mapSpanKm) * 50;
    const yPct = 50 - (dLat / mapSpanKm) * 50;

    return {
      x: Math.max(2, Math.min(98, xPct)),
      y: Math.max(2, Math.min(98, yPct)),
    };
  };

  const uavPos = toMapCoords(position.lat, position.lng);
  const homePos = toMapCoords(baseLat, baseLng);

  // Map click handler to drop new waypoint
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickToAddWaypoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const dLngKm = ((xPct - 50) / 50) * mapSpanKm;
    const dLatKm = -((yPct - 50) / 50) * mapSpanKm;

    const newLat = mapCenterLat + dLatKm / 111.32;
    const newLng = mapCenterLng + dLngKm / (111.32 * Math.cos((baseLat * Math.PI) / 180));

    addWaypoint({
      name: `WP-${waypoints.length + 1}`,
      lat: newLat,
      lng: newLng,
      altM: 300,
      speedKmh: 70,
      action: 'SURVEILLANCE',
    });
    sendCommand('WAYPOINT_DISPATCH');
    setClickToAddWaypoint(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-3">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-emerald-400" />
          <h3 className="font-tactical font-bold text-sm text-slate-100 tracking-wide">
            TACTICAL MULTI-SENSOR RADAR & SITUATIONAL MAP
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-military bg-emerald-950 text-emerald-400 border border-emerald-800">
            NATO MIL-STD-2525
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Waypoint Click Mode */}
          <button
            onClick={() => setClickToAddWaypoint(!clickToAddWaypoint)}
            className={`px-2.5 py-1 rounded text-xs font-tactical font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors ${
              clickToAddWaypoint
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{clickToAddWaypoint ? 'CLICK MAP TO DROP WP' : '+ ADD WP ON MAP'}</span>
          </button>

          {/* Clear Waypoints */}
          {waypoints.length > 0 && (
            <button
              onClick={clearWaypoints}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 rounded cursor-pointer"
              title="Clear all waypoints"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono-military text-slate-300">
            <button
              onClick={() => setMapScale(s => Math.max(0.5, s - 0.5))}
              className="px-2 py-0.5 hover:bg-slate-800 rounded cursor-pointer"
            >
              -
            </button>
            <span className="px-1">{mapScale}x</span>
            <button
              onClick={() => setMapScale(s => Math.min(3, s + 0.5))}
              className="px-2 py-0.5 hover:bg-slate-800 rounded cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* TACTICAL MAP CONTAINER */}
      <div
        onClick={handleMapClick}
        className={`relative w-full h-[460px] rounded-lg border-2 border-slate-800 overflow-hidden bg-slate-950 select-none ${
          clickToAddWaypoint ? 'cursor-crosshair ring-2 ring-emerald-500' : 'cursor-default'
        }`}
      >
        {/* Tactical Military Grid */}
        <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />

        {/* Concentric Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] h-[85%] rounded-full border border-emerald-500/10 flex items-center justify-center">
            <div className="w-[70%] h-[70%] rounded-full border border-emerald-500/15 flex items-center justify-center">
              <div className="w-[50%] h-[50%] rounded-full border border-emerald-500/20 flex items-center justify-center">
                <div className="w-[30%] h-[30%] rounded-full border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rotating Radar Sweep Beam */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-[85%] h-[85%] rounded-full relative">
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left radar-sweep pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.25) 0deg, transparent 60deg)',
              }}
            />
          </div>
        </div>

        {/* GEOFENCE BOUNDARY (SAFE SECTOR) */}
        <div
          className="absolute inset-[10%] rounded-full border-2 border-dashed border-emerald-500/30 pointer-events-none flex items-start justify-center pt-2 text-[10px] font-mono-military text-emerald-500/50"
        >
          <span>GEOFENCE PERIMETER (SECTOR ECHO - 15 KM RADIUS)</span>
        </div>

        {/* SVG FLIGHT PLAN PATH LINES */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {waypoints.length > 0 && (
            <polyline
              points={[
                `${uavPos.x}%,${uavPos.y}%`,
                ...waypoints.map((wp) => {
                  const c = toMapCoords(wp.lat, wp.lng);
                  return `${c.x}%,${c.y}%`;
                }),
              ].join(' ')}
              fill="none"
              stroke="rgba(16, 185, 129, 0.6)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* HOME AIRBASE (FRIENDLY BASE) */}
        <div
          style={{ left: `${homePos.x}%`, top: `${homePos.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-15 pointer-events-none"
        >
          <div className="w-5 h-5 rounded-sm rotate-45 border-2 border-blue-400 bg-blue-950/80 flex items-center justify-center shadow-lg shadow-blue-500/50">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <span className="text-[9px] font-mono-military text-blue-300 font-bold mt-1 bg-black/60 px-1 rounded">
            BASE ECHO (C2)
          </span>
        </div>

        {/* WAYPOINTS MARKERS */}
        {waypoints.map((wp, idx) => {
          const c = toMapCoords(wp.lat, wp.lng);
          const isActive = idx === activeWaypointIndex;
          return (
            <div
              key={wp.id}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono-military font-bold shadow ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-950 text-emerald-200 ring-2 ring-emerald-400/50 scale-110'
                    : 'border-slate-600 bg-slate-900 text-slate-300'
                }`}
              >
                {idx + 1}
              </div>
              <span className="text-[9px] font-mono-military text-emerald-400 font-semibold bg-black/70 px-1 rounded mt-0.5">
                {wp.name}
              </span>
            </div>
          );
        })}

        {/* DETECTED THREATS / CONTACTS */}
        {threats.map((threat) => {
          // Synthetic polar offset from base
          const bearingRad = (threat.bearingDeg * Math.PI) / 180;
          const threatLat = baseLat + (threat.distanceKm * Math.cos(bearingRad)) / 111.32;
          const threatLng = baseLng + (threat.distanceKm * Math.sin(bearingRad)) / (111.32 * Math.cos((baseLat * Math.PI) / 180));
          const c = toMapCoords(threatLat, threatLng);

          return (
            <div
              key={threat.id}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            >
              <div className="w-5 h-5 border-2 border-red-500 bg-red-950/80 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                <Crosshair className="w-3 h-3 text-red-400" />
              </div>
              <span className="text-[9px] font-mono-military text-red-300 font-bold bg-black/80 px-1 rounded mt-0.5 border border-red-900">
                {threat.id} [{threat.type}]
              </span>
            </div>
          );
        })}

        {/* ACTIVE UAV (VIPER-01) CHEVRON ICON WITH ROTATION */}
        <div
          style={{ left: `${uavPos.x}%`, top: `${uavPos.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 pointer-events-none transition-all duration-75"
        >
          {/* Outer Pulsing Range Ring */}
          <div className="absolute w-12 h-12 rounded-full border border-emerald-400/30 animate-ping pointer-events-none" />

          {/* Aircraft Chevron Symbol rotated to heading */}
          <div
            style={{ transform: `rotate(${attitude.yaw}deg)` }}
            className="w-8 h-8 flex items-center justify-center pointer-events-none"
          >
            <div className="w-0 h-0 border-x-[8px] border-x-transparent border-b-[18px] border-b-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="bg-black/80 border border-emerald-500/50 px-1.5 py-0.5 rounded text-[10px] font-mono-military text-emerald-400 font-bold mt-1 shadow-md">
            VIPER-01 • {velocity.speedKmh.toFixed(0)} km/h • {position.alt.toFixed(0)}m
          </div>
        </div>

        {/* MAP OVERLAY HUD LEGEND */}
        <div className="absolute bottom-2 left-2 bg-black/80 border border-slate-800 p-2 rounded text-[10px] font-mono-military space-y-1 z-30">
          <div className="text-slate-400 font-bold mb-1">TACTICAL MAP LEGEND:</div>
          <div className="flex items-center gap-2 text-blue-300">
            <span className="w-2 h-2 bg-blue-500 rounded-sm rotate-45" />
            <span>FRIENDLY C2 GROUND STATION</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span>UAV VIPER-01 (7-LAYER SECURE)</span>
          </div>
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2 h-2 bg-red-500" />
            <span>HOSTILE THREAT TRACKS</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-500" />
            <span>AUTHENTICATED MISSION FLIGHT PLAN</span>
          </div>
        </div>

        {/* MAP SCALE RULER */}
        <div className="absolute bottom-2 right-2 bg-black/80 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono-military text-slate-400 z-30">
          <span>SCALE: 1 GRID = {(mapSpanKm / 4).toFixed(1)} KM</span>
        </div>
      </div>
    </div>
  );
};
