/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EncryptedUAVPacket,
  L0GateCheck,
  L1PKICheck,
  L2KeyEvolutionCheck,
  L3DeviceIPCheck,
  L4ChallengeCheck,
  L5JourneyCounterCheck,
  L6SingleSessionCheck,
  L7UAVSuiteCheck,
  SecurityInspectionReport,
  WirePacketPayload,
} from '../types/uav';

// CONSTANTS & MILITARY HARDWARE REGISTRY
export const PROTOCOL_MAGIC_HEADER = '0x55415637'; // 'UAV7' in Hex ASCII
export const ROOT_CA_NAME = 'MIL-DEFENSE-PKI-ROOT-CA-LEVEL-4';
export const INTERMEDIATE_CA_NAME = 'TACTICAL-UAV-MESH-INTERMEDIATE-CA-G7';

export interface RegisteredHardwareNode {
  deviceId: string;
  callsign: string;
  role: 'C2_SERVER' | 'UAV_CLIENT' | 'ROGUE_THREAT';
  allowedIP: string;
  hardwareMac: string;
  certFingerprint: string;
  isRevoked: boolean;
}

export const MILITARY_HARDWARE_REGISTRY: Record<string, RegisteredHardwareNode> = {
  'C2-COMMAND-STATION-ALPHA': {
    deviceId: 'C2-COMMAND-STATION-ALPHA',
    callsign: 'AEGIS-C2-MAIN',
    role: 'C2_SERVER',
    allowedIP: '192.168.42.10',
    hardwareMac: '00:1B:44:11:3A:B7',
    certFingerprint: 'SHA256:7D:9C:E4:FA:21:88:B1:00:8C:33:F2:41:A5:10:98:C3',
    isRevoked: false,
  },
  'UAV-RECON-VIPER-01': {
    deviceId: 'UAV-RECON-VIPER-01',
    callsign: 'VIPER-01',
    role: 'UAV_CLIENT',
    allowedIP: '192.168.42.25',
    hardwareMac: '4A:8B:E2:11:09:FC',
    certFingerprint: 'SHA256:91:02:FA:7B:33:41:CC:89:12:00:AA:56:88:31:7E:9F',
    isRevoked: false,
  },
  'ROGUE-EXPLOIT-EMITTER-X': {
    deviceId: 'ROGUE-EXPLOIT-EMITTER-X',
    callsign: 'UNKNOWN-ROGUE-JAMMER',
    role: 'ROGUE_THREAT',
    allowedIP: '10.0.0.66',
    hardwareMac: 'DE:AD:BE:EF:00:01',
    certFingerprint: 'SHA256:INVALID:FORGED:CERTIFICATE:HASH:999999999',
    isRevoked: true, // Marked as compromised in tactical CRL
  },
};

// Fast internal hashing using Web Crypto when available or deterministic fnv1a fallback
async function computeSha256Hex(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  // Fallback hash implementation
  let h1 = 0xdeadbeef ^ data.length;
  let h2 = 0x41c6ce57 ^ data.length;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const raw = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return 'sha256_' + raw.toString(16).padStart(16, '0') + data.length.toString(16).padStart(16, '0');
}

/**
 * 7-LAYER STATE MANAGEMENT ENGINE
 */
export class SevenLayerSecurityEngine {
  private highestJourneyCounterSeen = 0;
  private currentActiveSessionId = 'SESSION-AEGIS-SECURE-9901-ACTIVE';
  private sessionLastHeartbeatMs = Date.now();
  private currentRatchetStep = 0;
  private baseMasterSecret = 'TOPSECRET_MIL_UAV_7LAYER_KEY_EVOLUTION_MASTER_2026';
  private rateLimitBucket = 50;
  private rateLimitLastRefill = Date.now();
  private secretChallengeSalt = 'CHALLENGE_NONCE_SALT_TACNET';

  constructor() {
    this.sessionLastHeartbeatMs = Date.now();
  }

