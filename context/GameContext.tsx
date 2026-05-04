import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SKINS, TRAILS, ACHIEVEMENTS, CHALLENGE_POOL, DAILY_REWARDS,
  DailyChallenge, ChallengeType, LifetimeStats,
  UPGRADES, PlayerUpgrades, DEFAULT_UPGRADES,
} from '@/constants/game';
import { POWERUP_DEFS } from '@/game/powerups';

const STORAGE_KEYS = {
  BEST_SCORE: 'gf_best_score',
  LEADERBOARD: 'gf_leaderboard',
  SELECTED_SKIN: 'gf_selected_skin',
  SELECTED_TRAIL: 'gf_selected_trail',
  SETTINGS: 'gf_settings',
  TOTAL_RUNS: 'gf_total_runs',
  COINS: 'gf_coins',
  DAILY_CHALLENGES: 'gf_daily_challenges',
  DAILY_CHALLENGE_DATE: 'gf_daily_challenge_date',
  DAILY_PROGRESS: 'gf_daily_progress',
  LIFETIME_STATS: 'gf_lifetime_stats',
  ACHIEVED_IDS: 'gf_achieved_ids',
  DAILY_REWARD_STREAK: 'gf_daily_reward_streak',
  DAILY_REWARD_DATE: 'gf_daily_reward_date',
  UPGRADES: 'gf_upgrades',
};

export interface LeaderboardEntry {
  id: string;
  score: number;
  date: string;
  skinId: string;
}

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  vibration: boolean;
}

export interface ChallengeProgress {
  [challengeId: string]: number;
}

export interface ChallengeState {
  challenges: DailyChallenge[];
  progress: ChallengeProgress;
  claimed: string[];
}

const DEFAULT_LIFETIME_STATS: LifetimeStats = {
  totalFlips: 0,
  bestSurvival: 0,
  totalCoinsEarned: 0,
  bestPerfectFlipsRun: 0,
  bestScore: 0,
  totalRuns: 0,
  bestNearMissesRun: 0,
};

interface RunStats {
  flips: number;
  survivalSeconds: number;
  coinsEarned: number;
  perfectFlips: number;
  nearMisses: number;
  score: number;
}

