/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import { FlightMode } from '../types/uav';
import {
  Gamepad2,
  Navigation,
  Compass,
  Radio,
  Shield,
  Eye,
  Camera,
  Flame,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Send,
  Lock,
  Layers,
  Activity,
  AlertCircle,
  Wifi,
  Crosshair,
} from 'lucide-react';

export const C2ServerDashboard: React.FC = () => {
  const {
    currentControls,
    setControls,
    sendCommand,
    flightMode,
    setFlightMode,
    rfLink,
    position,
    attitude,
    velocity,
    power,
    deployCountermeasure,
    triggerFailToZero,
    lastTransmittedPacket,
    addWaypoint,
    serverLock,
    loginAsServer,
    logoutServer,
    clientDetectedIp,
  } = useTactical();

  // Joystick virtual state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 }); // -50 to +50 px
  const [zoomLevel, setZoomLevel] = useState(2.5);
  const [activeCamFilter, setActiveCamFilter] = useState<'EO_DAYLIGHT' | 'FLIR_WHITE_HOT' | 'NVG_GREEN'>('FLIR_WHITE_HOT');

  // Keyboard navigation listener for flight stick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      let newPitch = currentControls.pitchInput;
      let newRoll = currentControls.rollInput;
      let newYaw = currentControls.yawInput;
      let newThrottle = currentControls.throttleInput;

      let changed = false;

      if (e.key === 'w' || e.key === 'W') {
        newPitch = Math.max(-1, newPitch - 0.2); // Dive / nose down
        changed = true;
      }
      if (e.key === 's' || e.key === 'S') {
        newPitch = Math.min(1, newPitch + 0.2); // Climb / nose up
        changed = true;
      }
      if (e.key === 'a' || e.key === 'A') {
        newRoll = Math.max(-1, newRoll - 0.2); // Bank left
        changed = true;
      }
      if (e.key === 'd' || e.key === 'D') {
        newRoll = Math.min(1, newRoll + 0.2); // Bank right
        changed = true;
      }
      if (e.key === 'q' || e.key === 'Q') {
        newYaw = Math.max(-1, newYaw - 0.2); // Yaw left
        changed = true;
      }
      if (e.key === 'e' || e.key === 'E') {
        newYaw = Math.min(1, newYaw + 0.2); // Yaw right
        changed = true;
      }
      if (e.key === 'ArrowUp') {
        newThrottle = Math.min(1, newThrottle + 0.1);
        changed = true;
      }
      if (e.key === 'ArrowDown') {
        newThrottle = Math.max(0, newThrottle - 0.1);
        changed = true;
      }

      if (changed) {
        setControls({
          pitchInput: newPitch,
          rollInput: newRoll,
          yawInput: newYaw,
          throttleInput: newThrottle,
        });
        setStickPos({
          x: newRoll * 45,
          y: newPitch * 45,
        });
        // Transmit authenticated packet
        sendCommand('FLIGHT_STICK_INPUT');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (['w', 'W', 's', 'S', 'a', 'A', 'd', 'D'].includes(e.key)) {
        // Return stick to neutral smoothly
        setControls({ pitchInput: 0, rollInput: 0 });
        setStickPos({ x: 0, y: 0 });
        sendCommand('FLIGHT_STICK_INPUT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentControls, setControls, sendCommand]);

  // Pointer drag handler for virtual joystick
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingStick(true);
    updateStickFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingStick) return;
    updateStickFromPointer(e);
  };

  const handlePointerUp = () => {
    setIsDraggingStick(false);
    setStickPos({ x: 0, y: 0 });
    setControls({ pitchInput: 0, rollInput: 0 });
    sendCommand('FLIGHT_STICK_INPUT');
  };

  const updateStickFromPointer = (e: React.PointerEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = 45;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });
    const rollNorm = Math.round((dx / maxRadius) * 100) / 100;
    const pitchNorm = Math.round((dy / maxRadius) * 100) / 100;

    setControls({
      rollInput: rollNorm,
      pitchInput: pitchNorm,
    });
    sendCommand('FLIGHT_STICK_INPUT');
  };

  const flightModes: { mode: FlightMode; label: string; desc: string; color: string }[] = [
    { mode: 'AUTONOMOUS_PATROL', label: 'AUTO PATROL', desc: 'Navigates pre-programmed tactical waypoints', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { mode: 'MANUAL_STABILIZED', label: 'MANUAL STICK', desc: 'Full pilot direct cyclic/throttle override', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { mode: 'LOITER_RECON', label: 'LOITER / RECON', desc: '360° surveillance orbit at current position', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { mode: 'RETURN_TO_BASE', label: 'RETURN TO BASE (RTL)', desc: 'Autonomous transit to home airfield', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
    { mode: 'FAIL_TO_ZERO', label: 'FAIL-TO-ZERO', desc: 'Zeroize cryptographic keys & emergency recovery', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  ];

  return (
    <div className="space-y-4">
      {/* C2 Command Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950/80 border border-blue-600/50 rounded text-blue-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-tactical font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
              GROUND COMMAND & CONTROL (C2) STATION
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-military bg-blue-950 text-blue-400 border border-blue-800">
                AUTHORITATIVE TRANSMITTER
              </span>
              {serverLock.isLocked ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-military bg-emerald-950 text-emerald-400 border border-emerald-800">
                  LOCKED TO THIS SESSION
                </span>
              ) : (
                <button
                  onClick={() => loginAsServer()}
                  className="px-2 py-0.5 rounded text-[10px] font-mono-military font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow"
                >
                  CLAIM SERVER LOCK
                </button>
              )}
            </h2>
            <p className="text-xs font-mono-military text-slate-400">
              UAV Target: <span className="text-emerald-400 font-semibold">VIPER-01 (UAV-RECON-VIPER-01)</span> • IP: 192.168.42.25 • 7-Layer Mutually Authenticated
            </p>
          </div>
        </div>

        {/* Live Fast Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono-military">
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] block">AIRSPEED</span>
            <span className="text-emerald-400 font-bold text-sm">{velocity.speedKmh.toFixed(1)} km/h</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] block">ALTITUDE AGL</span>
            <span className="text-emerald-400 font-bold text-sm">{position.alt.toFixed(0)} m</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] block">BATTERY</span>
            <span className="text-emerald-400 font-bold text-sm">{power.batteryPct.toFixed(1)}%</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] block">RF LINK</span>
            <span className="text-emerald-400 font-bold text-sm">{rfLink.rssiDbm} dBm</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: REAL FLIGHT CONTROLS & JOYSTICK (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-sm">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>PRIMARY FLIGHT CONTROL INTERFACE</span>
            </div>
            <span className="text-[10px] font-mono-military text-slate-400">
              KEYBOARD: [W/S] Pitch • [A/D] Roll • [Q/E] Yaw
            </span>
          </div>

          {/* Virtual Military Joystick + Throttle Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Cyclic Pitch & Roll Gimbal */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono-military text-slate-400 mb-2 font-semibold">
                CYCLIC (PITCH / ROLL)
              </span>
              <div
                ref={joystickRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-36 h-36 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center cursor-crosshair select-none touch-none shadow-inner shadow-black"
              >
                {/* Crosshairs & Angle Rings */}
                <div className="absolute inset-0 border border-slate-800/80 rounded-full scale-75" />
                <div className="absolute inset-0 border border-slate-800/80 rounded-full scale-50" />
                <div className="absolute w-full h-[1px] bg-slate-800" />
                <div className="absolute h-full w-[1px] bg-slate-800" />

                {/* Movable Joystick Head */}
                <div
                  style={{
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                    transition: isDraggingStick ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                    isDraggingStick
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/50'
                      : 'bg-slate-800 border-emerald-500/80 text-emerald-400 shadow-black'
                  }`}
                >
                  <Crosshair className="w-5 h-5" />
                </div>
              </div>

              {/* Deflection Readouts */}
              <div className="flex items-center gap-3 mt-2 text-[10px] font-mono-military text-slate-400">
                <span>PITCH: <strong className="text-slate-200">{currentControls.pitchInput.toFixed(2)}</strong></span>
                <span>ROLL: <strong className="text-slate-200">{currentControls.rollInput.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Throttle & Yaw Rudder */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] font-mono-military text-slate-300 mb-1">
                  <span>THROTTLE (POWER / CLIMB)</span>
                  <span className="text-emerald-400 font-bold">{Math.round(currentControls.throttleInput * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentControls.throttleInput}
                  onChange={(e) => {
                    setControls({ throttleInput: parseFloat(e.target.value) });
                    sendCommand('FLIGHT_STICK_INPUT');
                  }}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] font-mono-military text-slate-400 mt-0.5">
                  <span>0% DESCENT</span>
                  <span>50% LEVEL</span>
                  <span>100% CLIMB</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono-military text-slate-300 mb-1">
                  <span>RUDDER (YAW RATE)</span>
                  <span className="text-emerald-400 font-bold">{currentControls.yawInput.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={currentControls.yawInput}
                  onChange={(e) => {
                    setControls({ yawInput: parseFloat(e.target.value) });
                    sendCommand('FLIGHT_STICK_INPUT');
                  }}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[9px] font-mono-military text-slate-400 mt-0.5">
                  <span>LEFT YAW</span>
                  <span>NEUTRAL</span>
                  <span>RIGHT YAW</span>
                </div>
              </div>

              {/* Quick Center Controls Button */}
              <button
                onClick={() => {
                  setControls({ pitchInput: 0, rollInput: 0, yawInput: 0 });
                  setStickPos({ x: 0, y: 0 });
                  sendCommand('FLIGHT_STICK_INPUT');
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-tactical font-semibold rounded border border-slate-700 cursor-pointer transition-colors"
              >
                CENTER FLIGHT CONTROLS
              </button>
            </div>
          </div>

          {/* Electronic Warfare Countermeasures */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono-military text-slate-400 block mb-2 font-semibold">
              TACTICAL ELECTRONIC COUNTERMEASURES (ECM)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => deployCountermeasure('FREQ_HOP')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 rounded flex flex-col items-center gap-1 text-[11px] font-tactical font-bold text-emerald-300 cursor-pointer transition-colors"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>FREQ HOP (FHSS)</span>
              </button>
              <button
                onClick={() => deployCountermeasure('CHAFF_FLARE')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 rounded flex flex-col items-center gap-1 text-[11px] font-tactical font-bold text-amber-300 cursor-pointer transition-colors"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>CHAFF / FLARE</span>
              </button>
              <button
                onClick={() => deployCountermeasure('ECM_SHIELD')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-blue-500/40 rounded flex flex-col items-center gap-1 text-[11px] font-tactical font-bold text-blue-300 cursor-pointer transition-colors"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                <span>ECM SHIELD</span>
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: FLIGHT MODES & MISSION DIRECTIVES (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-sm">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>FLIGHT MODES & DIRECTIVES</span>
            </div>
            <span className="text-[10px] font-mono-military text-emerald-400 font-bold">
              ACTIVE: {flightMode}
            </span>
          </div>

          {/* Flight Mode Selectors */}
          <div className="space-y-2">
            {flightModes.map((item) => (
              <button
                key={item.mode}
                onClick={() => setFlightMode(item.mode)}
                className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  flightMode === item.mode
                    ? `${item.color} font-bold ring-1 ring-emerald-400`
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div>
                  <div className="text-xs font-tactical tracking-wide font-semibold">{item.label}</div>
                  <div className="text-[10px] font-mono-military text-slate-400">{item.desc}</div>
                </div>
                {flightMode === item.mode && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            ))}
          </div>

          {/* Quick Waypoint Dispatch */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono-military text-slate-400 block mb-2 font-semibold">
              QUICK WAYPOINT DISPATCH
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  addWaypoint({
                    name: `TARGET-${Math.floor(100 + Math.random() * 900)}`,
                    lat: position.lat + (Math.random() - 0.5) * 0.015,
                    lng: position.lng + (Math.random() - 0.5) * 0.015,
                    altM: 300,
                    speedKmh: 75,
                    action: 'SURVEILLANCE',
                  });
                  sendCommand('WAYPOINT_DISPATCH');
                }}
                className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded text-xs font-tactical font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>+ ADD RECON WAYPOINT</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 7-LAYER OUTGOING CRYPTOGRAPHIC WIRE TELEMETRY (3 Cols) */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>OUTGOING WIRE PACKET</span>
            </div>
            <span className="text-[10px] font-mono-military text-emerald-400">ENCRYPTED</span>
          </div>

          {lastTransmittedPacket ? (
            <div className="space-y-2 text-[11px] font-mono-military">
              <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">PACKET ID:</span>
                  <span className="text-emerald-400 font-bold">{lastTransmittedPacket.packetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MAGIC HEADER:</span>
                  <span className="text-slate-200">{lastTransmittedPacket.magicHeader}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">JOURNEY CTR (L5):</span>
                  <span className="text-amber-400 font-bold">#{lastTransmittedPacket.journeyCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RATCHET EPOCH (L2):</span>
                  <span className="text-blue-400 font-bold">EPOCH {lastTransmittedPacket.ratchetEpoch}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-1">CIPHERTEXT (AES-256-GCM):</span>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px] text-emerald-400 font-mono-military break-all select-all max-h-16 overflow-y-auto">
                  {lastTransmittedPacket.ciphertextHex.slice(0, 80)}...
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-1">AUTH TAG / SIGNATURE (L1/L2):</span>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[9px] text-slate-300 font-mono-military break-all">
                  TAG: {lastTransmittedPacket.authTagHex.slice(0, 24)}...
                  <br />
                  SIG: {lastTransmittedPacket.digitalSignatureHex.slice(0, 24)}...
                </div>
              </div>

              <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
                  <Layers className="w-3 h-3" />
                  <span>PROTECTED BY 7-LAYER PROTOCOL</span>
                </div>
                <span>Tamper-proof, zero-replay, forward secret, hardware-bound wire packet.</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded text-center text-xs font-mono-military text-slate-400">
              No packet transmitted yet. Move joystick or change mode to send.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
