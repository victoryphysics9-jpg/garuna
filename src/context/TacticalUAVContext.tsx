/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  EncryptedUAVPacket,
  FlightAttitude,
  FlightControls,
  FlightMode,
  FlightVelocity,
  GeoCoordinate,
  GNSSSubsystem,
  NodeRole,
  PowerSystem,
  RFCommLink,
  SecurityInspectionReport,
  SensorDataFusion,
  TacticalThreat,
  Waypoint,
  WirePacketPayload,
} from '../types/uav';
import { SevenLayerSecurityEngine, MILITARY_HARDWARE_REGISTRY } from '../security/crypto7LayerEngine';
import { tacticalMesh, MeshBroadcastEvent } from '../mesh/tacticalMeshNetwork';
import { generateAdversarialPacket } from '../security/adversaryAttackSim';

const BASE_LAT = 34.0522;
const BASE_LNG = -118.2437;

export interface ServerLockStateInfo {
  isLocked: boolean;
  lockedIp: string | null;
  lockedDeviceId: string | null;
  serverCallsign: string;
  heartbeatAgeMs: number;
  isCallerTheLockedServer: boolean;
}

export interface TacticalContextType {
  role: NodeRole;
  setRole: (role: NodeRole) => void;
  // Drone Telemetry
  position: GeoCoordinate;
  attitude: FlightAttitude;
  velocity: FlightVelocity;
  flightMode: FlightMode;
  power: PowerSystem;
  gnss: GNSSSubsystem;
  rfLink: RFCommLink;
  sensorFusion: SensorDataFusion;
  threats: TacticalThreat[];
  waypoints: Waypoint[];
  activeWaypointIndex: number;
  // Controls
  currentControls: FlightControls;
  setControls: (controls: Partial<FlightControls>) => void;
  // Commands dispatched by Server
  sendCommand: (type: WirePacketPayload['commandType'], params?: Partial<WirePacketPayload>) => Promise<void>;
  setFlightMode: (mode: FlightMode) => Promise<void>;
  addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
  clearWaypoints: () => void;
  deployCountermeasure: (type: 'FREQ_HOP' | 'CHAFF_FLARE' | 'ECM_SHIELD') => Promise<void>;
  triggerFailToZero: () => Promise<void>;
  // Security Inspection
  engine: SevenLayerSecurityEngine;
  lastReport: SecurityInspectionReport | null;
  securityLog: SecurityInspectionReport[];
  lastTransmittedPacket: EncryptedUAVPacket | null;
  // Attack injection
  injectAttack: (scenarioId: string) => Promise<void>;
  // Manual local override toggle
  clientManualOverride: boolean;
  setClientManualOverride: (enabled: boolean) => void;
  // Audio alarm state
  audioAlarmActive: boolean;
  clearAudioAlarm: () => void;
  // MULTI-LAPTOP BACKEND NETWORK EXTENSIONS
  networkSyncOnline: boolean;
  connectedDevicesCount: number;
  clientDetectedIp: string;
  configuredAllowedServerIp: string | null;
  serverLock: ServerLockStateInfo;
  loginAsServer: (customIp?: string, hardwareCertKey?: string) => Promise<{ success: boolean; message: string; violatingLayer?: string }>;
  logoutServer: () => Promise<void>;
  updateAllowedServerIp: (ip: string | null) => Promise<void>;
  serverLoginError: string | null;
  clearServerLoginError: () => void;
}

const TacticalContext = createContext<TacticalContextType | null>(null);

