import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SKINS, CHALLENGE_POOL, DailyChallenge, ChallengeType } from '@/constants/game';

const STORAGE_KEYS = {
  BEST_SCORE: 'gf_best_score',
  LEADERBOARD: 'gf_leaderboard',
  SELECTED_SKIN: 'gf_selected_skin',
  SETTINGS: 'gf_settings',
  TOTAL_RUNS: 'gf_total_runs',
  COINS: 'gf_coins',
  DAILY_CHALLENGES: 'gf_daily_challenges',
  DAILY_CHALLENGE_DATE: 'gf_daily_challenge_date',
  DAILY_PROGRESS: 'gf_daily_progress',
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

interface GameContextValue {
  bestScore: number;
  leaderboard: LeaderboardEntry[];
  selectedSkinId: string;
  settings: GameSettings;
  totalRuns: number;
  coins: number;
  unlockedSkins: string[];
  dailyChallenges: ChallengeState;
  submitScore: (score: number) => Promise<void>;
  selectSkin: (skinId: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  getSkinById: (id: string) => typeof SKINS[0];
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  updateChallengeProgress: (type: ChallengeType, value: number) => void;
  claimChallenge: (challengeId: string) => number;
}

const GameContext = createContext<GameContextValue | null>(null);

function pickDailyChallenges(): DailyChallenge[] {
  const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [bestScore, setBestScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState('default');
  const [settings, setSettings] = useState<GameSettings>({ music: true, sfx: true, vibration: true });
  const [totalRuns, setTotalRuns] = useState(0);
  const [coins, setCoins] = useState(0);
  const [dailyChallenges, setDailyChallenges] = useState<ChallengeState>({
    challenges: [],
    progress: {},
    claimed: [],
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [best, lb, skin, settingsData, runs, coinsData, challengeDate, challengeData, progressData] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.BEST_SCORE),
          AsyncStorage.getItem(STORAGE_KEYS.LEADERBOARD),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_SKIN),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.TOTAL_RUNS),
          AsyncStorage.getItem(STORAGE_KEYS.COINS),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGES),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_PROGRESS),
        ]);

      if (best) setBestScore(parseInt(best, 10));
      if (lb) setLeaderboard(JSON.parse(lb));
      if (skin) setSelectedSkinId(skin);
      if (settingsData) setSettings(JSON.parse(settingsData));
      if (runs) setTotalRuns(parseInt(runs, 10));
      if (coinsData) setCoins(parseInt(coinsData, 10));

      const today = getTodayDateStr();
      if (challengeDate === today && challengeData) {
        const challenges = JSON.parse(challengeData);
        const progress = progressData ? JSON.parse(progressData) : {};
        setDailyChallenges({ challenges, progress: progress.progress || {}, claimed: progress.claimed || [] });
      } else {
        const newChallenges = pickDailyChallenges();
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE, today);
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(newChallenges));
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: {}, claimed: [] }));
        setDailyChallenges({ challenges: newChallenges, progress: {}, claimed: [] });
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

  async function submitScore(score: number) {
    const newRuns = totalRuns + 1;
    setTotalRuns(newRuns);
    AsyncStorage.setItem(STORAGE_KEYS.TOTAL_RUNS, String(newRuns));

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      score,
      date: new Date().toLocaleDateString(),
      skinId: selectedSkinId,
    };

    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
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
    if (!challenge) return 0;
    if (dailyChallenges.claimed.includes(challengeId)) return 0;
    const progress = dailyChallenges.progress[challengeId] || 0;
    if (progress < challenge.target) return 0;

    const reward = challenge.reward;
    addCoins(reward);

    setDailyChallenges(prev => {
      const newClaimed = [...prev.claimed, challengeId];
      AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: prev.progress, claimed: newClaimed }));
      return { ...prev, claimed: newClaimed };
    });
    return reward;
  }

  const value = useMemo(() => ({
    bestScore, leaderboard, selectedSkinId, settings, totalRuns,
    coins, unlockedSkins, dailyChallenges,
    submitScore, selectSkin, updateSettings, getSkinById,
    addCoins, spendCoins, updateChallengeProgress, claimChallenge,
  }), [bestScore, leaderboard, selectedSkinId, settings, totalRuns, coins, unlockedSkins, dailyChallenges]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
