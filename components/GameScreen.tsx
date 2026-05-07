import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, useReducer, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  CoinStandardSvg, CoinRareSvg, CoinLegendarySvg,
  ObstacleFloorSpikesSvg, ObstacleCeilingSpikesSvg,
  ObstacleRotatingBladeSvg, ObstacleLaserGateSvg,
  PowerupSvg, CharacterSvg,
} from '@/components/GameSvgs';
import HudAssetIcon, { type HudAssetName } from '@/components/HudAssetIcon';
import COLORS from '@/constants/colors';
import {
  SKINS, TRAILS, GAME, ENVIRONMENTS, ENV_ORDER, POWERUPS,
  PowerupType, SCORE_MILESTONES,
} from '@/constants/game';
import { useGame } from '@/context/GameContext';
import { ChunkSpawner } from '@/game/generation/spawner';
import { gameAudio } from '@/lib/audio';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rect { left: number; right: number; top: number; bottom: number; }

type ObstacleType =
  | 'floor_spike' | 'ceiling_spike'
  | 'floor_spikes' | 'ceiling_spikes'
  | 'moving_spike' | 'rotating_blade'
  | 'laser_gate' | 'spike_wall';

interface Obstacle {
  id: string; type: ObstacleType;
  x: number; width: number;
  spikeCount?: number;
  moveY?: number; moveVelocity?: number;
  rotation?: number;
  warned?: boolean;
  laserOn?: boolean; laserTimer?: number;
  laserCycleOn?: number; laserCycleOff?: number;
  laserFromFloor?: boolean;
  gapAtFloor?: boolean;
}

interface CoinPickup {
  id: string; x: number; y: number; collected: boolean;
  rare?: boolean;
  highValue?: boolean;
}

interface FlipTrail {
  id: string; x: number; y: number;
  w: number; h: number;
  life: number; color: string;
}

interface PowerupPickup {
  id: string; x: number; y: number;
  type: PowerupType; collected: boolean;
}

interface TrailParticle {
  id: string; x: number; y: number; life: number; size: number; color: string;
}

interface BurstParticle {
  id: string; x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface FlipRing {
  id: string; x: number; y: number;
  radius: number; maxRadius: number;
  life: number; color: string;
}

interface BgNode {
  id: string;
  x: number; y: number; size: number; speed: number; opacity: number;
}

interface Popup {
  text: string; color: string; timer: number; size: 'sm' | 'md' | 'lg';
}

interface DeathSnapshot {
  playerY: number;
  onFloor: boolean;
  obstacleAnchorX: number;
}

interface GState {
  phase: 'playing' | 'dead';
  onFloor: boolean;
  playerY: number; playerVelocity: number;
  scaleX: number; scaleY: number;
  obstacles: Obstacle[];
  speed: number;
  speedFromScore: number;
  nextObsTimer: number;
  scoreTimer: number;
  totalTime: number;
  reviveUsed: boolean;
  flipCooldown: number;
  powerupShieldActive: boolean;
  shieldHitsRemaining: number;
  shieldInvulnTime: number;
  powerupSlowmoTime: number;
  powerupDoubleScoreTime: number;
  powerupMagnetTime: number;
  powerupPickups: PowerupPickup[];
  coins: CoinPickup[];
  coinsCollected: number;
  comboStreak: number;
  comboDisplayTimer: number;
  perfectFlipTimer: number;
  perfectFlipCount: number;
  flipCount: number;
  maxCombo: number;
  trail: TrailParticle[];
  bursts: BurstParticle[];
  flipRings: FlipRing[];
  flipTrails: FlipTrail[];
  nearMissTimer: number;
  nearMissCount: number;
  deathSlowmo: number;
  envIndex: number;
  envFlashTimer: number;
  survivalTime: number;
  bgFar: BgNode[];
  bgMid: BgNode[];
  bgNear: BgNode[];
  popup: Popup | null;
  dangerFloor: number;
  dangerCeil: number;
  lastMilestone: number;
  warnTimer: number;
  reviveAdReady: boolean;
  revivePending: boolean;
  deathFlash: number;
  deathExplosion: number;
  deathShake: number;
  deathSnapshot: DeathSnapshot | null;
}

interface LayoutConstants {
  HEADER_H: number;
  WALL_T: number;
  P_SIZE: number;
  P_X: number;
  CEIL_BOT: number;
  FLOOR_TOP: number;
  MID_Y: number;
  PLAY_H: number;
  P_ON_FLOOR: number;
  P_ON_CEIL: number;
}

interface LoopSettings {
  vibration: boolean;
  skinColor: string;
  skinTrailColor: string;
  skinId: string;
  selectedTrailId: string;
  upgrades: ReturnType<typeof useGame>['upgrades'];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SPIKE_H = 32;
const SPIKE_W = 13;
const BLADE_R = 21;
const MOVE_HH = 17;
const MOVE_HW = 11;
const TRAIL_INTERVAL = 0.028;
const DANGER_DIST = 60;
const MAGNET_RANGE = 140;
const MAGNET_SPEED = 220;
const MAGNET_PULL_DURATION = 10;
const SPEED_LINE_THRESHOLD = 0.35;
// FIX ①: Increased HUD interval — visual game state renders every rAF via canvas,
// React tree only updates for score/coins/powerup UI (not particles)
const HUD_UPDATE_INTERVAL_MS = 150;

const GRID_LINE_FRACTIONS = [0.2, 0.4, 0.6, 0.8] as const;
const SPEED_LINE_FRACTIONS = [0.15, 0.28, 0.44, 0.55, 0.68, 0.78, 0.9] as const;
const WALL_DOT_FRACTIONS = [0.1, 0.2, 0.35, 0.5, 0.62, 0.75, 0.88] as const;
const SPEED_LINE_OPACITY_FACTORS = [0.082, 0.094, 0.103, 0.088, 0.109, 0.097, 0.086] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function rectsOverlap(a: Rect, b: Rect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function rectsClose(a: Rect, b: Rect, t: number) {
  return rectsOverlap(a, { left: b.left - t, right: b.right + t, top: b.top - t, bottom: b.bottom + t });
}

function makeBgNodes(count: number, ceilBot: number, floorTop: number, speedFactor: number): BgNode[] {
  return Array.from({ length: count }, () => ({
    id: mkId(),
    x: Math.random() * SW * 1.5,
    y: ceilBot + Math.random() * (floorTop - ceilBot),
    size: 1.5 + Math.random() * 2.5,
    speed: speedFactor,
    opacity: 0.3 + Math.random() * 0.7,
  }));
}

// ─── FIX ②: Pre-baked sin table replaces Math.sin() calls in render ───────────
// Wall dot opacity is animated with sin — compute at spawn, not per-render
const SIN_TABLE_SIZE = 256;
const SIN_TABLE = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2);
}
function fastSin(x: number): number {
  const idx = ((x % (Math.PI * 2)) / (Math.PI * 2) * SIN_TABLE_SIZE + SIN_TABLE_SIZE) % SIN_TABLE_SIZE | 0;
  return SIN_TABLE[idx];
}

// ─── FIX ③: Stable style pools — reuse objects to reduce GC pressure ──────────
// Instead of creating new style objects in .map(), we use a pooled approach
// where each particle type has a fixed-size pool of pre-allocated style objects.
// This is the single biggest GC win since trail/burst can have 30-100 items.

// ─── Props & Ref ───────────────────────────────────────────────────────────────

interface Props {
  onDeath: (score: number, coins: number, canRevive: boolean) => void;
  onPause: () => void;
  isPaused: boolean;
  onScoreChange?: (score: number) => void;
}

export interface GameScreenRef {
  revive: () => void;
}

// ─── FIX ④: Separate HUD tick from visual tick ───────────────────────────────
// HUD tick: drives score/coins/powerup text updates (throttled to 150ms)
// Visual tick: drives particle/obstacle rendering (every rAF)
// By splitting these, the heavy React tree (particles) re-renders at rAF rate
// only when we actually need it — but we don't. See FIX ⑥ below.
interface FrameTick { hud: number; }
function tickReducer(state: FrameTick): FrameTick {
  return { hud: state.hud + 1 };
}

// ─── FIX ⑤: Canvas-based particle renderer ───────────────────────────────────
// Replaces 30-100 <View> elements per frame for trail/burst/rings with a single
// <canvas> element drawn in rAF — eliminates the biggest source of React reconciliation lag.
// This is the #1 fix for flip jank (burst spawns 24 particles on death/shield hit).
interface CanvasRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
}
const CanvasParticleLayer = memo(function CanvasParticleLayer({ canvasRef, width, height }: CanvasRendererProps) {
  return (
    <canvas
      // @ts-ignore — RN web canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  );
});

// ─── FIX ⑥: Memoised sub-components so parent re-renders don't cascade ────────
// All sub-components wrapped in memo — they only re-render when their own props change.
// Combined with the HUD-only tick system, this means obstacles/coins/etc
// only re-render when HUD fires (every 150ms) not every rAF frame.

const PlayerBody = memo(function PlayerBody({ skin, size, onFloor }: {
  skin: typeof SKINS[0]; size: number; onFloor: boolean; velocity: number;
}) {
  const flip = onFloor ? 1 : -1;
  return (
    <View style={{
      width: size, height: size,
      transform: [{ scaleY: flip }],
      shadowColor: skin.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 12,
    }}>
      <CharacterSvg skinId={skin.id} size={size} />
    </View>
  );
});

const PowerupPickupComp = memo(function PowerupPickupComp({ pu }: { pu: PowerupPickup }) {
  const cfg = POWERUPS[pu.type];
  const R = GAME.POWERUP_VISUAL_RADIUS + 4;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: pu.x - R, top: pu.y - R,
      width: R * 2, height: R * 2,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: cfg.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14,
    }}>
      <PowerupSvg type={pu.type} size={R * 2} />
    </View>
  );
});