export const TacticalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<NodeRole>('DUAL_STATION');
  const [engine] = useState(() => new SevenLayerSecurityEngine());

  // Aircraft physical state
  const [position, setPosition] = useState<GeoCoordinate>({
    lat: BASE_LAT,
    lng: BASE_LNG,
    alt: 250,
  });

  const [attitude, setAttitude] = useState<FlightAttitude>({
    roll: 0,
    pitch: 0,
    yaw: 45,
  });

  const [velocity, setVelocity] = useState<FlightVelocity>({
    vx: 12,
    vy: 12,
    vz: 0,
    speedKmh: 61.2,
  });

  const [flightMode, setFlightModeState] = useState<FlightMode>('AUTONOMOUS_PATROL');

  const [power, setPower] = useState<PowerSystem>({
    batteryPct: 92,
    voltageV: 24.8,
    currentAmps: 18.4,
    tempCelsius: 34.2,
    cellBalanceGood: true,
    estimatedFlightTimeMinutes: 38,
  });

  const [gnss, setGnss] = useState<GNSSSubsystem>({
    fixType: '3D_DGPS',
    satellitesLocked: 18,
    hdop: 0.85,
    vdop: 1.12,
    jammingDetected: false,
    spoofingConfidencePct: 0,
    signalIntegrity: 'NOMINAL',
  });

  const [rfLink, setRfLink] = useState<RFCommLink>({
    rssiDbm: -54,
    snrDb: 28,
    packetLossPct: 0.1,
    frequencyMhz: 2412.5,
    hoppingHopRateHz: 1200,
    activeChannel: 'TAC-CHANNEL-BRAVO-7',
    txPowerWatts: 2.5,
  });

  const [sensorFusion, setSensorFusion] = useState<SensorDataFusion>({
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
  });

  const [threats, setThreats] = useState<TacticalThreat[]>([
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
  ]);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 'WP-1', name: 'PATROL-ALPHA', lat: BASE_LAT + 0.008, lng: BASE_LNG + 0.006, altM: 300, speedKmh: 70, action: 'SURVEILLANCE' },
    { id: 'WP-2', name: 'OUTPOST-BRAVO', lat: BASE_LAT + 0.012, lng: BASE_LNG - 0.004, altM: 350, speedKmh: 65, action: 'PHOTO_RECON' },
    { id: 'WP-3', name: 'RIDGE-CHARLIE', lat: BASE_LAT - 0.005, lng: BASE_LNG - 0.009, altM: 280, speedKmh: 75, action: 'LOITER' },
    { id: 'WP-4', name: 'BASE-RETURN', lat: BASE_LAT, lng: BASE_LNG, altM: 150, speedKmh: 50, action: 'FLY_BY' },
  ]);

  const [activeWaypointIndex, setActiveWaypointIndex] = useState(0);

  const [currentControls, setCurrentControlsState] = useState<FlightControls>({
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    throttleInput: 0.5,
  });

  const [lastReport, setLastReport] = useState<SecurityInspectionReport | null>(null);
  const [securityLog, setSecurityLog] = useState<SecurityInspectionReport[]>([]);
  const [lastTransmittedPacket, setLastTransmittedPacket] = useState<EncryptedUAVPacket | null>(null);
  const [clientManualOverride, setClientManualOverride] = useState(false);
  const [audioAlarmActive, setAudioAlarmActive] = useState(false);

  // Multi-laptop backend network state
  const [networkSyncOnline, setNetworkSyncOnline] = useState(false);
  const [connectedDevicesCount, setConnectedDevicesCount] = useState(1);
  const [clientDetectedIp, setClientDetectedIp] = useState('127.0.0.1');
  const [configuredAllowedServerIp, setConfiguredAllowedServerIp] = useState<string | null>(null);
  const [serverLock, setServerLock] = useState<ServerLockStateInfo>({
    isLocked: false,
    lockedIp: null,
    lockedDeviceId: null,
    serverCallsign: 'AEGIS-C2-PRIMARY',
    heartbeatAgeMs: 0,
    isCallerTheLockedServer: false,
  });
  const [serverLoginError, setServerLoginError] = useState<string | null>(null);

  const stateRef = useRef({
    position,
    attitude,
    velocity,
    flightMode,
    currentControls,
    waypoints,
    activeWaypointIndex,
    clientManualOverride,
    serverLock,
  });
  stateRef.current = {
    position,
    attitude,
    velocity,
    flightMode,
    currentControls,
    waypoints,
    activeWaypointIndex,
    clientManualOverride,
    serverLock,
  };

  const clearAudioAlarm = useCallback(() => setAudioAlarmActive(false), []);
  const clearServerLoginError = useCallback(() => setServerLoginError(null), []);

  const setControls = useCallback((newControls: Partial<FlightControls>) => {
    setCurrentControlsState(prev => ({ ...prev, ...newControls }));
  }, []);

  // REAL-TIME BACKEND SSE STREAM SUBSCRIPTION (FOR MULTI-LAPTOP LIVE SYNC)
  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      try {
        evtSource = new EventSource('/api/telemetry/stream');
        evtSource.onopen = () => {
          setNetworkSyncOnline(true);
        };

        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT_STATE' || data.type === 'TELEMETRY_UPDATE' || data.type === 'COMMAND_EXECUTED') {
              if (data.droneState) {
                setPosition(data.droneState.position);
                setAttitude(data.droneState.attitude);
                setVelocity(data.droneState.velocity);
                setFlightModeState(data.droneState.flightMode);
                setPower(data.droneState.power);
                setGnss(data.droneState.gnss);
                setRfLink(data.droneState.rfLink);
                setSensorFusion(data.droneState.sensorFusion);
                if (data.droneState.waypoints) setWaypoints(data.droneState.waypoints);
                if (data.droneState.activeWaypointIndex !== undefined) {
                  setActiveWaypointIndex(data.droneState.activeWaypointIndex);
                }
              }
              if (data.serverLock) {
                setServerLock(data.serverLock);
                if (data.serverLock.configuredAllowedServerIp !== undefined) {
                  setConfiguredAllowedServerIp(data.serverLock.configuredAllowedServerIp);
                }
              }
              if (data.lastInspectionReport) {
                setLastReport(data.lastInspectionReport);
                setSecurityLog(prev => [data.lastInspectionReport, ...prev.slice(0, 49)]);
                if (data.lastInspectionReport.overallStatus === 'SECURITY_BREACH_DROPPED') {
                  setAudioAlarmActive(true);
                }
              }
              if (data.lastEncryptedPacket) {
                setLastTransmittedPacket(data.lastEncryptedPacket);
              }
            } else if (data.type === 'SERVER_LOCKED') {
              setServerLock(data.serverLock);
            } else if (data.type === 'SERVER_LOCK_RELEASED') {
              setServerLock(prev => ({ ...prev, isLocked: false, lockedIp: null, lockedDeviceId: null }));
            } else if (data.type === 'SECURITY_ALERT') {
              if (data.report) {
                setLastReport(data.report);
                setSecurityLog(prev => [data.report, ...prev.slice(0, 49)]);
                setAudioAlarmActive(true);
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        evtSource.onerror = () => {
          setNetworkSyncOnline(false);
          evtSource?.close();
          retryTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.warn('SSE stream error, running offline fallback', err);
      }
    };

    connectSSE();

    // Fetch initial status
    fetch('/api/session/status')
      .then(res => res.json())
      .then(data => {
        if (data.clientDetectedIp) setClientDetectedIp(data.clientDetectedIp);
        if (data.configuredAllowedServerIp) setConfiguredAllowedServerIp(data.configuredAllowedServerIp);
        if (data.serverLock) setServerLock(data.serverLock);
        if (data.connectedDevicesCount) setConnectedDevicesCount(data.connectedDevicesCount);
      })
      .catch(() => {});

    return () => {
      evtSource?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  // SERVER LOGIN / CLAIM EXCLUSIVE ROLE
  const loginAsServer = useCallback(async (customIp?: string, hardwareCertKey?: string) => {
    try {
      const res = await fetch('/api/server/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'C2-COMMAND-STATION-ALPHA',
          clientIp: customIp || clientDetectedIp,
          customIpInput: customIp,
          hardwareCertKey: hardwareCertKey || 'MIL-C2-CERT-KEY-ALPHA',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.message || 'Login failed';
        setServerLoginError(errorMsg);
        setAudioAlarmActive(true);
        return { success: false, message: errorMsg, violatingLayer: data.violatingLayer };
      }

      setServerLoginError(null);
      setRole('SERVER_C2');
      if (data.configuredAllowedServerIp) {
        setConfiguredAllowedServerIp(data.configuredAllowedServerIp);
      }
      return { success: true, message: data.message };
    } catch (err) {
      const msg = 'Network error during server login: ' + String(err);
      setServerLoginError(msg);
      return { success: false, message: msg };
    }
  }, [clientDetectedIp]);

  // SERVER LOGOUT / RELEASE LOCK
  const logoutServer = useCallback(async () => {
    try {
      await fetch('/api/server/logout', { method: 'POST' });
      setServerLock(prev => ({ ...prev, isLocked: false, lockedIp: null, lockedDeviceId: null }));
    } catch (err) {
      console.warn('Logout failed', err);
    }
  }, []);

  // CONFIGURE WHITELISTED SERVER IP
  const updateAllowedServerIp = useCallback(async (ip: string | null) => {
    try {
      const res = await fetch('/api/security/configure-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedIp: ip }),
      });
      const data = await res.json();
      if (data.success) {
        setConfiguredAllowedServerIp(data.configuredAllowedServerIp);
      }
    } catch (err) {
      console.warn('Config IP failed', err);
    }
  }, []);

  // Set flight mode via authenticated packet
  const setFlightMode = useCallback(async (mode: FlightMode) => {
    setFlightModeState(mode);
    await sendCommand('MODE_CHANGE', { targetMode: mode });
  }, []);

  const addWaypoint = useCallback((wp: Omit<Waypoint, 'id'>) => {
    const newWp: Waypoint = {
      ...wp,
      id: `WP-${Date.now().toString().slice(-4)}`,
    };
    setWaypoints(prev => [...prev, newWp]);
  }, []);

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  // Deploy military countermeasure
  const deployCountermeasure = useCallback(async (type: 'FREQ_HOP' | 'CHAFF_FLARE' | 'ECM_SHIELD') => {
    if (type === 'FREQ_HOP') {
      const newFreq = Math.round((2400 + Math.random() * 80) * 10) / 10;
      setRfLink(prev => ({
        ...prev,
        frequencyMhz: newFreq,
        activeChannel: `TAC-HOP-SECURE-${Math.floor(10 + Math.random() * 89)}`,
        hoppingHopRateHz: 2400,
      }));
    }
    await sendCommand('COUNTERMEASURE', { countermeasureType: type });
  }, []);

  // Fail-to-Zero command
  const triggerFailToZero = useCallback(async () => {
    await sendCommand('EMERGENCY_ZEROIZE');
    setFlightModeState('FAIL_TO_ZERO');
    engine.resetSession('SESSION_ZEROIZED_WIPED_CLEAN');
    setRfLink(prev => ({ ...prev, txPowerWatts: 0, packetLossPct: 100 }));
  }, [engine]);

  // Handle incoming mesh packets across tabs
  useEffect(() => {
    const unsubscribe = tacticalMesh.subscribe(async (event: MeshBroadcastEvent) => {
      if (!event.packet) return;

      const report = await engine.inspectAndVerifyPacket(event.packet, {
        altM: stateRef.current.position.alt,
        speedKmh: stateRef.current.velocity.speedKmh,
        geofenceRadiusKm: 15,
      });

      setLastReport(report);
      setSecurityLog(prev => [report, ...prev.slice(0, 49)]);

      if (report.overallStatus === 'SECURITY_BREACH_DROPPED') {
        setAudioAlarmActive(true);
      }
    });

    return unsubscribe;
  }, [engine]);

  // Master sendCommand implementation (7-layer encrypted packet creation + backend transmission)
  const sendCommand = useCallback(
    async (type: WirePacketPayload['commandType'], params?: Partial<WirePacketPayload>) => {
      const payload: WirePacketPayload = {
        commandType: type,
        controls: type === 'FLIGHT_STICK_INPUT' ? stateRef.current.currentControls : params?.controls,
        targetMode: params?.targetMode,
        targetWaypoint: params?.targetWaypoint,
        countermeasureType: params?.countermeasureType,
        authOrigin: 'C2-COMMAND-STATION-ALPHA',
        timestampMs: Date.now(),
        telemetrySnapshot: {
          attitude: stateRef.current.attitude,
          position: stateRef.current.position,
          speedKmh: stateRef.current.velocity.speedKmh,
          batteryPct: power.batteryPct,
        },
      };

      const encryptedPacket = await engine.createSecurePacket(payload, 'C2-COMMAND-STATION-ALPHA');
      setLastTransmittedPacket(encryptedPacket);

      // Local mesh broadcast
      tacticalMesh.broadcast({
        type: 'C2_COMMAND_PACKET',
        senderRole: 'SERVER_C2',
        senderId: 'C2-COMMAND-STATION-ALPHA',
        packet: encryptedPacket,
        timestamp: Date.now(),
      });

      // Transmit to backend via POST /api/command/send
      try {
        const res = await fetch('/api/command/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-IP': clientDetectedIp,
          },
          body: JSON.stringify({
            clientIp: clientDetectedIp,
            packet: encryptedPacket,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.report) {
            setLastReport(data.report);
            setSecurityLog(prev => [data.report, ...prev.slice(0, 49)]);
          }
          setAudioAlarmActive(true);
        } else if (data.report) {
          setLastReport(data.report);
        }
      } catch (err) {
        // Fallback for standalone offline execution
      }
    },
    [engine, power.batteryPct, clientDetectedIp]
  );

  // Adversary Attack Injection
  const injectAttack = useCallback(
    async (scenarioId: string) => {
      // Trigger attack on backend so all laptops see the defense in action!
      try {
        const res = await fetch('/api/attack/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId }),
        });
        const data = await res.json();
        if (data.report) {
          setLastReport(data.report);
          setSecurityLog(prev => [data.report, ...prev.slice(0, 49)]);
          setAudioAlarmActive(true);
          return;
        }
      } catch {
        // Fallback to local simulation
      }

      const attackPacket = await generateAdversarialPacket(engine, scenarioId);
      setLastTransmittedPacket(attackPacket);

      tacticalMesh.broadcast({
        type: 'ADVERSARY_ATTACK_PACKET',
        senderRole: 'ADVERSARY_HACKER',
        senderId: 'ROGUE-EXPLOIT-EMITTER-X',
        packet: attackPacket,
        timestamp: Date.now(),
      });
    },
    [engine]
  );

  return (
    <TacticalContext.Provider
      value={{
        role,
        setRole,
        position,
        attitude,
        velocity,
        flightMode,
        power,
        gnss,
        rfLink,
        sensorFusion,
        threats,
        waypoints,
        activeWaypointIndex,
        currentControls,
        setControls,
        sendCommand,
        setFlightMode,
        addWaypoint,
        clearWaypoints,
        deployCountermeasure,
        triggerFailToZero,
        engine,
        lastReport,
        securityLog,
        lastTransmittedPacket,
        injectAttack,
        clientManualOverride,
        setClientManualOverride,
        audioAlarmActive,
        clearAudioAlarm,
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
      }}
    >
      {children}
    </TacticalContext.Provider>
  );
};

export const useTactical = () => {
  const context = useContext(TacticalContext);
  if (!context) {
    throw new Error('useTactical must be used within TacticalProvider');
  }
  return context;
};
