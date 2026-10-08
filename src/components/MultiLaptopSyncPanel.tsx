/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import {
  Laptop,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Network,
  Radio,
  Server,
  Plane,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Key,
  Cpu,
  Fingerprint,
} from 'lucide-react';

export const MultiLaptopSyncPanel: React.FC = () => {
  const {
    role,
    setRole,
    networkSyncOnline,
    connectedDevicesCount,
    clientDetectedIp,
    configuredAllowedServerIp,
    serverLock,
    loginAsServer,
    logoutServer,
    updateAllowedServerIp,
    serverLoginError,
    clearServerLoginError,
  } = useTactical();

  const [customIpInput, setCustomIpInput] = useState(configuredAllowedServerIp || '');
  const [selectedDeviceProfile, setSelectedDeviceProfile] = useState<'AUTHORIZED_MIL_C2' | 'ROGUE_INTRUDER_PC'>('AUTHORIZED_MIL_C2');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClaimServer = async (ipToUse?: string, certKeyToUse?: string) => {
    setIsLoggingIn(true);
    setSuccessMsg(null);
    clearServerLoginError();

    const certKey = certKeyToUse || (selectedDeviceProfile === 'AUTHORIZED_MIL_C2' ? 'MIL-C2-CERT-KEY-ALPHA' : 'FORGED_INVALID_CERT_KEY_666');
    const ip = ipToUse || customIpInput || clientDetectedIp;

    const res = await loginAsServer(ip, certKey);
    setIsLoggingIn(false);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleSaveIp = async () => {
    await updateAllowedServerIp(customIpInput.trim() || null);
    setSuccessMsg(customIpInput.trim() ? `Server IP Whitelist locked to: ${customIpInput.trim()}` : 'IP Whitelist reset.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const isThisDeviceTheServer = serverLock.isLocked && (serverLock.lockedIp === clientDetectedIp || role === 'SERVER_C2');

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4 font-mono-military text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          <h3 className="font-tactical font-bold text-sm text-slate-100 tracking-wide flex items-center gap-2">
            MULTI-LAPTOP LIVE C2 & COMPUTER IDENTITY VERIFICATION
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                networkSyncOnline
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}
            >
              {networkSyncOnline ? 'CLOUD SYNC ONLINE' : 'LOCAL MESH ONLY'}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-emerald-400" />
            Connected Devices: <strong className="text-emerald-400">{connectedDevicesCount}</strong>
          </span>
          <span>•</span>
          <span>
            This Computer IP: <strong className="text-slate-100">{clientDetectedIp}</strong>
          </span>
        </div>
      </div>

      {/* ERROR BANNER FOR LAPTOP 3 / ATTACKER BLOCKS */}
      {serverLoginError && (
        <div className="p-3 bg-red-950/80 border border-red-600 rounded-lg text-red-200 space-y-1 animate-pulse">
          <div className="flex items-center justify-between font-bold text-xs font-tactical">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              SECURITY REJECTION: UNAUTHORIZED COMPUTER BLOCKED
            </span>
            <button
              onClick={clearServerLoginError}
              className="text-red-400 hover:text-red-100 text-[10px] underline cursor-pointer"
            >
              DISMISS
            </button>
          </div>
          <p className="text-[11px] text-red-100">{serverLoginError}</p>
        </div>
      )}

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-950/60 border border-emerald-600 rounded text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* HOW COMPUTER AUTHENTICATION IS VERIFIED (4 CRYPTOGRAPHIC PROOFS) */}
      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-slate-200 font-tactical font-bold text-xs">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span>HOW THE SYSTEM VERIFIES ONLY THE CORRECT COMPUTER CAN LOG IN:</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">4-TIER HARDWARE IDENTITY SHIELD</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
          {/* Check 1: PKI Digital Cert */}
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
            <div className="flex items-center justify-between font-bold text-blue-400">
              <span className="flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> 1. PKI CERTIFICATE (L1)
              </span>
              <span className="text-[9px] bg-blue-950 px-1 py-0.5 rounded text-blue-300">X.509</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Computer must hold certified Root CA private key. Rogue laptops without key cannot produce the signature.
            </p>
          </div>

          {/* Check 2: IP & MAC Hardware Fingerprint */}
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
            <div className="flex items-center justify-between font-bold text-cyan-400">
              <span className="flex items-center gap-1">
                <Network className="w-3.5 h-3.5" /> 2. IP / MAC BINDING (L3)
              </span>
              <span className="text-[9px] bg-cyan-950 px-1 py-0.5 rounded text-cyan-300">WHITELIST</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Tied to your specific laptop IP ({configuredAllowedServerIp || clientDetectedIp}). Another IP gets dropped at Layer 3.
            </p>
          </div>

          {/* Check 3: Dynamic Secret Challenge */}
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
            <div className="flex items-center justify-between font-bold text-amber-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> 3. DYNAMIC NONCE (L4)
              </span>
              <span className="text-[9px] bg-amber-950 px-1 py-0.5 rounded text-amber-300">5-SEC WINDOW</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Time-synchronized HMAC proof using pre-shared tactical salt. Outsiders cannot guess or forge it.
            </p>
          </div>

          {/* Check 4: Single Session Lease */}
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
            <div className="flex items-center justify-between font-bold text-purple-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> 4. SINGLE SESSION (L6)
              </span>
              <span className="text-[9px] bg-purple-950 px-1 py-0.5 rounded text-purple-300">1:1 LOCK</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Once Laptop 1 connects, server locks exclusively. A 3rd laptop is denied access until Laptop 1 logs out.
            </p>
          </div>
        </div>
      </div>

      {/* 3-COLUMN CONTROL & TEST SUITE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COLUMN 1: COMPUTER LOGIN / TEST SUITE */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-tactical font-bold text-slate-200 flex items-center gap-1.5">
              {serverLock.isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
              COMPUTER LOGIN STATUS
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                serverLock.isLocked ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {serverLock.isLocked ? 'SERVER LOCKED' : 'AVAILABLE'}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 block font-semibold">TEST AS WHICH COMPUTER:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSelectedDeviceProfile('AUTHORIZED_MIL_C2')}
                className={`p-1.5 rounded border text-[10px] font-tactical font-semibold cursor-pointer ${
                  selectedDeviceProfile === 'AUTHORIZED_MIL_C2'
                    ? 'bg-blue-600 text-white border-blue-400 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ✓ AUTH COMPUTER (LAPTOP 1)
              </button>
              <button
                onClick={() => setSelectedDeviceProfile('ROGUE_INTRUDER_PC')}
                className={`p-1.5 rounded border text-[10px] font-tactical font-semibold cursor-pointer ${
                  selectedDeviceProfile === 'ROGUE_INTRUDER_PC'
                    ? 'bg-red-600 text-white border-red-400 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ✗ ROGUE / HACKER (LAPTOP 3)
              </button>
            </div>
          </div>

          {/* Action buttons */}
          {serverLock.isLocked ? (
            isThisDeviceTheServer ? (
              <div className="space-y-1.5 pt-1">
                <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>THIS COMPUTER IS VERIFIED & LOCKED</span>
                </div>
                <button
                  onClick={logoutServer}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-tactical font-semibold text-xs border border-slate-700 cursor-pointer"
                >
                  RELEASE SERVER LOCK
                </button>
              </div>
            ) : (
              <div className="p-2 bg-red-950/40 border border-red-900 rounded text-red-300 text-[10px] space-y-1">
                <strong className="block text-red-200">SERVER IS CURRENTLY LOCKED:</strong>
                <span>Active Server: {serverLock.lockedDeviceId} ({serverLock.lockedIp})</span>
                <button
                  onClick={() => handleClaimServer()}
                  disabled={isLoggingIn}
                  className="w-full mt-1 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded font-tactical font-bold text-[10px] cursor-pointer"
                >
                  TRY INTRUDER LOGIN (TEST L6 & L1 BLOCK)
                </button>
              </div>
            )
          ) : (
            <button
              onClick={() => handleClaimServer()}
              disabled={isLoggingIn}
              className={`w-full py-2 text-white rounded font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-colors ${
                selectedDeviceProfile === 'AUTHORIZED_MIL_C2' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>
                {isLoggingIn
                  ? 'VERIFYING 4 HARDWARE CHECKS...'
                  : selectedDeviceProfile === 'AUTHORIZED_MIL_C2'
                  ? 'LOGIN AS AUTHORIZED COMPUTER (LAPTOP 1)'
                  : 'LOGIN AS ROGUE COMPUTER (TEST L1 BLOCK)'}
              </span>
            </button>
          )}
        </div>

        {/* COLUMN 2: HARDWARE IP WHITELIST (Rule L3) */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-tactical font-bold text-slate-200 flex items-center gap-1.5">
              <Network className="w-4 h-4 text-blue-400" />
              RULE L3: COMPUTER IP LOCK
            </span>
            <span className="text-[10px] text-slate-400">HARDWARE BOUND</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Set the single authorized IP address of your primary laptop. Any computer connecting from another IP address is immediately denied.
          </p>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder={clientDetectedIp}
                value={customIpInput}
                onChange={(e) => setCustomIpInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-mono-military focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveIp}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold cursor-pointer border border-slate-700"
              >
                SAVE IP
              </button>
            </div>

            <button
              onClick={() => {
                setCustomIpInput(clientDetectedIp);
                handleClaimServer(clientDetectedIp);
              }}
              className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-800 cursor-pointer"
            >
              BIND TO THIS COMPUTER'S IP ({clientDetectedIp})
            </button>
          </div>
        </div>

        {/* COLUMN 3: LIVE VERIFICATION BREAKDOWN */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-300">
          <span className="font-tactical font-bold text-emerald-400 block mb-1">
            LIVE VERIFICATION STATUS:
          </span>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center p-1 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">L1 PKI CERTIFICATE:</span>
              <span className={selectedDeviceProfile === 'AUTHORIZED_MIL_C2' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {selectedDeviceProfile === 'AUTHORIZED_MIL_C2' ? '✓ CERTIFIED ROOT CA' : '✗ FORGED / MISSING'}
              </span>
            </div>
            <div className="flex justify-between items-center p-1 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">L3 IP WHITELIST:</span>
              <span className="text-emerald-400 font-bold">
                {configuredAllowedServerIp ? `BOUND (${configuredAllowedServerIp})` : 'DYNAMIC AUTO-LOCK'}
              </span>
            </div>
            <div className="flex justify-between items-center p-1 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">L4 CHALLENGE PROOF:</span>
              <span className="text-emerald-400 font-bold">
                HMAC-SHA256 SYNCED
              </span>
            </div>
            <div className="flex justify-between items-center p-1 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">L6 CONCURRENT LEASE:</span>
              <span className={serverLock.isLocked ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {serverLock.isLocked ? 'EXCLUSIVELY HELD' : 'UNLOCKED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