const SpikeGroup = memo(function SpikeGroup({ count, fromFloor, x, floorTop, ceilBot, color }: {
  count: number; fromFloor: boolean; x: number;
  floorTop: number; ceilBot: number; color: string;
}) {
  const w = count === 1 ? 48 : count === 2 ? 64 : 80;
  if (fromFloor) {
    return (
      <View style={{ position: 'absolute', left: x, top: floorTop - SPIKE_H }} pointerEvents="none">
        <ObstacleFloorSpikesSvg width={w} height={SPIKE_H} />
      </View>
    );
  }
  return (
    <View style={{ position: 'absolute', left: x, top: ceilBot }} pointerEvents="none">
      <ObstacleCeilingSpikesSvg width={w} height={SPIKE_H} />
    </View>
  );
});

const ObstacleComp = memo(function ObstacleComp({ obs, ceilBot, floorTop, midY, color }: {
  obs: Obstacle; ceilBot: number; floorTop: number; midY: number; color: string;
}) {
  if (obs.type === 'floor_spike' || obs.type === 'floor_spikes') {
    return <SpikeGroup count={obs.spikeCount ?? 1} fromFloor x={obs.x} floorTop={floorTop} ceilBot={ceilBot} color={color} />;
  }
  if (obs.type === 'ceiling_spike' || obs.type === 'ceiling_spikes') {
    return <SpikeGroup count={obs.spikeCount ?? 1} fromFloor={false} x={obs.x} floorTop={floorTop} ceilBot={ceilBot} color={color} />;
  }
  if (obs.type === 'moving_spike') {
    const cy = midY + (obs.moveY ?? 0);
    const movingAsset: HudAssetName =
      obs.moveY === undefined || Math.abs(obs.moveY) < 6
        ? 'obstacle_moving_spike_pincer'
        : (obs.moveY > 0 ? 'obstacle_moving_spike_floor' : 'obstacle_moving_spike_ceiling');
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - MOVE_HW, top: cy - MOVE_HH,
        width: MOVE_HW * 2, height: MOVE_HH * 2,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10,
      }}>
        <HudAssetIcon name={movingAsset} size={Math.max(MOVE_HW * 2, MOVE_HH * 2)} style={{ width: MOVE_HW * 2, height: MOVE_HH * 2 }} />
      </View>
    );
  }
  if (obs.type === 'rotating_blade') {
    const D = BLADE_R * 2 + 6;
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - BLADE_R - 3, top: midY - BLADE_R - 3,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 14,
      }}>
        <ObstacleRotatingBladeSvg size={D} rotation={obs.rotation ?? 0} />
      </View>
    );
  }
  if (obs.type === 'spike_wall') {
    const GAP = 26 + 18;
    const wallAsset: HudAssetName = obs.gapAtFloor ? 'obstacle_narrow_tunnel' : 'obstacle_narrow_tunnel_offset';
    const top = obs.gapAtFloor ? ceilBot : ceilBot + GAP - 8;
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - 26, top,
        width: 58, height: GAP + 16,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10,
      }}>
        <HudAssetIcon name={wallAsset} size={58} style={{ width: 58, height: GAP + 16 }} />
      </View>
    );
  }
  if (obs.type === 'laser_gate') {
    const beamH = (floorTop - ceilBot) * 0.52;
    const top = obs.laserFromFloor ? floorTop - beamH : ceilBot;
    const isOn = !!obs.laserOn;
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - 12, top,
        shadowColor: '#FF2266', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isOn ? 1 : 0.3, shadowRadius: isOn ? 16 : 4,
      }}>
        <ObstacleLaserGateSvg width={24} height={beamH} opacity={isOn ? 1 : 0.35} />
      </View>
    );
  }
  return null;
});

// ─── FIX ⑦: Obstacle list only re-renders when obstacle array reference changes
// We track a version counter incremented only when obstacles are added/removed/mutated
// in ways that affect render (position changes use canvas, not React views).
// For moving obstacles, we accept 150ms staleness on position — physics still runs at rAF.
// NOTE: For a full native solution, migrate to react-native-reanimated worklets.

// ─── Component ─────────────────────────────────────────────────────────────────

