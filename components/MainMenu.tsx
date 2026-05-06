import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { ACHIEVEMENTS, MILESTONE_REWARDS } from '@/constants/game';
import { useGame } from '@/context/GameContext';
import { gameAudio } from '@/lib/audio';

interface Props {
  onPlay: () => void;
  onSkins: () => void;
  onShop: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  onChallenges: () => void;
  onAchievements: () => void;
  onDailyRewards: () => void;
  onUpgrades: () => void;
}

export default function MainMenu({ onPlay, onSkins, onShop, onLeaderboard, onSettings, onChallenges, onAchievements, onDailyRewards, onUpgrades }: Props) {
  const insets = useSafeAreaInsets();
  const { bestScore, coins, dailyChallenges, achievedIds, dailyRewardClaimed, milestoneClaimedIds } = useGame();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const playerAnim = useRef(new Animated.Value(0)).current;
  const eyeAnim = useRef(new Animated.Value(0)).current;

  const pendingChallenges = dailyChallenges.challenges.filter(
    ch => !dailyChallenges.claimed.includes(ch.id) && (dailyChallenges.progress[ch.id] || 0) >= ch.target
  ).length;

  const newAchievements = ACHIEVEMENTS.filter(a => !achievedIds.includes(a.id)).length;
  const canClaimReward = !dailyRewardClaimed;
  const upcomingMilestones = MILESTONE_REWARDS.filter(m => !milestoneClaimedIds.includes(m.id)).slice(0, 2);
  const claimedMilestones = milestoneClaimedIds.length;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(buttonsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -10, duration: 1400, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(playerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(playerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(400),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.delay(2000),
      Animated.timing(eyeAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(eyeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ])).start();
  }, []);

  function handlePlay() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); gameAudio.playSfx('uiClick'); onPlay(); }
  function handleBtn(fn: () => void) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); gameAudio.playSfx('uiClick'); fn(); }

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={['#020810', '#050A14', '#070E1C']}
      style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding + 20 }]}
    >
      <GridLines />

      <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ translateY: floatAnim }, { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }] }]}>
        <Animated.View style={[styles.heroPlayer, {
          transform: [{ translateY: playerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) }],
        }]}>
          <View style={styles.heroPlayerBody}>
            <Animated.View style={[styles.heroEyeL, { transform: [{ scaleY: eyeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) }] }]} />
            <Animated.View style={[styles.heroEyeR, { transform: [{ scaleY: eyeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) }] }]} />
          </View>
          {/* Flip trail preview */}
          <View style={styles.heroTrailWrap}>
            {['#00F5FF', '#00CCFF', '#80FAFF', '#00F5FF88'].map((c, i) => (
              <View key={i} style={[styles.heroTrailStreak, { backgroundColor: c, width: 18 - i * 3, opacity: 1 - i * 0.2 }]} />
            ))}
          </View>
        </Animated.View>

        <Text style={styles.logoTitle}>GRAVITY</Text>
        <Text style={styles.logoSubtitle}>FLIP</Text>
        <Text style={styles.logoTagline}>SURVIVE THE CORRIDOR</Text>
      </Animated.View>

      {/* Stats row */}
      {(bestScore > 0 || coins > 0) && (
        <Animated.View style={[styles.statsRow, { opacity: buttonsAnim }]}>
          {bestScore > 0 && (
            <View style={styles.statBadge}>
              <Ionicons name="trophy" size={13} color={COLORS.neonYellow} />
              <Text style={styles.statValue}>{bestScore}</Text>
            </View>
          )}
          {coins > 0 && (
            <View style={[styles.statBadge, { borderColor: 'rgba(255,230,0,0.2)', backgroundColor: 'rgba(255,230,0,0.07)' }]}>
              <View style={styles.coinDot} />
              <Text style={[styles.statValue, { color: COLORS.neonYellow }]}>{coins}</Text>
            </View>
          )}
        </Animated.View>
      )}

      <Animated.View style={[styles.buttonsSection, { opacity: buttonsAnim, transform: [{ translateY: buttonsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity onPress={handlePlay} activeOpacity={0.85} style={styles.playButton}>
            <LinearGradient colors={['#00F5FF', '#00C2CC']} style={styles.playGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="play" size={28} color={COLORS.background} />
              <Text style={styles.playText}>PLAY</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Row 1 */}
        <View style={styles.gridRow}>
          <TouchableOpacity onPress={() => handleBtn(onChallenges)} activeOpacity={0.75} style={styles.gridBtn}>
            <LinearGradient colors={['rgba(255,230,0,0.15)', 'rgba(255,230,0,0.04)']} style={styles.gridBtnInner}>
              <View style={styles.badgeWrap}>
                <Ionicons name="flash" size={20} color={COLORS.neonYellow} />
                {pendingChallenges > 0 && <View style={styles.pendingDot} />}
              </View>
              <Text style={[styles.gridBtnText, { color: COLORS.neonYellow }]}>DAILY</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onSkins)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <MaterialCommunityIcons name="palette-outline" size={20} color={COLORS.neonCyan} />
              <Text style={styles.gridBtnText}>CUSTOM</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onShop)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <Ionicons name="cart-outline" size={20} color={COLORS.neonCyan} />
              <Text style={styles.gridBtnText}>SHOP</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onLeaderboard)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <Ionicons name="trophy-outline" size={20} color={COLORS.neonYellow} />
              <Text style={[styles.gridBtnText, { color: COLORS.neonYellow }]}>RANKS</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          <TouchableOpacity onPress={() => handleBtn(onAchievements)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <View style={styles.badgeWrap}>
                <Ionicons name="medal-outline" size={20} color='#FF9900' />
                {newAchievements > 0 && <View style={[styles.pendingDot, { backgroundColor: '#FF9900' }]} />}
              </View>
              <Text style={[styles.gridBtnText, { color: '#FF9900' }]}>ACHIEVE</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onDailyRewards)} activeOpacity={0.75} style={styles.gridBtn}>
            <LinearGradient
              colors={canClaimReward ? ['rgba(255,230,0,0.15)', 'rgba(255,230,0,0.04)'] : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
              style={styles.gridBtnInner}
            >
              <View style={styles.badgeWrap}>
                <Ionicons name="gift-outline" size={20} color={canClaimReward ? COLORS.neonYellow : COLORS.textMuted} />
                {canClaimReward && <View style={styles.pendingDot} />}
              </View>
              <Text style={[styles.gridBtnText, canClaimReward ? { color: COLORS.neonYellow } : { color: COLORS.textMuted }]}>REWARDS</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onSettings)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.gridBtnText, { color: COLORS.textSecondary }]}>CONFIG</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Upgrades — full-width */}
        <TouchableOpacity onPress={() => handleBtn(onUpgrades)} activeOpacity={0.75} style={styles.upgradesBtn}>
          <LinearGradient colors={['rgba(0,245,255,0.14)', 'rgba(0,245,255,0.04)']} style={styles.upgradesBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="flash" size={18} color={COLORS.neonCyan} />
            <Text style={[styles.gridBtnText, { color: COLORS.neonCyan, letterSpacing: 2 }]}>UPGRADES</Text>
            <Ionicons name="chevron-forward" size={14} color={`${COLORS.neonCyan}80`} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>



      <LinearGradient
        colors={['rgba(0,245,255,0.12)', 'rgba(5,15,30,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.milestonePanel}
      >
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneHeaderLeft}>
            <Ionicons name="flag-outline" size={14} color={COLORS.neonCyan} />
            <Text style={styles.milestoneTitle}>MILESTONES</Text>
          </View>
          <Text style={styles.milestoneClaimed}>{claimedMilestones}/{MILESTONE_REWARDS.length} claimed</Text>
        </View>
        {upcomingMilestones.map((m, idx) => (
          <View key={m.id} style={[styles.milestoneRow, idx > 0 && styles.milestoneRowDivider]}>
            <View style={styles.milestoneScorePill}>
              <Text style={styles.milestoneScore}>SCORE {m.score}</Text>
            </View>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneText}>{m.title}</Text>
              <Text style={styles.milestoneSubtext}>Unlock reward on your next run</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.35)" />
          </View>
        ))}
      </LinearGradient>
      <Text style={styles.tapHint}>TAP SCREEN TO FLIP GRAVITY</Text>
    </LinearGradient>
  );
}