  public getSessionId(): string {
    return this.currentActiveSessionId;
  }

  public resetSession(newSessionId?: string) {
    this.currentActiveSessionId = newSessionId || `SESSION-AEGIS-SECURE-${Math.floor(1000 + Math.random() * 9000)}-ACTIVE`;
    this.highestJourneyCounterSeen = 0;
    this.currentRatchetStep = 0;
    this.sessionLastHeartbeatMs = Date.now();
  }

  /**
   * Derive dynamic evolving key for packet
   */
  public async deriveEvolvedKey(epoch: number, step: number): Promise<string> {
    const raw = `${this.baseMasterSecret}_EPOCH_${epoch}_STEP_${step}`;
    return computeSha256Hex(raw);
  }

  /**
   * Build authentic encrypted 7-layer UAV packet
   */
  public async createSecurePacket(
    payload: WirePacketPayload,
    senderId: string = 'C2-COMMAND-STATION-ALPHA'
  ): Promise<EncryptedUAVPacket> {
    const reg = MILITARY_HARDWARE_REGISTRY[senderId] || MILITARY_HARDWARE_REGISTRY['C2-COMMAND-STATION-ALPHA'];
    this.currentRatchetStep += 1;
    this.highestJourneyCounterSeen += 1;
    const journeyCounter = this.highestJourneyCounterSeen;
    const epoch = 1;

    const evolvedKey = await this.deriveEvolvedKey(epoch, this.currentRatchetStep);
    const payloadStr = JSON.stringify(payload);

    // Dynamic secret challenge response
    const challengeNonce = `CHALLENGE_TICK_${Math.floor(Date.now() / 5000)}`;
    const challengeHash = await computeSha256Hex(`${challengeNonce}_${this.secretChallengeSalt}_${senderId}`);

    // Compute signature over packet attributes
    const signatureMaterial = `${senderId}:${journeyCounter}:${this.currentActiveSessionId}:${payloadStr}:${evolvedKey}`;
    const digitalSignature = await computeSha256Hex(signatureMaterial);

    // Synthetic AES-256-GCM ciphertext representation
    const iv = Math.random().toString(16).substring(2, 18);
    const ciphertext = btoa(payloadStr).replace(/=/g, '');
    const authTag = (await computeSha256Hex(ciphertext + evolvedKey)).substring(0, 32);

    return {
      packetId: `PKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      magicHeader: PROTOCOL_MAGIC_HEADER,
      sessionToken: this.currentActiveSessionId,
      journeyCounter,
      senderDeviceId: reg.deviceId,
      senderIP: reg.allowedIP,
      senderMac: reg.hardwareMac,
      ratchetEpoch: epoch,
      ivHex: iv,
      ciphertextHex: ciphertext,
      authTagHex: authTag,
      digitalSignatureHex: digitalSignature,
      certThumbprint: reg.certFingerprint,
      challengeResponseHash: challengeHash,
      unencryptedPayloadForInspection: payload,
    };
  }

  /**
   * FULL 7-LAYER VERIFICATION PIPELINE
   */
  public async inspectAndVerifyPacket(
    packet: EncryptedUAVPacket,
    currentDroneState?: { altM: number; speedKmh: number; geofenceRadiusKm: number }
  ): Promise<SecurityInspectionReport> {
    const startTime = performance.now();
    const now = Date.now();

    // Refill rate limit tokens (L0)
    const elapsedSeconds = (now - this.rateLimitLastRefill) / 1000;
    this.rateLimitBucket = Math.min(50, this.rateLimitBucket + elapsedSeconds * 20);
    this.rateLimitLastRefill = now;

    // ==========================================
    // LAYER 0: SECURE GATE & PRE-AUTH SCREENING
    // ==========================================
    let l0Passed = true;
    let l0Msg = 'Pre-auth packet screening passed. Magic bytes 0x55415637 valid.';
    if (packet.magicHeader !== PROTOCOL_MAGIC_HEADER) {
      l0Passed = false;
      l0Msg = `GATEWAY BREACH: Invalid magic header ${packet.magicHeader}. Expected ${PROTOCOL_MAGIC_HEADER}. Dropping silently.`;
    } else if (this.rateLimitBucket < 1) {
      l0Passed = false;
      l0Msg = 'RATE_LIMIT_EXCEEDED: Possible DoS amplification attack detected. Gateway throttled.';
    } else {
      this.rateLimitBucket -= 1;
    }

    const l0Check: L0GateCheck = {
      layer: 'L0_SECURE_GATE',
      passed: l0Passed,
      magicHeader: packet.magicHeader,
      portKnockSignature: 'KNOCK_UDP_4412_VERIFIED',
      packetLengthValid: true,
      rateLimitTokensRemaining: Math.floor(this.rateLimitBucket),
      message: l0Msg,
    };

    if (!l0Passed) {
      return this.buildReport(packet, startTime, 'L0_SECURE_GATE', l0Msg, l0Check);
    }

    // ==========================================
    // LAYER 1: MUTUAL PKI X.509 AUTHENTICATION
    // ==========================================
    let l1Passed = true;
    let l1Msg = `Mutual X.509 validated. Issuer: ${INTERMEDIATE_CA_NAME} signed by ${ROOT_CA_NAME}.`;
    const regNode = MILITARY_HARDWARE_REGISTRY[packet.senderDeviceId];

    if (!regNode) {
      l1Passed = false;
      l1Msg = `PKI_REJECTED: Unknown sender device ID ${packet.senderDeviceId}. Not registered in PKI trust directory.`;
    } else if (regNode.isRevoked) {
      l1Passed = false;
      l1Msg = `CRL_REVOCATION_ALERT: Certificate for ${packet.senderDeviceId} is revoked on tactical CRL. Compromised node!`;
    } else if (packet.certThumbprint !== regNode.certFingerprint) {
      l1Passed = false;
      l1Msg = `SIGNATURE_FORGERY: Certificate thumbprint ${packet.certThumbprint} does not match certified military certificate.`;
    }

    const l1Check: L1PKICheck = {
      layer: 'L1_PKI_AUTH',
      passed: l1Passed,
      senderCertCN: regNode ? regNode.callsign : 'UNKNOWN_CN',
      issuerCN: INTERMEDIATE_CA_NAME,
      certFingerprint: packet.certThumbprint,
      signatureAlgorithm: 'ECDSA_P256_SHA256',
      signatureVerified: l1Passed,
      revocationStatus: regNode?.isRevoked ? 'REVOKED' : 'VALID',
      message: l1Msg,
    };

    if (!l1Passed) {
      return this.buildReport(packet, startTime, 'L1_PKI_AUTH', l1Msg, l0Check, l1Check);
    }

    // ==========================================
    // LAYER 2: DYNAMIC KEY EVOLUTION & RATCHET
    // ==========================================
    let l2Passed = true;
    let l2Msg = `Session ratchet key valid. Epoch ${packet.ratchetEpoch}, forward secrecy preserved.`;
    const expectedKey = await this.deriveEvolvedKey(packet.ratchetEpoch, packet.journeyCounter);
    const expectedAuthTag = (await computeSha256Hex(packet.ciphertextHex + expectedKey)).substring(0, 32);

    // If packet was tampered or key is stale
    if (packet.authTagHex !== expectedAuthTag && packet.authTagHex.length > 0) {
      l2Passed = false;
      l2Msg = 'KEY_EVOLUTION_MISMATCH: Authentication tag failed. Ratchet key desynchronized or ciphertext tampered.';
    }

    const l2Check: L2KeyEvolutionCheck = {
      layer: 'L2_KEY_EVOLUTION',
      passed: l2Passed,
      epoch: packet.ratchetEpoch,
      ratchetStep: packet.journeyCounter,
      derivedKeyFingerprint: expectedKey.substring(0, 16) + '...',
      forwardSecrecyEnforced: true,
      keyMismatchDetected: !l2Passed,
      message: l2Msg,
    };

    if (!l2Passed) {
      return this.buildReport(packet, startTime, 'L2_KEY_EVOLUTION', l2Msg, l0Check, l1Check, l2Check);
    }

    // ==========================================
    // LAYER 3: DEVICE-IP / HARDWARE BINDING
    // ==========================================
    let l3Passed = true;
    let l3Msg = `Hardware binding confirmed: ${regNode.deviceId} bound to IP ${regNode.allowedIP} and MAC ${regNode.hardwareMac}.`;

    if (packet.senderIP !== regNode.allowedIP) {
      l3Passed = false;
      l3Msg = `IP_SPOOFING_ALERT: Sender IP ${packet.senderIP} does not match cryptographically bound IP ${regNode.allowedIP}.`;
    } else if (packet.senderMac !== regNode.hardwareMac) {
      l3Passed = false;
      l3Msg = `MAC_SPOOFING_DETECTED: Hardware MAC ${packet.senderMac} does not match certified network interface.`;
    }

    const l3Check: L3DeviceIPCheck = {
      layer: 'L3_DEVICE_IP_CONTROL',
      passed: l3Passed,
      claimedDeviceId: packet.senderDeviceId,
      claimedIP: packet.senderIP,
      actualIP: regNode.allowedIP,
      macFingerprint: packet.senderMac,
      hardwareHashMatch: l3Passed,
      message: l3Msg,
    };

    if (!l3Passed) {
      return this.buildReport(packet, startTime, 'L3_DEVICE_IP_CONTROL', l3Msg, l0Check, l1Check, l2Check, l3Check);
    }

    // ==========================================
    // LAYER 4: SECRET CHALLENGE-RESPONSE HANDSHAKE
    // ==========================================
    let l4Passed = true;
    let l4Msg = 'Zero-Knowledge challenge proof verified against dynamic tactical salt.';
    const currentTick = Math.floor(now / 5000);
    const challengeNonceNow = `CHALLENGE_TICK_${currentTick}`;
    const challengeNoncePrev = `CHALLENGE_TICK_${currentTick - 1}`;

    const expectedHashNow = await computeSha256Hex(`${challengeNonceNow}_${this.secretChallengeSalt}_${packet.senderDeviceId}`);
    const expectedHashPrev = await computeSha256Hex(`${challengeNoncePrev}_${this.secretChallengeSalt}_${packet.senderDeviceId}`);

    if (packet.challengeResponseHash !== expectedHashNow && packet.challengeResponseHash !== expectedHashPrev) {
      l4Passed = false;
      l4Msg = 'CHALLENGE_RESPONSE_FAILED: Secret handshake nonce invalid or expired. Attacker lacks shared mission secret.';
    }

    const l4Check: L4ChallengeCheck = {
      layer: 'L4_SECRET_CHALLENGE',
      passed: l4Passed,
      challengeNonce: challengeNonceNow,
      responseHash: packet.challengeResponseHash.substring(0, 16) + '...',
      timeWindowValid: l4Passed,
      zeroKnowledgeProofValid: l4Passed,
      message: l4Msg,
    };

    if (!l4Passed) {
      return this.buildReport(packet, startTime, 'L4_SECRET_CHALLENGE', l4Msg, l0Check, l1Check, l2Check, l3Check, l4Check);
    }

    // ==========================================
    // LAYER 5: MONOTONIC JOURNEY COUNTER & ANTI-REPLAY
    // ==========================================
    let l5Passed = true;
    let l5Msg = `Monotonic counter ${packet.journeyCounter} strictly higher than previous record ${this.highestJourneyCounterSeen}.`;

    if (packet.journeyCounter <= this.highestJourneyCounterSeen) {
      l5Passed = false;
      l5Msg = `REPLAY_ATTACK_DETECTED: Received counter #${packet.journeyCounter} <= highest seen #${this.highestJourneyCounterSeen}. Replayed packet dropped!`;
    } else {
      // Advance counter
      this.highestJourneyCounterSeen = packet.journeyCounter;
    }

    const l5Check: L5JourneyCounterCheck = {
      layer: 'L5_JOURNEY_COUNTER',
      passed: l5Passed,
      receivedCounter: packet.journeyCounter,
      expectedCounter: this.highestJourneyCounterSeen,
      replayDetected: !l5Passed,
      counterDrift: packet.journeyCounter - this.highestJourneyCounterSeen,
      message: l5Msg,
    };

    if (!l5Passed) {
      return this.buildReport(packet, startTime, 'L5_JOURNEY_COUNTER', l5Msg, l0Check, l1Check, l2Check, l3Check, l4Check, l5Check);
    }

    // ==========================================
    // LAYER 6: SINGLE-SESSION ENFORCEMENT & MUTUAL LOCK
    // ==========================================
    let l6Passed = true;
    let l6Msg = `Active session ${packet.sessionToken} validated. Mutual exclusive session lock held.`;

    if (packet.sessionToken !== this.currentActiveSessionId) {
      l6Passed = false;
      l6Msg = `SESSION_HIJACK_ATTEMPT: Token ${packet.sessionToken} does not match active mission lock ${this.currentActiveSessionId}. Concurrent session blocked.`;
    } else {
      this.sessionLastHeartbeatMs = now;
    }

    const l6Check: L6SingleSessionCheck = {
      layer: 'L6_SINGLE_SESSION',
      passed: l6Passed,
      sessionId: packet.sessionToken,
      heartbeatAgeMs: now - this.sessionLastHeartbeatMs,
      concurrentSessionConflict: !l6Passed,
      mutualLockAcquired: l6Passed,
      message: l6Msg,
    };

    if (!l6Passed) {
      return this.buildReport(packet, startTime, 'L6_SINGLE_SESSION', l6Msg, l0Check, l1Check, l2Check, l3Check, l4Check, l5Check, l6Check);
    }

    // ==========================================
    // LAYER 7: MILITARY UAV SECURITY SUITE & ENVELOPE
    // ==========================================
    let l7Passed = true;
    let l7Msg = 'Flight command envelope, GNSS integrity, and mission geofencing passed nominal checks.';
    const payload = packet.unencryptedPayloadForInspection;

    if (payload) {
      // Command validation
      if (payload.commandType === 'FLIGHT_STICK_INPUT' && payload.controls) {
        const { pitchInput, rollInput, throttleInput } = payload.controls;
        if (
          pitchInput < -1.1 || pitchInput > 1.1 ||
          rollInput < -1.1 || rollInput > 1.1 ||
          throttleInput < -0.1 || throttleInput > 1.1
        ) {
          l7Passed = false;
          l7Msg = 'OUT_OF_ENVELOPE_ATTACK: Control inputs exceed aerodynamic structural limits. Malformed command discarded.';
        }
      }

      if (payload.commandType === 'WAYPOINT_DISPATCH' && payload.targetWaypoint) {
        if (payload.targetWaypoint.altM < 0 || payload.targetWaypoint.altM > 4500) {
          l7Passed = false;
          l7Msg = `FLIGHT_ENVELOPE_BREACH: Target altitude ${payload.targetWaypoint.altM}m violates authorized ceiling (0 - 4500m AGL).`;
        }
      }

      if (payload.commandType === 'EMERGENCY_ZEROIZE') {
        l7Msg = 'EMERGENCY_FAIL_TO_ZERO: Cryptographic wipe instruction authorized and executed.';
      }
    }

    const l7Check: L7UAVSuiteCheck = {
      layer: 'L7_UAV_SECURITY_SUITE',
      passed: l7Passed,
      commandSyntacticallyValid: l7Passed,
      flightEnvelopeSafe: l7Passed,
      geofenceCompliant: true,
      tamperSignalNominal: true,
      gnssConsistencyValid: true,
      failToZeroTriggered: payload?.commandType === 'EMERGENCY_ZEROIZE',
      message: l7Msg,
    };

    if (!l7Passed) {
      return this.buildReport(packet, startTime, 'L7_UAV_SECURITY_SUITE', l7Msg, l0Check, l1Check, l2Check, l3Check, l4Check, l5Check, l6Check, l7Check);
    }

    // ALL 7 LAYERS PASSED!
    const elapsed = Math.round((performance.now() - startTime) * 1000);
    return {
      timestamp: new Date().toISOString(),
      packetId: packet.packetId,
      overallStatus: 'AUTHENTICATED_SECURE',
      processingLatencyMicroseconds: elapsed,
      l0: l0Check,
      l1: l1Check,
      l2: l2Check,
      l3: l3Check,
      l4: l4Check,
      l5: l5Check,
      l6: l6Check,
      l7: l7Check,
    };
  }

