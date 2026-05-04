import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { DAILY_REWARDS, BALANCING } from '@/constants/game';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DailyRewardsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { dailyRewardStreak, dailyRewardClaimed, claimDailyReward } = useGame();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const claimAnim = useRef(new Animated.Value(1)).current;
  const [claimedCoins, setClaimedCoins] = useState(0);
  const [justClaimed, setJustClaimed] = useState(false);

  useEffect(() => {
    if (visible) {
      setJustClaimed(false);
      setClaimedCoins(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Next day to claim (1-indexed)
  const nextDay = (dailyRewardStreak % 7) + 1;
  const currentStreak = dailyRewardClaimed ? dailyRewardStreak : dailyRewardStreak;

  function handleClaim() {
    if (dailyRewardClaimed || justClaimed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const coins = claimDailyReward();
    setClaimedCoins(coins);
    setJustClaimed(true);

    Animated.sequence([
      Animated.timing(claimAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(claimAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  const canClaim = !dailyRewardClaimed && !justClaimed;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>DAILY REWARDS</Text>
                <Text style={styles.subtitle}>{`LOGIN EACH DAY • ${BALANCING.milestones.join('/')} PROGRESSION`}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Day grid */}
            <View style={styles.dayGrid}>
              {DAILY_REWARDS.map((reward, idx) => {
                const day = idx + 1;
                const isClaimed = dailyRewardClaimed || justClaimed
                  ? day <= currentStreak
                  : day < currentStreak;
                const isToday = canClaim && day === nextDay;
                const isFuture = day > nextDay;
                return (
                  <View key={day} style={[
                    styles.dayCard,
                    isClaimed && styles.dayCardClaimed,
                    isToday && styles.dayCardToday,
                    isFuture && styles.dayCardFuture,
                  ]}>
                    {day === 7 && (
                      <Ionicons name="star" size={12} color={isClaimed ? COLORS.neonYellow : isToday ? COLORS.neonYellow : COLORS.textMuted} style={{ marginBottom: 2 }} />
                    )}
                    <Text style={[styles.dayLabel, (isClaimed || isToday) && { color: COLORS.neonYellow }]}>
                      DAY {day}
                    </Text>
                    <View style={styles.dayCoins}>
                      <View style={[styles.coinDot, (isClaimed || isToday) && { backgroundColor: COLORS.neonYellow }]} />
                      <Text style={[styles.dayCoinsText, (isClaimed || isToday) && { color: COLORS.neonYellow }]}>
                        {reward.coins}
                      </Text>
                    </View>
                    {isClaimed && (
                      <View style={styles.claimedCheck}>
                        <Ionicons name="checkmark" size={8} color={COLORS.background} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Claim / Already Claimed */}
            {justClaimed ? (
              <Animated.View style={[styles.claimedBanner, { transform: [{ scale: claimAnim }] }]}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.neonYellow} />
                <Text style={styles.claimedBannerText}>+{claimedCoins} COINS CLAIMED!</Text>
              </Animated.View>
            ) : canClaim ? (
              <TouchableOpacity onPress={handleClaim} activeOpacity={0.85} style={styles.claimBtn}>
                <LinearGradient colors={['#FFE600', '#FFAA00']} style={styles.claimBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="gift" size={20} color={COLORS.background} />
                  <Text style={styles.claimBtnText}>CLAIM DAY {nextDay} REWARD</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.alreadyClaimed}>
                <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.alreadyClaimedText}>COME BACK TOMORROW FOR DAY {(currentStreak % 7) + 1}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,230,0,0.15)',
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  handle: {
    width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 3 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  dayCard: {
    width: '13%', minWidth: 42, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', position: 'relative', gap: 3,
  },
  dayCardClaimed: { backgroundColor: 'rgba(255,230,0,0.07)', borderColor: 'rgba(255,230,0,0.25)' },
  dayCardToday: {
    backgroundColor: 'rgba(255,230,0,0.12)', borderColor: COLORS.neonYellow, borderWidth: 1.5,
    shadowColor: COLORS.neonYellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  dayCardFuture: { opacity: 0.4 },
  dayLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: COLORS.textMuted, letterSpacing: 0.5 },
  dayCoins: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coinDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.textMuted },
  dayCoinsText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: COLORS.textMuted },
  claimedCheck: {
    position: 'absolute', top: 4, right: 4, width: 12, height: 12,
    borderRadius: 6, backgroundColor: COLORS.neonYellow, alignItems: 'center', justifyContent: 'center',
  },
  claimBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  claimBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  claimBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: COLORS.background, letterSpacing: 2 },
  claimedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,230,0,0.12)', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(255,230,0,0.3)', marginBottom: 4,
  },
  claimedBannerText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.neonYellow, letterSpacing: 2 },
  alreadyClaimed: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 4,
  },
  alreadyClaimedText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5 },
});
