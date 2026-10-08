/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import {
  Compass,
  Eye,
  Camera,
  Layers,
  Lock,
  Radio,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Crosshair,
  Sliders,
  Plane,
} from 'lucide-react';

export const ClientDroneCockpit: React.FC = () => {
  const {
    position,
    attitude,
    velocity,
    flightMode,
    power,
    gnss,
    rfLink,
    sensorFusion,
    threats,
    lastReport,
    clientManualOverride,
    setClientManualOverride,
    setControls,
    sendCommand,
  } = useTactical();

  const [sensorView, setSensorView] = useState<'FLIR_WHITE_HOT' | 'EO_DAYLIGHT' | 'NVG_GREEN'>('FLIR_WHITE_HOT');

  // Pitch ladder calculation
  const rollDeg = attitude.roll;
  const pitchDeg = attitude.pitch;

  return (
    <div className="space-y-4">
      {/* UAV Drone Status Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/80 border border-amber-600/50 rounded text-amber-400">
            <Plane className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-tactical font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
              AIRBORNE UAV TACTICAL HUD & COCKPIT
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-military bg-amber-950 text-amber-400 border border-amber-800">
                VIPER-01 CLIENT RECEIVER
              </span>
            </h2>
            <p className="text-xs font-mono-military text-slate-400">
              Hardware ID: <span className="text-slate-200">UAV-RECON-VIPER-01</span> • MAC: 4A:8B:E2:11:09:FC • Controlled via 7-Layer Secure Link
            </p>
          </div>
        </div>

        {/* Local Override Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono-military">
            <span className="text-slate-400">C2 REMOTE LINK:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              AUTHENTICATED
            </span>
          </div>

          <button
            onClick={() => setClientManualOverride(!clientManualOverride)}
            className={`px-3 py-1.5 rounded text-xs font-tactical font-bold tracking-wide border cursor-pointer transition-all ${
              clientManualOverride
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {clientManualOverride ? 'LOCAL OVERRIDE ACTIVE' : 'ENABLE LOCAL OVERRIDE'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT / CENTER: MILITARY HUD & GIMBAL SENSOR SCREEN (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-sm">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span>HEAD-UP DISPLAY (HUD) & MULTI-SENSOR GIMBAL</span>
            </div>

            {/* Sensor mode switches */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
              {(['FLIR_WHITE_HOT', 'EO_DAYLIGHT', 'NVG_GREEN'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSensorView(mode)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-military font-bold cursor-pointer transition-colors ${
                    sensorView === mode
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* HUD MAIN CANVAS SIMULATOR */}
          <div
            className={`relative h-[380px] rounded-lg border-2 overflow-hidden select-none transition-colors ${
              sensorView === 'FLIR_WHITE_HOT'
                ? 'bg-slate-950 border-slate-700'
                : sensorView === 'NVG_GREEN'
                ? 'bg-emerald-950/40 border-emerald-700/80'
                : 'bg-slate-900 border-slate-700'
            }`}
          >
            {/* Scanlines effect */}
            <div className="absolute inset-0 scanline pointer-events-none z-20" />

            {/* Simulated Tactical Horizon Pitch Ladder with gyro rotation */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{
                transform: `rotate(${-rollDeg}deg)`,
              }}
            >
              {/* Pitch bars */}
              <div
                className="relative w-72 flex flex-col items-center gap-6"
                style={{
                  transform: `translateY(${pitchDeg * 3}px)`,
                }}
              >
                {/* Horizon Line */}
                <div className="w-full flex items-center justify-between">
                  <div className="w-24 h-0.5 bg-emerald-400/80 shadow-sm shadow-emerald-500" />
                  <div className="text-[10px] font-mono-military text-emerald-400 font-bold px-1">00°</div>
                  <div className="w-24 h-0.5 bg-emerald-400/80 shadow-sm shadow-emerald-500" />
                </div>

                {/* +10 deg pitch up */}
                <div className="w-48 flex items-center justify-between">
                  <div className="w-14 h-0.5 bg-emerald-400/60" />
                  <span className="text-[9px] font-mono-military text-emerald-400 font-bold">+10°</span>
                  <div className="w-14 h-0.5 bg-emerald-400/60" />
                </div>

                {/* -10 deg pitch down */}
                <div className="w-48 flex items-center justify-between border-dashed">
                  <div className="w-14 h-0.5 bg-emerald-400/60 border-t border-emerald-400" />
                  <span className="text-[9px] font-mono-military text-emerald-400 font-bold">-10°</span>
                  <div className="w-14 h-0.5 bg-emerald-400/60 border-t border-emerald-400" />
                </div>
              </div>

              {/* Fixed Boresight Aircraft Symbol */}
              <div className="absolute w-8 h-8 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50" />
                <div className="absolute w-12 h-[2px] bg-emerald-400" />
                <div className="absolute h-4 w-[2px] -top-2 bg-emerald-400" />
              </div>
            </div>

            {/* LEFT SPEED TAPE */}
            <div className="absolute left-3 top-8 bottom-8 w-14 bg-black/40 border border-emerald-500/30 rounded flex flex-col justify-between p-1 z-10 font-mono-military text-emerald-400 text-xs">
              <span className="text-[9px] text-slate-400 text-center">IAS</span>
              <div className="text-center">
                <div className="text-[10px] text-emerald-500/60">{(velocity.speedKmh + 20).toFixed(0)}</div>
                <div className="bg-emerald-500 text-slate-950 font-bold py-1 px-0.5 rounded text-xs my-1 shadow">
                  {velocity.speedKmh.toFixed(0)}
                </div>
                <div className="text-[10px] text-emerald-500/60">{Math.max(0, velocity.speedKmh - 20).toFixed(0)}</div>
              </div>
              <span className="text-[9px] text-center text-slate-400">KM/H</span>
            </div>

            {/* RIGHT ALTITUDE TAPE */}
            <div className="absolute right-3 top-8 bottom-8 w-16 bg-black/40 border border-emerald-500/30 rounded flex flex-col justify-between p-1 z-10 font-mono-military text-emerald-400 text-xs">
              <span className="text-[9px] text-slate-400 text-center">ALT</span>
              <div className="text-center">
                <div className="text-[10px] text-emerald-500/60">{(position.alt + 50).toFixed(0)}</div>
                <div className="bg-emerald-500 text-slate-950 font-bold py-1 px-0.5 rounded text-xs my-1 shadow">
                  {position.alt.toFixed(0)}m
                </div>
                <div className="text-[10px] text-emerald-500/60">{Math.max(0, position.alt - 50).toFixed(0)}</div>
              </div>
              <span className="text-[9px] text-center text-slate-400">AGL</span>
            </div>

            {/* TOP COMPASS HEADING TAPE */}
            <div className="absolute top-2 left-20 right-20 bg-black/40 border border-emerald-500/30 rounded py-1 px-4 flex items-center justify-between z-10 font-mono-military text-emerald-400 text-xs">
              <span>{((attitude.yaw - 30 + 360) % 360).toFixed(0)}°</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded font-bold text-emerald-300 border border-emerald-500/40">
                HDG {attitude.yaw.toFixed(0)}°
              </span>
              <span>{((attitude.yaw + 30) % 360).toFixed(0)}°</span>
            </div>

            {/* SYNTHETIC TARGET TRACKING BOUNDING BOXES */}
            <div className="absolute top-24 right-28 border border-red-500/80 bg-red-950/20 p-1.5 rounded z-10 font-mono-military text-[10px] text-red-400 animate-pulse">
              <div className="flex items-center gap-1 font-bold">
                <Crosshair className="w-3 h-3 text-red-500" />
                <span>[TRK-01 ROGUE UAV]</span>
              </div>
              <div>RNG: 2.8 km • ALT: 320m</div>
              <div>THREAT: CAUTION</div>
            </div>

            <div className="absolute bottom-16 left-28 border border-emerald-500/60 bg-emerald-950/20 p-1 rounded z-10 font-mono-military text-[9px] text-emerald-400">
              <span>[WP-1 PATROL-ALPHA]</span>
              <div>RNG: 0.9 km • 300m</div>
            </div>

            {/* BOTTOM HUD TELEMETRY BAR */}
            <div className="absolute bottom-2 left-20 right-20 bg-black/60 border border-slate-800 rounded py-1 px-3 flex items-center justify-between z-10 text-[10px] font-mono-military text-slate-300">
              <span>MODE: <strong className="text-emerald-400">{flightMode}</strong></span>
              <span>ROLL: <strong>{attitude.roll.toFixed(1)}°</strong></span>
              <span>PITCH: <strong>{attitude.pitch.toFixed(1)}°</strong></span>
              <span>LIDAR: <strong>{sensorFusion.lidarDistanceM}m</strong></span>
              <span>GNSS: <strong className="text-emerald-400">{gnss.satellitesLocked} SATS</strong></span>
            </div>
          </div>

          {/* SENSOR FUSION GAUGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-military">
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">RADAR TRACKS</span>
              <span className="text-emerald-400 font-bold">{sensorFusion.radarTrackedTargets} TARGETS</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">FLIR AMBIENT</span>
              <span className="text-emerald-400 font-bold">{sensorFusion.flirAmbientTempC}°C</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">IMU INTEGRITY</span>
              <span className="text-emerald-400 font-bold">{sensorFusion.imuHealthPct}%</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">GNSS SPOOF RISK</span>
              <span className="text-emerald-400 font-bold">{gnss.spoofingConfidencePct}% (NOMINAL)</span>
            </div>
          </div>
        </div>

        {/* RIGHT: INCOMING C2 COMMAND DECRYPTION MONITOR (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>COMMAND DECRYPTION LOG</span>
            </div>
            <span className="text-[10px] font-mono-military text-emerald-400">7-LAYER VERIFIED</span>
          </div>

          {lastReport ? (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border font-mono-military text-xs ${
                  lastReport.overallStatus === 'AUTHENTICATED_SECURE'
                    ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                    : 'bg-red-950/50 border-red-600 text-red-200 animate-pulse'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>{lastReport.overallStatus}</span>
                  <span className="text-[10px] opacity-80">{lastReport.processingLatencyMicroseconds}µs</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Packet: <strong className="text-slate-100">{lastReport.packetId}</strong>
                </div>
                {lastReport.rejectionReason && (
                  <div className="mt-1 text-red-300 text-[11px] font-semibold">
                    VIOLATION: {lastReport.violatingLayer} - {lastReport.rejectionReason}
                  </div>
                )}
              </div>

              {/* Layer-by-Layer Verification Summary */}
              <div className="space-y-1.5 text-[11px] font-mono-military">
                {[
                  { layer: 'L0 SECURE GATE', check: lastReport.l0 },
                  { layer: 'L1 PKI AUTH', check: lastReport.l1 },
                  { layer: 'L2 KEY EVOLUTION', check: lastReport.l2 },
                  { layer: 'L3 DEVICE-IP CONTROL', check: lastReport.l3 },
                  { layer: 'L4 SECRET CHALLENGE', check: lastReport.l4 },
                  { layer: 'L5 JOURNEY COUNTER', check: lastReport.l5 },
                  { layer: 'L6 SINGLE SESSION', check: lastReport.l6 },
                  { layer: 'L7 UAV SECURITY SUITE', check: lastReport.l7 },
                ].map(({ layer, check }) => (
                  <div
                    key={layer}
                    className={`flex items-center justify-between p-1.5 rounded border ${
                      check.passed
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-red-950 border-red-800 text-red-300 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {check.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span>{layer}</span>
                    </div>
                    <span className="text-[10px] font-bold">
                      {check.passed ? 'PASSED' : 'REJECTED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded text-center text-xs font-mono-military text-slate-400">
              Awaiting first authenticated command packet from C2 Ground Station...
            </div>
          )}

          {/* Autonomy Safety Lock */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono-military space-y-1">
            <span className="text-emerald-400 font-bold block flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              FAIL-SAFE ARCHITECTURE
            </span>
            <p className="text-[11px] text-slate-400">
              If cryptographic heartbeat expires (&gt;3000ms) or an unauthenticated command is injected, UAV automatically drops packet and transitions to autonomous RTL fail-safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
