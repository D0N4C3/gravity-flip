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
import { SKINS, NEXT_SKIN_MILESTONES } from '@/constants/game';
import { useGame } from '@/context/GameContext';

interface Props {
  score: number;
  coinsEarned: number;
  onRetry: () => void;
  onRevive: () => void;
  canRevive: boolean;
  onMenu: () => void;
}

export default function DeathScreen({ score, coinsEarned, onRetry, onRevive, canRevive, onMenu }: Props) {
  const insets = useSafeAreaInsets();
  const { bestScore, coins } = useGame();

  const isNewBest = score > bestScore;
  const containerAnim = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.5)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const nextMilestone = NEXT_SKIN_MILESTONES.find(m => m > Math.max(bestScore, score));
  const progressToNext = nextMilestone ? Math.min(score / nextMilestone, 1) : 1;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(containerAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(scoreScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(scoreOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(coinAnim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]),
      Animated.timing(buttonsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressAnim, { toValue: progressToNext, duration: 900, delay: 500, useNativeDriver: false }).start();
  }, []);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={['#08000F', '#050A14', '#050A14']}
      style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 24 }]}
    >
      <Animated.View style={[styles.content, { opacity: containerAnim }]}>

        <View style={styles.deathHeader}>
          <MaterialCommunityIcons name="skull-outline" size={26} color={COLORS.neonPink} />
          <Text style={styles.deathTitle}>CRASHED</Text>
        </View>

        <Animated.View style={[styles.scoreCard, { opacity: scoreOpacity, transform: [{ scale: scoreScale }] }]}>
          {isNewBest && (
            <View style={styles.newBestBadge}>
              <Ionicons name="star" size={11} color={COLORS.background} />
              <Text style={styles.newBestText}>NEW RECORD</Text>
            </View>
          )}
          <Text style={styles.scoreLabel}>DISTANCE</Text>
          <Text style={[styles.scoreValue, isNewBest && styles.scoreValueGold]}>{score}</Text>
          {!isNewBest && (
            <View style={styles.bestRow}>
              <Ionicons name="trophy-outline" size={13} color={COLORS.neonYellow} />
              <Text style={styles.bestText}>BEST  </Text>
              <Text style={styles.bestValue}>{bestScore}</Text>
            </View>
          )}
        </Animated.View>

        {coinsEarned > 0 && (
          <Animated.View style={[styles.coinsCard, { opacity: coinAnim, transform: [{ translateY: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            <LinearGradient colors={['rgba(255,230,0,0.12)', 'rgba(255,230,0,0.04)']} style={styles.coinsGradient}>
              <View style={styles.coinIcon} />
              <Text style={styles.coinsLabel}>COINS COLLECTED</Text>
              <Text style={styles.coinsValue}>+{coinsEarned}</Text>
              <View style={styles.totalCoinsRow}>
                <Text style={styles.totalCoinsText}>Total: {coins}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {nextMilestone && (
          <Animated.View style={[styles.progressSection, { opacity: buttonsAnim }]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>NEXT SKIN UNLOCK</Text>
              <Text style={styles.progressScore}>{Math.min(score, nextMilestone)} / {nextMilestone}</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]}
              />
            </View>
          </Animated.View>
        )}

        <Animated.View style={[styles.buttonsSection, {
          opacity: buttonsAnim,
          transform: [{ translateY: buttonsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onRetry(); }}
            activeOpacity={0.85} style={styles.retryButton}
          >
            <LinearGradient colors={['#00F5FF', '#00C2CC']} style={styles.retryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="refresh" size={22} color={COLORS.background} />
              <Text style={styles.retryText}>RETRY</Text>
            </LinearGradient>
          </TouchableOpacity>

          {canRevive && (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onRevive(); }}
              activeOpacity={0.75} style={styles.reviveButton}
            >
              <LinearGradient colors={['rgba(255,0,128,0.15)', 'rgba(255,0,128,0.05)']} style={styles.reviveGradient}>
                <Ionicons name="videocam-outline" size={18} color={COLORS.neonPink} />
                <Text style={styles.reviveText}>WATCH AD TO REVIVE</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onMenu} activeOpacity={0.6} style={styles.menuButton}>
            <Ionicons name="home-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.menuText}>MAIN MENU</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', paddingHorizontal: 24, alignItems: 'center', gap: 18 },
  deathHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deathTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 26, color: COLORS.neonPink, letterSpacing: 6,
    textShadowColor: COLORS.neonPink, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  scoreCard: {
    width: '100%', backgroundColor: 'rgba(255,0,128,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,0,128,0.2)', borderRadius: 20, alignItems: 'center',
    paddingVertical: 24, paddingHorizontal: 20, gap: 3,
  },
  newBestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.neonYellow, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 6,
  },
  newBestText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: COLORS.background, letterSpacing: 2 },
  scoreLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textMuted, letterSpacing: 3 },
  scoreValue: {
    fontFamily: 'Inter_700Bold', fontSize: 68, color: COLORS.textPrimary, lineHeight: 76,
  },
  scoreValueGold: { color: COLORS.neonYellow, textShadowColor: COLORS.neonYellow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bestText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  bestValue: { fontFamily: 'Inter_700Bold', fontSize: 12, color: COLORS.neonYellow },
  coinsCard: { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,230,0,0.2)' },
  coinsGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  coinIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.neonYellow },
  coinsLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1, flex: 1 },
  coinsValue: { fontFamily: 'Inter_700Bold', fontSize: 20, color: COLORS.neonYellow },
  totalCoinsRow: {},
  totalCoinsText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted },
  progressSection: { width: '100%', gap: 7 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  progressScore: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: COLORS.textSecondary },
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.neonPurple, borderRadius: 2.5 },
  buttonsSection: { width: '100%', gap: 10 },
  retryButton: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  retryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  retryText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: COLORS.background, letterSpacing: 3 },
  reviveButton: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,0,128,0.3)' },
  reviveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
  reviveText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.neonPink, letterSpacing: 2 },
  menuButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  menuText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
});
