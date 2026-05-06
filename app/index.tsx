import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Modal, Text, TextInput, TouchableOpacity } from 'react-native';
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
  const [draftName, setDraftName] = useState('');
  const gameKeyRef = useRef(0);
  const { settings, playerName, setPlayerName } = useGame();
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
  const shouldPromptName = !playerName;

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

      <Modal visible={shouldPromptName} transparent animationType="fade">
        <View style={styles.nameOverlay}>
          <View style={styles.nameCard}>
            <Text style={styles.nameTitle}>REGISTER PILOT NAME</Text>
            <Text style={styles.nameSubtitle}>This name appears on leaderboard entries.</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              maxLength={18}
              autoCapitalize="words"
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.nameInput}
            />
            <TouchableOpacity
              style={[styles.nameButton, !draftName.trim() && { opacity: 0.5 }]}
              disabled={!draftName.trim()}
              onPress={() => setPlayerName(draftName)}
            >
              <Text style={styles.nameButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  nameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 22 },
  nameCard: { borderRadius: 18, backgroundColor: '#081627', padding: 20, borderWidth: 1, borderColor: 'rgba(0,245,255,0.24)' },
  nameTitle: { color: COLORS.neonCyan, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 8, fontSize: 16 },
  nameSubtitle: { color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  nameInput: { borderWidth: 1, borderColor: 'rgba(0,245,255,0.3)', borderRadius: 12, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  nameButton: { backgroundColor: COLORS.neonCyan, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  nameButtonText: { color: COLORS.background, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
});
