import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import COLORS from '@/constants/colors';
import MainMenu from '@/components/MainMenu';
import GameScreen, { GameScreenRef } from '@/components/GameScreen';
import DeathScreen from '@/components/DeathScreen';
import PauseOverlay from '@/components/PauseOverlay';
import SkinsModal from '@/components/SkinsModal';
import LeaderboardModal from '@/components/LeaderboardModal';
import SettingsModal from '@/components/SettingsModal';
import DailyChallengesModal from '@/components/DailyChallengesModal';
import AchievementsModal from '@/components/AchievementsModal';
import DailyRewardsModal from '@/components/DailyRewardsModal';
import UpgradesModal from '@/components/UpgradesModal';
import ShopModal from '@/components/ShopModal';
import { useGame } from '@/context/GameContext';
import { gameAudio } from '@/lib/audio';

type Screen = 'menu' | 'game' | 'dead';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [deathScore, setDeathScore] = useState(0);
  const [deathCoins, setDeathCoins] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [canRevive, setCanRevive] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const gameKeyRef = useRef(0);
  const { settings } = useGame();
  const gameScreenRef = useRef<GameScreenRef>(null);

  useEffect(() => {
    gameAudio.setSettings({ music: settings.music, sfx: settings.sfx });
    if (screen === 'menu') gameAudio.startMusic();
    else gameAudio.stopMusic();
  }, [settings.music, settings.sfx, screen]);

  const onUiTap = useCallback((fn: () => void) => {
    gameAudio.playSfx('uiClick');
    fn();
  }, []);

  const handlePlay = useCallback(() => {
    gameKeyRef.current += 1;
    setIsPaused(false);
    setCurrentScore(0);
    setScreen('game');
  }, []);

  const handleDeath = useCallback((score: number, coins: number, reviveAvailable: boolean) => {
    setDeathScore(score);
    setDeathCoins(coins);
    setCanRevive(reviveAvailable);
    setIsPaused(false);
    setScreen('dead');
  }, []);

  const handleRetry = useCallback(() => {
    gameKeyRef.current += 1;
    setIsPaused(false);
    setCurrentScore(0);
    setScreen('game');
  }, []);

  const handleRevive = useCallback(() => {
    setScreen('game');
    requestAnimationFrame(() => {
      gameScreenRef.current?.revive();
    });
  }, []);

  const handlePause = useCallback(() => { setIsPaused(true); }, []);
  const handleResume = useCallback(() => { setIsPaused(false); }, []);

  const handleRestartFromPause = useCallback(() => {
    setIsPaused(false);
    gameKeyRef.current += 1;
    setCurrentScore(0);
    setScreen('game');
  }, []);

  const handleMenuFromPause = useCallback(() => {
    setIsPaused(false);
    setScreen('menu');
  }, []);

  const gameActive = screen !== 'menu';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent />

      {screen === 'menu' && (
        <MainMenu
          onPlay={handlePlay}
          onSkins={() => onUiTap(() => setShowSkins(true))}
          onShop={() => onUiTap(() => setShowShop(true))}
          onLeaderboard={() => onUiTap(() => setShowLeaderboard(true))}
          onSettings={() => onUiTap(() => setShowSettings(true))}
          onChallenges={() => onUiTap(() => setShowChallenges(true))}
          onAchievements={() => onUiTap(() => setShowAchievements(true))}
          onDailyRewards={() => onUiTap(() => setShowDailyRewards(true))}
          onUpgrades={() => onUiTap(() => setShowUpgrades(true))}
        />
      )}

      {gameActive && (
        <GameScreen
          key={`game-${gameKeyRef.current}`}
          ref={gameScreenRef}
          onDeath={handleDeath}
          onPause={handlePause}
          isPaused={isPaused}
          onScoreChange={setCurrentScore}
        />
      )}

      {screen === 'dead' && (
        <View style={StyleSheet.absoluteFill}>
          <DeathScreen
            score={deathScore}
            coinsEarned={deathCoins}
            onRetry={handleRetry}
            onRevive={handleRevive}
            canRevive={canRevive}
            onMenu={() => onUiTap(() => setScreen('menu'))}
          />
        </View>
      )}

      {screen === 'game' && (
        <PauseOverlay
          visible={isPaused}
          score={currentScore}
          onResume={handleResume}
          onRestart={handleRestartFromPause}
          onMenu={handleMenuFromPause}
          onSettings={() => onUiTap(() => setShowSettings(true))}
        />
      )}

      <SkinsModal visible={showSkins} onClose={() => onUiTap(() => setShowSkins(false))} />
      <LeaderboardModal visible={showLeaderboard} onClose={() => onUiTap(() => setShowLeaderboard(false))} />
      <SettingsModal visible={showSettings} onClose={() => onUiTap(() => setShowSettings(false))} />
      <DailyChallengesModal visible={showChallenges} onClose={() => onUiTap(() => setShowChallenges(false))} />
      <AchievementsModal visible={showAchievements} onClose={() => onUiTap(() => setShowAchievements(false))} />
      <DailyRewardsModal visible={showDailyRewards} onClose={() => onUiTap(() => setShowDailyRewards(false))} />
      <UpgradesModal visible={showUpgrades} onClose={() => onUiTap(() => setShowUpgrades(false))} />
      <ShopModal visible={showShop} onClose={() => onUiTap(() => setShowShop(false))} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
