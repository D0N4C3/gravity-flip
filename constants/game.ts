import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SCREEN = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT,
};

export const GAME = {
  PLAYER_SIZE: 26,
  PLAYER_X: 90,
  WALL_THICKNESS: 28,
  HEADER_HEIGHT: 80,
  OBSTACLE_SPEED_INITIAL: 150,
  OBSTACLE_SPEED_MAX: 400,
  OBSTACLE_GAP_INITIAL: 480,
  OBSTACLE_GAP_MIN: 260,
  SCORE_INCREMENT_INTERVAL: 1.0,
  NEAR_MISS_THRESHOLD: 24,
  // Coins
  COIN_VISUAL_RADIUS: 11,
  COIN_COLLECT_RADIUS: 26,
  COIN_SPAWN_CHANCE: 0.70,
  // Power-ups
  POWERUP_VISUAL_RADIUS: 16,
  POWERUP_COLLECT_RADIUS: 30,
  POWERUP_SPAWN_CHANCE: 0.12,
  // Physics — lower K = slower, more floaty movement between floor and ceiling
  SPRING_K: 680,
  SPRING_D: 38,
  FLIP_COOLDOWN: 0.32,
  // Perfect flip
  PERFECT_FLIP_WINDOW: 0.45,
  // Environment
  ENV_CHANGE_INTERVAL: 28,
};

export type EnvironmentId = 'neon' | 'cyber' | 'lava' | 'ice';

export const ENVIRONMENTS: Record<EnvironmentId, {
  id: EnvironmentId;
  name: string;
  wallColor: string;
  wallGlow: string;
  bgTop: string;
  bgBot: string;
  obstacleColor: string;
  coinColor: string;
  gridColor: string;
  accentColor: string;
  nodeFarColor: string;
  nodeMidColor: string;
  unlockScore: number;
}> = {
  neon: {
    id: 'neon',
    name: 'NEON TUNNEL',
    wallColor: '#0E2540',
    wallGlow: '#00F5FF',
    bgTop: '#010609',
    bgBot: '#030A14',
    obstacleColor: '#FF0080',
    coinColor: '#FFE600',
    gridColor: 'rgba(0, 245, 255, 0.025)',
    accentColor: '#00F5FF',
    nodeFarColor: 'rgba(0, 245, 255, 0.07)',
    nodeMidColor: 'rgba(0, 245, 255, 0.04)',
    unlockScore: 0,
  },
  cyber: {
    id: 'cyber',
    name: 'CYBER CITY',
    wallColor: '#120C30',
    wallGlow: '#8800FF',
    bgTop: '#040010',
    bgBot: '#08001C',
    obstacleColor: '#00FF88',
    coinColor: '#CC44FF',
    gridColor: 'rgba(136, 0, 255, 0.03)',
    accentColor: '#8800FF',
    nodeFarColor: 'rgba(136, 0, 255, 0.08)',
    nodeMidColor: 'rgba(136, 0, 255, 0.04)',
    unlockScore: 0,
  },
  lava: {
    id: 'lava',
    name: 'LAVA CORRIDOR',
    wallColor: '#2E1008',
    wallGlow: '#FF5500',
    bgTop: '#0E0301',
    bgBot: '#180605',
    obstacleColor: '#FF6600',
    coinColor: '#FFD700',
    gridColor: 'rgba(255, 85, 0, 0.03)',
    accentColor: '#FF5500',
    nodeFarColor: 'rgba(255, 85, 0, 0.08)',
    nodeMidColor: 'rgba(255, 85, 0, 0.04)',
    unlockScore: 0,
  },
  ice: {
    id: 'ice',
    name: 'ICE CAVE',
    wallColor: '#081C2A',
    wallGlow: '#00CCFF',
    bgTop: '#01060C',
    bgBot: '#030C16',
    obstacleColor: '#00BBFF',
    coinColor: '#AAEEFF',
    gridColor: 'rgba(0, 204, 255, 0.025)',
    accentColor: '#00CCFF',
    nodeFarColor: 'rgba(0, 204, 255, 0.07)',
    nodeMidColor: 'rgba(0, 204, 255, 0.04)',
    unlockScore: 0,
  },
};

export const ENV_ORDER: EnvironmentId[] = ['neon', 'cyber', 'lava', 'ice'];

export type PowerupType = 'shield' | 'slowmo' | 'double_score' | 'magnet';

