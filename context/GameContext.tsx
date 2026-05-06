import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SKINS, TRAILS, ACHIEVEMENTS, CHALLENGE_POOL, DAILY_REWARDS,
  DailyChallenge, ChallengeType, LifetimeStats,
  UPGRADES, PlayerUpgrades, DEFAULT_UPGRADES, POWERUPS,
} from '@/constants/game';

const STORAGE_KEYS = {
  BEST_SCORE: 'gf_best_score', LEADERBOARD: 'gf_leaderboard', SELECTED_SKIN: 'gf_selected_skin', SELECTED_TRAIL: 'gf_selected_trail',
  SETTINGS: 'gf_settings', TOTAL_RUNS: 'gf_total_runs', COINS: 'gf_coins', GEMS: 'gf_gems', DAILY_CHALLENGES: 'gf_daily_challenges',
  DAILY_CHALLENGE_DATE: 'gf_daily_challenge_date', DAILY_PROGRESS: 'gf_daily_progress', LIFETIME_STATS: 'gf_lifetime_stats', ACHIEVED_IDS: 'gf_achieved_ids',
  DAILY_REWARD_STREAK: 'gf_daily_reward_streak', DAILY_REWARD_DATE: 'gf_daily_reward_date', UPGRADES: 'gf_upgrades', OWNED_SKINS: 'gf_owned_skins', OWNED_TRAILS: 'gf_owned_trails',
  POWERUP_INVENTORY: 'gf_powerup_inventory', BOOST_INVENTORY: 'gf_boost_inventory',
};

type ShopItemType = 'skin' | 'trail' | 'powerup' | 'boost';
export interface ShopItem { id: string; type: ShopItemType; costCoins: number; costGems?: number; owned: boolean; stackCount?: number }
export interface LeaderboardEntry { id: string; score: number; date: string; skinId: string; }
export interface GameSettings { music: boolean; sfx: boolean; vibration: boolean; }
export interface ChallengeProgress { [challengeId: string]: number; }
export interface ChallengeState { challenges: DailyChallenge[]; progress: ChallengeProgress; claimed: string[]; }
const DEFAULT_LIFETIME_STATS: LifetimeStats = { totalFlips: 0, bestSurvival: 0, totalCoinsEarned: 0, bestPerfectFlipsRun: 0, bestScore: 0, totalRuns: 0, bestNearMissesRun: 0 };
interface RunStats { flips: number; survivalSeconds: number; coinsEarned: number; perfectFlips: number; nearMisses: number; score: number; }

