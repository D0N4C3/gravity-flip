import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { useGame } from '@/context/GameContext';
import { DailyChallenge, BALANCING } from '@/constants/game';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function ChallengeRow({ ch, progress, claimed, onClaim }: {
  ch: DailyChallenge;
  progress: number;
  claimed: boolean;
  onClaim: () => void;
}) {
  const pct = Math.min(progress / ch.target, 1);
  const complete = pct >= 1;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const claimedAnim = useRef(new Animated.Value(claimed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: pct, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, [pct]);

  return (
    <View style={[styles.challengeRow, claimed && styles.challengeRowClaimed]}>
      <View style={[styles.challengeIcon, { backgroundColor: `${COLORS.neonCyan}18` }]}>
        <Ionicons name={ch.icon as any} size={18} color={claimed ? COLORS.textMuted : COLORS.neonCyan} />
      </View>
      <View style={styles.challengeInfo}>
        <Text style={[styles.challengeLabel, claimed && styles.textMuted]}>{ch.label}</Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: claimed ? COLORS.textMuted : (complete ? COLORS.neonGreen : COLORS.neonCyan),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.min(progress, ch.target)} / {ch.target}
        </Text>
      </View>
      <View style={styles.rewardSection}>
        <View style={styles.rewardBadge}>
          <View style={styles.coinSmall} />
          <Text style={styles.rewardText}>{ch.reward}</Text>
        </View>
        {!claimed && complete && (
          <TouchableOpacity onPress={onClaim} activeOpacity={0.75} style={styles.claimButton}>
            <Text style={styles.claimText}>CLAIM</Text>
          </TouchableOpacity>
        )}
        {claimed && (
          <View style={styles.claimedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.neonGreen} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function DailyChallengesModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { dailyChallenges, claimChallenge, coins } = useGame();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setClaimedCoins(null);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handleClaim(challengeId: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const reward = claimChallenge(challengeId);
    if (reward > 0) {
      setClaimedCoins(reward);
      setTimeout(() => setClaimedCoins(null), 2000);
    }
  }

  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const allClaimed = dailyChallenges.challenges.length > 0 &&
    dailyChallenges.challenges.every(ch => dailyChallenges.claimed.includes(ch.id));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="flash" size={20} color={COLORS.neonYellow} />
                <Text style={styles.title}>DAILY CHALLENGES</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.coinBadge}>
                  <View style={styles.coinDot} />
                  <Text style={styles.coinBalance}>{coins}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {claimedCoins !== null && (
              <View style={styles.claimedAlert}>
                <Ionicons name="sparkles" size={14} color={COLORS.neonYellow} />
                <Text style={styles.claimedAlertText}>+{claimedCoins} coins earned!</Text>
              </View>
            )}

            {allClaimed && (
              <View style={styles.allDoneRow}>
                <Ionicons name="trophy" size={20} color={COLORS.goldRank} />
                <Text style={styles.allDoneText}>All done! Come back tomorrow</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {dailyChallenges.challenges.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>Loading challenges...</Text>
                </View>
              ) : (
                dailyChallenges.challenges.map(ch => (
                  <ChallengeRow
                    key={ch.id}
                    ch={ch}
                    progress={dailyChallenges.progress[ch.id] || 0}
                    claimed={dailyChallenges.claimed.includes(ch.id)}
                    onClaim={() => handleClaim(ch.id)}
                  />
                ))
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Ionicons name="information-circle-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.footerText}>{`Challenges reset daily at midnight • target run income ${BALANCING.economy.targetCoinsPerRun.min}-${BALANCING.economy.targetCoinsPerRun.max} coins`}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    maxHeight: '85%',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.12)',
  },
  sheetContent: {
    paddingHorizontal: 20, paddingTop: 12, flex: 1,
  },
  handle: {
    width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontFamily: 'Inter_700Bold', fontSize: 14, color: COLORS.textPrimary, letterSpacing: 2,
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255, 230, 0, 0.1)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,230,0,0.2)',
  },
  coinDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.neonYellow,
  },
  coinBalance: { fontFamily: 'Inter_700Bold', fontSize: 13, color: COLORS.neonYellow },
  claimedAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255, 230, 0, 0.1)', borderRadius: 10,
    padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,230,0,0.2)',
  },
  claimedAlertText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.neonYellow,
  },
  allDoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,230,0,0.06)', borderRadius: 10,
    padding: 10, marginBottom: 12,
  },
  allDoneText: {
    fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.neonYellow,
  },
  scrollContent: { gap: 12, paddingBottom: 12 },
  challengeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14,
  },
  challengeRowClaimed: {
    opacity: 0.55,
  },
  challengeIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  challengeInfo: { flex: 1, gap: 5 },
  challengeLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textPrimary,
  },
  textMuted: { color: COLORS.textMuted },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: {
    fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted,
  },
  rewardSection: { alignItems: 'center', gap: 6 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinSmall: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.neonYellow },
  rewardText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.neonYellow },
  claimButton: {
    backgroundColor: COLORS.neonYellow, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  claimText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#1A1400', letterSpacing: 1 },
  claimedBadge: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textMuted, letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingTop: 8,
  },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted },
});
