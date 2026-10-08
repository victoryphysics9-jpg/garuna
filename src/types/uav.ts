/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NodeRole = 'SERVER_C2' | 'CLIENT_DRONE' | 'ADVERSARY_HACKER' | 'DUAL_STATION' | 'SECURITY_LAB';

export type FlightMode = 
  | 'STANDBY' 
  | 'ARMED' 
  | 'TAKEOFF' 
  | 'AUTONOMOUS_PATROL' 
  | 'MANUAL_STABILIZED' 
  | 'LOITER_RECON' 
  | 'RETURN_TO_BASE' 
  | 'LANDING' 
  | 'FAIL_TO_ZERO' 
  | 'EMERGENCY_DESCENT';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  alt: number; // Altitude in meters Above Ground Level (AGL)
}

export interface FlightAttitude {
  roll: number;  // -45 to +45 deg
  pitch: number; // -45 to +45 deg
  yaw: number;   // 0 to 360 deg
}

export interface FlightVelocity {
  vx: number; // m/s
  vy: number; // m/s
  vz: number; // m/s (climb/descent)
  speedKmh: number;
}

export interface FlightControls {
  pitchInput: number;    // -1 (nose down) to 1 (nose up)
  rollInput: number;     // -1 (bank left) to 1 (bank right)
  yawInput: number;      // -1 (yaw left) to 1 (yaw right)
  throttleInput: number; // 0 to 1 (climb rate / power)
}

export interface PowerSystem {
  batteryPct: number;
  voltageV: number;
  currentAmps: number;
  tempCelsius: number;
  cellBalanceGood: boolean;
  estimatedFlightTimeMinutes: number;
}

export interface GNSSSubsystem {
  fixType: '3D_DGPS' | 'RTK_FIXED' | 'STANDALONE' | 'NO_FIX';
  satellitesLocked: number;
  hdop: number; // Horizontal Dilution of Precision
  vdop: number;
  jammingDetected: boolean;
  spoofingConfidencePct: number;
  signalIntegrity: 'NOMINAL' | 'DEGRADED' | 'SPOOFED_UNSAFE';
}

export interface RFCommLink {
  rssiDbm: number; // -30 (great) to -95 (poor)
  snrDb: number;
  packetLossPct: number;
  frequencyMhz: number;
  hoppingHopRateHz: number;
  activeChannel: string;
  txPowerWatts: number;
}

export interface SensorDataFusion {
  lidarDistanceM: number;
  lidarGroundElevationM: number;
  radarTrackedTargets: number;
  flirAmbientTempC: number;
  imuHealthPct: number;
  barometerAltM: number;
  airspeedPitotKmh: number;
  opticalGimbal: {
    pitchDeg: number;
    yawDeg: number;
    zoomLevel: number;
    sensorMode: 'EO_DAYLIGHT' | 'FLIR_WHITE_HOT' | 'NVG_GREEN';
    lockedTargetId?: string;
  };
}

export interface TacticalThreat {
  id: string;
  type: 'ROGUE_UAV' | 'RF_JAMMER' | 'RADAR_EMITTER' | 'GPS_SPOOFER' | 'UNAUTHORIZED_C2';
  threatLevel: 'INFO' | 'CAUTION' | 'CRITICAL';
  distanceKm: number;
  bearingDeg: number;
  altitudeM: number;
  signalStrengthDbm: number;
  actionTaken: string;
  firstDetectedTime: string;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altM: number;
  speedKmh: number;
  action: 'LOITER' | 'PHOTO_RECON' | 'SURVEILLANCE' | 'FLY_BY';
}

// 7-LAYER SECURITY PROTOCOL TYPES

export type SecurityLayerStatus = 'VERIFIED_SECURE' | 'SUSPICIOUS' | 'BLOCKED_VIOLATION' | 'BYPASS_DISABLED';

export interface L0GateCheck {
  layer: 'L0_SECURE_GATE';
  passed: boolean;
  magicHeader: string; // e.g. "0x55415637"
  portKnockSignature: string;
  packetLengthValid: boolean;
  rateLimitTokensRemaining: number;
  message: string;
}

