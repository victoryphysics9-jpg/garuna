/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptedUAVPacket, WirePacketPayload } from '../types/uav';
import { SevenLayerSecurityEngine, PROTOCOL_MAGIC_HEADER } from './crypto7LayerEngine';

export interface AttackVectorScenario {
  id: string;
  name: string;
  category: 'IMPERSONATION' | 'REPLAY' | 'SPOOFING' | 'HIJACKING' | 'INJECTION' | 'ELECTRONIC_WARFARE';
  targetLayer: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
  description: string;
  payloadExplanation: string;
  militaryImpactIfUnchecked: string;
}

export const ATTACK_SCENARIOS: AttackVectorScenario[] = [
  {
    id: 'ATTACK_L1_ROGUE_C2',
    name: 'Rogue C2 Certificate Forgery',
    category: 'IMPERSONATION',
    targetLayer: 'L1',
    description: 'Adversary spins up an unauthorized transmitter pretending to be military C2 Ground Station.',
    payloadExplanation: 'Sends packet with invalid digital signature and forged certificate thumbprint not signed by Root CA.',
    militaryImpactIfUnchecked: 'Catastrophic: Enemy hijacks UAV navigation and exfiltrates classified recon payloads.',
  },
  {
    id: 'ATTACK_L5_PACKET_REPLAY',
    name: 'Tactical Radio Packet Replay Attack',
    category: 'REPLAY',
    targetLayer: 'L5',
    description: 'Adversary sniffed a legitimate flight command (e.g., "DIVE 500m") over RF and replays it 15 seconds later.',
    payloadExplanation: 'Transmits previously authenticated packet with stale/identical Journey Counter sequence number.',
    militaryImpactIfUnchecked: 'High: Forces UAV into outdated waypoints or ground collision via repeated maneuvers.',
  },
  {
    id: 'ATTACK_L3_IP_MAC_SPOOF',
    name: 'Tactical IP & Hardware MAC Spoofing',
    category: 'SPOOFING',
    targetLayer: 'L3',
    description: 'Adversary clones the authorized C2 IP address (192.168.42.10) to bypass network firewall.',
    payloadExplanation: 'Transmits from unmapped hardware node claiming to have valid IP but hardware MAC/UUID is rogue.',
    militaryImpactIfUnchecked: 'High: Bypasses standard L3/L4 IP firewalls and injects unauthenticated telecommands.',
  },
  {
    id: 'ATTACK_L2_CIPHERTEXT_TAMPER',
    name: 'Cryptographic Ratchet Desync & Bitflip',
    category: 'INJECTION',
    targetLayer: 'L2',
    description: 'Adversary intercepts ciphertext mid-air and flips telemetry bits or uses stale epoch keys.',
    payloadExplanation: 'Tampered ciphertext creates immediate AES-GCM AuthTag verification failure against dynamic evolving key.',
    militaryImpactIfUnchecked: 'Severe: Causes payload corruption or stealth modification of altitude and GPS target targets.',
  },
  {
    id: 'ATTACK_L4_SECRET_CHALLENGE_BYPASS',
    name: 'Zero-Knowledge Challenge Nonce Guessing',
    category: 'SPOOFING',
    targetLayer: 'L4',
    description: 'Adversary floods random cryptographic hash responses attempting to guess the dynamic mission challenge.',
    payloadExplanation: 'Random challenge response fails against the time-synchronized zero-knowledge salt proof.',
    militaryImpactIfUnchecked: 'Critical: Allows unauthorized ground stations to seize drone without pre-shared mission keys.',
  },
  {
    id: 'ATTACK_L6_SESSION_HIJACK',
    name: 'Concurrent Session Token Theft / MITM',
    category: 'HIJACKING',
    targetLayer: 'L6',
    description: 'Attacker sniffs the active session token and attempts to send commands concurrently with active C2.',
    payloadExplanation: 'Sends commands using a forged or mismatched session token, triggering single-session eviction lock.',
    militaryImpactIfUnchecked: 'Catastrophic: Split-brain control conflict where UAV responds to two competing commands.',
  },
  {
    id: 'ATTACK_L7_OUT_OF_ENVELOPE',
    name: 'Out-Of-Envelope Malformed Command Injection',
    category: 'INJECTION',
    targetLayer: 'L7',
    description: 'Adversary crafts a syntactically valid packet ordering the drone to dive to -500m or pull 20G lateral roll.',
    payloadExplanation: 'Commands violate aerodynamic flight envelope and geofencing structural integrity boundaries.',
    militaryImpactIfUnchecked: 'Total Hull Loss: UAV performs destructive high-speed lawn dart impact into terrain.',
  },
  {
    id: 'ATTACK_L0_MALFORMED_GATE',
    name: 'Pre-Auth Buffer Overflow & Gateway Knock Flooding',
    category: 'ELECTRONIC_WARFARE',
    targetLayer: 'L0',
    description: 'Adversary floods the UAV radio receiver with raw junk packets lacking the 0x55415637 protocol magic bytes.',
    payloadExplanation: 'Malformed binary bytes rejected at Layer 0 Secure Gate before consuming crypto CPU cycles.',
    militaryImpactIfUnchecked: 'Denial of Service: Saturates onboard flight computer crypto processors with junk packets.',
  },
];