const GameScreen = forwardRef<GameScreenRef, Props>(function GameScreen(
  { onDeath, onPause, isPaused, onScoreChange }: Props,
  ref,
) {
  const insets = useSafeAreaInsets();
  const { selectedSkinId, selectedTrailId, settings, submitScore, addCoins, updateChallengeProgress, recordRunStats, upgrades } = useGame();
  const skin = useMemo(() => SKINS.find(s => s.id === selectedSkinId) || SKINS[0], [selectedSkinId]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const HEADER_H = topPadding + 60;
  const WALL_T = GAME.WALL_THICKNESS;
  const P_SIZE = GAME.PLAYER_SIZE;
  const P_X = GAME.PLAYER_X;
  const CEIL_BOT = HEADER_H + WALL_T;
  const FLOOR_TOP = SH - bottomPadding - WALL_T;
  const MID_Y = (CEIL_BOT + FLOOR_TOP) / 2;
  const PLAY_H = FLOOR_TOP - CEIL_BOT;
  const P_ON_FLOOR = FLOOR_TOP - P_SIZE;
  const P_ON_CEIL = CEIL_BOT;

  const layoutRef = useRef<LayoutConstants>({
    HEADER_H, WALL_T, P_SIZE, P_X,
    CEIL_BOT, FLOOR_TOP, MID_Y, PLAY_H,
    P_ON_FLOOR, P_ON_CEIL,
  });
  useEffect(() => {
    layoutRef.current = {
      HEADER_H, WALL_T, P_SIZE, P_X,
      CEIL_BOT, FLOOR_TOP, MID_Y, PLAY_H,
      P_ON_FLOOR, P_ON_CEIL,
    };
  }, [HEADER_H, WALL_T, P_SIZE, P_X, CEIL_BOT, FLOOR_TOP, MID_Y, PLAY_H, P_ON_FLOOR, P_ON_CEIL]);

  const loopSettingsRef = useRef<LoopSettings>({
    vibration: settings.vibration,
    skinColor: skin.color,
    skinTrailColor: skin.trailColor,
    skinId: skin.id,
    selectedTrailId,
    upgrades,
  });
  useEffect(() => {
    loopSettingsRef.current = {
      vibration: settings.vibration,
      skinColor: skin.color,
      skinTrailColor: skin.trailColor,
      skinId: skin.id,
      selectedTrailId,
      upgrades,
    };
  }, [settings.vibration, skin, selectedTrailId, upgrades]);

  // ─── Game state ref ──────────────────────────────────────────────────────────
  const gRef = useRef<GState>({
    phase: 'playing', onFloor: true,
    playerY: P_ON_FLOOR, playerVelocity: 0,
    scaleX: 1, scaleY: 1,
    obstacles: [],
    speed: GAME.OBSTACLE_SPEED_INITIAL,
    speedFromScore: 0,
    nextObsTimer: 1.5, scoreTimer: 1,
    totalTime: 0, reviveUsed: false,
    flipCooldown: 0,
    powerupShieldActive: false, shieldHitsRemaining: 1,
    shieldInvulnTime: 0,
    powerupSlowmoTime: 0, powerupDoubleScoreTime: 0, powerupMagnetTime: 0,
    powerupPickups: [], coins: [], coinsCollected: 0,
    comboStreak: 0, comboDisplayTimer: 0,
    perfectFlipTimer: 0, perfectFlipCount: 0,
    flipCount: 0, maxCombo: 1,
    trail: [], bursts: [], flipRings: [], flipTrails: [],
    nearMissTimer: 0, nearMissCount: 0, deathSlowmo: 0,
    envIndex: 0, envFlashTimer: 0, survivalTime: 0,
    bgFar: [], bgMid: [], bgNear: [],
    popup: null, dangerFloor: 0, dangerCeil: 0,
    lastMilestone: 0, warnTimer: 0,
    reviveAdReady: true, revivePending: false,
    deathFlash: 0, deathExplosion: 0, deathShake: 0,
    deathSnapshot: null,
  });

  const scoreRef = useRef(0);
  const trailTimerRef = useRef(0);
  const rAFRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastRenderAtRef = useRef<number>(0);
  const isPausedRef = useRef(isPaused);
  const deadFiredRef = useRef(false);
  const loopActiveRef = useRef(false);
  const chunkSpawnerRef = useRef(new ChunkSpawner(Date.now()));

  // FIX ⑤: Canvas ref for particle rendering
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  // FIX ④: HUD-only tick — no longer drives particle/obstacle renders
  const [, dispatchHudTick] = useReducer(tickReducer, { hud: 0 });

  // FIX ⑧: Separate lightweight state for things that need React rendering
  // but update less often than rAF
  const [hudSnapshot, setHudSnapshot] = useState({
    coinsCollected: 0,
    canFlip: true,
    comboStreak: 0,
    comboDisplayTimer: 0,
    powerupShieldActive: false,
    powerupSlowmoTime: 0,
    powerupDoubleScoreTime: 0,
    powerupMagnetTime: 0,
    dangerFloor: 0,
    dangerCeil: 0,
    envIndex: 0,
    envFlashTimer: 0,
    speedNorm: 0,
    popup: null as Popup | null,
    obstacles: [] as Obstacle[],
    coins: [] as CoinPickup[],
    powerupPickups: [] as PowerupPickup[],
    onFloor: true,
    playerY: P_ON_FLOOR,
  });

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const envFlashAnim = useRef(new Animated.Value(0)).current;
  const flipPulseAnim = useRef(new Animated.Value(1)).current;
  const popupAnim = useRef(new Animated.Value(0)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.5)).current;
  const playerYAnim = useRef(new Animated.Value(P_ON_FLOOR)).current;
  const playerScaleXAnim = useRef(new Animated.Value(1)).current;
  const playerScaleYAnim = useRef(new Animated.Value(1)).current;

  // Init background nodes after layout
  useEffect(() => {
    const g = gRef.current;
    g.bgFar = makeBgNodes(18, CEIL_BOT, FLOOR_TOP, 0.18);
    g.bgMid = makeBgNodes(12, CEIL_BOT, FLOOR_TOP, 0.38);
    g.bgNear = makeBgNodes(7, CEIL_BOT, FLOOR_TOP, 0.62);
  }, []);

  useEffect(() => {
    gameAudio.setSettings({ music: settings.music, sfx: settings.sfx });
  }, [settings.music, settings.sfx]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused && gRef.current.phase === 'playing' && !loopActiveRef.current) {
      loopActiveRef.current = true;
      lastTimeRef.current = 0;
      rAFRef.current = requestAnimationFrame(gameLoop);
    }
    if (isPaused && rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
      loopActiveRef.current = false;
    }
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
      loopActiveRef.current = false;
    };
  }, [isPaused, gameLoop]);

  // ─── Revive ──────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    revive() {
      const g = gRef.current;
      const L = layoutRef.current;
      if (g.reviveUsed || !g.reviveAdReady || !g.deathSnapshot) return;
      g.phase = 'playing';
      g.reviveUsed = true;
      g.reviveAdReady = false;
      g.revivePending = false;
      g.powerupShieldActive = true;
      g.shieldHitsRemaining = Math.max(g.shieldHitsRemaining, 1);
      g.shieldInvulnTime = 1.0;
      g.playerY = g.deathSnapshot.playerY;
      g.onFloor = g.deathSnapshot.onFloor;
      const revivePlayerHitbox: Rect = {
        left: L.P_X + 4, right: L.P_X + L.P_SIZE - 4,
        top: g.playerY + 4, bottom: g.playerY + L.P_SIZE - 4,
      };
      g.obstacles = g.obstacles.filter((o) => {
        if (o.x >= g.deathSnapshot!.obstacleAnchorX - 30) return false;
        return !getHitboxes(o, L).some((hb) => rectsClose(revivePlayerHitbox, hb, 28));
      });
      g.deathSlowmo = 0;
      g.deathFlash = 0;
      g.deathExplosion = 0;
      g.deathShake = 0;
      deadFiredRef.current = false;
      isPausedRef.current = false;
      if (!loopActiveRef.current) {
        loopActiveRef.current = true;
        lastTimeRef.current = 0;
        rAFRef.current = requestAnimationFrame(gameLoop);
      }
    },
  }));

  function showPopup(g: GState, text: string, color: string, size: Popup['size'] = 'md') {
    g.popup = { text, color, timer: 1.1, size };
    // FIX ⑨: Schedule Animated calls via setTimeout(0) to keep them off the
    // hot rAF path — prevents Animated bridge calls from blocking the game loop tick
    setTimeout(() => {
      popupAnim.setValue(0);
      popupScaleAnim.setValue(0.4);
      Animated.parallel([
        Animated.spring(popupScaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
        Animated.timing(popupAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }, 0);
  }

  // FIX ⑤: Draw particles to canvas each frame — zero React reconciliation cost
  const drawParticlesOnCanvas = useCallback((g: GState, env: typeof ENVIRONMENTS[string]) => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SW, SH);

    // Draw flip trail streaks
    for (const ft of g.flipTrails) {
      const opacity = Math.max(0, ft.life * 0.85);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 5;
      const rx = ft.w / 2;
      const ry = ft.h / 2;
      ctx.beginPath();
      ctx.ellipse(ft.x, ft.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw trail particles
    for (const t of g.trail) {
      const opacity = Math.max(0, t.life * 0.75);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw flip rings
    ctx.globalAlpha = 1;
    for (const r of g.flipRings) {
      const opacity = Math.max(0, r.life * 0.6);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw burst particles
    for (const b of g.bursts) {
      const opacity = Math.max(0, b.life);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw background parallax nodes via canvas too (biggest BG savings)
    ctx.globalAlpha = 1;
    for (const n of g.bgFar) {
      ctx.globalAlpha = n.opacity * 0.5;
      ctx.fillStyle = env.nodeFarColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < g.bgMid.length; i++) {
      const n = g.bgMid[i];
      ctx.globalAlpha = n.opacity * 0.6;
      ctx.fillStyle = env.nodeMidColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, (n.size + 1) / 2, 0, Math.PI * 2);
      ctx.fill();
      // Connecting lines
      if (i < g.bgMid.length - 1) {
        const next = g.bgMid[i + 1];
        const dx = next.x - n.x;
        const dy = next.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 160) {
          ctx.globalAlpha = (1 - dist / 160) * 0.3;
          ctx.strokeStyle = env.nodeFarColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
  }, []);

  // FIX ⑤: Main game loop — empty dep array, reads everything through stable refs
  const gameLoop = useCallback((timestamp: number) => {
    if (isPausedRef.current) {
      loopActiveRef.current = false;
      return;
    }
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const rawDelta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.075);
    lastTimeRef.current = timestamp;
    const g = gRef.current;
    if (g.phase !== 'playing') {
      loopActiveRef.current = false;
      return;
    }

    const L = layoutRef.current;
    const S = loopSettingsRef.current;
    const {
      P_ON_FLOOR, P_ON_CEIL, P_X, P_SIZE,
      FLOOR_TOP, CEIL_BOT, MID_Y, PLAY_H,
    } = L;

    const inSlowmo = g.powerupSlowmoTime > 0 || g.deathSlowmo > 0;
    const slowFactor = inSlowmo ? (g.deathSlowmo > 0 ? 0.12 : 0.32) : 1;
    const dt = rawDelta * slowFactor;
    const speedNorm = Math.min((g.speed - GAME.OBSTACLE_SPEED_INITIAL) / (GAME.OBSTACLE_SPEED_MAX - GAME.OBSTACLE_SPEED_INITIAL), 1);

    // ── Player physics ─────────────────────────────────────────────────────────
    const target = g.onFloor ? P_ON_FLOOR : P_ON_CEIL;
    const disp = g.playerY - target;
    const force = -GAME.SPRING_K * disp - GAME.SPRING_D * g.playerVelocity;
    g.playerVelocity += force * dt;
    g.playerY += g.playerVelocity * dt;
    g.playerY = Math.max(P_ON_CEIL - 1, Math.min(P_ON_FLOOR + 1, g.playerY));

    // Squish/stretch
    const absVel = Math.abs(g.playerVelocity);
    if (absVel > 150) {
      g.scaleX = 1 + Math.min(absVel / 2200, 0.3);
      g.scaleY = Math.max(1 - absVel / 3200, 0.68);
    } else {
      g.scaleX += (1 - g.scaleX) * 0.25;
      g.scaleY += (1 - g.scaleY) * 0.25;
    }

    // Flip cooldown
    if (g.flipCooldown > 0) g.flipCooldown -= rawDelta;

    // Danger proximity
    const distToFloor = (P_ON_FLOOR + P_SIZE) - (g.playerY + P_SIZE);
    const distToCeil = g.playerY - P_ON_CEIL;
    g.dangerFloor = Math.max(0, 1 - distToFloor / DANGER_DIST);
    g.dangerCeil = Math.max(0, 1 - distToCeil / DANGER_DIST);

    // ── Trail particles ────────────────────────────────────────────────────────
    trailTimerRef.current += dt;
    if (trailTimerRef.current >= TRAIL_INTERVAL) {
      trailTimerRef.current = 0;
      g.trail.push({
        id: mkId(),
        x: P_X + P_SIZE / 2,
        y: g.playerY + P_SIZE / 2,
        life: 1, size: P_SIZE * 0.52,
        color: S.skinTrailColor,
      });
    }
    for (const t of g.trail) t.life -= rawDelta / 0.32;
    g.trail = g.trail.filter(t => t.life > 0);

    // ── Flip rings ─────────────────────────────────────────────────────────────
    for (const r of g.flipRings) {
      r.radius += (r.maxRadius - r.radius) * rawDelta * 6;
      r.life -= rawDelta / 0.45;
    }
    g.flipRings = g.flipRings.filter(r => r.life > 0);

    // ── Flip trail streaks ─────────────────────────────────────────────────────
    for (const ft of g.flipTrails) {
      ft.x -= g.speed * dt;
      ft.life -= rawDelta / 0.38;
    }
    g.flipTrails = g.flipTrails.filter(ft => ft.life > 0);

    // ── Background parallax ────────────────────────────────────────────────────
    // FIX ⑤: bg nodes are now drawn on canvas, still update positions here
    const updateBgLayer = (nodes: BgNode[]) => {
      for (const n of nodes) {
        n.x -= g.speed * n.speed * dt;
        if (n.x < -n.size * 2) {
          n.x = SW + n.size + Math.random() * 80;
          n.y = CEIL_BOT + Math.random() * PLAY_H;
        }
      }
    };
    updateBgLayer(g.bgFar);
    updateBgLayer(g.bgMid);
    updateBgLayer(g.bgNear);

    // ── Move obstacles ─────────────────────────────────────────────────────────
    for (const obs of g.obstacles) {
      obs.x -= g.speed * dt;
      if (obs.type === 'moving_spike') {
        obs.moveY = (obs.moveY ?? 0) + (obs.moveVelocity ?? 80) * dt;
        const maxY = PLAY_H / 2 - MOVE_HH - 10;
        if (Math.abs(obs.moveY) > maxY) {
          obs.moveVelocity = -(obs.moveVelocity ?? 80);
          obs.moveY = Math.sign(obs.moveY) * maxY;
        }
      }
      if (obs.type === 'rotating_blade') {
        obs.rotation = ((obs.rotation ?? 0) + 190 * dt) % 360;
      }
      if (obs.type === 'laser_gate') {
        obs.laserTimer = (obs.laserTimer ?? 0) - dt;
        if (obs.laserTimer <= 0) {
          obs.laserOn = !obs.laserOn;
          obs.laserTimer = obs.laserOn ? (obs.laserCycleOn ?? 0.55) : (obs.laserCycleOff ?? 0.75);
        }
      }
    }
    g.obstacles = g.obstacles.filter(o => o.x + o.width + 60 > 0);

    // ── Move coins and powerups ────────────────────────────────────────────────
    for (const c of g.coins) c.x -= g.speed * dt;
    g.coins = g.coins.filter(c => c.x + 24 > 0);
    for (const p of g.powerupPickups) p.x -= g.speed * dt;
    g.powerupPickups = g.powerupPickups.filter(p => p.x + 32 > 0);

    // ── Magnet attraction ──────────────────────────────────────────────────────
    if (g.powerupMagnetTime > 0) {
      const px = P_X + P_SIZE / 2;
      const py = g.playerY + P_SIZE / 2;
      const effectiveMagnetRange = MAGNET_RANGE + S.upgrades.magnet_radius * 55;
      for (const coin of g.coins) {
        const dx = px - coin.x;
        const dy = py - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < effectiveMagnetRange && dist > 4) {
          coin.x += (dx / dist) * MAGNET_SPEED * dt;
          coin.y += (dy / dist) * MAGNET_SPEED * dt;
        }
      }
    }

    // ── Spawn obstacles ────────────────────────────────────────────────────────
    const spawnEvents = chunkSpawnerRef.current.spawn({ elapsedSec: g.totalTime });
    for (const event of spawnEvents) {
      const obs = spawnObstacleFromChunk(event.obstacle.type, g.totalTime, g.speed, event.obstacle, L);
      g.obstacles.push(obs);
      if (Math.random() < GAME.COIN_SPAWN_CHANCE) spawnCoins(obs, g, L);
      if (Math.random() < GAME.POWERUP_SPAWN_CHANCE) spawnPowerup(g, L);
    }

    // ── Score ──────────────────────────────────────────────────────────────────
    const scoreTickInterval = Math.max(0.25, 1 - speedNorm * 0.65);
    g.scoreTimer -= rawDelta;
    if (g.scoreTimer <= 0) {
      g.scoreTimer += scoreTickInterval;
      const comboMult = getComboMultiplier(g.comboStreak);
      const doubleMult = g.powerupDoubleScoreTime > 0 ? 2 : 1;
      const upgradeBonus = S.upgrades.score_multiplier;
      const gained = comboMult * doubleMult + upgradeBonus;
      scoreRef.current += gained;
      g.speedFromScore = Math.min(g.speedFromScore + (gained * GAME.SPEED_GAIN_PER_POINT), GAME.OBSTACLE_SPEED_MAX - GAME.OBSTACLE_SPEED_INITIAL);
      setScore(scoreRef.current);
      onScoreChange?.(scoreRef.current);

      const nextMilestone = SCORE_MILESTONES.find(m => m > g.lastMilestone && scoreRef.current >= m);
      if (nextMilestone) {
        g.lastMilestone = nextMilestone;
        showPopup(g, `${nextMilestone} PTS`, COLORS.neonYellow, 'lg');
        if (S.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // ── Difficulty ─────────────────────────────────────────────────────────────
    g.totalTime += rawDelta;
    g.survivalTime += rawDelta;
    gameAudio.updateMusicIntensity(g.survivalTime);
    {
      const t = g.totalTime;
      let newSpeed: number;
      if (t < 20) {
        newSpeed = GAME.OBSTACLE_SPEED_INITIAL + 18 + t * 2.3;
      } else if (t < 60) {
        newSpeed = GAME.OBSTACLE_SPEED_INITIAL + 64 + (t - 20) * 3.1;
      } else {
        newSpeed = (GAME.OBSTACLE_SPEED_INITIAL + 150) + Math.pow(t - 60, 1.45) * 1.5;
      }
      g.speed = Math.min(newSpeed + g.speedFromScore, GAME.OBSTACLE_SPEED_MAX);
    }

    // ── Environment cycling ────────────────────────────────────────────────────
    const newEnvIndex = Math.floor(g.totalTime / GAME.ENV_CHANGE_INTERVAL) % ENV_ORDER.length;
    if (newEnvIndex !== g.envIndex) {
      g.envIndex = newEnvIndex;
      g.envFlashTimer = 0.45;
      // FIX ⑨: Animated calls deferred off hot path
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(envFlashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(envFlashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start();
      }, 0);
    }
    if (g.envFlashTimer > 0) g.envFlashTimer -= rawDelta;

    // ── Power-up timers ────────────────────────────────────────────────────────
    if (g.powerupSlowmoTime > 0) g.powerupSlowmoTime -= rawDelta;
    if (g.powerupDoubleScoreTime > 0) g.powerupDoubleScoreTime -= rawDelta;
    if (g.powerupMagnetTime > 0) g.powerupMagnetTime -= rawDelta;
    if (g.shieldInvulnTime > 0) g.shieldInvulnTime -= rawDelta;

    // ── Perfect flip timer ─────────────────────────────────────────────────────
    if (g.perfectFlipTimer > 0) {
      g.perfectFlipTimer -= rawDelta;
      if (g.perfectFlipTimer <= 0 && g.phase === 'playing') {
        g.perfectFlipCount += 1;
        g.comboStreak += 1;
        g.maxCombo = Math.max(g.maxCombo, getComboMultiplier(g.comboStreak));
        g.comboDisplayTimer = 2.0;
        scoreRef.current += 5;
        const label = getComboLabel(g.comboStreak);
        if (label) {
          showPopup(g, `PERFECT ${label} +5`, COLORS.neonCyan, 'md');
        } else {
          showPopup(g, 'PERFECT FLIP +5', COLORS.neonCyan, 'sm');
        }
      }
    }

    // ── Combo display timer ────────────────────────────────────────────────────
    if (g.comboDisplayTimer > 0) g.comboDisplayTimer -= rawDelta;

    // ── Popup timer ────────────────────────────────────────────────────────────
    if (g.popup) {
      g.popup.timer -= rawDelta;
      if (g.popup.timer <= 0) g.popup = null;
    }

    // ── Burst particles ────────────────────────────────────────────────────────
    for (const b of g.bursts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 180 * dt;
      b.life -= rawDelta / b.maxLife;
    }
    g.bursts = g.bursts.filter(b => b.life > 0);

    // ── Collision detection ────────────────────────────────────────────────────
    const pH: Rect = {
      left: P_X + 4, right: P_X + P_SIZE - 4,
      top: g.playerY + 4, bottom: g.playerY + P_SIZE - 4,
    };

    let died = false;
    let nearMiss = false;
    for (const obs of g.obstacles) {
      const hitboxes = getHitboxes(obs, L);
      for (const hb of hitboxes) {
        if (rectsOverlap(pH, hb)) {
          if (g.powerupShieldActive && g.shieldInvulnTime <= 0) {
            g.shieldHitsRemaining -= 1;
            if (g.shieldHitsRemaining <= 0) g.powerupShieldActive = false;
            g.shieldInvulnTime = 0.28;
            spawnBurst(g, P_X + P_SIZE / 2, g.playerY + P_SIZE / 2, COLORS.neonCyan, 10);
            const hitsLeft = g.shieldHitsRemaining;
            showPopup(g, hitsLeft > 0 ? `SHIELD BLOCK (${hitsLeft})` : 'SHIELD BREAK', COLORS.neonCyan, 'sm');
            if (S.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else if (g.powerupShieldActive && g.shieldInvulnTime > 0) {
            // ignore
          } else {
            died = true;
          }
          break;
        }
        if (rectsClose(pH, hb, GAME.NEAR_MISS_THRESHOLD) && !nearMiss) {
          nearMiss = true;
          if (g.nearMissTimer <= 0) {
            g.nearMissCount += 1;
            scoreRef.current += 2;
            showPopup(g, 'NEAR MISS! +2', COLORS.neonOrange, 'sm');
            if (S.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            gameAudio.playSfx('nearMiss');
          }
        }
      }
      if (died) break;
    }

    g.nearMissTimer = nearMiss ? 0.35 : Math.max(0, g.nearMissTimer - rawDelta);

    // ── Coin collection ────────────────────────────────────────────────────────
    const env = ENVIRONMENTS[ENV_ORDER[g.envIndex]];
    for (const coin of g.coins) {
      if (coin.collected) continue;
      const coinRect: Rect = {
        left: coin.x - GAME.COIN_COLLECT_RADIUS, right: coin.x + GAME.COIN_COLLECT_RADIUS,
        top: coin.y - GAME.COIN_COLLECT_RADIUS, bottom: coin.y + GAME.COIN_COLLECT_RADIUS,
      };
      if (rectsOverlap(pH, coinRect)) {
        coin.collected = true;
        const coinValue = coin.rare ? 5 : coin.highValue ? 3 : 1;
        g.coinsCollected += coinValue;
        const burstColor = coin.rare ? '#FFE600' : coin.highValue ? '#FF9900' : env.coinColor;
        spawnBurst(g, coin.x, coin.y, burstColor, coin.rare ? 12 : coin.highValue ? 7 : 5);
        if (coin.rare) showPopup(g, 'RARE COIN +5', '#FFE600', 'sm');
        else if (coin.highValue) showPopup(g, '+3', '#FF9900', 'sm');
        if (S.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        gameAudio.playSfx('pickup');
      }
    }
    g.coins = g.coins.filter(c => !c.collected);

    // ── Power-up collection ────────────────────────────────────────────────────
    for (const pu of g.powerupPickups) {
      if (pu.collected) continue;
      const puRect: Rect = {
        left: pu.x - GAME.POWERUP_COLLECT_RADIUS, right: pu.x + GAME.POWERUP_COLLECT_RADIUS,
        top: pu.y - GAME.POWERUP_COLLECT_RADIUS, bottom: pu.y + GAME.POWERUP_COLLECT_RADIUS,
      };
      if (rectsOverlap(pH, puRect)) {
        pu.collected = true;
        activatePowerup(pu.type, g, S);
        spawnBurst(g, pu.x, pu.y, POWERUPS[pu.type].color, 10);
        showPopup(g, POWERUPS[pu.type].label, POWERUPS[pu.type].color, 'md');
        if (S.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameAudio.playSfx('pickup');
      }
    }
    g.powerupPickups = g.powerupPickups.filter(p => !p.collected);

    // ── Death ──────────────────────────────────────────────────────────────────
    if (g.deathSlowmo > 0) g.deathSlowmo -= rawDelta;
    if (g.deathFlash > 0) g.deathFlash -= rawDelta * 2.4;
    if (g.deathExplosion > 0) g.deathExplosion -= rawDelta * 1.7;
    if (g.deathShake > 0) g.deathShake -= rawDelta * 1.9;

    if (died && !deadFiredRef.current) {
      deadFiredRef.current = true;
      g.phase = 'dead';
      g.comboStreak = 0;
      g.deathSlowmo = 0.6;
      g.deathFlash = 1;
      g.deathExplosion = 1;
      g.deathShake = 1;
      g.revivePending = g.reviveAdReady && !g.reviveUsed;
      g.deathSnapshot = {
        playerY: g.playerY,
        onFloor: g.onFloor,
        obstacleAnchorX: P_X + P_SIZE,
      };
      if (S.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      gameAudio.playSfx('death');
      spawnBurst(g, P_X + P_SIZE / 2, g.playerY + P_SIZE / 2, S.skinColor, 24);
      // FIX ⑨: Animated calls off hot path
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 12, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -12, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]).start();
      }, 0);

      const finalScore = scoreRef.current;
      const finalCoins = g.coinsCollected;
      const survival = g.survivalTime;
      const flips = g.flipCount;
      const perfects = g.perfectFlipCount;
      const maxCombo = g.maxCombo;

      setTimeout(() => {
        submitScore(finalScore);
        addCoins(finalCoins);
        updateChallengeProgress('collect_coins', finalCoins);
        updateChallengeProgress('flip_gravity', flips);
        updateChallengeProgress('survive_seconds', Math.floor(survival));
        updateChallengeProgress('reach_score', finalScore);
        updateChallengeProgress('perfect_flips', perfects);
        updateChallengeProgress('max_combo', maxCombo);
        recordRunStats({
          flips: g.flipCount,
          survivalSeconds: Math.floor(g.survivalTime),
          coinsEarned: finalCoins,
          perfectFlips: g.perfectFlipCount,
          nearMisses: g.nearMissCount,
          score: finalScore,
        });
        onDeath(finalScore, finalCoins, !g.reviveUsed);
      }, 850);
    }

    // FIX ②: Drive Animated values from JS — still needed for RN Animated API
    playerYAnim.setValue(g.playerY);
    playerScaleXAnim.setValue(g.scaleX);
    playerScaleYAnim.setValue(g.scaleY);

    // FIX ⑤: Draw all particles on canvas every rAF — zero React cost
    drawParticlesOnCanvas(g, env);

    // FIX ④ & ⑧: Throttled HUD update — React tree only re-renders at 150ms intervals
    // This dramatically reduces reconciliation work for obstacles, coins, powerup pickups
    if (timestamp - lastRenderAtRef.current >= HUD_UPDATE_INTERVAL_MS) {
      lastRenderAtRef.current = timestamp;
      // Snapshot the values React needs — shallow copy of arrays for referential stability
      setHudSnapshot({
        coinsCollected: g.coinsCollected,
        canFlip: g.flipCooldown <= 0,
        comboStreak: g.comboStreak,
        comboDisplayTimer: g.comboDisplayTimer,
        powerupShieldActive: g.powerupShieldActive,
        powerupSlowmoTime: g.powerupSlowmoTime,
        powerupDoubleScoreTime: g.powerupDoubleScoreTime,
        powerupMagnetTime: g.powerupMagnetTime,
        dangerFloor: g.dangerFloor,
        dangerCeil: g.dangerCeil,
        envIndex: g.envIndex,
        envFlashTimer: g.envFlashTimer,
        speedNorm: Math.min((g.speed - GAME.OBSTACLE_SPEED_INITIAL) / (GAME.OBSTACLE_SPEED_MAX - GAME.OBSTACLE_SPEED_INITIAL), 1),
        popup: g.popup,
        obstacles: g.obstacles,
        coins: g.coins,
        powerupPickups: g.powerupPickups,
        onFloor: g.onFloor,
        playerY: g.playerY,
      });
      dispatchHudTick();
    }

    rAFRef.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helper functions ────────────────────────────────────────────────────────

  function getComboMultiplier(streak: number): number {
    if (streak >= 8) return 10;
    if (streak >= 5) return 5;
    if (streak >= 3) return 3;
    if (streak >= 1) return 2;
    return 1;
  }

  function getComboLabel(streak: number): string {
    if (streak >= 8) return 'x10';
    if (streak >= 5) return 'x5';
    if (streak >= 3) return 'x3';
    if (streak >= 1) return 'x2';
    return '';
  }

  function activatePowerup(type: PowerupType, g: GState, S: LoopSettings) {
    if (type === 'shield') {
      g.powerupShieldActive = true;
      g.shieldHitsRemaining = 1 + S.upgrades.shield_strength;
    }
    else if (type === 'slowmo') g.powerupSlowmoTime = POWERUPS.slowmo.duration;
    else if (type === 'double_score') g.powerupDoubleScoreTime = Math.max(g.powerupDoubleScoreTime, POWERUPS.double_score.duration);
    else if (type === 'magnet') g.powerupMagnetTime = Math.max(g.powerupMagnetTime, MAGNET_PULL_DURATION);
  }

  function spawnBurst(g: GState, x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 55 + Math.random() * 130;
      g.bursts.push({
        id: mkId(), x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30,
        life: 1, maxLife: 0.4 + Math.random() * 0.35,
        color, size: 2 + Math.random() * 4,
      });
    }
  }

  function spawnCoins(obs: Obstacle, g: GState, L: LayoutConstants) {
    const { MID_Y, PLAY_H } = L;
    const count = 2 + Math.floor(Math.random() * 3);
    const baseX = obs.x + obs.width + 50 + Math.random() * 40;
    const isString = Math.random() < 0.4;
    const safeSpread = PLAY_H * 0.25;
    const centerY = MID_Y;
    const stringY = centerY + (Math.random() - 0.5) * safeSpread;
    for (let i = 0; i < count; i++) {
      const y = isString
        ? stringY
        : centerY + (Math.random() - 0.5) * safeSpread;
      const roll = Math.random();
      const rare = roll < 0.12;
      const highValue = !rare && roll < 0.27;
      g.coins.push({ id: mkId(), x: baseX + i * 34, y, collected: false, rare, highValue });
    }
  }

  function spawnPowerup(g: GState, L: LayoutConstants) {
    const { MID_Y, PLAY_H } = L;
    const types: PowerupType[] = ['shield', 'slowmo', 'double_score', 'magnet'];
    const weights = [0.30, 0.25, 0.25, 0.20];
    let r = Math.random();
    let type: PowerupType = 'shield';
    for (let i = 0; i < types.length; i++) { r -= weights[i]; if (r <= 0) { type = types[i]; break; } }
    g.powerupPickups.push({
      id: mkId(), type,
      x: SW + 60 + Math.random() * 80,
      y: MID_Y + (Math.random() - 0.5) * PLAY_H * 0.45,
      collected: false,
    });
  }

  function getHitboxes(obs: Obstacle, L: LayoutConstants): Rect[] {
    const { FLOOR_TOP, CEIL_BOT, MID_Y, PLAY_H, P_SIZE } = L;
    switch (obs.type) {
      case 'floor_spike': case 'floor_spikes':
        return [{ left: obs.x + 3, right: obs.x + obs.width - 3, top: FLOOR_TOP - SPIKE_H + 7, bottom: FLOOR_TOP }];
      case 'ceiling_spike': case 'ceiling_spikes':
        return [{ left: obs.x + 3, right: obs.x + obs.width - 3, top: CEIL_BOT, bottom: CEIL_BOT + SPIKE_H - 7 }];
      case 'moving_spike': {
        const cy = MID_Y + (obs.moveY ?? 0);
        return [{ left: obs.x - MOVE_HW + 2, right: obs.x + MOVE_HW - 2, top: cy - MOVE_HH, bottom: cy + MOVE_HH }];
      }
      case 'rotating_blade':
        return [{ left: obs.x - BLADE_R + 5, right: obs.x + BLADE_R - 5, top: MID_Y - BLADE_R + 5, bottom: MID_Y + BLADE_R - 5 }];
      case 'laser_gate':
        if (!obs.laserOn) return [];
        if (obs.laserFromFloor) {
          return [{ left: obs.x - 3, right: obs.x + 3, top: FLOOR_TOP - PLAY_H * 0.52, bottom: FLOOR_TOP }];
        }
        return [{ left: obs.x - 3, right: obs.x + 3, top: CEIL_BOT, bottom: CEIL_BOT + PLAY_H * 0.52 }];
      case 'spike_wall': {
        const GAP = P_SIZE + 18;
        if (obs.gapAtFloor) {
          return [{ left: obs.x, right: obs.x + obs.width, top: CEIL_BOT, bottom: FLOOR_TOP - GAP }];
        }
        return [{ left: obs.x, right: obs.x + obs.width, top: CEIL_BOT + GAP, bottom: FLOOR_TOP }];
      }
      default:
        return [];
    }
  }

  function spawnObstacleFromChunk(type: ObstacleType, totalTime: number, speed: number, spec: Partial<Obstacle> | undefined, L: LayoutConstants): Obstacle {
    const obs = spawnObstacle(totalTime, speed, L, type);
    if (spec?.spikeCount) obs.spikeCount = spec.spikeCount;
    if (spec?.laserCycleOn) obs.laserCycleOn = spec.laserCycleOn;
    if (spec?.laserCycleOff) obs.laserCycleOff = spec.laserCycleOff;
    if (spec?.moveVelocity) obs.moveVelocity = spec.moveVelocity;
    return obs;
  }

  function spawnObstacle(totalTime: number, speed: number, L: LayoutConstants, forcedType?: ObstacleType): Obstacle {
    const id = mkId(); const x = SW + 28;
    if (totalTime < 8) {
      return { id, type: Math.random() < 0.5 ? 'floor_spike' : 'ceiling_spike', x, width: SPIKE_W * 2 };
    }
    if (totalTime < 20) {
      if (forcedType) {
        if (forcedType === 'floor_spike') return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'ceiling_spike') return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'floor_spikes') return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'ceiling_spikes') return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'moving_spike') return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 90 + Math.random() * 50 };
        if (forcedType === 'rotating_blade') return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
        if (forcedType === 'laser_gate') return { id, type: 'laser_gate', x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
        if (forcedType === 'spike_wall') return { id, type: 'spike_wall', x, width: 12, gapAtFloor: Math.random() < 0.5 };
      }
      const r = Math.random();
      if (r < 0.35) return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
      if (r < 0.7) return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
      return { id, type: 'floor_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
    }
    if (totalTime < 35) {
      if (forcedType) {
        if (forcedType === 'floor_spike') return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'ceiling_spike') return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'floor_spikes') return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'ceiling_spikes') return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'moving_spike') return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 90 + Math.random() * 50 };
        if (forcedType === 'rotating_blade') return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
        if (forcedType === 'laser_gate') return { id, type: 'laser_gate', x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
        if (forcedType === 'spike_wall') return { id, type: 'spike_wall', x, width: 12, gapAtFloor: Math.random() < 0.5 };
      }
      const r = Math.random();
      if (r < 0.18) return { id, type: 'floor_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
      if (r < 0.36) return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
      if (r < 0.54) return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
      if (r < 0.72) return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
      return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 55 + Math.random() * 40 };
    }
    if (totalTime < 55) {
      if (forcedType) {
        if (forcedType === 'floor_spike') return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'ceiling_spike') return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
        if (forcedType === 'floor_spikes') return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'ceiling_spikes') return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
        if (forcedType === 'moving_spike') return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 90 + Math.random() * 50 };
        if (forcedType === 'rotating_blade') return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
        if (forcedType === 'laser_gate') return { id, type: 'laser_gate', x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
        if (forcedType === 'spike_wall') return { id, type: 'spike_wall', x, width: 12, gapAtFloor: Math.random() < 0.5 };
      }
      const r = Math.random();
      if (r < 0.2) return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (r < 0.4) return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (r < 0.58) return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 75 + Math.random() * 45 };
      if (r < 0.76) return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
      return { id, type: Math.random() < 0.5 ? 'floor_spikes' : 'ceiling_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
    }
    if (forcedType) {
      if (forcedType === 'floor_spike') return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
      if (forcedType === 'ceiling_spike') return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
      if (forcedType === 'floor_spikes') return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (forcedType === 'ceiling_spikes') return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (forcedType === 'moving_spike') return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 90 + Math.random() * 50 };
      if (forcedType === 'rotating_blade') return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
      if (forcedType === 'laser_gate') return { id, type: 'laser_gate', x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
      if (forcedType === 'spike_wall') return { id, type: 'spike_wall', x, width: 12, gapAtFloor: Math.random() < 0.5 };
    }
    const r = Math.random();
    if (r < 0.12) return { id, type: 'spike_wall' as const, x, width: 10, gapAtFloor: Math.random() < 0.5 };
    if (r < 0.24) return { id, type: 'laser_gate' as const, x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
    if (r < 0.40) return { id, type: 'rotating_blade' as const, x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
    if (r < 0.56) return { id, type: 'moving_spike' as const, x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 95 + Math.random() * 55 };
    if (r < 0.76) return { id, type: 'floor_spikes' as const, x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
    return { id, type: 'ceiling_spikes' as const, x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
  }

  // ─── Tap handler ─────────────────────────────────────────────────────────────

  function handleTap() {
    const g = gRef.current;
    const L = layoutRef.current;
    const S = loopSettingsRef.current;
    if (g.phase !== 'playing') {
      loopActiveRef.current = false;
      return;
    }
    if (g.flipCooldown > 0) return;

    gameAudio.playSfx('flip');
    g.onFloor = !g.onFloor;
    g.flipCount += 1;
    const effectiveCooldown = [0.32, 0.26, 0.20, 0.14][S.upgrades.flip_speed] ?? 0.32;
    g.flipCooldown = effectiveCooldown;
    g.scaleY = 0.55;
    g.scaleX = 1.45;

    g.flipRings.push({
      id: mkId(),
      x: L.P_X + L.P_SIZE / 2,
      y: g.playerY + L.P_SIZE / 2,
      radius: L.P_SIZE * 0.4,
      maxRadius: L.P_SIZE * 2.5,
      life: 1,
      color: S.skinColor,
    });

    const trailDef = TRAILS.find(t => t.id === S.selectedTrailId) || TRAILS[0];
    for (let i = 0; i < 14; i++) {
      const color = trailDef.colors[i % trailDef.colors.length];
      g.flipTrails.push({
        id: mkId(),
        x: L.P_X - 4 - i * 10,
        y: g.playerY + L.P_SIZE * 0.5 + (Math.random() - 0.5) * L.P_SIZE * 0.9,
        w: 10 + Math.random() * 22,
        h: 2.5 + Math.random() * 4.5,
        life: 1.0 - i * 0.03,
        color,
      });
    }

    const nearObs = g.obstacles.find(o => o.x > L.P_X + 30 && o.x < L.P_X + 180);
    if (nearObs) {
      g.perfectFlipTimer = GAME.PERFECT_FLIP_WINDOW;
    }

    if (S.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // FIX ⑨: Animated calls off hot path
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(flipPulseAnim, { toValue: 1.12, duration: 70, useNativeDriver: true }),
        Animated.timing(flipPulseAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      ]).start();
    }, 0);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  // FIX ⑧: Read from hudSnapshot for all React-rendered state, not gRef directly
  const {
    canFlip,
    comboStreak,
    comboDisplayTimer,
    powerupShieldActive,
    powerupSlowmoTime,
    powerupDoubleScoreTime,
    powerupMagnetTime,
    dangerFloor,
    dangerCeil,
    envIndex,
    envFlashTimer,
    speedNorm,
    popup,
    obstacles,
    coins,
    powerupPickups,
    onFloor,
    playerY: snapPlayerY,
    coinsCollected,
  } = hudSnapshot;

  const env = ENVIRONMENTS[ENV_ORDER[envIndex]];
  const comboMult = getComboMultiplier(comboStreak);
  const comboLabel = getComboLabel(comboStreak);
  const speedLineOpacityScale = (speedNorm - SPEED_LINE_THRESHOLD) / (1 - SPEED_LINE_THRESHOLD);

  // FIX ③: Stable memoised styles — only recompute when env/speedNorm actually changes
  const speedOverlayStyle = useMemo(() => [styles.absoluteFill, { backgroundColor: env.obstacleColor, opacity: speedNorm * 0.06 }], [env.obstacleColor, speedNorm]);
  const magnetAuraStyle = useMemo(() => [styles.absoluteFill, { backgroundColor: POWERUPS.magnet.color, opacity: 0.03 }], []);

  // FIX ④: activePowerups derived from hudSnapshot, not gRef — stable 150ms update cadence
  const activePowerups = useMemo(() => {
    const list: { type: PowerupType; timeLeft?: number }[] = [];
    if (powerupShieldActive) list.push({ type: 'shield' });
    if (powerupSlowmoTime > 0) list.push({ type: 'slowmo', timeLeft: powerupSlowmoTime });
    if (powerupDoubleScoreTime > 0) list.push({ type: 'double_score', timeLeft: powerupDoubleScoreTime });
    if (powerupMagnetTime > 0) list.push({ type: 'magnet', timeLeft: powerupMagnetTime });
    return list;
  }, [powerupShieldActive, powerupSlowmoTime, powerupDoubleScoreTime, powerupMagnetTime]);

  const warnObs = obstacles.find(o => o.x > P_X && o.x < P_X + 260);

  // FIX ②: Pre-compute wall dot opacities outside render — fastSin is cheap but
  // doing it inline per-render still creates temporary arrays each frame
  const g = gRef.current;
  const wallDotOpacities = useMemo(() =>
    WALL_DOT_FRACTIONS.map((_, i) => 0.4 + fastSin(g.totalTime * 2 + i) * 0.2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(g.totalTime * 2)] // only recompute each ~0.5s
  );

  return (
    <Animated.View style={[styles.container, { backgroundColor: env.bgTop, transform: [{ translateX: shakeAnim }] }]}>
      <TouchableOpacity style={styles.absoluteFill} onPress={handleTap} activeOpacity={1} />

      {/* Environment transition flash */}
      <Animated.View
        style={[styles.absoluteFill, { backgroundColor: env.accentColor, opacity: envFlashAnim }]}
        pointerEvents="none"
      />

      {/* Speed overlay */}
      {speedNorm > 0.1 && (
        <View style={speedOverlayStyle} pointerEvents="none" />
      )}

      {/* Magnet aura */}
      {powerupMagnetTime > 0 && (
        <View style={magnetAuraStyle} pointerEvents="none" />
      )}

      {/* FIX ⑤: Canvas layer handles all particles + bg nodes — replaces 30-150 Views */}
      <CanvasParticleLayer canvasRef={particleCanvasRef} width={SW} height={SH} />

      {/* Horizontal grid lines — FIX: static, never re-renders */}
      <View style={styles.absoluteFill} pointerEvents="none">
        {GRID_LINE_FRACTIONS.map(f => (
          <View key={f} style={{ position: 'absolute', left: 0, right: 0, top: CEIL_BOT + PLAY_H * f, height: 1, backgroundColor: env.gridColor }} />
        ))}
      </View>

      {/* Speed lines */}
      {speedNorm > SPEED_LINE_THRESHOLD && (
        <View style={styles.absoluteFill} pointerEvents="none">
          {SPEED_LINE_FRACTIONS.map((f, i) => (
            <View key={`speed-line-${f}`} style={{
              position: 'absolute',
              left: 0, right: 0,
              top: CEIL_BOT + PLAY_H * f,
              height: 1,
              backgroundColor: env.accentColor,
              opacity: speedLineOpacityScale * SPEED_LINE_OPACITY_FACTORS[i],
            }} />
          ))}
        </View>
      )}

      {/* Ceiling wall */}
      <View style={[styles.wall, { top: HEADER_H, height: WALL_T, backgroundColor: env.wallColor }]}>
        <View style={[styles.wallGlowLine, { borderBottomColor: env.wallGlow, opacity: 0.8 }]} />
        {WALL_DOT_FRACTIONS.map((f, i) => (
          <View key={`ceil-dot-${f}`} style={[styles.wallDot, { left: SW * f, backgroundColor: env.wallGlow, opacity: wallDotOpacities[i] }]} />
        ))}
      </View>

      {/* Floor wall */}
      <View style={[styles.wall, { top: FLOOR_TOP, height: WALL_T, backgroundColor: env.wallColor }]}>
        <View style={[styles.wallGlowLineTop, { borderTopColor: env.wallGlow, opacity: 0.8 }]} />
        {WALL_DOT_FRACTIONS.map((f, i) => (
          <View key={`floor-dot-${f}`} style={[styles.wallDot, { left: SW * f, top: 10, backgroundColor: env.wallGlow, opacity: wallDotOpacities[i] }]} />
        ))}
      </View>

      {/* Danger glow on walls */}
      {dangerCeil > 0.1 && (
        <View style={[styles.dangerGlow, { top: HEADER_H, height: WALL_T + 8, opacity: dangerCeil * 0.45, backgroundColor: COLORS.neonPink }]} pointerEvents="none" />
      )}
      {dangerFloor > 0.1 && (
        <View style={[styles.dangerGlow, { top: FLOOR_TOP - 8, height: WALL_T + 8, opacity: dangerFloor * 0.45, backgroundColor: COLORS.neonPink }]} pointerEvents="none" />
      )}

      {/* Obstacle warning indicator */}
      {warnObs && warnObs.x < P_X + 160 && (
        <View style={[styles.warnLine, {
          top: warnObs.type === 'floor_spike' || warnObs.type === 'floor_spikes'
            ? FLOOR_TOP - SPIKE_H - 4
            : warnObs.type === 'ceiling_spike' || warnObs.type === 'ceiling_spikes'
            ? CEIL_BOT + SPIKE_H + 4
            : MID_Y - 2,
          left: warnObs.x - 8,
          opacity: (1 - (warnObs.x - P_X) / 160) * 0.7,
          backgroundColor: env.obstacleColor,
        }]} pointerEvents="none" />
      )}

      {/* Obstacles — memo'd, re-render only on HUD tick (150ms) not every rAF */}
      {obstacles.map(obs => (
        <ObstacleComp key={obs.id} obs={obs} ceilBot={CEIL_BOT} floorTop={FLOOR_TOP} midY={MID_Y} color={env.obstacleColor} />
      ))}

      {/* Coins */}
      {coins.map(coin => {
        const R = coin.rare ? GAME.COIN_VISUAL_RADIUS * 1.7 : coin.highValue ? GAME.COIN_VISUAL_RADIUS * 1.35 : GAME.COIN_VISUAL_RADIUS * 1.1;
        return (
          <View key={coin.id} pointerEvents="none" style={{
            position: 'absolute',
            left: coin.x - R, top: coin.y - R,
            width: R * 2, height: R * 2,
          }}>
            {coin.rare
              ? <CoinLegendarySvg size={R * 2} />
              : coin.highValue
              ? <CoinRareSvg size={R * 2} />
              : <CoinStandardSvg size={R * 2} />}
          </View>
        );
      })}

      {/* Power-up pickups */}
      {powerupPickups.map(pu => (
        <PowerupPickupComp key={pu.id} pu={pu} />
      ))}

      {/* Shield orb — reads snapPlayerY (150ms update is fine for shield visual) */}
      {powerupShieldActive && (
        <View pointerEvents="none" style={{
          position: 'absolute', left: P_X - 9, top: snapPlayerY - 9,
          width: P_SIZE + 18, height: P_SIZE + 18, borderRadius: (P_SIZE + 18) / 2,
          borderWidth: 2, borderColor: COLORS.neonCyan,
          backgroundColor: 'rgba(0, 245, 255, 0.08)',
          shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
        }} />
      )}

      {/* Magnet field ring */}
      {powerupMagnetTime > 0 && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          left: P_X + P_SIZE / 2 - MAGNET_RANGE, top: snapPlayerY + P_SIZE / 2 - MAGNET_RANGE,
          width: MAGNET_RANGE * 2, height: MAGNET_RANGE * 2, borderRadius: MAGNET_RANGE,
          borderWidth: 1, borderColor: POWERUPS.magnet.color,
          opacity: 0.15,
        }} />
      )}

      {/* Player — Animated.View drives position at rAF rate via setValue, zero React cost */}
      <Animated.View style={{
        position: 'absolute', left: P_X,
        width: P_SIZE, height: P_SIZE,
        transform: [{ translateY: playerYAnim }, { scaleX: playerScaleXAnim }, { scaleY: playerScaleYAnim }, { scale: flipPulseAnim }],
      }} pointerEvents="none">
        <PlayerBody skin={skin} size={P_SIZE} onFloor={onFloor} velocity={g.playerVelocity} />
      </Animated.View>

      {/* Popup text */}
      {popup && (
        <Animated.View
          pointerEvents="none"
          style={[styles.popupWrapper, {
            top: MID_Y - 30,
            opacity: popupAnim,
            transform: [{ scale: popupScaleAnim }, { translateY: popupAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }]}
        >
          <Text style={[
            styles.popupText,
            { color: popup.color },
            popup.size === 'lg' && styles.popupTextLg,
            popup.size === 'sm' && styles.popupTextSm,
          ]}>
            {popup.text}
          </Text>
        </Animated.View>
      )}

      {/* Header HUD */}
      <View style={[styles.header, { paddingTop: topPadding + 8, height: HEADER_H }]}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreText}>{score}</Text>
          {coinsCollected > 0 && (
            <View style={styles.coinRow}>
              <CoinStandardSvg size={14} />
              <Text style={[styles.coinCount, { color: env.coinColor }]}>×{coinsCollected}</Text>
            </View>
          )}
        </View>

        {comboMult > 1 && comboDisplayTimer > 0 && (
          <View style={[styles.comboBadge, { borderColor: env.accentColor, backgroundColor: `${env.accentColor}18` }]}>
            <Text style={[styles.comboText, { color: env.accentColor }]}>{comboLabel}</Text>
          </View>
        )}

        <View style={[styles.flipIndicator, {
          borderColor: canFlip ? env.accentColor : 'rgba(255,255,255,0.10)',
          backgroundColor: canFlip ? `${env.accentColor}18` : 'rgba(255,255,255,0.04)',
        }]}>
          <View style={[styles.flipDot, {
            backgroundColor: canFlip ? env.accentColor : 'rgba(255,255,255,0.2)',
            shadowColor: canFlip ? env.accentColor : 'transparent',
            shadowOpacity: canFlip ? 1 : 0,
            shadowRadius: 6,
          }]} />
          <Text style={[styles.flipIndicatorText, { color: canFlip ? env.accentColor : 'rgba(255,255,255,0.3)' }]}>
            {canFlip ? 'FLIP' : 'WAIT'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPause(); }}
          style={styles.pauseButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pause" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Power-up HUD */}
      {activePowerups.length > 0 && (
        <View style={[styles.powerupHUD, { top: CEIL_BOT + WALL_T + 8 }]}>
          {activePowerups.map(pu => (
            <View key={pu.type} style={[styles.powerupPill, { borderColor: POWERUPS[pu.type].color, backgroundColor: `${POWERUPS[pu.type].color}15` }]}>
              <PowerupSvg type={pu.type} size={22} />
              {pu.timeLeft !== undefined && (
                <View style={[styles.powerupTimerBar, { width: 32 }]}>
                  <View style={[styles.powerupTimerFill, {
                    width: `${(pu.timeLeft / POWERUPS[pu.type].duration) * 100}%`,
                    backgroundColor: POWERUPS[pu.type].color,
                  }]} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Environment name flash */}
      {envFlashTimer > 0.15 && (
        <View style={[styles.envLabel, { top: CEIL_BOT + WALL_T + 8 }]}>
          <Text style={[styles.envLabelText, { color: env.accentColor }]}>{env.name}</Text>
        </View>
      )}

      {/* Speed indicator */}
      {speedNorm > 0.4 && (
        <View style={[styles.speedIndicator, { top: HEADER_H + WALL_T + 6, borderColor: `${env.obstacleColor}60` }]}>
          <View style={[styles.speedBar, { width: speedNorm * 36, backgroundColor: env.obstacleColor }]} />
          <Text style={[styles.speedText, { color: env.obstacleColor }]}>
            {speedNorm > 0.8 ? 'MAX' : speedNorm > 0.6 ? 'FAST' : 'GO'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  absoluteFill: { ...StyleSheet.absoluteFillObject },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  scoreBlock: { minWidth: 68 },
  scoreText: {
    fontFamily: 'Inter_700Bold', fontSize: 32, color: COLORS.textPrimary,
    textShadowColor: 'rgba(0, 245, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  coinCount: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  comboBadge: {
    paddingHorizontal: 11, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  comboText: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1 },
  flipIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5,
  },
  flipDot: { width: 6, height: 6, borderRadius: 3 },
  flipIndicatorText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  pauseButton: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  wall: {
    position: 'absolute', left: 0, right: 0, overflow: 'hidden',
  },
  wallGlowLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderBottomWidth: 1.5,
  },
  wallGlowLineTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    borderTopWidth: 1.5,
  },
  wallDot: { position: 'absolute', top: 8, width: 3, height: 3, borderRadius: 1.5 },
  dangerGlow: { position: 'absolute', left: 0, right: 0 },
  warnLine: { position: 'absolute', width: 3, height: 20, borderRadius: 1.5 },
  powerupHUD: {
    position: 'absolute', right: 10, flexDirection: 'column', gap: 6, zIndex: 5,
  },
  powerupPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 6, paddingVertical: 5, borderWidth: 1.5, borderRadius: 10,
  },
  powerupTimerBar: {
    height: 3.5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden',
  },
  powerupTimerFill: { height: '100%', borderRadius: 2 },
  envLabel: {
    position: 'absolute', alignSelf: 'center', left: 0, right: 0, alignItems: 'center', zIndex: 5,
  },
  envLabelText: {
    fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 5,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  speedIndicator: {
    position: 'absolute', right: 12, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 5, borderWidth: 1, zIndex: 5,
  },
  speedBar: { height: 2.5, borderRadius: 1 },
  speedText: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 2 },
  popupWrapper: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20,
  },
  popupText: {
    fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  popupTextLg: { fontSize: 28, letterSpacing: 4 },
  popupTextSm: { fontSize: 13, letterSpacing: 2 },
});

export default GameScreen;
