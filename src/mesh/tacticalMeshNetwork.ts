/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptedUAVPacket, SecurityInspectionReport } from '../types/uav';

export interface MeshBroadcastEvent {
  type: 'C2_COMMAND_PACKET' | 'UAV_TELEMETRY_PACKET' | 'ADVERSARY_ATTACK_PACKET' | 'SECURITY_ALERT' | 'HEARTBEAT';
  senderRole: 'SERVER_C2' | 'CLIENT_DRONE' | 'ADVERSARY_HACKER';
  senderId: string;
  packet?: EncryptedUAVPacket;
  report?: SecurityInspectionReport;
  timestamp: number;
}

export type MeshEventListener = (event: MeshBroadcastEvent) => void;

class TacticalMeshNetwork {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MeshEventListener> = new Set();
  private channelName = 'uav-7lsp-tactical-mesh-v1';

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          const data: MeshBroadcastEvent = event.data;
          this.notifyListeners(data);
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization failed, falling back to local events', e);
      }
    }

    // Storage fallback for cross-tab in restrictive environments
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'uav_mesh_tx_sync' && e.newValue) {
          try {
            const data: MeshBroadcastEvent = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {
            // Ignore parse errors
          }
        }
      });
    }
  }

  public subscribe(listener: MeshEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(event: MeshBroadcastEvent) {
    // Notify local listeners in same tab
    this.notifyListeners(event);

    // Notify other tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (e) {
        console.warn('Mesh postMessage error', e);
      }
    }

    // Storage sync fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('uav_mesh_tx_sync', JSON.stringify({ ...event, _rnd: Math.random() }));
      } catch {
        // LocalStorage may be full or disabled
      }
    }
  }

  private notifyListeners(event: MeshBroadcastEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in mesh listener callback', e);
      }
    });
  }
}

export const tacticalMesh = new TacticalMeshNetwork();