function GridLines() {
  const lines = 10;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lines }, (_, i) => (
        <View key={`h${i}`} style={[styles.gridH, { top: `${(i / (lines - 1)) * 100}%` as any }]} />
      ))}
      {Array.from({ length: lines }, (_, i) => (
        <View key={`v${i}`} style={[styles.gridV, { left: `${(i / (lines - 1)) * 100}%` as any }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,245,255,0.03)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,245,255,0.03)' },
  logoSection: { alignItems: 'center', marginTop: 16, gap: 2 },
  heroPlayer: { marginBottom: 12, alignItems: 'center' },
  heroPlayerBody: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: COLORS.neonCyan,
    shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 16,
  },
  heroEyeL: { position: 'absolute', left: 9, top: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: '#001A1E' },
  heroEyeR: { position: 'absolute', left: 25, top: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: '#001A1E' },
  heroTrailWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  heroTrailStreak: { height: 4, borderRadius: 2 },
  logoTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 52, color: COLORS.neonCyan, letterSpacing: 10,
    textShadowColor: COLORS.neonCyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18, lineHeight: 58,
  },
  logoSubtitle: {
    fontFamily: 'Inter_700Bold', fontSize: 52, color: COLORS.neonPink, letterSpacing: 18,
    textShadowColor: COLORS.neonPink, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18, lineHeight: 58, marginTop: -6,
  },
  logoTagline: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textMuted, letterSpacing: 4, marginTop: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,230,0,0.07)', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,230,0,0.15)',
  },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15, color: COLORS.neonYellow },
  coinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.neonYellow },
  upgradesBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,245,255,0.15)' },
  upgradesBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 20 },
  buttonsSection: { width: '100%', paddingHorizontal: 20, gap: 10 },
  playButton: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 8,
  },
  playGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  playText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: COLORS.background, letterSpacing: 4 },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridBtn: {
    flex: 1, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,245,255,0.12)', backgroundColor: 'rgba(0,245,255,0.04)',
  },
  gridBtnInner: { alignItems: 'center', paddingVertical: 12, gap: 4 },
  gridBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: COLORS.neonCyan, letterSpacing: 2 },
  badgeWrap: { position: 'relative' },
  pendingDot: {
    position: 'absolute', top: -2, right: -2, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.neonYellow,
    borderWidth: 1.5, borderColor: '#070E1C',
  },
  milestonePanel: {
    width: '92%',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    shadowColor: COLORS.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  milestoneTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: COLORS.neonCyan },
  milestoneClaimed: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textMuted },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  milestoneRowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  milestoneScorePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,230,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,0,0.2)',
  },
  milestoneScore: { fontFamily: 'Inter_700Bold', fontSize: 10, color: COLORS.neonYellow },
  milestoneContent: { flex: 1, gap: 2 },
  milestoneText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.textPrimary },
  milestoneSubtext: { fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted },
  tapHint: { fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textMuted, letterSpacing: 3 },
});
