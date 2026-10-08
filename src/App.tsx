/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TacticalProvider, useTactical } from './context/TacticalUAVContext';
import { MilitaryHeader } from './components/MilitaryHeader';
import { C2ServerDashboard } from './components/C2ServerDashboard';
import { ClientDroneCockpit } from './components/ClientDroneCockpit';
import { TacticalRadarMap } from './components/TacticalRadarMap';
import { LayerProtocolInspector } from './components/LayerProtocolInspector';
import { AdversaryHackerSuite } from './components/AdversaryHackerSuite';
import { HardwareExportModal } from './components/HardwareExportModal';
import { MultiLaptopSyncPanel } from './components/MultiLaptopSyncPanel';
import { ShieldCheck, Info, ExternalLink, Radio, Cpu, Layers } from 'lucide-react';

const MainTacticalApp: React.FC = () => {
  const { role, audioAlarmActive } = useTactical();
  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);

  // Play subtle military radar tone on security alarm
  useEffect(() => {
    if (!audioAlarmActive) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz alert tone
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext may be restricted by browser policy before user gesture
    }
  }, [audioAlarmActive]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <MilitaryHeader onOpenHardwareModal={() => setHardwareModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full p-4 space-y-4">
        {/* Helper Banner for Multi-Device / Multi-Tab Feature */}
        <div className="bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs font-mono-military text-slate-300">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-emerald-400">MULTI-DEVICE / MULTI-TAB READY:</strong> You can open this URL in a 2nd tab or window, select <strong>SERVER (C2)</strong> in Tab 1 and <strong>CLIENT (UAV)</strong> in Tab 2. Moving controls in Tab 1 will pilot the drone in Tab 2 in real-time over the 7-Layer secure mesh!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <ExternalLink className="w-3 h-3" />
              <span>OPEN COMPANION TAB</span>
            </button>
          </div>
        </div>

        {/* Multi-Laptop Live Session & IP Whitelist Controller */}
        <MultiLaptopSyncPanel />

        {/* ROLE-BASED VIEW ROUTING */}

        {role === 'DUAL_STATION' && (
          <div className="space-y-4">
            {/* Top row: C2 Server Dashboard on Left, Client UAV Cockpit on Right */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <C2ServerDashboard />
              <ClientDroneCockpit />
            </div>

            {/* Bottom row: Tactical Map & 7-Layer Inspector */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-6">
                <TacticalRadarMap />
              </div>
              <div className="xl:col-span-6">
                <LayerProtocolInspector />
              </div>
            </div>

            {/* Red-Team Exploit Suite */}
            <AdversaryHackerSuite />
          </div>
        )}

        {role === 'SERVER_C2' && (
          <div className="space-y-4">
            <C2ServerDashboard />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <TacticalRadarMap />
              </div>
              <div className="xl:col-span-5">
                <LayerProtocolInspector />
              </div>
            </div>
            <AdversaryHackerSuite />
          </div>
        )}

        {role === 'CLIENT_DRONE' && (
          <div className="space-y-4">
            <ClientDroneCockpit />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <TacticalRadarMap />
              </div>
              <div className="xl:col-span-5">
                <LayerProtocolInspector />
              </div>
            </div>
          </div>
        )}

        {role === 'ADVERSARY_HACKER' && (
          <div className="space-y-4">
            <AdversaryHackerSuite />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <TacticalRadarMap />
              <LayerProtocolInspector />
            </div>
          </div>
        )}

        {role === 'SECURITY_LAB' && (
          <div className="space-y-4">
            <LayerProtocolInspector />
            <AdversaryHackerSuite />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <C2ServerDashboard />
              <ClientDroneCockpit />
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-xs font-mono-military text-slate-500">
        AEGIS UAV-7LSP • MILITARY 7-LAYER HIGH-SECURITY DRONE C2 PROTOCOL • END-TO-END ZERO-TRUST HARDENED • COMPATIBLE WITH PIXHAWK / ARDUPILOT
      </footer>

      {/* Hardware Telemetry Export Modal */}
      <HardwareExportModal
        isOpen={hardwareModalOpen}
        onClose={() => setHardwareModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TacticalProvider>
      <MainTacticalApp />
    </TacticalProvider>
  );
}