export interface L1PKICheck {
  layer: 'L1_PKI_AUTH';
  passed: boolean;
  senderCertCN: string;
  issuerCN: string;
  certFingerprint: string;
  signatureAlgorithm: 'ECDSA_P256_SHA256' | 'ED25519' | 'RSA_PSS_4096';
  signatureVerified: boolean;
  revocationStatus: 'VALID' | 'REVOKED' | 'EXPIRED';
  message: string;
}

export interface L2KeyEvolutionCheck {
  layer: 'L2_KEY_EVOLUTION';
  passed: boolean;
  epoch: number;
  ratchetStep: number;
  derivedKeyFingerprint: string;
  forwardSecrecyEnforced: boolean;
  keyMismatchDetected: boolean;
  message: string;
}

export interface L3DeviceIPCheck {
  layer: 'L3_DEVICE_IP_CONTROL';
  passed: boolean;
  claimedDeviceId: string;
  claimedIP: string;
  actualIP: string;
  macFingerprint: string;
  hardwareHashMatch: boolean;
  message: string;
}

export interface L4ChallengeCheck {
  layer: 'L4_SECRET_CHALLENGE';
  passed: boolean;
  challengeNonce: string;
  responseHash: string;
  timeWindowValid: boolean;
  zeroKnowledgeProofValid: boolean;
  message: string;
}

export interface L5JourneyCounterCheck {
  layer: 'L5_JOURNEY_COUNTER';
  passed: boolean;
  receivedCounter: number;
  expectedCounter: number;
  replayDetected: boolean;
  counterDrift: number;
  message: string;
}

export interface L6SingleSessionCheck {
  layer: 'L6_SINGLE_SESSION';
  passed: boolean;
  sessionId: string;
  heartbeatAgeMs: number;
  concurrentSessionConflict: boolean;
  mutualLockAcquired: boolean;
  message: string;
}

export interface L7UAVSuiteCheck {
  layer: 'L7_UAV_SECURITY_SUITE';
  passed: boolean;
  commandSyntacticallyValid: boolean;
  flightEnvelopeSafe: boolean; // Alt 0-5000m, Speed 0-250km/h
  geofenceCompliant: boolean;
  tamperSignalNominal: boolean;
  gnssConsistencyValid: boolean;
  failToZeroTriggered: boolean;
  message: string;
}

export interface SecurityInspectionReport {
  timestamp: string;
  packetId: string;
  overallStatus: 'AUTHENTICATED_SECURE' | 'SECURITY_BREACH_DROPPED' | 'ATTACK_NEUTRALIZED';
  processingLatencyMicroseconds: number;
  l0: L0GateCheck;
  l1: L1PKICheck;
  l2: L2KeyEvolutionCheck;
  l3: L3DeviceIPCheck;
  l4: L4ChallengeCheck;
  l5: L5JourneyCounterCheck;
  l6: L6SingleSessionCheck;
  l7: L7UAVSuiteCheck;
  violatingLayer?: string;
  rejectionReason?: string;
}

export interface WirePacketPayload {
  commandType: 'FLIGHT_STICK_INPUT' | 'MODE_CHANGE' | 'WAYPOINT_DISPATCH' | 'COUNTERMEASURE' | 'EMERGENCY_ZEROIZE' | 'TELEMETRY_BEACON';
  controls?: FlightControls;
  targetMode?: FlightMode;
  targetWaypoint?: Waypoint;
  countermeasureType?: 'FREQ_HOP' | 'CHAFF_FLARE' | 'ECM_SHIELD';
  telemetrySnapshot?: {
    attitude: FlightAttitude;
    position: GeoCoordinate;
    speedKmh: number;
    batteryPct: number;
  };
  authOrigin: string; // Device ID
  timestampMs: number;
}

export interface EncryptedUAVPacket {
  packetId: string;
  magicHeader: string; // "UAV7"
  sessionToken: string;
  journeyCounter: number;
  senderDeviceId: string;
  senderIP: string;
  senderMac: string;
  ratchetEpoch: number;
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
  digitalSignatureHex: string;
  certThumbprint: string;
  challengeResponseHash: string;
  // Raw payload kept for simulation inspection
  unencryptedPayloadForInspection?: WirePacketPayload;
}