interface GameContextValue {
  bestScore: number;
  leaderboard: LeaderboardEntry[];
  selectedSkinId: string;
  selectedTrailId: string;
  settings: GameSettings;
  totalRuns: number;
  coins: number;
  unlockedSkins: string[];
  unlockedTrails: string[];
  dailyChallenges: ChallengeState;
  lifetimeStats: LifetimeStats;
  achievedIds: string[];
  dailyRewardStreak: number;
  dailyRewardClaimed: boolean;
  upgrades: PlayerUpgrades;
  submitScore: (score: number) => Promise<void>;
  selectSkin: (skinId: string) => void;
  selectTrail: (trailId: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  getSkinById: (id: string) => typeof SKINS[0];
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  updateChallengeProgress: (type: ChallengeType, value: number) => void;
  claimChallenge: (challengeId: string) => number;
  recordRunStats: (stats: RunStats) => string[];
  claimDailyReward: () => number;
  upgradeAbility: (id: keyof PlayerUpgrades) => boolean;
  powerupDefinitions: typeof POWERUP_DEFS;
}

const GameContext = createContext<GameContextValue | null>(null);

function pickDailyChallenges(): DailyChallenge[] {
  const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round(Math.abs(db - da) / 86400000);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [bestScore, setBestScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState('default');
  const [selectedTrailId, setSelectedTrailId] = useState('neon');
  const [settings, setSettings] = useState<GameSettings>({ music: true, sfx: true, vibration: true });
  const [totalRuns, setTotalRuns] = useState(0);
  const [coins, setCoins] = useState(0);
  const [dailyChallenges, setDailyChallenges] = useState<ChallengeState>({
    challenges: [], progress: {}, claimed: [],
  });
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(DEFAULT_LIFETIME_STATS);
  const [achievedIds, setAchievedIds] = useState<string[]>([]);
  const [dailyRewardStreak, setDailyRewardStreak] = useState(0);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [upgrades, setUpgrades] = useState<PlayerUpgrades>(DEFAULT_UPGRADES);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const keys = [
        STORAGE_KEYS.BEST_SCORE, STORAGE_KEYS.LEADERBOARD, STORAGE_KEYS.SELECTED_SKIN,
        STORAGE_KEYS.SELECTED_TRAIL, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.TOTAL_RUNS,
        STORAGE_KEYS.COINS, STORAGE_KEYS.DAILY_CHALLENGE_DATE, STORAGE_KEYS.DAILY_CHALLENGES,
        STORAGE_KEYS.DAILY_PROGRESS, STORAGE_KEYS.LIFETIME_STATS, STORAGE_KEYS.ACHIEVED_IDS,
        STORAGE_KEYS.DAILY_REWARD_STREAK, STORAGE_KEYS.DAILY_REWARD_DATE,
      ];
      const values = await AsyncStorage.multiGet(keys);
      const data: Record<string, string | null> = {};
      values.forEach(([k, v]) => { data[k] = v; });

      if (data[STORAGE_KEYS.BEST_SCORE]) setBestScore(parseInt(data[STORAGE_KEYS.BEST_SCORE]!, 10));
      if (data[STORAGE_KEYS.LEADERBOARD]) setLeaderboard(JSON.parse(data[STORAGE_KEYS.LEADERBOARD]!));
      if (data[STORAGE_KEYS.SELECTED_SKIN]) setSelectedSkinId(data[STORAGE_KEYS.SELECTED_SKIN]!);
      if (data[STORAGE_KEYS.SELECTED_TRAIL]) setSelectedTrailId(data[STORAGE_KEYS.SELECTED_TRAIL]!);
      if (data[STORAGE_KEYS.SETTINGS]) setSettings(JSON.parse(data[STORAGE_KEYS.SETTINGS]!));
      if (data[STORAGE_KEYS.TOTAL_RUNS]) setTotalRuns(parseInt(data[STORAGE_KEYS.TOTAL_RUNS]!, 10));
      if (data[STORAGE_KEYS.COINS]) setCoins(parseInt(data[STORAGE_KEYS.COINS]!, 10));
      if (data[STORAGE_KEYS.LIFETIME_STATS]) setLifetimeStats(JSON.parse(data[STORAGE_KEYS.LIFETIME_STATS]!));
      if (data[STORAGE_KEYS.ACHIEVED_IDS]) setAchievedIds(JSON.parse(data[STORAGE_KEYS.ACHIEVED_IDS]!));
      if (data[STORAGE_KEYS.UPGRADES]) setUpgrades({ ...DEFAULT_UPGRADES, ...JSON.parse(data[STORAGE_KEYS.UPGRADES]!) });

      // Daily challenges
      const today = getTodayDateStr();
      if (data[STORAGE_KEYS.DAILY_CHALLENGE_DATE] === today && data[STORAGE_KEYS.DAILY_CHALLENGES]) {
        const challenges = JSON.parse(data[STORAGE_KEYS.DAILY_CHALLENGES]!);
        const progress = data[STORAGE_KEYS.DAILY_PROGRESS] ? JSON.parse(data[STORAGE_KEYS.DAILY_PROGRESS]!) : {};
        setDailyChallenges({ challenges, progress: progress.progress || {}, claimed: progress.claimed || [] });
      } else {
        const newChallenges = pickDailyChallenges();
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE, today);
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(newChallenges));
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: {}, claimed: [] }));
        setDailyChallenges({ challenges: newChallenges, progress: {}, claimed: [] });
      }

      // Daily reward streak
      const rewardDate = data[STORAGE_KEYS.DAILY_REWARD_DATE];
      const streak = data[STORAGE_KEYS.DAILY_REWARD_STREAK] ? parseInt(data[STORAGE_KEYS.DAILY_REWARD_STREAK]!, 10) : 0;
      if (rewardDate === today) {
        setDailyRewardStreak(streak);
        setDailyRewardClaimed(true);
      } else if (rewardDate && daysBetween(rewardDate, today) === 1) {
        // Consecutive day
        setDailyRewardStreak(streak);
        setDailyRewardClaimed(false);
      } else {
        // Missed days or first time — reset streak but don't claim yet
        setDailyRewardStreak(0);
        setDailyRewardClaimed(false);
      }
    } catch {}
  }

  const unlockedSkins = useMemo(() => {
    return SKINS.filter(s => {
      const scoreOk = bestScore >= s.unlockScore;
      const coinsOk = coins >= s.unlockCoins;
      return (s.unlockScore > 0 && scoreOk) || (s.unlockCoins > 0 && coinsOk) || (s.unlockScore === 0 && s.unlockCoins === 0);
    }).map(s => s.id);
  }, [bestScore, coins]);

  const unlockedTrails = useMemo(() => {
    return TRAILS.filter(t => coins >= t.unlockCoins || t.unlockCoins === 0).map(t => t.id);
  }, [coins]);

  async function submitScore(score: number) {
    const newRuns = totalRuns + 1;
    setTotalRuns(newRuns);
    AsyncStorage.setItem(STORAGE_KEYS.TOTAL_RUNS, String(newRuns));

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      score, date: new Date().toLocaleDateString(), skinId: selectedSkinId,
    };
    const newLeaderboard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 20);
    setLeaderboard(newLeaderboard);
    AsyncStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(newLeaderboard));

    if (score > bestScore) {
      setBestScore(score);
      AsyncStorage.setItem(STORAGE_KEYS.BEST_SCORE, String(score));
    }
  }

  function selectSkin(skinId: string) {
    setSelectedSkinId(skinId);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_SKIN, skinId);
  }

  function selectTrail(trailId: string) {
    setSelectedTrailId(trailId);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TRAIL, trailId);
  }

  function updateSettings(newSettings: Partial<GameSettings>) {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }

  function getSkinById(id: string) {
    return SKINS.find(s => s.id === id) || SKINS[0];
  }

  function addCoins(amount: number) {
    setCoins(prev => {
      const newVal = prev + amount;
      AsyncStorage.setItem(STORAGE_KEYS.COINS, String(newVal));
      return newVal;
    });
  }

  function spendCoins(amount: number): boolean {
    if (coins < amount) return false;
    setCoins(prev => {
      const newVal = prev - amount;
      AsyncStorage.setItem(STORAGE_KEYS.COINS, String(newVal));
      return newVal;
    });
    return true;
  }

  function updateChallengeProgress(type: ChallengeType, value: number) {
    setDailyChallenges(prev => {
      const newProgress = { ...prev.progress };
      for (const ch of prev.challenges) {
        if (ch.type === type && !prev.claimed.includes(ch.id)) {
          newProgress[ch.id] = Math.max(newProgress[ch.id] || 0, value);
        }
      }
      const updated = { ...prev, progress: newProgress };
      AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: newProgress, claimed: prev.claimed }));
      return updated;
    });
  }

  function claimChallenge(challengeId: string): number {
    const challenge = dailyChallenges.challenges.find(c => c.id === challengeId);
    if (!challenge || dailyChallenges.claimed.includes(challengeId)) return 0;
    if ((dailyChallenges.progress[challengeId] || 0) < challenge.target) return 0;

    addCoins(challenge.reward);
    setDailyChallenges(prev => {
      const newClaimed = [...prev.claimed, challengeId];
      AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: prev.progress, claimed: newClaimed }));
      return { ...prev, claimed: newClaimed };
    });
    return challenge.reward;
  }

  // Records run stats, checks achievements, awards coins. Returns newly unlocked achievement IDs.
  function recordRunStats(stats: RunStats): string[] {
    const newStats = { ...lifetimeStats };
    newStats.totalFlips += stats.flips;
    newStats.totalRuns += 1;
    newStats.totalCoinsEarned += stats.coinsEarned;
    newStats.bestSurvival = Math.max(newStats.bestSurvival, stats.survivalSeconds);
    newStats.bestPerfectFlipsRun = Math.max(newStats.bestPerfectFlipsRun, stats.perfectFlips);
    newStats.bestScore = Math.max(newStats.bestScore, stats.score);
    newStats.bestNearMissesRun = Math.max(newStats.bestNearMissesRun, stats.nearMisses);

    setLifetimeStats(newStats);
    AsyncStorage.setItem(STORAGE_KEYS.LIFETIME_STATS, JSON.stringify(newStats));

    // Check achievements
    const newlyUnlocked: string[] = [];
    const currentAchieved = achievedIds;

    for (const ach of ACHIEVEMENTS) {
      if (currentAchieved.includes(ach.id)) continue;
      const val = newStats[ach.stat];
      if (val >= ach.target) {
        newlyUnlocked.push(ach.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      const allAchieved = [...currentAchieved, ...newlyUnlocked];
      setAchievedIds(allAchieved);
      AsyncStorage.setItem(STORAGE_KEYS.ACHIEVED_IDS, JSON.stringify(allAchieved));
      // Award coins for each newly unlocked achievement
      const totalReward = ACHIEVEMENTS
        .filter(a => newlyUnlocked.includes(a.id))
        .reduce((sum, a) => sum + a.reward, 0);
      if (totalReward > 0) addCoins(totalReward);
    }

    return newlyUnlocked;
  }

  function upgradeAbility(id: keyof PlayerUpgrades): boolean {
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return false;
    const currentLevel = upgrades[id];
    if (currentLevel >= def.maxLevel) return false;
    const cost = def.costs[currentLevel];
    if (!spendCoins(cost)) return false;
    const newUpgrades = { ...upgrades, [id]: currentLevel + 1 };
    setUpgrades(newUpgrades);
    AsyncStorage.setItem(STORAGE_KEYS.UPGRADES, JSON.stringify(newUpgrades));
    return true;
  }

  function claimDailyReward(): number {
    if (dailyRewardClaimed) return 0;
    const today = getTodayDateStr();
    // streak is 0-indexed (0 = first claim, 6 = day 7)
    const nextStreak = (dailyRewardStreak % 7) + 1;
    const reward = DAILY_REWARDS[nextStreak - 1];
    addCoins(reward.coins);

    setDailyRewardStreak(nextStreak);
    setDailyRewardClaimed(true);
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_REWARD_STREAK, String(nextStreak));
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_REWARD_DATE, today);
    return reward.coins;
  }

  const value = useMemo(() => ({
    bestScore, leaderboard, selectedSkinId, selectedTrailId, settings, totalRuns,
    coins, unlockedSkins, unlockedTrails, dailyChallenges, lifetimeStats, achievedIds,
    dailyRewardStreak, dailyRewardClaimed, upgrades,
    submitScore, selectSkin, selectTrail, updateSettings, getSkinById,
    addCoins, spendCoins, updateChallengeProgress, claimChallenge, recordRunStats, claimDailyReward, upgradeAbility,
    powerupDefinitions: POWERUP_DEFS,
  }), [bestScore, leaderboard, selectedSkinId, selectedTrailId, settings, totalRuns,
    coins, unlockedSkins, unlockedTrails, dailyChallenges, lifetimeStats, achievedIds,
    dailyRewardStreak, dailyRewardClaimed, upgrades]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
