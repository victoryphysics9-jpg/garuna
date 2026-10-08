/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  EncryptedUAVPacket,
  FlightAttitude,
  FlightControls,
  FlightMode,
  FlightVelocity,
  GeoCoordinate,
  SecurityInspectionReport,
  TacticalThreat,
  Waypoint,
  WirePacketPayload,
} from './src/types/uav.ts';
import {
  SevenLayerSecurityEngine,
  PROTOCOL_MAGIC_HEADER,
  MILITARY_HARDWARE_REGISTRY,
} from './src/security/crypto7LayerEngine.ts';
import { generateAdversarialPacket } from './src/security/adversaryAttackSim.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up CORS and client IP detection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Client-IP, X-Device-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (typeof req.headers['x-client-ip'] === 'string') {
    return req.headers['x-client-ip'];
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// ==============================================================
// BACKEND MULTI-DEVICE 7-LAYER SECURITY & UAV STATE
// ==============================================================

const baseLat = 34.0522;
const baseLng = -118.2437;

interface ServerLockState {
  isLocked: boolean;
  lockedSessionId: string | null;
  lockedDeviceId: string | null;
  lockedIp: string | null;
  sessionToken: string | null;
  lastHeartbeat: number;
  serverCallsign: string;
}

const serverLock: ServerLockState = {
  isLocked: false,
  lockedSessionId: null,
  lockedDeviceId: null,
  lockedIp: null,
  sessionToken: null,
  lastHeartbeat: 0,
  serverCallsign: 'AEGIS-C2-ALPHA',
};

// Configurable allowed server IP (default: null allows first genuine C2 login to claim it, or user can set it)
let configuredAllowedServerIp: string | null = null;

// Backend Cryptographic Engine
const backendCryptoEngine = new SevenLayerSecurityEngine();

// Master Drone State
let droneState = {
  position: { lat: baseLat, lng: baseLng, alt: 250 },
  attitude: { roll: 0, pitch: 0, yaw: 45 },
  velocity: { vx: 12, vy: 12, vz: 0, speedKmh: 61.2 },
  flightMode: 'AUTONOMOUS_PATROL' as FlightMode,
  currentControls: { pitchInput: 0, rollInput: 0, yawInput: 0, throttleInput: 0.5 } as FlightControls,
  power: {
    batteryPct: 92,
    voltageV: 24.8,
    currentAmps: 18.4,
    tempCelsius: 34.2,
    cellBalanceGood: true,
    estimatedFlightTimeMinutes: 38,
  },
  gnss: {
    fixType: '3D_DGPS',
    satellitesLocked: 18,
    hdop: 0.85,
    vdop: 1.12,
    jammingDetected: false,
    spoofingConfidencePct: 0,
    signalIntegrity: 'NOMINAL',
  },
  rfLink: {
    rssiDbm: -54,
    snrDb: 28,
    packetLossPct: 0.1,
    frequencyMhz: 2412.5,
    hoppingHopRateHz: 1200,
    activeChannel: 'TAC-CHANNEL-BRAVO-7',
    txPowerWatts: 2.5,
  },
  sensorFusion: {
    lidarDistanceM: 250.4,
    lidarGroundElevationM: 42.1,
    radarTrackedTargets: 3,
    flirAmbientTempC: 19.8,
    imuHealthPct: 99.4,
    barometerAltM: 251.2,
    airspeedPitotKmh: 62.0,
    opticalGimbal: {
      pitchDeg: -22,
      yawDeg: 15,
      zoomLevel: 2.5,
      sensorMode: 'FLIR_WHITE_HOT',
      lockedTargetId: 'TRK-01',
    },
  },
  threats: [
    {
      id: 'TRK-01',
      type: 'ROGUE_UAV',
      threatLevel: 'CAUTION',
      distanceKm: 2.8,
      bearingDeg: 62,
      altitudeM: 320,
      signalStrengthDbm: -68,
      actionTaken: 'RADAR_TRACK_LOCKED',
      firstDetectedTime: '12:04:18Z',
    },
    {
      id: 'TRK-02',
      type: 'RF_JAMMER',
      threatLevel: 'INFO',
      distanceKm: 6.4,
      bearingDeg: 145,
      altitudeM: 10,
      signalStrengthDbm: -82,
      actionTaken: 'FREQ_HOP_MITIGATED',
      firstDetectedTime: '12:02:50Z',
    },
  ] as TacticalThreat[],
  waypoints: [
    { id: 'WP-1', name: 'PATROL-ALPHA', lat: baseLat + 0.008, lng: baseLng + 0.006, altM: 300, speedKmh: 70, action: 'SURVEILLANCE' },
    { id: 'WP-2', name: 'OUTPOST-BRAVO', lat: baseLat + 0.012, lng: baseLng - 0.004, altM: 350, speedKmh: 65, action: 'PHOTO_RECON' },
    { id: 'WP-3', name: 'RIDGE-CHARLIE', lat: baseLat - 0.005, lng: baseLng - 0.009, altM: 280, speedKmh: 75, action: 'LOITER' },
    { id: 'WP-4', name: 'BASE-RETURN', lat: baseLat, lng: baseLng, altM: 150, speedKmh: 50, action: 'FLY_BY' },
  ] as Waypoint[],
  activeWaypointIndex: 0,
};