export const POWERUPS: Record<PowerupType, {
  id: PowerupType;
  label: string;
  icon: string;
  color: string;
  duration: number;
}> = {
  shield: {
    id: 'shield',
    label: 'SHIELD',
    icon: 'shield-checkmark',
    color: '#00F5FF',
    duration: 0,
  },
  slowmo: {
    id: 'slowmo',
    label: 'SLOW-MO',
    icon: 'timer-outline',
    color: '#FF9900',
    duration: 5,
  },
  double_score: {
    id: 'double_score',
    label: '2× SCORE',
    icon: 'star',
    color: '#FFE600',
    duration: 10,
  },
  magnet: {
    id: 'magnet',
    label: 'MAGNET',
    icon: 'magnet',
    color: '#FF44CC',
    duration: 8,
  },
};

export const SKINS = [
  {
    id: 'default',
    name: 'Runner',
    color: '#00F5FF',
    glowColor: 'rgba(0, 245, 255, 0.5)',
    trailColor: 'rgba(0, 245, 255, 0.28)',
    eyeColor: '#001A1E',
    unlockScore: 0,
    unlockCoins: 0,
    shape: 'square' as const,
  },
  {
    id: 'robot',
    name: 'Robot',
    color: '#7DF9FF',
    glowColor: 'rgba(125, 249, 255, 0.5)',
    trailColor: 'rgba(125, 249, 255, 0.22)',
    eyeColor: '#FF0080',
    unlockScore: 50,
    unlockCoins: 0,
    shape: 'square' as const,
  },
  {
    id: 'ninja',
    name: 'Ninja',
    color: '#FF0080',
    glowColor: 'rgba(255, 0, 128, 0.5)',
    trailColor: 'rgba(255, 0, 128, 0.22)',
    eyeColor: '#FFFFFF',
    unlockScore: 0,
    unlockCoins: 120,
    shape: 'square' as const,
  },
  {
    id: 'neon_cube',
    name: 'Neon Cube',
    color: '#FFE600',
    glowColor: 'rgba(255, 230, 0, 0.5)',
    trailColor: 'rgba(255, 230, 0, 0.22)',
    eyeColor: '#1A1400',
    unlockScore: 0,
    unlockCoins: 250,
    shape: 'square' as const,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    color: 'rgba(191, 0, 255, 0.9)',
    glowColor: 'rgba(191, 0, 255, 0.5)',
    trailColor: 'rgba(191, 0, 255, 0.18)',
    eyeColor: '#FFFFFF',
    unlockScore: 0,
    unlockCoins: 500,
    shape: 'circle' as const,
  },
  {
    id: 'glitch',
    name: 'Glitch',
    color: '#00FF88',
    glowColor: 'rgba(0, 255, 136, 0.5)',
    trailColor: 'rgba(0, 255, 136, 0.18)',
    eyeColor: '#001A0D',
    unlockScore: 600,
    unlockCoins: 0,
    shape: 'diamond' as const,
  },
];

export const NEXT_SKIN_MILESTONES = [50, 100, 200, 400, 600];

export type ChallengeType = 'survive_seconds' | 'collect_coins' | 'flip_gravity' | 'reach_score' | 'perfect_flips' | 'max_combo';

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  label: string;
  target: number;
  reward: number;
  icon: string;
}

export const CHALLENGE_POOL: DailyChallenge[] = [
  { id: 'c1', type: 'survive_seconds', label: 'Survive 30 seconds', target: 30, reward: 50, icon: 'time-outline' },
  { id: 'c2', type: 'survive_seconds', label: 'Survive 60 seconds', target: 60, reward: 100, icon: 'time-outline' },
  { id: 'c3', type: 'collect_coins', label: 'Collect 20 coins', target: 20, reward: 40, icon: 'ellipse' },
  { id: 'c4', type: 'collect_coins', label: 'Collect 50 coins', target: 50, reward: 80, icon: 'ellipse' },
  { id: 'c5', type: 'flip_gravity', label: 'Flip gravity 15 times', target: 15, reward: 30, icon: 'arrow-up-circle-outline' },
  { id: 'c6', type: 'flip_gravity', label: 'Flip gravity 30 times', target: 30, reward: 60, icon: 'arrow-up-circle-outline' },
  { id: 'c7', type: 'reach_score', label: 'Reach a score of 25', target: 25, reward: 45, icon: 'trophy-outline' },
  { id: 'c8', type: 'reach_score', label: 'Reach a score of 50', target: 50, reward: 80, icon: 'trophy-outline' },
  { id: 'c9', type: 'perfect_flips', label: 'Get 5 perfect flips', target: 5, reward: 35, icon: 'flash-outline' },
  { id: 'c10', type: 'max_combo', label: 'Reach x5 combo', target: 5, reward: 60, icon: 'flame-outline' },
];

export const SCORE_MILESTONES = [10, 25, 50, 100, 200, 500];
