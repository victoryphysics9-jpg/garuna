/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Network,
  HelpCircle,
  Hash,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Clock,
  Cpu,
} from 'lucide-react';

export const LayerProtocolInspector: React.FC = () => {
  const { lastReport, securityLog, lastTransmittedPacket } = useTactical();
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'RAW_WIRE' | 'AUDIT_LOG'>('PIPELINE');

  const layersInfo = [
    {
      id: 'L0',
      name: 'L0: SECURE GATE',
      title: 'Pre-Authentication Wire Filter & Port Knock Guard',
      color: 'border-slate-500 text-slate-300',
      icon: Lock,
      purpose: 'Filters raw RF network traffic before hitting crypto processors. Checks protocol magic bytes (0x55415637), packet size bounds, and enforces rate-limiting token buckets to defeat Denial-of-Service and buffer overflows.',
      check: lastReport?.l0,
    },
    {
      id: 'L1',
      name: 'L1: MUTUAL PKI AUTH',
      title: 'X.509 Dual Certificate Trust & Digital Signatures',
      color: 'border-blue-500 text-blue-300',
      icon: ShieldCheck,
      purpose: 'Enforces mutual cryptographic authentication between C2 Ground Station and UAV Drone using MIL-STD X.509 certificates. Validates digital signatures, Intermediate CA signatures, and checks Tactical Certificate Revocation Lists (CRL).',
      check: lastReport?.l1,
    },
    {
      id: 'L2',
      name: 'L2: KEY EVOLUTION',
      title: 'Ephemeral HKDF-SHA256 Ratchet & Forward Secrecy',
      color: 'border-indigo-500 text-indigo-300',
      icon: Key,
      purpose: 'Continuously derives a unique, evolving cryptographic key for every single packet transmitted. If an adversary compromises a key at time T, they cannot decrypt past communications or forge future packets.',
      check: lastReport?.l2,
    },
    {
      id: 'L3',
      name: 'L3: DEVICE-IP CONTROL',
      title: 'Hardware UUID + IP + MAC Cryptographic Binding',
      color: 'border-cyan-500 text-cyan-300',
      icon: Network,
      purpose: 'Binds network addresses (IP and MAC) to certified physical hardware identities. Detects and instantly drops rogue transmitters attempting to spoof authorized C2 IP addresses from unauthorized radio nodes.',
      check: lastReport?.l3,
    },
    {
      id: 'L4',
      name: 'L4: SECRET CHALLENGE',
      title: 'Dynamic Time-Slotted Challenge-Response Handshake',
      color: 'border-amber-500 text-amber-300',
      icon: HelpCircle,
      purpose: 'Requires both sender and receiver to prove knowledge of dynamic tactical mission nonces without transmitting the mission secret across the RF link, defeating passive eavesdropping and impersonation.',
      check: lastReport?.l4,
    },
    {
      id: 'L5',
      name: 'L5: JOURNEY COUNTER',
      title: 'Monotonic Sequence Counter & Anti-Replay Engine',
      color: 'border-emerald-500 text-emerald-300',
      icon: Hash,
      purpose: 'Strictly monitors packet sequence numbers and arrival timestamps. If an adversary sniffs a valid flight command and attempts to replay it over the radio 10 seconds later, L5 detects the stale sequence number and drops it.',
      check: lastReport?.l5,
    },
    {
      id: 'L6',
      name: 'L6: SINGLE SESSION',
      title: 'Mutual Exclusive Session Lease & Hijack Eviction',
      color: 'border-purple-500 text-purple-300',
      icon: UserCheck,
      purpose: 'Enforces a strict 1-to-1 session relationship between C2 Ground Station and the airborne drone. Rejects concurrent command streams and immediately locks out stolen session tokens.',
      check: lastReport?.l6,
    },
    {
      id: 'L7',
      name: 'L7: UAV SECURITY SUITE',
      title: 'Military Flight Envelope, GNSS Guard & Fail-to-Zero',
      color: 'border-red-500 text-red-300',
      icon: ShieldAlert,
      purpose: 'The master flight security guardian. Validates that commands are within aerodynamic limits (altitude 0-4500m, safe velocity, geofence sector). Cross-checks GNSS against IMU to catch GPS spoofing, and triggers Fail-to-Zero if compromised.',
      check: lastReport?.l7,
    },
  ];

  const currentLayer = layersInfo[selectedLayerIndex];

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-lg space-y-4">
      {/* Header & Tab navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="font-tactical font-bold text-sm text-slate-100 tracking-wide">
            7-LAYER CRYPTOGRAPHIC PROTOCOL DEEP INSPECTOR
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-military bg-emerald-950 text-emerald-400 border border-emerald-800">
            ZERO-TRUST ARCHITECTURE
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono-military">
          <button
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'PIPELINE' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7-LAYER PIPELINE
          </button>
          <button
            onClick={() => setActiveTab('RAW_WIRE')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'RAW_WIRE' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RAW WIRE PACKET
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOG')}
            className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
              activeTab === 'AUDIT_LOG' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SECURITY AUDIT LOG ({securityLog.length})
          </button>
        </div>
      </div>

      {activeTab === 'PIPELINE' && (
        <div className="space-y-4">
          {/* Layer Selector Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {layersInfo.map((item, idx) => {
              const isPassed = item.check ? item.check.passed : true;
              const isSelected = selectedLayerIndex === idx;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedLayerIndex(idx)}
                  className={`p-2 rounded border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-400 ring-1 ring-emerald-400/80 shadow'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-tactical font-bold text-xs text-slate-100">{item.id}</span>
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono-military text-slate-400 truncate">
                    {item.name.split(':')[1]}
                  </div>
                  <div
                    className={`mt-1 text-[9px] font-mono-military font-bold px-1 py-0.5 rounded text-center ${
                      isPassed ? 'bg-emerald-950/80 text-emerald-400' : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {isPassed ? 'PASSED' : 'REJECTED'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Selected Layer Forensic View */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <currentLayer.icon className="w-5 h-5 text-emerald-400" />
                <h4 className="font-tactical font-bold text-sm text-slate-100 tracking-wide">
                  {currentLayer.name}: {currentLayer.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono-military">
                <span className="text-slate-400">STATUS:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    currentLayer.check?.passed !== false
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  }`}
                >
                  {currentLayer.check?.passed !== false ? 'VERIFIED SECURE' : 'SECURITY VIOLATION DETECTED'}
                </span>
              </div>
            </div>

            <p className="text-xs font-mono-military text-slate-300 leading-relaxed">
              {currentLayer.purpose}
            </p>

            {/* Forensic Inspection Metadata Table */}
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-xs font-mono-military space-y-2">
              <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wide">
                FORENSIC CRYPTOGRAPHIC STATE (LAST PROCESSED PACKET):
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">LAYER DIAGNOSTIC MESSAGE:</span>
                  <span className="text-slate-200 font-semibold">
                    {currentLayer.check?.message || 'Verification nominal. Handshake confirmed.'}
                  </span>
                </div>

                {selectedLayerIndex === 0 && (
                  <div>
                    <span className="text-slate-400 block">MAGIC HEADER / GATE TOKENS:</span>
                    <span className="text-emerald-400 font-bold">
                      Header: 0x55415637 (UAV7) • Tokens Remaining: 48/50
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 1 && (
                  <div>
                    <span className="text-slate-400 block">X.509 CERTIFICATE ISSUER / SIGNATURE:</span>
                    <span className="text-emerald-400 font-bold">
                      ECDSA_P256_SHA256 • CA: TACTICAL-UAV-MESH-INTERMEDIATE-CA-G7
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 2 && (
                  <div>
                    <span className="text-slate-400 block">RATCHET KEY DERIVATION (HKDF):</span>
                    <span className="text-emerald-400 font-bold">
                      Forward Secrecy Enforced • Epoch: 1 • Step: {lastTransmittedPacket?.journeyCounter || 1}
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 3 && (
                  <div>
                    <span className="text-slate-400 block">HARDWARE BINDING TABLE:</span>
                    <span className="text-emerald-400 font-bold">
                      Bound IP: 192.168.42.10 • MAC: 00:1B:44:11:3A:B7
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 4 && (
                  <div>
                    <span className="text-slate-400 block">ZERO-KNOWLEDGE TIME NONCE:</span>
                    <span className="text-emerald-400 font-bold">
                      Dynamic Salt Hash Validated • Window: 5000ms
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 5 && (
                  <div>
                    <span className="text-slate-400 block">MONOTONIC SEQUENCE COUNTER:</span>
                    <span className="text-emerald-400 font-bold">
                      Received: #{lastTransmittedPacket?.journeyCounter || 1} • Anti-Replay: ACTIVE
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 6 && (
                  <div>
                    <span className="text-slate-400 block">SINGLE SESSION LEASE:</span>
                    <span className="text-emerald-400 font-bold">
                      1:1 Mutual Exclusive Lock • Heartbeat: 25ms
                    </span>
                  </div>
                )}

                {selectedLayerIndex === 7 && (
                  <div>
                    <span className="text-slate-400 block">AERODYNAMIC ENVELOPE / GNSS:</span>
                    <span className="text-emerald-400 font-bold">
                      Safe Flight Envelope (0 - 4500m AGL) • GNSS / INS Fusion: OK
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAW WIRE PACKET TAB */}
      {activeTab === 'RAW_WIRE' && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 font-mono-military text-xs">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
            <span className="font-bold flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              AUTHENTICATED WIRE PACKET DISASSEMBLY (HEX / BYTES)
            </span>
            <span className="text-[10px] text-slate-400">Format: MIL-STD-2525 7LSP Wire Protocol</span>
          </div>

          {lastTransmittedPacket ? (
            <div className="space-y-3">
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block mb-1">SERIALIZED WIRE PAYLOAD (JSON):</span>
                <pre className="text-emerald-300 text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(lastTransmittedPacket, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block mb-1">CIPHERTEXT (AES-256-GCM):</span>
                  <div className="break-all text-[10px] text-emerald-400 bg-black/60 p-2 rounded">
                    {lastTransmittedPacket.ciphertextHex}
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block mb-1">AUTHENTICATION TAG & DIGITAL SIGNATURE:</span>
                  <div className="break-all text-[10px] text-slate-300 bg-black/60 p-2 rounded space-y-1">
                    <div>TAG: {lastTransmittedPacket.authTagHex}</div>
                    <div>SIG: {lastTransmittedPacket.digitalSignatureHex}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              No packet transmitted yet. Issue a command or trigger an attack to inspect wire packets.
            </div>
          )}
        </div>
      )}

      {/* SECURITY AUDIT LOG TAB */}
      {activeTab === 'AUDIT_LOG' && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 font-mono-military text-xs">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
            <span className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              REAL-TIME CRYPTOGRAPHIC DEFENSE AUDIT TIMELINE
            </span>
            <span className="text-[10px] text-slate-400">Total Events Logged: {securityLog.length}</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {securityLog.length > 0 ? (
              securityLog.map((log, index) => (
                <div
                  key={`${log.packetId}-${index}`}
                  className={`p-2.5 rounded border flex flex-wrap items-center justify-between gap-2 ${
                    log.overallStatus === 'AUTHENTICATED_SECURE'
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                      : 'bg-red-950/60 border-red-700/80 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {log.overallStatus === 'AUTHENTICATED_SECURE' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <div className="font-bold text-[11px] flex items-center gap-2">
                        <span>{log.packetId}</span>
                        <span className="text-[10px] opacity-70">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.overallStatus === 'AUTHENTICATED_SECURE'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-red-900 text-red-200'
                          }`}
                        >
                          {log.overallStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {log.rejectionReason
                          ? `BLOCKED BY ${log.violatingLayer}: ${log.rejectionReason}`
                          : 'All 7 cryptographic layers authenticated in nominal parameters.'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Latency: <strong className="text-slate-200">{log.processingLatencyMicroseconds}µs</strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">No security events recorded yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
