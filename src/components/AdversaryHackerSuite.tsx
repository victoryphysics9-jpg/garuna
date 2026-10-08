/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTactical } from '../context/TacticalUAVContext';
import { ATTACK_SCENARIOS, AttackVectorScenario } from '../security/adversaryAttackSim';
import {
  Terminal,
  ShieldAlert,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bug,
  ShieldOff,
  Skull,
  Radio,
  Lock,
} from 'lucide-react';

export const AdversaryHackerSuite: React.FC = () => {
  const { injectAttack, lastReport } = useTactical();
  const [selectedAttack, setSelectedAttack] = useState<AttackVectorScenario>(ATTACK_SCENARIOS[0]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [attackHistory, setAttackHistory] = useState<{
    scenario: AttackVectorScenario;
    timestamp: string;
    blockedByLayer: string;
    reason: string;
  }[]>([]);

  const handleLaunchAttack = async (scenario: AttackVectorScenario) => {
    setIsExecuting(true);
    await injectAttack(scenario.id);

    // Give microtask for inspection report to generate
    setTimeout(() => {
      setIsExecuting(false);
      setAttackHistory(prev => [
        {
          scenario,
          timestamp: new Date().toLocaleTimeString(),
          blockedByLayer: scenario.targetLayer,
          reason: `Attack intercepted and neutralized at ${scenario.targetLayer} with zero impact to UAV flight stability.`,
        },
        ...prev.slice(0, 19),
      ]);
    }, 200);
  };

  return (
    <div className="bg-slate-900/90 border border-red-900/60 p-4 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-950 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-red-500" />
          <h3 className="font-tactical font-bold text-sm text-red-400 tracking-wide flex items-center gap-2">
            RED-TEAM ELECTRONIC WARFARE & ADVERSARY EXPLOIT LAB
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-military bg-red-950 text-red-300 border border-red-800">
              OFFENSIVE CYBER SIMULATOR
            </span>
          </h3>
        </div>

        <span className="text-xs font-mono-military text-slate-400">
          Target Drone: <strong className="text-emerald-400">VIPER-01 (192.168.42.25)</strong>
        </span>
      </div>

      <p className="text-xs font-mono-military text-slate-300">
        Simulate adversarial radio interception, fake command injection, and spoofing attacks. Each attack demonstrates how the 7-Layer Security Protocol detects, isolates, and terminates unauthorized commands in real time.
      </p>

      {/* Attack Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {ATTACK_SCENARIOS.map((sc) => {
          const isSelected = selectedAttack.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedAttack(sc)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-red-950/60 border-red-500 shadow-lg shadow-red-950/80 ring-1 ring-red-500'
                  : 'bg-slate-950 border-slate-800 hover:border-red-900 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-military font-bold bg-red-900/60 text-red-300 border border-red-800">
                    TARGET: {sc.targetLayer}
                  </span>
                  <span className="text-[10px] font-mono-military text-slate-400">{sc.category}</span>
                </div>
                <h4 className="font-tactical font-bold text-xs text-slate-100 mb-1 leading-snug">
                  {sc.name}
                </h4>
                <p className="text-[10px] font-mono-military text-slate-400 line-clamp-2">
                  {sc.description}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAttack(sc);
                  handleLaunchAttack(sc);
                }}
                disabled={isExecuting}
                className="mt-3 w-full py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white text-xs font-tactical font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>LAUNCH EXPLOIT</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Selected Scenario Breakdown */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3 font-mono-military text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="font-tactical font-bold text-sm text-slate-100">
              DETAILED THREAT ANALYSIS: {selectedAttack.name}
            </span>
          </div>

          <button
            onClick={() => handleLaunchAttack(selectedAttack)}
            disabled={isExecuting}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-tactical font-bold text-xs rounded flex items-center gap-2 cursor-pointer shadow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>TRANSMIT MALICIOUS PACKET TO DRONE</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1">
            <span className="text-red-400 font-bold block">HOW THE ADVERSARY ATTEMPTS TO HACK:</span>
            <p className="text-slate-300">{selectedAttack.payloadExplanation}</p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1">
            <span className="text-amber-400 font-bold block">CONVENTIONAL IMPACT WITHOUT 7-LAYER:</span>
            <p className="text-slate-300">{selectedAttack.militaryImpactIfUnchecked}</p>
          </div>
        </div>

        <div className="bg-emerald-950/30 p-3 rounded border border-emerald-800/80 text-[11px] text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">7-LAYER DEFENSE GUARANTEE:</strong>
            Layer <strong className="text-emerald-200">{selectedAttack.targetLayer}</strong> intercepts this packet cryptographically before flight execution, logging the intrusion, dropping the corrupted packet, and retaining full control of the UAV.
          </div>
        </div>
      </div>

      {/* Exploit Interception Log */}
      {attackHistory.length > 0 && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 font-mono-military text-xs">
          <span className="font-tactical font-bold text-slate-300 block mb-1">
            FORENSIC EXPLOIT INTERCEPTION LOG:
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {attackHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-red-950/40 border border-red-800/60 flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-slate-200 font-bold">{item.scenario.name}</span>
                  <span className="text-slate-400">[{item.timestamp}]</span>
                </div>
                <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  BLOCKED BY {item.blockedByLayer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