interface GameContextValue {
  bestScore: number; leaderboard: LeaderboardEntry[]; selectedSkinId: string; selectedTrailId: string; settings: GameSettings; totalRuns: number;
  coins: number; gems: number; unlockedSkins: string[]; unlockedTrails: string[]; shopItems: ShopItem[]; powerupInventory: Record<string, number>; boostInventory: string[];
  dailyChallenges: ChallengeState; lifetimeStats: LifetimeStats; achievedIds: string[]; dailyRewardStreak: number; dailyRewardClaimed: boolean; upgrades: PlayerUpgrades;
  submitScore: (score: number) => Promise<void>; selectSkin: (skinId: string) => void; selectTrail: (trailId: string) => void; updateSettings: (settings: Partial<GameSettings>) => void;
  getSkinById: (id: string) => typeof SKINS[0]; addCoins: (amount: number) => void; spendCoins: (amount: number) => boolean; addGems: (amount: number) => void; spendGems: (amount: number) => boolean;
  buyShopItem: (itemId: string) => boolean; buyConsumable: (powerupId: string, quantity: number) => boolean; buyBoost: (boostId: string) => boolean;
  updateChallengeProgress: (type: ChallengeType, value: number) => void; claimChallenge: (challengeId: string) => number; recordRunStats: (stats: RunStats) => string[]; claimDailyReward: () => number; upgradeAbility: (id: keyof PlayerUpgrades) => boolean;
}
const GameContext = createContext<GameContextValue | null>(null);
const pickDailyChallenges = () => [...CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
const getTodayDateStr = () => new Date().toISOString().split('T')[0];
const daysBetween = (a: string, b: string) => Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export function GameProvider({ children }: { children: ReactNode }) {
  const [bestScore, setBestScore] = useState(0); const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); const [selectedSkinId, setSelectedSkinId] = useState('default');
  const [selectedTrailId, setSelectedTrailId] = useState('neon'); const [settings, setSettings] = useState<GameSettings>({ music: true, sfx: true, vibration: true }); const [totalRuns, setTotalRuns] = useState(0);
  const [coins, setCoins] = useState(0); const [gems, setGems] = useState(0); const [dailyChallenges, setDailyChallenges] = useState<ChallengeState>({ challenges: [], progress: {}, claimed: [] });
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(DEFAULT_LIFETIME_STATS); const [achievedIds, setAchievedIds] = useState<string[]>([]); const [dailyRewardStreak, setDailyRewardStreak] = useState(0);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false); const [upgrades, setUpgrades] = useState<PlayerUpgrades>(DEFAULT_UPGRADES); const [ownedSkins, setOwnedSkins] = useState<string[]>(['default']);
  const [ownedTrails, setOwnedTrails] = useState<string[]>(['neon']); const [powerupInventory, setPowerupInventory] = useState<Record<string, number>>({}); const [boostInventory, setBoostInventory] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);
  async function loadData() { try { const keys = Object.values(STORAGE_KEYS); const values = await AsyncStorage.multiGet(keys); const data: Record<string, string | null> = {}; values.forEach(([k, v]) => { data[k] = v; });
    if (data[STORAGE_KEYS.BEST_SCORE]) setBestScore(parseInt(data[STORAGE_KEYS.BEST_SCORE]!, 10)); if (data[STORAGE_KEYS.LEADERBOARD]) setLeaderboard(JSON.parse(data[STORAGE_KEYS.LEADERBOARD]!));
    if (data[STORAGE_KEYS.SELECTED_SKIN]) setSelectedSkinId(data[STORAGE_KEYS.SELECTED_SKIN]!); if (data[STORAGE_KEYS.SELECTED_TRAIL]) setSelectedTrailId(data[STORAGE_KEYS.SELECTED_TRAIL]!);
    if (data[STORAGE_KEYS.SETTINGS]) setSettings(JSON.parse(data[STORAGE_KEYS.SETTINGS]!)); if (data[STORAGE_KEYS.TOTAL_RUNS]) setTotalRuns(parseInt(data[STORAGE_KEYS.TOTAL_RUNS]!, 10));
    if (data[STORAGE_KEYS.COINS]) setCoins(parseInt(data[STORAGE_KEYS.COINS]!, 10)); if (data[STORAGE_KEYS.GEMS]) setGems(parseInt(data[STORAGE_KEYS.GEMS]!, 10)); if (data[STORAGE_KEYS.LIFETIME_STATS]) setLifetimeStats(JSON.parse(data[STORAGE_KEYS.LIFETIME_STATS]!));
    if (data[STORAGE_KEYS.ACHIEVED_IDS]) setAchievedIds(JSON.parse(data[STORAGE_KEYS.ACHIEVED_IDS]!)); if (data[STORAGE_KEYS.UPGRADES]) setUpgrades({ ...DEFAULT_UPGRADES, ...JSON.parse(data[STORAGE_KEYS.UPGRADES]!) });
    if (data[STORAGE_KEYS.OWNED_SKINS]) setOwnedSkins(JSON.parse(data[STORAGE_KEYS.OWNED_SKINS]!)); if (data[STORAGE_KEYS.OWNED_TRAILS]) setOwnedTrails(JSON.parse(data[STORAGE_KEYS.OWNED_TRAILS]!));
    if (data[STORAGE_KEYS.POWERUP_INVENTORY]) setPowerupInventory(JSON.parse(data[STORAGE_KEYS.POWERUP_INVENTORY]!)); if (data[STORAGE_KEYS.BOOST_INVENTORY]) setBoostInventory(JSON.parse(data[STORAGE_KEYS.BOOST_INVENTORY]!));
    const today = getTodayDateStr();
    if (data[STORAGE_KEYS.DAILY_CHALLENGE_DATE] === today && data[STORAGE_KEYS.DAILY_CHALLENGES]) { const challenges = JSON.parse(data[STORAGE_KEYS.DAILY_CHALLENGES]!); const progress = data[STORAGE_KEYS.DAILY_PROGRESS] ? JSON.parse(data[STORAGE_KEYS.DAILY_PROGRESS]!) : {}; setDailyChallenges({ challenges, progress: progress.progress || {}, claimed: progress.claimed || [] }); }
    else { const newChallenges = pickDailyChallenges(); await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE, today); await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(newChallenges)); await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: {}, claimed: [] })); setDailyChallenges({ challenges: newChallenges, progress: {}, claimed: [] }); }
    const rewardDate = data[STORAGE_KEYS.DAILY_REWARD_DATE]; const streak = data[STORAGE_KEYS.DAILY_REWARD_STREAK] ? parseInt(data[STORAGE_KEYS.DAILY_REWARD_STREAK]!, 10) : 0;
    if (rewardDate === today) { setDailyRewardStreak(streak); setDailyRewardClaimed(true); } else if (rewardDate && daysBetween(rewardDate, today) === 1) { setDailyRewardStreak(streak); setDailyRewardClaimed(false); } else { setDailyRewardStreak(0); setDailyRewardClaimed(false); }
  } catch {} }

  const unlockedSkins = useMemo(() => SKINS.filter(s => s.unlockCoins === 0 || ownedSkins.includes(s.id)).map(s => s.id), [ownedSkins]);
  const unlockedTrails = useMemo(() => TRAILS.filter(t => t.unlockCoins === 0 || ownedTrails.includes(t.id)).map(t => t.id), [ownedTrails]);
  const shopItems = useMemo<ShopItem[]>(() => ([
    ...SKINS.map(s => ({ id: s.id, type: 'skin' as const, costCoins: s.unlockCoins || 0, owned: unlockedSkins.includes(s.id) })),
    ...TRAILS.map(t => ({ id: t.id, type: 'trail' as const, costCoins: t.unlockCoins || 0, owned: unlockedTrails.includes(t.id) })),
    ...Object.values(POWERUPS).map(p => ({ id: p.id, type: 'powerup' as const, costCoins: 80, costGems: 2, owned: true, stackCount: powerupInventory[p.id] || 0 })),
    ...UPGRADES.map(u => ({ id: u.id, type: 'boost' as const, costCoins: 300, costGems: 8, owned: boostInventory.includes(u.id) })),
  ]), [unlockedSkins, unlockedTrails, powerupInventory, boostInventory]);

  const addCoins = (a: number) => setCoins(p => (AsyncStorage.setItem(STORAGE_KEYS.COINS, String(p + a)), p + a));
  const spendCoins = (a: number) => (coins >= a ? (setCoins(p => (AsyncStorage.setItem(STORAGE_KEYS.COINS, String(p - a)), p - a)), true) : false);
  const addGems = (a: number) => setGems(p => (AsyncStorage.setItem(STORAGE_KEYS.GEMS, String(p + a)), p + a));
  const spendGems = (a: number) => (gems >= a ? (setGems(p => (AsyncStorage.setItem(STORAGE_KEYS.GEMS, String(p - a)), p - a)), true) : false);

  const buyShopItem = (itemId: string) => {
    const item = shopItems.find(s => s.id === itemId && (s.type === 'skin' || s.type === 'trail')); if (!item || item.owned) return true;
    if (item.costCoins > 0 && !spendCoins(item.costCoins)) return false; if (item.costGems && !spendGems(item.costGems)) return false;
    if (item.type === 'skin') { const u = [...ownedSkins, itemId]; setOwnedSkins(u); AsyncStorage.setItem(STORAGE_KEYS.OWNED_SKINS, JSON.stringify(u)); }
    if (item.type === 'trail') { const u = [...ownedTrails, itemId]; setOwnedTrails(u); AsyncStorage.setItem(STORAGE_KEYS.OWNED_TRAILS, JSON.stringify(u)); }
    return true;
  };
  const buyConsumable = (powerupId: string, quantity: number) => {
    const costCoins = 80 * quantity; const costGems = 2 * quantity; if (!spendCoins(costCoins) || !spendGems(costGems)) return false;
    setPowerupInventory(prev => { const next = { ...prev, [powerupId]: (prev[powerupId] || 0) + quantity }; AsyncStorage.setItem(STORAGE_KEYS.POWERUP_INVENTORY, JSON.stringify(next)); return next; }); return true;
  };
  const buyBoost = (boostId: string) => {
    if (boostInventory.includes(boostId)) return true; if (!spendCoins(300) || !spendGems(8)) return false;
    const next = [...boostInventory, boostId]; setBoostInventory(next); AsyncStorage.setItem(STORAGE_KEYS.BOOST_INVENTORY, JSON.stringify(next)); return true;
  };
  const submitScore = async (score: number) => { const newRuns = totalRuns + 1; setTotalRuns(newRuns); AsyncStorage.setItem(STORAGE_KEYS.TOTAL_RUNS, String(newRuns)); const newEntry: LeaderboardEntry = { id: Date.now().toString(), score, date: new Date().toLocaleDateString(), skinId: selectedSkinId }; const newLeaderboard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 20); setLeaderboard(newLeaderboard); AsyncStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(newLeaderboard)); if (score > bestScore) { setBestScore(score); AsyncStorage.setItem(STORAGE_KEYS.BEST_SCORE, String(score)); } };
  const selectSkin = (skinId: string) => { setSelectedSkinId(skinId); AsyncStorage.setItem(STORAGE_KEYS.SELECTED_SKIN, skinId); };
  const selectTrail = (trailId: string) => { setSelectedTrailId(trailId); AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TRAIL, trailId); };
  const updateSettings = (newSettings: Partial<GameSettings>) => { const updated = { ...settings, ...newSettings }; setSettings(updated); AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated)); };
  const getSkinById = (id: string) => SKINS.find(s => s.id === id) || SKINS[0];
  function updateChallengeProgress(type: ChallengeType, value: number) { setDailyChallenges(prev => { const newProgress = { ...prev.progress }; for (const ch of prev.challenges) if (ch.type === type && !prev.claimed.includes(ch.id)) newProgress[ch.id] = Math.max(newProgress[ch.id] || 0, value); AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: newProgress, claimed: prev.claimed })); return { ...prev, progress: newProgress }; }); }
  function claimChallenge(challengeId: string): number { const challenge = dailyChallenges.challenges.find(c => c.id === challengeId); if (!challenge || dailyChallenges.claimed.includes(challengeId) || (dailyChallenges.progress[challengeId] || 0) < challenge.target) return 0; addCoins(challenge.reward); setDailyChallenges(prev => { const newClaimed = [...prev.claimed, challengeId]; AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify({ progress: prev.progress, claimed: newClaimed })); return { ...prev, claimed: newClaimed }; }); return challenge.reward; }
  function recordRunStats(stats: RunStats): string[] { const newStats = { ...lifetimeStats, totalFlips: lifetimeStats.totalFlips + stats.flips, totalRuns: lifetimeStats.totalRuns + 1, totalCoinsEarned: lifetimeStats.totalCoinsEarned + stats.coinsEarned, bestSurvival: Math.max(lifetimeStats.bestSurvival, stats.survivalSeconds), bestPerfectFlipsRun: Math.max(lifetimeStats.bestPerfectFlipsRun, stats.perfectFlips), bestScore: Math.max(lifetimeStats.bestScore, stats.score), bestNearMissesRun: Math.max(lifetimeStats.bestNearMissesRun, stats.nearMisses) }; setLifetimeStats(newStats); AsyncStorage.setItem(STORAGE_KEYS.LIFETIME_STATS, JSON.stringify(newStats)); const newlyUnlocked = ACHIEVEMENTS.filter(a => !achievedIds.includes(a.id) && newStats[a.stat] >= a.target).map(a => a.id); if (newlyUnlocked.length) { const all = [...achievedIds, ...newlyUnlocked]; setAchievedIds(all); AsyncStorage.setItem(STORAGE_KEYS.ACHIEVED_IDS, JSON.stringify(all)); addCoins(ACHIEVEMENTS.filter(a => newlyUnlocked.includes(a.id)).reduce((s, a) => s + a.reward, 0)); } return newlyUnlocked; }
  function upgradeAbility(id: keyof PlayerUpgrades): boolean { const def = UPGRADES.find(u => u.id === id); if (!def) return false; const current = upgrades[id]; if (current >= def.maxLevel || !spendCoins(def.costs[current])) return false; const next = { ...upgrades, [id]: current + 1 }; setUpgrades(next); AsyncStorage.setItem(STORAGE_KEYS.UPGRADES, JSON.stringify(next)); return true; }
  function claimDailyReward(): number { if (dailyRewardClaimed) return 0; const today = getTodayDateStr(); const nextStreak = (dailyRewardStreak % 7) + 1; const reward = DAILY_REWARDS[nextStreak - 1]; addCoins(reward.coins); setDailyRewardStreak(nextStreak); setDailyRewardClaimed(true); AsyncStorage.setItem(STORAGE_KEYS.DAILY_REWARD_STREAK, String(nextStreak)); AsyncStorage.setItem(STORAGE_KEYS.DAILY_REWARD_DATE, today); return reward.coins; }

  const value = useMemo(() => ({ bestScore, leaderboard, selectedSkinId, selectedTrailId, settings, totalRuns, coins, gems, unlockedSkins, unlockedTrails, shopItems, powerupInventory, boostInventory, dailyChallenges, lifetimeStats, achievedIds, dailyRewardStreak, dailyRewardClaimed, upgrades, submitScore, selectSkin, selectTrail, updateSettings, getSkinById, addCoins, spendCoins, addGems, spendGems, buyShopItem, buyConsumable, buyBoost, updateChallengeProgress, claimChallenge, recordRunStats, claimDailyReward, upgradeAbility }), [bestScore, leaderboard, selectedSkinId, selectedTrailId, settings, totalRuns, coins, gems, unlockedSkins, unlockedTrails, shopItems, powerupInventory, boostInventory, dailyChallenges, lifetimeStats, achievedIds, dailyRewardStreak, dailyRewardClaimed, upgrades]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
export function useGame() { const ctx = useContext(GameContext); if (!ctx) throw new Error('useGame must be used within GameProvider'); return ctx; }
