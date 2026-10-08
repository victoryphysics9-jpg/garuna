/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import { NodeRole } from '../types/uav';
import { 
  ShieldAlert, 
  Radio, 
  Cpu, 
  Compass, 
  Lock, 
  Zap, 
  AlertTriangle, 
  Layers, 
  Server, 
  Plane, 
  Terminal, 
  SlidersHorizontal,
  VolumeX,
  Volume2
} from 'lucide-react';

interface MilitaryHeaderProps {
  onOpenHardwareModal: () => void;
}

export const MilitaryHeader: React.FC<MilitaryHeaderProps> = ({ onOpenHardwareModal }) => {
  const {
    role,
    setRole,
    lastReport,
    flightMode,
    rfLink,
    engine,
    audioAlarmActive,
    clearAudioAlarm,
    triggerFailToZero,
    serverLock,
    clientDetectedIp,
  } = useTactical();

  const isBreach = lastReport?.overallStatus === 'SECURITY_BREACH_DROPPED';

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top Threat Alert Marquee Banner */}
      {isBreach && (
        <div className="bg-red-600 text-white px-4 py-1.5 flex items-center justify-between font-tactical font-bold text-xs uppercase tracking-wider animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>CRITICAL DEFENSE ALERT: HOSTILE ATTACK INTERCEPTED & NEUTRALIZED BY {lastReport.violatingLayer}</span>
            <span className="text-red-100 font-mono-military text-[11px] font-normal">[{lastReport.rejectionReason}]</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAudioAlarm}
              className="px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded text-[10px] tracking-normal cursor-pointer"
            >
              ACKNOWLEDGE THREAT
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Callsign */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
            <Layers className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tactical font-bold text-lg tracking-wider text-slate-100">
                AEGIS <span className="text-emerald-400">UAV-7LSP</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-military font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                MIL-STD-2525
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-military font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                7-LAYER SECURE
              </span>
            </div>
            <div className="text-[11px] font-mono-military text-slate-400 flex items-center gap-2">
              <span>NET: TACNET-MESH-01</span>
              <span>•</span>
              <span>FHSS: {rfLink.frequencyMhz.toFixed(1)} MHz</span>
              <span>•</span>
              {serverLock.isLocked ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> C2 LOCKED [{serverLock.lockedIp || 'ACTIVE'}]
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" /> C2 UNLOCKED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 7-Layer Cryptographic Health Status Pipeline */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded">
          <span className="text-[10px] font-mono-military text-slate-400 mr-2 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            7-LAYER SHIELD:
          </span>
          {[
            { id: 'L0', name: 'GATE', active: lastReport ? lastReport.l0.passed : true },
            { id: 'L1', name: 'PKI', active: lastReport ? lastReport.l1.passed : true },
            { id: 'L2', name: 'KEY-EVO', active: lastReport ? lastReport.l2.passed : true },
            { id: 'L3', name: 'DEV-IP', active: lastReport ? lastReport.l3.passed : true },
            { id: 'L4', name: 'CHLNG', active: lastReport ? lastReport.l4.passed : true },
            { id: 'L5', name: 'JRNY-CTR', active: lastReport ? lastReport.l5.passed : true },
            { id: 'L6', name: 'SESS-LOCK', active: lastReport ? lastReport.l6.passed : true },
            { id: 'L7', name: 'SUITE', active: lastReport ? lastReport.l7.passed : true },
          ].map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono-military font-bold border transition-colors ${
                layer.active
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400'
                  : 'bg-red-950/80 border-red-600 text-red-400 animate-pulse'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${layer.active ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span>{layer.id}</span>
            </div>
          ))}
        </div>

        {/* Tactical Operating Role Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono-military text-slate-400 px-2 uppercase">DEVICE MODE:</span>
          
          <button
            onClick={() => setRole('DUAL_STATION')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tactical font-semibold tracking-wide transition-all cursor-pointer ${
              role === 'DUAL_STATION'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>DUAL C2 & HUD</span>
          </button>

          <button
            onClick={() => setRole('SERVER_C2')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tactical font-semibold tracking-wide transition-all cursor-pointer ${
              role === 'SERVER_C2'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SERVER (C2)</span>
          </button>

          <button
            onClick={() => setRole('CLIENT_DRONE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tactical font-semibold tracking-wide transition-all cursor-pointer ${
              role === 'CLIENT_DRONE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>CLIENT (UAV)</span>
          </button>

          <button
            onClick={() => setRole('ADVERSARY_HACKER')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tactical font-semibold tracking-wide transition-all cursor-pointer ${
              role === 'ADVERSARY_HACKER'
                ? 'bg-red-500 text-slate-950 shadow-md shadow-red-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>RED-TEAM HACKER</span>
          </button>

          <button
            onClick={() => setRole('SECURITY_LAB')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tactical font-semibold tracking-wide transition-all cursor-pointer ${
              role === 'SECURITY_LAB'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>7-LAYER LAB</span>
          </button>
        </div>

        {/* Hardware Export & Emergency Kill Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHardwareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs font-mono-military font-semibold transition-colors cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>HARDWARE / MAVLink</span>
          </button>

          <button
            onClick={triggerFailToZero}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 rounded text-xs font-tactical font-bold transition-all shadow-sm shadow-red-950 cursor-pointer"
            title="Immediately zeroizes cryptographic memory and initiates emergency RTL failover"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>FAIL-TO-ZERO</span>
          </button>
        </div>
      </div>
    </header>
  );
};
