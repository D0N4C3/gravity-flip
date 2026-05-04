import { Dimensions } from 'react-native';
import { POWERUP_DEFS } from '@/game/powerups';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SCREEN = { WIDTH: SCREEN_WIDTH, HEIGHT: SCREEN_HEIGHT };

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
  COIN_VISUAL_RADIUS: 11,
  COIN_COLLECT_RADIUS: 26,
  COIN_SPAWN_CHANCE: 0.68,
  POWERUP_VISUAL_RADIUS: 16,
  POWERUP_COLLECT_RADIUS: 30,
  POWERUP_SPAWN_CHANCE: 0.12,
  SPRING_K: 680,
  SPRING_D: 38,
  FLIP_COOLDOWN: 0.32,
  PERFECT_FLIP_WINDOW: 0.45,
  ENV_CHANGE_INTERVAL: 28,
};

export const BALANCING = {
  milestones: [50, 100, 200, 400, 600],
  economy: {
    targetCoinsPerRun: { min: 10, max: 30, avg: 20 },
    midTierPriceTarget: 500,
    highTierPriceTarget: 1500,
  },
  rewards: {
    dailyRewards: [50, 100, 200, 400, 600, 800, 1200],
    challengeRewards: {
      low: 50,
      medium: 100,
      high: 200,
      elite: 400,
      legendary: 600,
    },
  },
  upgrades: {
    flip_speed: { costs: [100, 250, 500], effects: ['Cooldown 0.26s', 'Cooldown 0.20s', 'Cooldown 0.14s'] },
    magnet_radius: { costs: [125, 300, 600], effects: ['+45 range', '+90 range', '+150 range'] },
    shield_strength: { costs: [150, 350, 700], effects: ['2 hits', '3 hits', '4 hits'] },
    score_multiplier: { costs: [120, 300, 650], effects: ['+1 / sec', '+2 / sec', '+3 / sec'] },
  },
} as const;

export type EnvironmentId = 'neon' | 'cyber' | 'lava' | 'ice';

export const ENVIRONMENTS: Record<EnvironmentId, {
  id: EnvironmentId; name: string; wallColor: string; wallGlow: string;
  bgTop: string; bgBot: string; obstacleColor: string; coinColor: string;
  gridColor: string; accentColor: string; nodeFarColor: string; nodeMidColor: string;
  unlockScore: number;
}> = {
  neon: {
    id: 'neon', name: 'NEON TUNNEL', wallColor: '#0E2540', wallGlow: '#00F5FF',
    bgTop: '#010609', bgBot: '#030A14', obstacleColor: '#FF0080', coinColor: '#FFE600',
    gridColor: 'rgba(0, 245, 255, 0.025)', accentColor: '#00F5FF',
    nodeFarColor: 'rgba(0, 245, 255, 0.07)', nodeMidColor: 'rgba(0, 245, 255, 0.04)', unlockScore: 0,
  },
  cyber: {
    id: 'cyber', name: 'CYBER CITY', wallColor: '#120C30', wallGlow: '#8800FF',
    bgTop: '#040010', bgBot: '#08001C', obstacleColor: '#00FF88', coinColor: '#CC44FF',
    gridColor: 'rgba(136, 0, 255, 0.03)', accentColor: '#8800FF',
    nodeFarColor: 'rgba(136, 0, 255, 0.08)', nodeMidColor: 'rgba(136, 0, 255, 0.04)', unlockScore: 0,
  },
  lava: {
    id: 'lava', name: 'LAVA CORRIDOR', wallColor: '#2E1008', wallGlow: '#FF5500',
    bgTop: '#0E0301', bgBot: '#180605', obstacleColor: '#FF6600', coinColor: '#FFD700',
    gridColor: 'rgba(255, 85, 0, 0.03)', accentColor: '#FF5500',
    nodeFarColor: 'rgba(255, 85, 0, 0.08)', nodeMidColor: 'rgba(255, 85, 0, 0.04)', unlockScore: 0,
  },
  ice: {
    id: 'ice', name: 'ICE CAVE', wallColor: '#081C2A', wallGlow: '#00CCFF',
    bgTop: '#01060C', bgBot: '#030C16', obstacleColor: '#00BBFF', coinColor: '#AAEEFF',
    gridColor: 'rgba(0, 204, 255, 0.025)', accentColor: '#00CCFF',
    nodeFarColor: 'rgba(0, 204, 255, 0.07)', nodeMidColor: 'rgba(0, 204, 255, 0.04)', unlockScore: 0,
  },
};

export const ENV_ORDER: EnvironmentId[] = ['neon', 'cyber', 'lava', 'ice'];

export type { PowerupType } from '@/game/powerups';

