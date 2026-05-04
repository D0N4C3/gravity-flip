import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
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
import COLORS from '@/constants/colors';
import {
  SKINS, TRAILS, GAME, ENVIRONMENTS, ENV_ORDER, POWERUPS,
  PowerupType, EnvironmentId, ChallengeType, SCORE_MILESTONES,
} from '@/constants/game';
import { applyPowerup, consumeShieldHit, createPowerupManagerState, getActivePowerups, getPowerupEffects, POWERUP_DEFS, tickPowerups } from '@/game/powerups';
import { useGame } from '@/context/GameContext';

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
  gapAtFloor?: boolean; // spike_wall: gap is at floor or ceiling
}

interface CoinPickup {
  id: string; x: number; y: number; collected: boolean;
  rare?: boolean;      // +5, neon gold
  highValue?: boolean; // +3, orange
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
  x: number; y: number; size: number; speed: number; opacity: number;
}

interface Popup {
  text: string; color: string; timer: number; size: 'sm' | 'md' | 'lg';
}

interface GState {
  phase: 'playing' | 'dead';
  onFloor: boolean;
  playerY: number; playerVelocity: number;
  scaleX: number; scaleY: number;
  obstacles: Obstacle[];
  speed: number;
  nextObsTimer: number;
  scoreTimer: number;
  totalTime: number;
  reviveUsed: boolean;
  reviveInvulnerableUntil: number;
  flipCooldown: number;
  // Power-ups
  powerupState: ReturnType<typeof createPowerupManagerState>;
  nextPowerupSpawnAt: number;
  powerupPickups: PowerupPickup[];
  // Coins
  coins: CoinPickup[];
  coinsCollected: number;
  // Combo / perfect flip
  comboStreak: number;
  comboDisplayTimer: number;
  perfectFlipTimer: number;
  perfectFlipCount: number;
  flipCount: number;
  maxCombo: number;
  // Particles
  trail: TrailParticle[];
  bursts: BurstParticle[];
  flipRings: FlipRing[];
  flipTrails: FlipTrail[];
  nearMissTimer: number;
  nearMissCount: number;
  deathSlowmo: number;
  // Environment
  envIndex: number;
  envFlashTimer: number;
  survivalTime: number;
  // Background parallax nodes
  bgFar: BgNode[];
  bgMid: BgNode[];
  bgNear: BgNode[];
  // Popups
  popup: Popup | null;
  // Danger proximity
  dangerFloor: number;
  dangerCeil: number;
  // Milestones
  lastMilestone: number;
  // Warning
  warnTimer: number;
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
const SPEED_LINE_THRESHOLD = 0.35;

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
    x: Math.random() * SW * 1.5,
    y: ceilBot + Math.random() * (floorTop - ceilBot),
    size: 1.5 + Math.random() * 2.5,
    speed: speedFactor,
    opacity: 0.3 + Math.random() * 0.7,
  }));
}

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

  const HEADER_H = topPadding + 48;
  const WALL_T = GAME.WALL_THICKNESS;
  const P_SIZE = GAME.PLAYER_SIZE;
  const P_X = GAME.PLAYER_X;
  const CEIL_BOT = HEADER_H + WALL_T;
  const FLOOR_TOP = SH - bottomPadding - WALL_T;
  const MID_Y = (CEIL_BOT + FLOOR_TOP) / 2;
  const PLAY_H = FLOOR_TOP - CEIL_BOT;
  const P_ON_FLOOR = FLOOR_TOP - P_SIZE;
  const P_ON_CEIL = CEIL_BOT;

  // ─── Game state ref ──────────────────────────────────────────────────────────
  const gRef = useRef<GState>({
    phase: 'playing', onFloor: true,
    playerY: P_ON_FLOOR, playerVelocity: 0,
    scaleX: 1, scaleY: 1,
    obstacles: [],
    speed: GAME.OBSTACLE_SPEED_INITIAL,
    nextObsTimer: 1.5, scoreTimer: 1,
    totalTime: 0, reviveUsed: false, reviveInvulnerableUntil: 0,
    flipCooldown: 0,
    powerupState: createPowerupManagerState(),
    nextPowerupSpawnAt: 10 + Math.random() * 10,
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
  });

  const scoreRef = useRef(0);
  const trailTimerRef = useRef(0);
  const rAFRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPausedRef = useRef(isPaused);
  const deadFiredRef = useRef(false);

  const [score, setScore] = useState(0);
  const [renderTick, setRenderTick] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const envFlashAnim = useRef(new Animated.Value(0)).current;
  const flipPulseAnim = useRef(new Animated.Value(1)).current;
  const popupAnim = useRef(new Animated.Value(0)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.5)).current;

  // Init background nodes after layout
  useEffect(() => {
    const g = gRef.current;
    g.bgFar = makeBgNodes(18, CEIL_BOT, FLOOR_TOP, 0.18);
    g.bgMid = makeBgNodes(12, CEIL_BOT, FLOOR_TOP, 0.38);
    g.bgNear = makeBgNodes(7, CEIL_BOT, FLOOR_TOP, 0.62);
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused && gRef.current.phase === 'playing') {
      lastTimeRef.current = 0;
      rAFRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, [isPaused]);

  useEffect(() => {
    rAFRef.current = requestAnimationFrame(gameLoop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, []);

  // ─── Revive: resume game from where death happened ────────────────────────
  useImperativeHandle(ref, () => ({
    revive() {
      const g = gRef.current;
      g.phase = 'playing';
      g.reviveUsed = true;
      const now = Date.now();
      g.reviveInvulnerableUntil = now + 1500;
      applyPowerup(g.powerupState, 'shield', now, upgrades.shield_strength);
      g.deathSlowmo = 0;
      deadFiredRef.current = false;
      isPausedRef.current = false;
      lastTimeRef.current = 0;
      rAFRef.current = requestAnimationFrame(gameLoop);
    },
  }));

  function showPopup(g: GState, text: string, color: string, size: Popup['size'] = 'md') {
    g.popup = { text, color, timer: 1.1, size };
    popupAnim.setValue(0);
    popupScaleAnim.setValue(0.4);
    Animated.parallel([
      Animated.spring(popupScaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      Animated.timing(popupAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }

  const gameLoop = useCallback((timestamp: number) => {
    if (isPausedRef.current) return;
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const rawDelta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.075);
    lastTimeRef.current = timestamp;
    const g = gRef.current;
    if (g.phase !== 'playing') return;

    const powerEffects = getPowerupEffects(g.powerupState);
    const inSlowmo = powerEffects.speed < 1 || g.deathSlowmo > 0;
    const slowFactor = g.deathSlowmo > 0 ? 0.12 : powerEffects.speed;
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
        color: skin.trailColor,
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
    if (g.powerupState.active.magnet) {
      const px = P_X + P_SIZE / 2;
      const py = g.playerY + P_SIZE / 2;
      const effectiveMagnetRange = (MAGNET_RANGE + upgrades.magnet_radius * 55) * powerEffects.magnetRadius;
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
    g.nextObsTimer -= dt;
    if (g.nextObsTimer <= 0) {
      const obs = spawnObstacle(g.totalTime, g.speed);
      g.obstacles.push(obs);

      if (Math.random() < GAME.COIN_SPAWN_CHANCE) spawnCoins(obs, g);
      if (g.totalTime >= g.nextPowerupSpawnAt) { spawnPowerup(g); g.nextPowerupSpawnAt = g.totalTime + 10 + Math.random() * 10; }

      const baseInterval = 380 / g.speed;
      g.nextObsTimer = Math.max(0.95, baseInterval);
    }

    // ── Score ──────────────────────────────────────────────────────────────────
    g.scoreTimer -= rawDelta;
    if (g.scoreTimer <= 0) {
      g.scoreTimer = 1;
      const comboMult = getComboMultiplier(g.comboStreak);
      const doubleMult = powerEffects.score;
      const upgradeBonus = upgrades.score_multiplier;
      const gained = comboMult * doubleMult + upgradeBonus;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      onScoreChange?.(scoreRef.current);

      // Milestone popup
      const nextMilestone = SCORE_MILESTONES.find(m => m > g.lastMilestone && scoreRef.current >= m);
      if (nextMilestone) {
        g.lastMilestone = nextMilestone;
        showPopup(g, `${nextMilestone} PTS`, COLORS.neonYellow, 'lg');
        if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // ── Difficulty ────────────────────────────────────────────────────────────
    g.totalTime += rawDelta;
    g.survivalTime += rawDelta;
    // Speed curve: linear 0–30s → faster linear 30–60s → exponential after 60s
    {
      const t = g.totalTime;
      let newSpeed: number;
      if (t < 30) {
        newSpeed = GAME.OBSTACLE_SPEED_INITIAL + t * 2.0;
      } else if (t < 60) {
        newSpeed = GAME.OBSTACLE_SPEED_INITIAL + 60 + (t - 30) * 3.0;
      } else {
        newSpeed = (GAME.OBSTACLE_SPEED_INITIAL + 150) + Math.pow(t - 60, 1.45) * 1.5;
      }
      g.speed = Math.min(newSpeed, GAME.OBSTACLE_SPEED_MAX);
    }

    // ── Environment cycling ───────────────────────────────────────────────────
    const newEnvIndex = Math.floor(g.totalTime / GAME.ENV_CHANGE_INTERVAL) % ENV_ORDER.length;
    if (newEnvIndex !== g.envIndex) {
      g.envIndex = newEnvIndex;
      g.envFlashTimer = 0.45;
      Animated.sequence([
        Animated.timing(envFlashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(envFlashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
    if (g.envFlashTimer > 0) g.envFlashTimer -= rawDelta;

    tickPowerups(g.powerupState, Date.now());

    // ── Power-up timers ───────────────────────────────────────────────────────

    // ── Perfect flip timer ────────────────────────────────────────────────────
    if (g.perfectFlipTimer > 0) {
      g.perfectFlipTimer -= rawDelta;
      if (g.perfectFlipTimer <= 0 && g.phase === 'playing') {
        // Timer expired while alive — it's a perfect flip!
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

    // ── Combo display timer ───────────────────────────────────────────────────
    if (g.comboDisplayTimer > 0) g.comboDisplayTimer -= rawDelta;

    // ── Popup timer ───────────────────────────────────────────────────────────
    if (g.popup) {
      g.popup.timer -= rawDelta;
      if (g.popup.timer <= 0) g.popup = null;
    }

    // ── Burst particles ───────────────────────────────────────────────────────
    for (const b of g.bursts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 180 * dt;
      b.life -= rawDelta / b.maxLife;
    }
    g.bursts = g.bursts.filter(b => b.life > 0);

    // ── Collision detection ───────────────────────────────────────────────────
    const pH: Rect = {
      left: P_X + 4, right: P_X + P_SIZE - 4,
      top: g.playerY + 4, bottom: g.playerY + P_SIZE - 4,
    };

    let died = false;
    let nearMiss = false;
    const isReviveImmune = Date.now() < g.reviveInvulnerableUntil;
    for (const obs of g.obstacles) {
      const hitboxes = getHitboxes(obs);
      for (const hb of hitboxes) {
        if (rectsOverlap(pH, hb)) {
          if (isReviveImmune) {
            showPopup(g, 'REVIVE IMMUNE', '#FFFFFF', 'sm');
          } else if (g.powerupState.active.shield) {
            const hitsLeft = consumeShieldHit(g.powerupState);
            spawnBurst(g, P_X + P_SIZE / 2, g.playerY + P_SIZE / 2, COLORS.neonCyan, 10);
            showPopup(g, hitsLeft > 0 ? `SHIELD BLOCK (${hitsLeft})` : 'SHIELD BREAK', COLORS.neonCyan, 'sm');
            if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
            if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      }
      if (died) break;
    }

    g.nearMissTimer = nearMiss ? 0.35 : Math.max(0, g.nearMissTimer - rawDelta);

    // ── Coin collection ───────────────────────────────────────────────────────
    for (const coin of g.coins) {
      if (coin.collected) continue;
      const coinRect: Rect = {
        left: coin.x - GAME.COIN_COLLECT_RADIUS, right: coin.x + GAME.COIN_COLLECT_RADIUS,
        top: coin.y - GAME.COIN_COLLECT_RADIUS, bottom: coin.y + GAME.COIN_COLLECT_RADIUS,
      };
      if (rectsOverlap(pH, coinRect)) {
        coin.collected = true;
        const coinValue = coin.rare ? 4 : coin.highValue ? 2 : 1;
        g.coinsCollected += coinValue;
        const burstColor = coin.rare ? '#FFE600' : coin.highValue ? '#FF9900' : getEnv(g).coinColor;
        spawnBurst(g, coin.x, coin.y, burstColor, coin.rare ? 12 : coin.highValue ? 7 : 5);
        if (coin.rare) showPopup(g, 'RARE COIN +5', '#FFE600', 'sm');
        else if (coin.highValue) showPopup(g, '+3', '#FF9900', 'sm');
        if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    g.coins = g.coins.filter(c => !c.collected);

    // ── Power-up collection ───────────────────────────────────────────────────
    for (const pu of g.powerupPickups) {
      if (pu.collected) continue;
      const puRect: Rect = {
        left: pu.x - GAME.POWERUP_COLLECT_RADIUS, right: pu.x + GAME.POWERUP_COLLECT_RADIUS,
        top: pu.y - GAME.POWERUP_COLLECT_RADIUS, bottom: pu.y + GAME.POWERUP_COLLECT_RADIUS,
      };
      if (rectsOverlap(pH, puRect)) {
        pu.collected = true;
        activatePowerup(pu.type, g);
        spawnBurst(g, pu.x, pu.y, POWERUPS[pu.type].color, 10);
        showPopup(g, POWERUPS[pu.type].label, POWERUPS[pu.type].color, 'md');
        if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
    g.powerupPickups = g.powerupPickups.filter(p => !p.collected);

    // ── Death ─────────────────────────────────────────────────────────────────
    if (g.deathSlowmo > 0) g.deathSlowmo -= rawDelta;

    if (died && !deadFiredRef.current) {
      deadFiredRef.current = true;
      g.phase = 'dead';
      g.comboStreak = 0;
      g.deathSlowmo = 0.6;
      if (settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      spawnBurst(g, P_X + P_SIZE / 2, g.playerY + P_SIZE / 2, skin.color, 24);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

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

    setRenderTick(t => t + 1);
    rAFRef.current = requestAnimationFrame(gameLoop);
  }, [P_ON_FLOOR, P_ON_CEIL, P_X, P_SIZE, FLOOR_TOP, CEIL_BOT, MID_Y, PLAY_H, settings.vibration, skin, selectedTrailId, recordRunStats, upgrades]);

  // ─── Helper functions ───────────────────────────────────────────────────────

  function getEnv(g: GState) {
    return ENVIRONMENTS[ENV_ORDER[g.envIndex]];
  }

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

  function activatePowerup(type: PowerupType, g: GState) { applyPowerup(g.powerupState, type, Date.now(), upgrades.shield_strength); }

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

  function spawnCoins(obs: Obstacle, g: GState) {
    const count = 1 + Math.floor(Math.random() * 3); // 1–3 coins per group
    const baseX = obs.x + obs.width + 50 + Math.random() * 40;
    // 40% chance: horizontal string all at same Y (easy to collect by holding position)
    const isString = Math.random() < 0.4;
    // Keep coins in the middle 50% of the corridor — well away from lethal walls
    const safeSpread = PLAY_H * 0.25;
    const centerY = MID_Y;
    const stringY = centerY + (Math.random() - 0.5) * safeSpread;
    for (let i = 0; i < count; i++) {
      const y = isString
        ? stringY                                           // line of coins at fixed Y
        : centerY + (Math.random() - 0.5) * safeSpread;  // scattered near centre
      const roll = Math.random();
      const rare = roll < 0.08;
      const highValue = !rare && roll < 0.20;
      g.coins.push({ id: mkId(), x: baseX + i * 34, y, collected: false, rare, highValue });
    }
  }

  function spawnPowerup(g: GState) {
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

  function getHitboxes(obs: Obstacle): Rect[] {
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
          // Gap at floor: player must be on floor — solid block occupies top portion
          return [{ left: obs.x, right: obs.x + obs.width, top: CEIL_BOT, bottom: FLOOR_TOP - GAP }];
        }
        // Gap at ceiling: player must be on ceiling — solid block occupies bottom portion
        return [{ left: obs.x, right: obs.x + obs.width, top: CEIL_BOT + GAP, bottom: FLOOR_TOP }];
      }
      default:
        return [];
    }
  }

  function spawnObstacle(totalTime: number, speed: number): Obstacle {
    const id = mkId(); const x = SW + 28;
    if (totalTime < 8) {
      return { id, type: Math.random() < 0.5 ? 'floor_spike' : 'ceiling_spike', x, width: SPIKE_W * 2 };
    }
    if (totalTime < 20) {
      const r = Math.random();
      if (r < 0.35) return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
      if (r < 0.7) return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
      return { id, type: 'floor_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
    }
    if (totalTime < 35) {
      const r = Math.random();
      if (r < 0.18) return { id, type: 'floor_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
      if (r < 0.36) return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
      if (r < 0.54) return { id, type: 'floor_spike', x, width: SPIKE_W * 2 };
      if (r < 0.72) return { id, type: 'ceiling_spike', x, width: SPIKE_W * 2 };
      return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 55 + Math.random() * 40 };
    }
    if (totalTime < 55) {
      const r = Math.random();
      if (r < 0.2) return { id, type: 'floor_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (r < 0.4) return { id, type: 'ceiling_spikes', x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
      if (r < 0.58) return { id, type: 'moving_spike', x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 75 + Math.random() * 45 };
      if (r < 0.76) return { id, type: 'rotating_blade', x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
      return { id, type: Math.random() < 0.5 ? 'floor_spikes' : 'ceiling_spikes', x, width: SPIKE_W * 4 + 4, spikeCount: 2 };
    }
    const r = Math.random();
    if (r < 0.12) return { id, type: 'spike_wall' as const, x, width: 10, gapAtFloor: Math.random() < 0.5 };
    if (r < 0.24) return { id, type: 'laser_gate' as const, x: x + 2, width: 6, laserOn: false, laserTimer: 0.6, laserCycleOn: 0.55, laserCycleOff: 0.75, laserFromFloor: Math.random() < 0.5 };
    if (r < 0.40) return { id, type: 'rotating_blade' as const, x: x + BLADE_R, width: BLADE_R * 2, rotation: 0 };
    if (r < 0.56) return { id, type: 'moving_spike' as const, x, width: MOVE_HW * 2, moveY: 0, moveVelocity: 95 + Math.random() * 55 };
    if (r < 0.76) return { id, type: 'floor_spikes' as const, x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
    return { id, type: 'ceiling_spikes' as const, x, width: SPIKE_W * 6 + 8, spikeCount: 3 };
  }

  // ─── Tap handler ────────────────────────────────────────────────────────────

  function handleTap() {
    const g = gRef.current;
    if (g.phase !== 'playing') return;
    if (g.flipCooldown > 0) return;

    g.onFloor = !g.onFloor;
    g.flipCount += 1;
    const effectiveCooldown = [0.32, 0.26, 0.20, 0.14][upgrades.flip_speed] ?? 0.32;
    g.flipCooldown = effectiveCooldown;
    g.scaleY = 0.55;
    g.scaleX = 1.45;

    // Add a flip ring
    g.flipRings.push({
      id: mkId(),
      x: P_X + P_SIZE / 2,
      y: g.playerY + P_SIZE / 2,
      radius: P_SIZE * 0.4,
      maxRadius: P_SIZE * 2.5,
      life: 1,
      color: skin.color,
    });

    // Spawn dramatic flip trail streaks behind the player
    const trailDef = TRAILS.find(t => t.id === selectedTrailId) || TRAILS[0];
    for (let i = 0; i < 14; i++) {
      const color = trailDef.colors[i % trailDef.colors.length];
      g.flipTrails.push({
        id: mkId(),
        x: P_X - 4 - i * 10,
        y: g.playerY + P_SIZE * 0.5 + (Math.random() - 0.5) * P_SIZE * 0.9,
        w: 10 + Math.random() * 22,
        h: 2.5 + Math.random() * 4.5,
        life: 1.0 - i * 0.03,
        color,
      });
    }

    // Perfect flip detection: is there an obstacle 60–180px ahead?
    const nearObs = g.obstacles.find(o => o.x > P_X + 30 && o.x < P_X + 180);
    if (nearObs) {
      g.perfectFlipTimer = GAME.PERFECT_FLIP_WINDOW;
    }

    if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(flipPulseAnim, { toValue: 1.12, duration: 70, useNativeDriver: true }),
      Animated.timing(flipPulseAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
    ]).start();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const g = gRef.current;
  const env = ENVIRONMENTS[ENV_ORDER[g.envIndex]];
  const speedNorm = Math.min((g.speed - GAME.OBSTACLE_SPEED_INITIAL) / (GAME.OBSTACLE_SPEED_MAX - GAME.OBSTACLE_SPEED_INITIAL), 1);
  const comboMult = getComboMultiplier(g.comboStreak);
  const comboLabel = getComboLabel(g.comboStreak);
  const canFlip = g.flipCooldown <= 0;

  const activePowerups = useMemo(() => getActivePowerups(g.powerupState, Date.now()), [renderTick]);

  // Find nearest upcoming obstacle for warning
  const warnObs = g.obstacles.find(o => o.x > P_X && o.x < P_X + 260);

  return (
    <Animated.View style={[styles.container, { backgroundColor: env.bgTop, transform: [{ translateX: shakeAnim }] }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTap} activeOpacity={1} />

      {/* Environment transition flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: env.accentColor, opacity: envFlashAnim }]}
        pointerEvents="none"
      />

      {/* Speed overlay */}
      {speedNorm > 0.1 && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: env.obstacleColor, opacity: speedNorm * 0.06 }]}
          pointerEvents="none"
        />
      )}

      {/* Magnet aura */}
      {g.powerupState.active.magnet && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: POWERUPS.magnet.color, opacity: 0.03 }]} pointerEvents="none" />
      )}

      {/* Background parallax nodes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {g.bgFar.map((n, i) => (
          <View key={`f${i}`} style={{
            position: 'absolute', left: n.x - n.size / 2, top: n.y - n.size / 2,
            width: n.size, height: n.size, borderRadius: n.size / 2,
            backgroundColor: env.nodeFarColor, opacity: n.opacity * 0.5,
          }} />
        ))}
        {g.bgMid.map((n, i) => (
          <View key={`m${i}`} style={{
            position: 'absolute', left: n.x - n.size / 2, top: n.y - n.size / 2,
            width: n.size + 1, height: n.size + 1, borderRadius: (n.size + 1) / 2,
            backgroundColor: env.nodeMidColor, opacity: n.opacity * 0.6,
          }} />
        ))}
        {/* Connecting lines for mid nodes */}
        {g.bgMid.slice(0, -1).map((n, i) => {
          const next = g.bgMid[i + 1];
          const dx = next.x - n.x; const dy = next.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 160) return null;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <View key={`l${i}`} style={{
              position: 'absolute', left: n.x, top: n.y - 0.5,
              width: dist, height: 1,
              backgroundColor: env.nodeFarColor,
              opacity: (1 - dist / 160) * 0.3,
              transform: [{ rotate: `${angle}deg` }, { translateX: 0 }],
            }} />
          );
        })}
      </View>

      {/* Horizontal grid lines */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[0.2, 0.4, 0.6, 0.8].map(f => (
          <View key={f} style={{ position: 'absolute', left: 0, right: 0, top: CEIL_BOT + PLAY_H * f, height: 1, backgroundColor: env.gridColor }} />
        ))}
      </View>

      {/* Speed lines */}
      {speedNorm > SPEED_LINE_THRESHOLD && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.15, 0.28, 0.44, 0.55, 0.68, 0.78, 0.9].map((f, i) => (
            <View key={i} style={{
              position: 'absolute',
              left: 0, right: 0,
              top: CEIL_BOT + PLAY_H * f,
              height: 1,
              backgroundColor: env.accentColor,
              opacity: (speedNorm - SPEED_LINE_THRESHOLD) / (1 - SPEED_LINE_THRESHOLD) * (0.08 + Math.random() * 0.04),
            }} />
          ))}
        </View>
      )}

      {/* Ceiling wall */}
      <View style={[styles.wall, { top: HEADER_H, height: WALL_T, backgroundColor: env.wallColor }]}>
        <View style={[styles.wallGlowLine, { borderBottomColor: env.wallGlow, opacity: 0.8 }]} />
        {/* Wall dots */}
        {[0.1, 0.2, 0.35, 0.5, 0.62, 0.75, 0.88].map((f, i) => (
          <View key={i} style={[styles.wallDot, { left: SW * f, backgroundColor: env.wallGlow, opacity: 0.4 + Math.sin(g.totalTime * 2 + i) * 0.2 }]} />
        ))}
      </View>

      {/* Floor wall */}
      <View style={[styles.wall, { top: FLOOR_TOP, height: WALL_T, backgroundColor: env.wallColor }]}>
        <View style={[styles.wallGlowLineTop, { borderTopColor: env.wallGlow, opacity: 0.8 }]} />
        {[0.1, 0.2, 0.35, 0.5, 0.62, 0.75, 0.88].map((f, i) => (
          <View key={i} style={[styles.wallDot, { left: SW * f, top: 10, backgroundColor: env.wallGlow, opacity: 0.4 + Math.sin(g.totalTime * 2 + i + 1) * 0.2 }]} />
        ))}
      </View>

      {/* Danger glow on walls */}
      {g.dangerCeil > 0.1 && (
        <View style={[styles.dangerGlow, { top: HEADER_H, height: WALL_T + 8, opacity: g.dangerCeil * 0.45, backgroundColor: COLORS.neonPink }]} pointerEvents="none" />
      )}
      {g.dangerFloor > 0.1 && (
        <View style={[styles.dangerGlow, { top: FLOOR_TOP - 8, height: WALL_T + 8, opacity: g.dangerFloor * 0.45, backgroundColor: COLORS.neonPink }]} pointerEvents="none" />
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

      {/* Flip trail streaks (gravity switch burst) */}
      {g.flipTrails.map(ft => (
        <View key={ft.id} pointerEvents="none" style={{
          position: 'absolute',
          left: ft.x - ft.w / 2, top: ft.y - ft.h / 2,
          width: ft.w, height: ft.h,
          borderRadius: ft.h / 2,
          backgroundColor: ft.color,
          opacity: Math.max(0, ft.life * 0.85),
          shadowColor: ft.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 5,
        }} />
      ))}

      {/* Trail particles */}
      {g.trail.map(t => (
        <View key={t.id} pointerEvents="none" style={{
          position: 'absolute',
          left: t.x - t.size / 2, top: t.y - t.size / 2,
          width: t.size, height: t.size,
          borderRadius: t.size / 2,
          backgroundColor: t.color,
          opacity: Math.max(0, t.life * 0.75),
        }} />
      ))}

      {/* Flip rings */}
      {g.flipRings.map(r => (
        <View key={r.id} pointerEvents="none" style={{
          position: 'absolute',
          left: r.x - r.radius, top: r.y - r.radius,
          width: r.radius * 2, height: r.radius * 2,
          borderRadius: r.radius,
          borderWidth: 1.5,
          borderColor: r.color,
          opacity: Math.max(0, r.life * 0.6),
        }} />
      ))}

      {/* Obstacles */}
      {g.obstacles.map(obs => (
        <ObstacleComp key={obs.id} obs={obs} ceilBot={CEIL_BOT} floorTop={FLOOR_TOP} midY={MID_Y} color={env.obstacleColor} />
      ))}

      {/* Coins */}
      {g.coins.map(coin => {
        const R = coin.rare ? GAME.COIN_VISUAL_RADIUS * 1.55 : coin.highValue ? GAME.COIN_VISUAL_RADIUS * 1.25 : GAME.COIN_VISUAL_RADIUS;
        const cColor = coin.rare ? '#FFE600' : coin.highValue ? '#FF9900' : env.coinColor;
        return (
          <View key={coin.id} pointerEvents="none" style={{
            position: 'absolute',
            left: coin.x - R, top: coin.y - R,
            width: R * 2, height: R * 2,
            borderRadius: R,
            backgroundColor: cColor,
            borderWidth: coin.rare ? 2 : 1.5,
            borderColor: coin.rare ? '#FFFFFF' : coin.highValue ? '#FFCC88' : 'rgba(255,255,255,0.4)',
            shadowColor: cColor, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: coin.rare ? 1 : coin.highValue ? 0.9 : 0.85,
            shadowRadius: coin.rare ? 14 : coin.highValue ? 10 : 7,
          }}>
            {coin.rare && (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#A06000', lineHeight: 10 }}>★</Text>
              </View>
            )}
            {coin.highValue && (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#7A3500', lineHeight: 9 }}>3</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Power-up pickups */}
      {g.powerupPickups.map(pu => (
        <PowerupPickupComp key={pu.id} pu={pu} />
      ))}

      {/* Shield orb */}
      {g.powerupState.active.shield && (
        <View pointerEvents="none" style={{
          position: 'absolute', left: P_X - 9, top: g.playerY - 9,
          width: P_SIZE + 18, height: P_SIZE + 18, borderRadius: (P_SIZE + 18) / 2,
          borderWidth: 2, borderColor: COLORS.neonCyan,
          backgroundColor: 'rgba(0, 245, 255, 0.08)',
          shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
        }} />
      )}

      {/* Magnet field ring */}
      {g.powerupState.active.magnet && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          left: P_X + P_SIZE / 2 - MAGNET_RANGE * getPowerupEffects(g.powerupState).magnetRadius, top: g.playerY + P_SIZE / 2 - MAGNET_RANGE * getPowerupEffects(g.powerupState).magnetRadius,
          width: MAGNET_RANGE * 2 * getPowerupEffects(g.powerupState).magnetRadius, height: MAGNET_RANGE * 2 * getPowerupEffects(g.powerupState).magnetRadius, borderRadius: MAGNET_RANGE * getPowerupEffects(g.powerupState).magnetRadius,
          borderWidth: 1, borderColor: POWERUPS.magnet.color,
          opacity: 0.15,
        }} />
      )}

      {/* Player */}
      <Animated.View style={{
        position: 'absolute', left: P_X, top: g.playerY,
        width: P_SIZE, height: P_SIZE,
        transform: [{ scaleX: g.scaleX }, { scaleY: g.scaleY }, { scale: flipPulseAnim }],
      }} pointerEvents="none">
        <PlayerBody skin={skin} size={P_SIZE} onFloor={g.onFloor} velocity={g.playerVelocity} />
      </Animated.View>

      {/* Burst particles */}
      {g.bursts.map(b => (
        <View key={b.id} pointerEvents="none" style={{
          position: 'absolute', left: b.x - b.size / 2, top: b.y - b.size / 2,
          width: b.size, height: b.size, borderRadius: b.size / 2,
          backgroundColor: b.color, opacity: Math.max(0, b.life),
        }} />
      ))}

      {/* Popup text */}
      {g.popup && (
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
            { color: g.popup.color },
            g.popup.size === 'lg' && styles.popupTextLg,
            g.popup.size === 'sm' && styles.popupTextSm,
          ]}>
            {g.popup.text}
          </Text>
        </Animated.View>
      )}

      {/* Header HUD */}
      <View style={[styles.header, { paddingTop: topPadding + 6, height: HEADER_H }]}>
        <View>
          <Text style={styles.scoreText}>{score}</Text>
          {g.coinsCollected > 0 && (
            <View style={styles.coinRow}>
              <View style={[styles.coinDot, { backgroundColor: env.coinColor }]} />
              <Text style={[styles.coinCount, { color: env.coinColor }]}>{g.coinsCollected}</Text>
            </View>
          )}
        </View>

        {/* Combo badge */}
        {comboMult > 1 && g.comboDisplayTimer > 0 && (
          <View style={[styles.comboBadge, { borderColor: env.accentColor, backgroundColor: `${env.accentColor}18` }]}>
            <Text style={[styles.comboText, { color: env.accentColor }]}>{comboLabel}</Text>
          </View>
        )}

        {/* Flip ready indicator */}
        <View style={[styles.flipIndicator, { borderColor: canFlip ? env.accentColor : 'rgba(255,255,255,0.12)', backgroundColor: canFlip ? `${env.accentColor}15` : 'transparent' }]}>
          <View style={[styles.flipDot, { backgroundColor: canFlip ? env.accentColor : 'rgba(255,255,255,0.15)' }]} />
          <Text style={[styles.flipIndicatorText, { color: canFlip ? env.accentColor : COLORS.textMuted }]}>
            {canFlip ? 'FLIP' : 'WAIT'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPause(); }} style={styles.pauseButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pause" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Power-up HUD */}
      {activePowerups.length > 0 && (
        <View style={[styles.powerupHUD, { top: CEIL_BOT + WALL_T + 6 }]}>
          {activePowerups.map(pu => (
            <View key={pu.type} style={[styles.powerupPill, { borderColor: POWERUPS[pu.type].color, backgroundColor: `${POWERUPS[pu.type].color}12` }]}>
              <Ionicons name={POWERUPS[pu.type].icon as any} size={11} color={POWERUPS[pu.type].color} />
              {pu.durationLeftMs > 0 && (
                <View style={[styles.powerupTimerBar, { width: 28 }]}>
                  <View style={[styles.powerupTimerFill, {
                    width: `${(pu.durationLeftMs / POWERUP_DEFS[pu.type].durationMs) * 100}%`,
                    backgroundColor: POWERUPS[pu.type].color,
                  }]} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Environment name flash */}
      {g.envFlashTimer > 0.15 && (
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

// ─── Sub-components ─────────────────────────────────────────────────────────────

function PlayerBody({ skin, size, onFloor, velocity }: {
  skin: typeof SKINS[0]; size: number; onFloor: boolean; velocity: number;
}) {
  const eyeProgress = Math.abs(velocity) / 800;
  const eyeShift = Math.min(eyeProgress, 1) * (onFloor ? -1 : 1) * 1.5;
  const eyeY = size * 0.35 + eyeShift;
  const eyeOpenness = Math.max(0.4, 1 - Math.abs(velocity) / 1200);

  const baseStyle = {
    width: size, height: size,
    backgroundColor: skin.color,
    shadowColor: skin.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10,
  };

  if (skin.shape === 'circle') {
    return (
      <View style={[baseStyle, { borderRadius: size / 2 }]}>
        <View style={[styles.eye, { left: size * 0.2, top: eyeY - eyeOpenness * 2, height: 5 * eyeOpenness, backgroundColor: skin.eyeColor }]} />
        <View style={[styles.eye, { left: size * 0.54, top: eyeY - eyeOpenness * 2, height: 5 * eyeOpenness, backgroundColor: skin.eyeColor }]} />
      </View>
    );
  }
  if (skin.shape === 'diamond') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[baseStyle, { width: size * 0.72, height: size * 0.72, borderRadius: 3, transform: [{ rotate: '45deg' }] }]} />
      </View>
    );
  }
  return (
    <View style={[baseStyle, { borderRadius: 5 }]}>
      {/* Main eyes */}
      <View style={[styles.eye, { left: size * 0.18, top: eyeY - eyeOpenness * 2.5, height: Math.max(3, 6 * eyeOpenness), backgroundColor: skin.eyeColor }]} />
      <View style={[styles.eye, { left: size * 0.52, top: eyeY - eyeOpenness * 2.5, height: Math.max(3, 6 * eyeOpenness), backgroundColor: skin.eyeColor }]} />
      {/* Shine dot on each eye */}
      <View style={{ position: 'absolute', left: size * 0.22, top: eyeY - eyeOpenness * 2, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.7)' }} />
      <View style={{ position: 'absolute', left: size * 0.56, top: eyeY - eyeOpenness * 2, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.7)' }} />
    </View>
  );
}

function PowerupPickupComp({ pu }: { pu: PowerupPickup }) {
  const cfg = POWERUPS[pu.type];
  const R = GAME.POWERUP_VISUAL_RADIUS;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: pu.x - R, top: pu.y - R,
      width: R * 2, height: R * 2, borderRadius: R,
      backgroundColor: `${cfg.color}18`,
      borderWidth: 1.5, borderColor: cfg.color,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: cfg.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10,
    }}>
      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
    </View>
  );
}

function SpikeGroup({ count, fromFloor, x, floorTop, ceilBot, color }: {
  count: number; fromFloor: boolean; x: number;
  floorTop: number; ceilBot: number; color: string;
}) {
  const spikes = Array.from({ length: count }, (_, i) => i);
  if (fromFloor) {
    return (
      <View style={{ position: 'absolute', left: x, top: floorTop - SPIKE_H, flexDirection: 'row', gap: 2 }} pointerEvents="none">
        {spikes.map(i => (
          <View key={i} style={{ width: 0, height: 0, borderLeftWidth: SPIKE_W / 2, borderRightWidth: SPIKE_W / 2, borderBottomWidth: SPIKE_H, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }} />
        ))}
        <View style={{ position: 'absolute', bottom: 0, left: -1, right: -1, height: 2, backgroundColor: color, opacity: 0.5 }} />
      </View>
    );
  }
  return (
    <View style={{ position: 'absolute', left: x, top: ceilBot, flexDirection: 'row', gap: 2 }} pointerEvents="none">
      {spikes.map(i => (
        <View key={i} style={{ width: 0, height: 0, borderLeftWidth: SPIKE_W / 2, borderRightWidth: SPIKE_W / 2, borderTopWidth: SPIKE_H, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
      ))}
      <View style={{ position: 'absolute', top: 0, left: -1, right: -1, height: 2, backgroundColor: color, opacity: 0.5 }} />
    </View>
  );
}

function ObstacleComp({ obs, ceilBot, floorTop, midY, color }: {
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
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - MOVE_HW, top: cy - MOVE_HH,
        width: MOVE_HW * 2, height: MOVE_HH * 2, borderRadius: 5,
        backgroundColor: color,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10,
      }}>
        <View style={{ position: 'absolute', inset: 3, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
      </View>
    );
  }
  if (obs.type === 'rotating_blade') {
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', left: obs.x - BLADE_R, top: midY - BLADE_R,
        width: BLADE_R * 2, height: BLADE_R * 2,
        borderRadius: BLADE_R, borderWidth: 2.5, borderColor: color,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12,
        transform: [{ rotate: `${obs.rotation ?? 0}deg` }],
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
      }}>
        <View style={{ width: BLADE_R * 2 - 6, height: 2.5, backgroundColor: color, position: 'absolute' }} />
        <View style={{ width: 2.5, height: BLADE_R * 2 - 6, backgroundColor: color, position: 'absolute' }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
    );
  }
  if (obs.type === 'spike_wall') {
    const GAP = 26 + 18; // P_SIZE + 18 (matching hitbox)
    const solidTop = obs.gapAtFloor ? ceilBot : ceilBot + GAP;
    const solidBot = obs.gapAtFloor ? floorTop - GAP : floorTop;
    const solidH = solidBot - solidTop;
    const gapTop = obs.gapAtFloor ? floorTop - GAP : ceilBot;
    return (
      <View pointerEvents="none">
        {/* Solid barrier */}
        <View style={{
          position: 'absolute', left: obs.x, top: solidTop,
          width: obs.width, height: solidH,
          backgroundColor: color,
          shadowColor: color, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9, shadowRadius: 10,
        }} />
        {/* Gap indicator arrows pointing into the gap */}
        <View style={{
          position: 'absolute', left: obs.x - 7, top: gapTop + (GAP / 2) - 8,
          width: 0, height: 0,
          borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 12,
          borderTopColor: 'transparent', borderBottomColor: 'transparent',
          borderRightColor: color, opacity: 0.6,
        }} />
        {/* Edge spikes on barrier near gap */}
        <View style={{
          position: 'absolute', left: obs.x, top: solidBot - 4,
          width: obs.width, height: 4,
          backgroundColor: obs.gapAtFloor ? 'transparent' : color, opacity: 0.6,
        }} />
      </View>
    );
  }
  if (obs.type === 'laser_gate') {
    const beamH = (floorTop - ceilBot) * 0.52;
    const top = obs.laserFromFloor ? floorTop - beamH : ceilBot;
    const isOn = !!obs.laserOn;
    const laserColor = isOn ? '#FF2266' : '#FF226633';
    return (
      <View pointerEvents="none">
        {/* Beam body */}
        <View style={{
          position: 'absolute', left: obs.x - 2, top,
          width: 4, height: beamH,
          backgroundColor: laserColor,
          shadowColor: '#FF2266',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isOn ? 1 : 0.15,
          shadowRadius: isOn ? 14 : 3,
        }} />
        {/* Core bright line */}
        <View style={{
          position: 'absolute', left: obs.x - 0.5, top,
          width: 1, height: beamH,
          backgroundColor: isOn ? '#FFFFFF' : 'transparent',
          opacity: isOn ? 0.9 : 0,
        }} />
        {/* Source node at wall */}
        <View style={{
          position: 'absolute', left: obs.x - 5,
          top: obs.laserFromFloor ? floorTop - 5 : ceilBot - 5,
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: isOn ? '#FF2266' : '#FF226655',
          shadowColor: '#FF2266', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isOn ? 1 : 0.3, shadowRadius: isOn ? 10 : 3,
        }} />
      </View>
    );
  }
  return null;
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, zIndex: 10,
  },
  scoreText: {
    fontFamily: 'Inter_700Bold', fontSize: 28, color: COLORS.textPrimary,
    textShadowColor: 'rgba(0, 245, 255, 0.35)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  coinDot: { width: 7, height: 7, borderRadius: 3.5 },
  coinCount: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  comboBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  comboText: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1 },
  flipIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  flipDot: { width: 5, height: 5, borderRadius: 2.5 },
  flipIndicatorText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.5 },
  pauseButton: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
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
  eye: {
    position: 'absolute', width: 5, borderRadius: 2.5,
  },
  powerupHUD: {
    position: 'absolute', right: 10, flexDirection: 'column', gap: 4, zIndex: 5,
  },
  powerupPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderRadius: 8,
  },
  powerupTimerBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1.5, overflow: 'hidden',
  },
  powerupTimerFill: { height: '100%', borderRadius: 1.5 },
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