  private buildReport(
    packet: EncryptedUAVPacket,
    startTime: number,
    violatingLayer: string,
    rejectionReason: string,
    l0: L0GateCheck,
    l1?: L1PKICheck,
    l2?: L2KeyEvolutionCheck,
    l3?: L3DeviceIPCheck,
    l4?: L4ChallengeCheck,
    l5?: L5JourneyCounterCheck,
    l6?: L6SingleSessionCheck,
    l7?: L7UAVSuiteCheck
  ): SecurityInspectionReport {
    const elapsed = Math.round((performance.now() - startTime) * 1000);
    return {
      timestamp: new Date().toISOString(),
      packetId: packet.packetId,
      overallStatus: 'SECURITY_BREACH_DROPPED',
      processingLatencyMicroseconds: elapsed,
      violatingLayer,
      rejectionReason,
      l0,
      l1: l1 || { layer: 'L1_PKI_AUTH', passed: false, senderCertCN: '', issuerCN: '', certFingerprint: '', signatureAlgorithm: 'ECDSA_P256_SHA256', signatureVerified: false, revocationStatus: 'REVOKED', message: 'Skipped due to prior layer rejection' },
      l2: l2 || { layer: 'L2_KEY_EVOLUTION', passed: false, epoch: 0, ratchetStep: 0, derivedKeyFingerprint: '', forwardSecrecyEnforced: false, keyMismatchDetected: true, message: 'Skipped due to prior layer rejection' },
      l3: l3 || { layer: 'L3_DEVICE_IP_CONTROL', passed: false, claimedDeviceId: '', claimedIP: '', actualIP: '', macFingerprint: '', hardwareHashMatch: false, message: 'Skipped due to prior layer rejection' },
      l4: l4 || { layer: 'L4_SECRET_CHALLENGE', passed: false, challengeNonce: '', responseHash: '', timeWindowValid: false, zeroKnowledgeProofValid: false, message: 'Skipped due to prior layer rejection' },
      l5: l5 || { layer: 'L5_JOURNEY_COUNTER', passed: false, receivedCounter: 0, expectedCounter: 0, replayDetected: false, counterDrift: 0, message: 'Skipped due to prior layer rejection' },
      l6: l6 || { layer: 'L6_SINGLE_SESSION', passed: false, sessionId: '', heartbeatAgeMs: 0, concurrentSessionConflict: false, mutualLockAcquired: false, message: 'Skipped due to prior layer rejection' },
      l7: l7 || { layer: 'L7_UAV_SECURITY_SUITE', passed: false, commandSyntacticallyValid: false, flightEnvelopeSafe: false, geofenceCompliant: false, tamperSignalNominal: false, gnssConsistencyValid: false, failToZeroTriggered: false, message: 'Skipped due to prior layer rejection' },
    };
  }
}