export const POWERUPS = {
  shield: { ...POWERUP_DEFS.shield, duration: POWERUP_DEFS.shield.durationMs / 1000 },
  slowmo: { ...POWERUP_DEFS.slowmo, duration: POWERUP_DEFS.slowmo.durationMs / 1000 },
  double_score: { ...POWERUP_DEFS.double_score, duration: POWERUP_DEFS.double_score.durationMs / 1000 },
  magnet: { ...POWERUP_DEFS.magnet, duration: POWERUP_DEFS.magnet.durationMs / 1000 },
};

export const SKINS = [
  { id: 'default', name: 'Runner', color: '#00F5FF', glowColor: 'rgba(0, 245, 255, 0.5)', trailColor: 'rgba(0, 245, 255, 0.28)', eyeColor: '#001A1E', unlockScore: 0, unlockCoins: 0, shape: 'square' as const },
  { id: 'robot', name: 'Robot', color: '#7DF9FF', glowColor: 'rgba(125, 249, 255, 0.5)', trailColor: 'rgba(125, 249, 255, 0.22)', eyeColor: '#FF0080', unlockScore: 50, unlockCoins: 0, shape: 'square' as const },
  { id: 'ninja', name: 'Ninja', color: '#FF0080', glowColor: 'rgba(255, 0, 128, 0.5)', trailColor: 'rgba(255, 0, 128, 0.22)', eyeColor: '#FFFFFF', unlockScore: 0, unlockCoins: 120, shape: 'square' as const },
  { id: 'neon_cube', name: 'Neon Cube', color: '#FFE600', glowColor: 'rgba(255, 230, 0, 0.5)', trailColor: 'rgba(255, 230, 0, 0.22)', eyeColor: '#1A1400', unlockScore: 0, unlockCoins: 250, shape: 'square' as const },
  { id: 'ghost', name: 'Ghost', color: 'rgba(191, 0, 255, 0.9)', glowColor: 'rgba(191, 0, 255, 0.5)', trailColor: 'rgba(191, 0, 255, 0.18)', eyeColor: '#FFFFFF', unlockScore: 0, unlockCoins: 500, shape: 'circle' as const },
  { id: 'glitch', name: 'Glitch', color: '#00FF88', glowColor: 'rgba(0, 255, 136, 0.5)', trailColor: 'rgba(0, 255, 136, 0.18)', eyeColor: '#001A0D', unlockScore: 600, unlockCoins: 0, shape: 'diamond' as const },
];

export const NEXT_SKIN_MILESTONES = [...BALANCING.milestones];

// ─── Trail Types ───────────────────────────────────────────────────────────────

export interface TrailDef {
  id: string;
  name: string;
  colors: string[];
  unlockCoins: number;
  preview: string;
}

export const TRAILS: TrailDef[] = [
  { id: 'neon', name: 'Neon Pulse', colors: ['#00F5FF', '#00CCFF', '#80FAFF'], unlockCoins: 0, preview: '#00F5FF' },
  { id: 'fire', name: 'Fire Blaze', colors: ['#FF6600', '#FF3300', '#FF9900', '#FFCC00'], unlockCoins: 300, preview: '#FF6600' },
  { id: 'ice', name: 'Ice Crystal', colors: ['#00CCFF', '#AAEEFF', '#FFFFFF', '#88DDFF'], unlockCoins: 400, preview: '#88DDFF' },
  { id: 'glitch', name: 'Glitch Wave', colors: ['#FF00FF', '#00FF88', '#FF0080', '#8800FF'], unlockCoins: 500, preview: '#FF00FF' },
  { id: 'gold', name: 'Gold Rush', colors: ['#FFE600', '#FFAA00', '#FFD700', '#FFF080'], unlockCoins: 600, preview: '#FFE600' },
  { id: 'rainbow', name: 'Rainbow', colors: ['#FF0080', '#FF6600', '#FFE600', '#00FF88', '#00F5FF', '#8800FF'], unlockCoins: 700, preview: '#8800FF' },
];

// ─── Achievements ──────────────────────────────────────────────────────────────

export type AchievementStat =
  | 'totalFlips' | 'bestSurvival' | 'totalCoinsEarned'
  | 'bestPerfectFlipsRun' | 'bestScore' | 'totalRuns' | 'bestNearMissesRun';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  stat: AchievementStat;
  target: number;
  reward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_flip', title: 'First Steps', description: 'Flip gravity for the first time', icon: 'arrow-up-circle', stat: 'totalFlips', target: 1, reward: 20 },
  { id: 'survivor', title: 'Survivor', description: 'Survive 60 seconds in one run', icon: 'time', stat: 'bestSurvival', target: 60, reward: 50 },
  { id: 'coin_hoarder', title: 'Coin Hoarder', description: 'Earn 100 coins total', icon: 'ellipse', stat: 'totalCoinsEarned', target: 100, reward: 30 },
  { id: 'perfect_streak', title: 'Perfect Streak', description: '10 perfect flips in one run', icon: 'flash', stat: 'bestPerfectFlipsRun', target: 10, reward: 75 },
  { id: 'high_scorer', title: 'High Scorer', description: 'Reach a score of 100', icon: 'trophy', stat: 'bestScore', target: 100, reward: 60 },
  { id: 'veteran', title: 'Veteran', description: 'Complete 10 runs', icon: 'game-controller', stat: 'totalRuns', target: 10, reward: 40 },
  { id: 'danger_zone', title: 'Danger Zone', description: '10 near misses in one run', icon: 'warning', stat: 'bestNearMissesRun', target: 10, reward: 50 },
];