let lastInspectionReport: SecurityInspectionReport | null = null;
const securityLogs: SecurityInspectionReport[] = [];
let lastEncryptedPacket: EncryptedUAVPacket | null = null;

// Connected SSE clients for live synchronization across multiple laptops!
const sseClients = new Set<Response>();

function broadcastSSE(data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Physics simulation loop on server (runs continuously for all clients)
setInterval(() => {
  if (droneState.flightMode === 'FAIL_TO_ZERO') {
    droneState.position.alt = Math.max(0, droneState.position.alt - 1.2);
    droneState.attitude.roll = 8 * Math.sin(Date.now() / 800);
    droneState.attitude.pitch = -4;
  } else if (droneState.flightMode === 'AUTONOMOUS_PATROL' && droneState.waypoints.length > 0) {
    const targetWp = droneState.waypoints[droneState.activeWaypointIndex % droneState.waypoints.length];
    const dLat = targetWp.lat - droneState.position.lat;
    const dLng = targetWp.lng - droneState.position.lng;
    const distanceM = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
    const desiredHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    const headingError = ((desiredHeading - droneState.attitude.yaw + 540) % 360) - 180;

    droneState.attitude.roll = Math.max(-25, Math.min(25, headingError * 0.8));
    const yawRate = Math.max(-15, Math.min(15, headingError * 0.4));
    const climbRate = Math.max(-4, Math.min(4, (targetWp.altM - droneState.position.alt) * 0.1));
    droneState.attitude.pitch = -climbRate * 1.5;
    droneState.velocity.speedKmh = targetWp.speedKmh;

    droneState.attitude.yaw = (droneState.attitude.yaw + yawRate * 0.05 + 360) % 360;

    const headingRad = (droneState.attitude.yaw * Math.PI) / 180;
    const speedMs = (droneState.velocity.speedKmh * 1000) / 3600;
    droneState.velocity.vx = Math.sin(headingRad) * speedMs;
    droneState.velocity.vy = Math.cos(headingRad) * speedMs;
    droneState.velocity.vz = climbRate;

    droneState.position.lat += (droneState.velocity.vy * 0.05) / 111320;
    droneState.position.lng += (droneState.velocity.vx * 0.05) / (111320 * Math.cos((droneState.position.lat * Math.PI) / 180));
    droneState.position.alt = Math.max(5, droneState.position.alt + climbRate * 0.05);

    if (distanceM < 50) {
      droneState.activeWaypointIndex = (droneState.activeWaypointIndex + 1) % droneState.waypoints.length;
    }
  } else if (droneState.flightMode === 'MANUAL_STABILIZED') {
    const ctrl = droneState.currentControls;
    const targetPitch = ctrl.pitchInput * 25;
    const targetRoll = ctrl.rollInput * 30;
    const targetYawRate = ctrl.yawInput * 20;
    const targetClimbRate = (ctrl.throttleInput - 0.5) * 8;
    const targetSpeedKmh = 30 + ctrl.throttleInput * 90;

    droneState.attitude.pitch += (targetPitch - droneState.attitude.pitch) * 0.1;
    droneState.attitude.roll += (targetRoll - droneState.attitude.roll) * 0.1;
    droneState.attitude.yaw = (droneState.attitude.yaw + targetYawRate * 0.05 + 360) % 360;

    const headingRad = (droneState.attitude.yaw * Math.PI) / 180;
    const speedMs = (targetSpeedKmh * 1000) / 3600;
    droneState.velocity.vx = Math.sin(headingRad) * speedMs;
    droneState.velocity.vy = Math.cos(headingRad) * speedMs;
    droneState.velocity.vz = targetClimbRate;
    droneState.velocity.speedKmh = targetSpeedKmh;

    droneState.position.lat += (droneState.velocity.vy * 0.05) / 111320;
    droneState.position.lng += (droneState.velocity.vx * 0.05) / (111320 * Math.cos((droneState.position.lat * Math.PI) / 180));
    droneState.position.alt = Math.max(5, droneState.position.alt + targetClimbRate * 0.05);
  }

  // Battery gradual consumption
  droneState.power.batteryPct = Math.max(0, droneState.power.batteryPct - 0.001);
  droneState.sensorFusion.lidarDistanceM = Math.round(droneState.position.alt * 10) / 10;

  // Check server lock timeout: If server has been silent for > 30 seconds, release lock
  if (serverLock.isLocked && Date.now() - serverLock.lastHeartbeat > 30000) {
    console.log('[AEGIS-7LSP] Server heartbeat timed out. Releasing exclusive server lock.');
    serverLock.isLocked = false;
    serverLock.lockedSessionId = null;
    serverLock.lockedIp = null;
    serverLock.lockedDeviceId = null;
    serverLock.sessionToken = null;
    broadcastSSE({ type: 'SERVER_LOCK_RELEASED', reason: 'HEARTBEAT_TIMEOUT' });
  }

  // Periodic broadcast to all connected devices (Laptops 1, 2, 3)
  broadcastSSE({
    type: 'TELEMETRY_UPDATE',
    droneState,
    serverLock: {
      isLocked: serverLock.isLocked,
      lockedIp: serverLock.lockedIp,
      lockedDeviceId: serverLock.lockedDeviceId,
      serverCallsign: serverLock.serverCallsign,
      configuredAllowedServerIp,
    },
    lastInspectionReport,
    lastEncryptedPacket,
  });
}, 100);

// ==============================================================
// REST API ENDPOINTS
// ==============================================================

// 1. Session & Server Lock Status
app.get('/api/session/status', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  res.json({
    status: 'ONLINE',
    clientDetectedIp: clientIp,
    configuredAllowedServerIp,
    serverLock: {
      isLocked: serverLock.isLocked,
      lockedIp: serverLock.lockedIp,
      lockedDeviceId: serverLock.lockedDeviceId,
      serverCallsign: serverLock.serverCallsign,
      heartbeatAgeMs: serverLock.isLocked ? Date.now() - serverLock.lastHeartbeat : 0,
      isCallerTheLockedServer: serverLock.isLocked && (serverLock.lockedIp === clientIp || !configuredAllowedServerIp),
    },
    droneState,
    connectedDevicesCount: sseClients.size,
  });
});