/**
 * Generates an adversarial packet crafted specifically to trigger a security breach test
 */
export async function generateAdversarialPacket(
  engine: SevenLayerSecurityEngine,
  scenarioId: string
): Promise<EncryptedUAVPacket> {
  // First build a baseline packet
  const maliciousPayload: WirePacketPayload = {
    commandType: 'FLIGHT_STICK_INPUT',
    controls: { pitchInput: -1.0, rollInput: 0, yawInput: 0, throttleInput: 0.1 },
    authOrigin: 'ROGUE-EXPLOIT-EMITTER-X',
    timestampMs: Date.now(),
  };

  const basePacket = await engine.createSecurePacket(maliciousPayload, 'C2-COMMAND-STATION-ALPHA');

  switch (scenarioId) {
    case 'ATTACK_L0_MALFORMED_GATE':
      return {
        ...basePacket,
        packetId: `ATK-L0-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        magicHeader: '0xDEADBEEF', // Corrupted header
      };

    case 'ATTACK_L1_ROGUE_C2':
      return {
        ...basePacket,
        packetId: `ATK-L1-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        senderDeviceId: 'ROGUE-EXPLOIT-EMITTER-X',
        certThumbprint: 'SHA256:FAKE:FORGED:UNTRUSTED:ROOT:CERT',
        digitalSignatureHex: 'BAD_SIGNATURE_0000000000000000000000000000',
      };

    case 'ATTACK_L2_CIPHERTEXT_TAMPER':
      return {
        ...basePacket,
        packetId: `ATK-L2-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        ciphertextHex: basePacket.ciphertextHex + 'MODIFIED_CORRUPT_BYTES',
        authTagHex: 'CORRUPTED_AES_GCM_AUTH_TAG_9999999',
      };

    case 'ATTACK_L3_IP_MAC_SPOOF':
      return {
        ...basePacket,
        packetId: `ATK-L3-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        senderIP: '10.254.99.1', // Rogue IP claiming to be C2
        senderMac: 'AA:BB:CC:DD:EE:FF', // Mismatched MAC
      };

    case 'ATTACK_L4_SECRET_CHALLENGE_BYPASS':
      return {
        ...basePacket,
        packetId: `ATK-L4-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        challengeResponseHash: 'FORGED_CHALLENGE_GUESS_99182818273618',
      };

    case 'ATTACK_L5_PACKET_REPLAY':
      return {
        ...basePacket,
        packetId: `ATK-L5-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        // Replay a stale counter number (e.g. 1 or 2, which has already been seen)
        journeyCounter: 1,
      };

    case 'ATTACK_L6_SESSION_HIJACK':
      return {
        ...basePacket,
        packetId: `ATK-L6-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        sessionToken: 'SESSION-ROGUE-HIJACK-ATTEMPT-666',
      };

    case 'ATTACK_L7_OUT_OF_ENVELOPE': {
      const dangerousPayload: WirePacketPayload = {
        commandType: 'FLIGHT_STICK_INPUT',
        controls: {
          pitchInput: -9.5, // Structural over-G command!
          rollInput: 15.0,  // Illegal roll rate!
          yawInput: 0,
          throttleInput: 4.5,
        },
        authOrigin: 'C2-COMMAND-STATION-ALPHA',
        timestampMs: Date.now(),
      };
      const dangerousPacket = await engine.createSecurePacket(dangerousPayload, 'C2-COMMAND-STATION-ALPHA');
      return {
        ...dangerousPacket,
        packetId: `ATK-L7-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        unencryptedPayloadForInspection: dangerousPayload,
      };
    }

    default:
      return basePacket;
  }
}