export interface LifetimeStats {
  totalFlips: number;
  bestSurvival: number;
  totalCoinsEarned: number;
  bestPerfectFlipsRun: number;
  bestScore: number;
  totalRuns: number;
  bestNearMissesRun: number;
}

// ─── Daily Rewards ─────────────────────────────────────────────────────────────

export const DAILY_REWARDS = BALANCING.rewards.dailyRewards.map((coins, idx) => ({ day: idx + 1, coins }));

// ─── Challenges ────────────────────────────────────────────────────────────────

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
  { id: 'c1', type: 'survive_seconds', label: 'Survive 30 seconds', target: 30, reward: BALANCING.rewards.challengeRewards.low, icon: 'time-outline' },
  { id: 'c2', type: 'survive_seconds', label: 'Survive 60 seconds', target: 60, reward: BALANCING.rewards.challengeRewards.medium, icon: 'time-outline' },
  { id: 'c3', type: 'collect_coins', label: 'Collect 20 coins', target: 20, reward: BALANCING.rewards.challengeRewards.low, icon: 'ellipse' },
  { id: 'c4', type: 'collect_coins', label: 'Collect 50 coins', target: 50, reward: BALANCING.rewards.challengeRewards.high, icon: 'ellipse' },
  { id: 'c5', type: 'flip_gravity', label: 'Flip gravity 15 times', target: 15, reward: BALANCING.rewards.challengeRewards.low, icon: 'arrow-up-circle-outline' },
  { id: 'c6', type: 'flip_gravity', label: 'Flip gravity 30 times', target: 30, reward: BALANCING.rewards.challengeRewards.medium, icon: 'arrow-up-circle-outline' },
  { id: 'c7', type: 'reach_score', label: 'Reach a score of 25', target: 25, reward: BALANCING.rewards.challengeRewards.medium, icon: 'trophy-outline' },
  { id: 'c8', type: 'reach_score', label: 'Reach a score of 50', target: 50, reward: BALANCING.rewards.challengeRewards.high, icon: 'trophy-outline' },
  { id: 'c9', type: 'perfect_flips', label: 'Get 5 perfect flips', target: 5, reward: BALANCING.rewards.challengeRewards.low, icon: 'flash-outline' },
  { id: 'c10', type: 'max_combo', label: 'Reach x5 combo', target: 5, reward: BALANCING.rewards.challengeRewards.medium, icon: 'flame-outline' },
];

export const SCORE_MILESTONES = [10, 25, 50, 100, 200, 500];

// ─── Player Upgrades ───────────────────────────────────────────────────────────

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  costs: number[];         // coin cost for each level (3 entries)
  effectLabels: string[]; // human-readable effect at each level
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'flip_speed',
    name: 'Flip Speed',
    description: 'Reduce gravity flip cooldown',
    icon: 'flash',
    maxLevel: 3,
    costs: [...BALANCING.upgrades.flip_speed.costs],
    effectLabels: [...BALANCING.upgrades.flip_speed.effects],
  },
  {
    id: 'magnet_radius',
    name: 'Magnet Power',
    description: 'Expand coin magnet attraction range',
    icon: 'magnet',
    maxLevel: 3,
    costs: [...BALANCING.upgrades.magnet_radius.costs],
    effectLabels: [...BALANCING.upgrades.magnet_radius.effects],
  },
  {
    id: 'shield_strength',
    name: 'Shield Armor',
    description: 'Shield absorbs more hits before breaking',
    icon: 'shield-checkmark',
    maxLevel: 3,
    costs: [...BALANCING.upgrades.shield_strength.costs],
    effectLabels: [...BALANCING.upgrades.shield_strength.effects],
  },
  {
    id: 'score_multiplier',
    name: 'Score Boost',
    description: 'Earn passive bonus score every second',
    icon: 'star',
    maxLevel: 3,
    costs: [...BALANCING.upgrades.score_multiplier.costs],
    effectLabels: [...BALANCING.upgrades.score_multiplier.effects],
  },
];

export interface PlayerUpgrades {
  flip_speed: number;
  magnet_radius: number;
  shield_strength: number;
  score_multiplier: number;
}

export const DEFAULT_UPGRADES: PlayerUpgrades = {
  flip_speed: 0,
  magnet_radius: 0,
  shield_strength: 0,
  score_multiplier: 0,
};
