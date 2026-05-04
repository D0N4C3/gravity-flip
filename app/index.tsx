import React, { useState, useCallback, useRef } from 'react';
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
  const gameKeyRef = useRef(0);
  // Ref to the live GameScreen so we can call revive() without remounting
  const gameScreenRef = useRef<GameScreenRef>(null);

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
    // Full restart — increment key so GameScreen remounts fresh
    gameKeyRef.current += 1;
    setIsPaused(false);
    setCurrentScore(0);
    setScreen('game');
  }, []);

  const handleRevive = useCallback(() => {
    // Resume from exactly where the player died — do NOT remount GameScreen
    setScreen('game');
    // Give the React tree a tick to hide the DeathScreen overlay, then revive
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

  // GameScreen stays mounted whenever we are not in the menu.
  // The DeathScreen is rendered as an absolute overlay on top of it so that
  // the game world remains visible underneath and revive can resume in-place.
  const gameActive = screen !== 'menu';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent />

      {screen === 'menu' && (
        <MainMenu
          onPlay={handlePlay}
          onSkins={() => setShowSkins(true)}
          onLeaderboard={() => setShowLeaderboard(true)}
          onSettings={() => setShowSettings(true)}
          onChallenges={() => setShowChallenges(true)}
        />
      )}

      {/* GameScreen lives here while any game session is active (playing OR dead).
          Keeping it mounted lets revive() restore the exact game state. */}
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

      {/* Death overlay — sits on top of the still-mounted GameScreen */}
      {screen === 'dead' && (
        <View style={StyleSheet.absoluteFill}>
          <DeathScreen
            score={deathScore}
            coinsEarned={deathCoins}
            onRetry={handleRetry}
            onRevive={handleRevive}
            canRevive={canRevive}
            onMenu={() => setScreen('menu')}
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
          onSettings={() => setShowSettings(true)}
        />
      )}

      <SkinsModal visible={showSkins} onClose={() => setShowSkins(false)} />
      <LeaderboardModal visible={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
      <DailyChallengesModal visible={showChallenges} onClose={() => setShowChallenges(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
