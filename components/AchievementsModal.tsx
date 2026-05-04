import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { ACHIEVEMENTS } from '@/constants/game';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AchievementsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { achievedIds, lifetimeStats } = useGame();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const completedCount = achievedIds.length;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>ACHIEVEMENTS</Text>
                <Text style={styles.subtitle}>{completedCount}/{ACHIEVEMENTS.length} UNLOCKED</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completedCount / ACHIEVEMENTS.length) * 100}%` as any }]} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {ACHIEVEMENTS.map(ach => {
                const done = achievedIds.includes(ach.id);
                const current = lifetimeStats[ach.stat] ?? 0;
                const progress = Math.min(current / ach.target, 1);
                return (
                  <View key={ach.id} style={[styles.card, done && styles.cardDone]}>
                    <View style={[styles.iconBox, done && { backgroundColor: 'rgba(0,245,255,0.12)', borderColor: COLORS.neonCyan }]}>
                      <Ionicons name={ach.icon as any} size={22} color={done ? COLORS.neonCyan : COLORS.textMuted} />
                    </View>
                    <View style={styles.info}>
                      <Text style={[styles.achTitle, done && { color: COLORS.neonCyan }]}>{ach.title}</Text>
                      <Text style={styles.achDesc}>{ach.description}</Text>
                      {!done && (
                        <View style={styles.progRow}>
                          <View style={styles.progBarBg}>
                            <View style={[styles.progBarFill, { width: `${progress * 100}%` as any }]} />
                          </View>
                          <Text style={styles.progText}>{Math.min(current, ach.target)}/{ach.target}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.rewardBadge, done && styles.rewardBadgeDone]}>
                      <View style={styles.rewardCoin} />
                      <Text style={[styles.rewardText, done && { color: COLORS.neonYellow }]}>+{ach.reward}</Text>
                    </View>
                    {done && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={10} color={COLORS.background} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
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
    borderColor: 'rgba(0,245,255,0.12)',
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  handle: {
    width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 2 },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.neonCyan, borderRadius: 2 },
  list: { paddingBottom: 8, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14, position: 'relative',
  },
  cardDone: { backgroundColor: 'rgba(0,245,255,0.04)', borderColor: 'rgba(0,245,255,0.18)' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  info: { flex: 1, gap: 2 },
  achTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.textPrimary, letterSpacing: 0.5 },
  achDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textMuted },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progBarBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: '100%', backgroundColor: COLORS.neonCyan, borderRadius: 2 },
  progText: { fontFamily: 'Inter_500Medium', fontSize: 9, color: COLORS.textMuted },
  rewardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,230,0,0.07)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,230,0,0.1)',
  },
  rewardBadgeDone: { borderColor: 'rgba(255,230,0,0.3)', backgroundColor: 'rgba(255,230,0,0.12)' },
  rewardCoin: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.neonYellow },
  rewardText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textMuted },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.neonCyan,
    alignItems: 'center', justifyContent: 'center',
  },
});