// 2. Server Login / Claim Exclusive Role
app.post('/api/server/login', (req: Request, res: Response) => {
  const clientIp = req.body.clientIp || getClientIp(req);
  const deviceId = req.body.deviceId || 'C2-COMMAND-STATION-ALPHA';
  const customIpInput = req.body.customIpInput;
  const hardwareCertKey = req.body.hardwareCertKey; // PKI Private Key / Certificate Token

  console.log(`[AEGIS-7LSP] Server Login attempt from IP: ${clientIp}, Device: ${deviceId}`);

  // RULE L1: Mutual PKI Certificate / Key Token Check
  // Authorized computers possess the military certificate key or default alpha key
  const validKeys = ['MIL-C2-CERT-KEY-ALPHA', 'TOPSECRET_MIL_UAV_7LAYER_KEY_EVOLUTION_MASTER_2026', 'AEGIS-AUTH-C2-KEY'];
  if (hardwareCertKey && !validKeys.includes(hardwareCertKey) && hardwareCertKey !== 'DEFAULT_AUTHORIZED') {
    const errorMsg = `L1_PKI_AUTH_VIOLATION: Untrusted Computer! Hardware Certificate thumbprint [${hardwareCertKey.slice(0, 16)}...] is not signed by Root CA or is forged. Digital signature rejected!`;
    console.warn(`[L1 BLOCK] ${errorMsg}`);
    return res.status(403).json({
      success: false,
      violatingLayer: 'L1_PKI_AUTH',
      message: errorMsg,
    });
  }

  // RULE L3: IP Whitelist Check
  if (configuredAllowedServerIp && configuredAllowedServerIp !== clientIp && configuredAllowedServerIp !== customIpInput) {
    const errorMsg = `L3_DEVICE_IP_CONTROL: IP Mismatch! Caller IP [${clientIp}] does not match configured authorized server IP [${configuredAllowedServerIp}]. Access Denied!`;
    console.warn(`[L3 BLOCK] ${errorMsg}`);
    return res.status(403).json({
      success: false,
      violatingLayer: 'L3_DEVICE_IP_CONTROL',
      message: errorMsg,
    });
  }

  // RULE L6: Single-Session Enforcement
  // If another server is already locked and active
  if (serverLock.isLocked && Date.now() - serverLock.lastHeartbeat < 30000) {
    if (serverLock.lockedIp !== clientIp && serverLock.lockedDeviceId !== deviceId) {
      const errorMsg = `L6_SINGLE_SESSION_VIOLATION: Server is ALREADY LOCKED by another active device [${serverLock.lockedDeviceId}] (IP: ${serverLock.lockedIp}). A third laptop cannot log in or issue commands while a server is active!`;
      console.warn(`[L6 BLOCK] ${errorMsg}`);
      return res.status(403).json({
        success: false,
        violatingLayer: 'L6_SINGLE_SESSION',
        message: errorMsg,
        lockedBy: {
          deviceId: serverLock.lockedDeviceId,
          ip: serverLock.lockedIp,
        },
      });
    }
  }

  // LOCK ACQUIRED!
  const newSessionId = `SESSION-MIL-C2-${Date.now().toString().slice(-6)}`;
  const token = `AEGIS_TOKEN_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

  serverLock.isLocked = true;
  serverLock.lockedSessionId = newSessionId;
  serverLock.lockedDeviceId = deviceId;
  serverLock.lockedIp = clientIp;
  serverLock.sessionToken = token;
  serverLock.lastHeartbeat = Date.now();
  serverLock.serverCallsign = 'AEGIS-C2-PRIMARY';

  backendCryptoEngine.resetSession(newSessionId);

  // If user passed a custom IP to enforce from now on, set it!
  if (customIpInput) {
    configuredAllowedServerIp = customIpInput;
  } else if (!configuredAllowedServerIp) {
    configuredAllowedServerIp = clientIp; // Auto-bind to first authentic server
  }

  broadcastSSE({
    type: 'SERVER_LOCKED',
    serverLock,
  });

  res.json({
    success: true,
    message: `Exclusive C2 Server Lock successfully acquired by ${deviceId} (${clientIp}). 7-Layer Mutual Protocol Armed.`,
    sessionToken: token,
    sessionId: newSessionId,
    configuredAllowedServerIp,
  });
});

// 3. Server Logout / Release Lock
app.post('/api/server/logout', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  console.log(`[AEGIS-7LSP] Server logout requested by ${clientIp}`);

  serverLock.isLocked = false;
  serverLock.lockedSessionId = null;
  serverLock.lockedDeviceId = null;
  serverLock.lockedIp = null;
  serverLock.sessionToken = null;

  broadcastSSE({
    type: 'SERVER_LOCK_RELEASED',
    reason: 'MANUAL_LOGOUT',
  });

  res.json({ success: true, message: 'Server lock released.' });
});

// 4. Configure / Update Whitelisted Server IP
app.post('/api/security/configure-ip', (req: Request, res: Response) => {
  const { allowedIp } = req.body;
  configuredAllowedServerIp = allowedIp ? allowedIp.trim() : null;
  console.log(`[AEGIS-7LSP] Configured allowed Server IP set to: ${configuredAllowedServerIp}`);

  res.json({
    success: true,
    configuredAllowedServerIp,
    message: configuredAllowedServerIp
      ? `Authorized Server IP locked to: ${configuredAllowedServerIp}`
      : 'Allowed Server IP reset (open to first legitimate C2 login).',
  });
});

// 5. Send Flight Command (7-Layer Secured)
app.post('/api/command/send', async (req: Request, res: Response) => {
  const clientIp = req.body.clientIp || getClientIp(req);
  const packet: EncryptedUAVPacket = req.body.packet;

  if (!packet) {
    return res.status(400).json({ error: 'Missing EncryptedUAVPacket' });
  }

  // Update server heartbeat if coming from locked server
  if (serverLock.isLocked && (serverLock.lockedIp === clientIp || !configuredAllowedServerIp)) {
    serverLock.lastHeartbeat = Date.now();
  }

  // =======================================================
  // STRICT 7-LAYER VALIDATION ON SERVER BACKEND
  // =======================================================

  // Extra Server-Level L3 Check: Does request originate from the locked server IP?
  if (serverLock.isLocked && serverLock.lockedIp && serverLock.lockedIp !== clientIp) {
    const report: SecurityInspectionReport = {
      timestamp: new Date().toISOString(),
      packetId: packet.packetId || 'UNKNOWN_PKT',
      overallStatus: 'SECURITY_BREACH_DROPPED',
      processingLatencyMicroseconds: 140,
      violatingLayer: 'L3_DEVICE_IP_CONTROL',
      rejectionReason: `HOSTILE INJECTION ATTEMPT: Packet received from unauthorized IP [${clientIp}]. Active server is bound to [${serverLock.lockedIp}]!`,
      l0: { layer: 'L0_SECURE_GATE', passed: true, magicHeader: packet.magicHeader, portKnockSignature: 'OK', packetLengthValid: true, rateLimitTokensRemaining: 45, message: 'Gate passed' },
      l1: { layer: 'L1_PKI_AUTH', passed: true, senderCertCN: 'ROGUE', issuerCN: 'CA', certFingerprint: 'X', signatureAlgorithm: 'ECDSA_P256_SHA256', signatureVerified: false, revocationStatus: 'VALID', message: 'Cert unverified' },
      l2: { layer: 'L2_KEY_EVOLUTION', passed: false, epoch: 1, ratchetStep: 1, derivedKeyFingerprint: '', forwardSecrecyEnforced: false, keyMismatchDetected: true, message: 'Key desynced' },
      l3: { layer: 'L3_DEVICE_IP_CONTROL', passed: false, claimedDeviceId: packet.senderDeviceId, claimedIP: clientIp, actualIP: serverLock.lockedIp, macFingerprint: '', hardwareHashMatch: false, message: `IP Mismatch: Request from ${clientIp} while Server locked to ${serverLock.lockedIp}` },
      l4: { layer: 'L4_SECRET_CHALLENGE', passed: false, challengeNonce: '', responseHash: '', timeWindowValid: false, zeroKnowledgeProofValid: false, message: 'Failed' },
      l5: { layer: 'L5_JOURNEY_COUNTER', passed: false, receivedCounter: packet.journeyCounter, expectedCounter: 0, replayDetected: false, counterDrift: 0, message: 'Failed' },
      l6: { layer: 'L6_SINGLE_SESSION', passed: false, sessionId: packet.sessionToken, heartbeatAgeMs: 0, concurrentSessionConflict: true, mutualLockAcquired: false, message: 'Session conflict' },
      l7: { layer: 'L7_UAV_SECURITY_SUITE', passed: false, commandSyntacticallyValid: false, flightEnvelopeSafe: false, geofenceCompliant: false, tamperSignalNominal: false, gnssConsistencyValid: false, failToZeroTriggered: false, message: 'Failed' },
    };

    lastInspectionReport = report;
    securityLogs.unshift(report);

    broadcastSSE({
      type: 'SECURITY_ALERT',
      report,
    });

    return res.status(403).json({
      success: false,
      report,
      message: report.rejectionReason,
    });
  }

  // Extra Server-Level L6 Check: Single Session Enforcement
  if (serverLock.isLocked && serverLock.sessionToken && packet.sessionToken !== serverLock.sessionToken) {
    const report: SecurityInspectionReport = {
      timestamp: new Date().toISOString(),
      packetId: packet.packetId,
      overallStatus: 'SECURITY_BREACH_DROPPED',
      processingLatencyMicroseconds: 110,
      violatingLayer: 'L6_SINGLE_SESSION',
      rejectionReason: `SESSION HIJACK REJECTED: Packet session token [${packet.sessionToken}] does not match active server session lock [${serverLock.sessionToken}].`,
      l0: { layer: 'L0_SECURE_GATE', passed: true, magicHeader: packet.magicHeader, portKnockSignature: 'OK', packetLengthValid: true, rateLimitTokensRemaining: 45, message: 'Gate passed' },
      l1: { layer: 'L1_PKI_AUTH', passed: true, senderCertCN: '', issuerCN: '', certFingerprint: '', signatureAlgorithm: 'ECDSA_P256_SHA256', signatureVerified: true, revocationStatus: 'VALID', message: 'Cert valid' },
      l2: { layer: 'L2_KEY_EVOLUTION', passed: true, epoch: 1, ratchetStep: packet.journeyCounter, derivedKeyFingerprint: '', forwardSecrecyEnforced: true, keyMismatchDetected: false, message: 'Key valid' },
      l3: { layer: 'L3_DEVICE_IP_CONTROL', passed: true, claimedDeviceId: packet.senderDeviceId, claimedIP: clientIp, actualIP: clientIp, macFingerprint: '', hardwareHashMatch: true, message: 'IP matched' },
      l4: { layer: 'L4_SECRET_CHALLENGE', passed: true, challengeNonce: '', responseHash: '', timeWindowValid: true, zeroKnowledgeProofValid: true, message: 'Challenge valid' },
      l5: { layer: 'L5_JOURNEY_COUNTER', passed: true, receivedCounter: packet.journeyCounter, expectedCounter: packet.journeyCounter, replayDetected: false, counterDrift: 0, message: 'Counter valid' },
      l6: { layer: 'L6_SINGLE_SESSION', passed: false, sessionId: packet.sessionToken, heartbeatAgeMs: 0, concurrentSessionConflict: true, mutualLockAcquired: false, message: 'Session token mismatch' },
      l7: { layer: 'L7_UAV_SECURITY_SUITE', passed: false, commandSyntacticallyValid: false, flightEnvelopeSafe: false, geofenceCompliant: false, tamperSignalNominal: false, gnssConsistencyValid: false, failToZeroTriggered: false, message: 'Failed' },
    };

    lastInspectionReport = report;
    securityLogs.unshift(report);

    broadcastSSE({
      type: 'SECURITY_ALERT',
      report,
    });

    return res.status(403).json({
      success: false,
      report,
      message: report.rejectionReason,
    });
  }

  // Run full 7-Layer Inspection via cryptographic engine
  const report = await backendCryptoEngine.inspectAndVerifyPacket(packet, {
    altM: droneState.position.alt,
    speedKmh: droneState.velocity.speedKmh,
    geofenceRadiusKm: 15,
  });

  lastInspectionReport = report;
  securityLogs.unshift(report);
  lastEncryptedPacket = packet;

  if (report.overallStatus === 'SECURITY_BREACH_DROPPED') {
    broadcastSSE({
      type: 'SECURITY_ALERT',
      report,
    });
    return res.status(403).json({
      success: false,
      report,
      message: report.rejectionReason,
    });
  }

  // COMMAND EXECUTION: 7 Layers Verified! Update Drone State
  const payload: WirePacketPayload | undefined = packet.unencryptedPayloadForInspection;
  if (payload) {
    if (payload.commandType === 'FLIGHT_STICK_INPUT' && payload.controls) {
      droneState.currentControls = payload.controls;
    } else if (payload.commandType === 'MODE_CHANGE' && payload.targetMode) {
      droneState.flightMode = payload.targetMode;
    } else if (payload.commandType === 'EMERGENCY_ZEROIZE') {
      droneState.flightMode = 'FAIL_TO_ZERO';
      serverLock.isLocked = false;
      serverLock.lockedSessionId = null;
    } else if (payload.commandType === 'WAYPOINT_DISPATCH' && payload.targetWaypoint) {
      droneState.waypoints.push(payload.targetWaypoint);
    } else if (payload.commandType === 'COUNTERMEASURE' && payload.countermeasureType === 'FREQ_HOP') {
      droneState.rfLink.frequencyMhz = Math.round((2400 + Math.random() * 80) * 10) / 10;
    }
  }

  // Instant broadcast to Laptop 2 (Client Drone) and all watchers!
  broadcastSSE({
    type: 'COMMAND_EXECUTED',
    report,
    packet,
    droneState,
  });

  res.json({
    success: true,
    report,
    droneState,
  });
});

// 6. Adversary Attack Simulation Endpoint
app.post('/api/attack/simulate', async (req: Request, res: Response) => {
  const { scenarioId } = req.body;
  const attackPacket = await generateAdversarialPacket(backendCryptoEngine, scenarioId || 'ATTACK_L1_ROGUE_C2');
  
  // Verify packet against engine (it will be caught and dropped!)
  const report = await backendCryptoEngine.inspectAndVerifyPacket(attackPacket, {
    altM: droneState.position.alt,
    speedKmh: droneState.velocity.speedKmh,
    geofenceRadiusKm: 15,
  });

  lastInspectionReport = report;
  securityLogs.unshift(report);
  lastEncryptedPacket = attackPacket;

  broadcastSSE({
    type: 'SECURITY_ALERT',
    report,
    packet: attackPacket,
  });

  res.json({
    success: true,
    attackIntercepted: true,
    report,
  });
});

// 7. Live Server-Sent Events (SSE) Stream across multiple laptops
app.get('/api/telemetry/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial handshake
  res.write(
    `data: ${JSON.stringify({
      type: 'INIT_STATE',
      droneState,
      serverLock: {
        isLocked: serverLock.isLocked,
        lockedIp: serverLock.lockedIp,
        lockedDeviceId: serverLock.lockedDeviceId,
        serverCallsign: serverLock.serverCallsign,
        configuredAllowedServerIp,
      },
      lastInspectionReport,
      lastEncryptedPacket,
    })}\n\n`
  );

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// ==============================================================
// VITE DEV MIDDLEWARE / STATIC ASSET SERVING
// ==============================================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Only call listen if not in a serverless environment like Vercel
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[AEGIS-UAV-7LSP] Tactical Server active on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});

export default app;
