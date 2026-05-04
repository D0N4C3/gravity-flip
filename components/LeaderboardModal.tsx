import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { SKINS } from '@/constants/game';
import { useGame, LeaderboardEntry } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Ionicons name="trophy" size={16} color={COLORS.goldRank} />;
  if (rank === 2) return <Ionicons name="trophy" size={14} color={COLORS.silverRank} />;
  if (rank === 3) return <Ionicons name="trophy" size={12} color={COLORS.bronzeRank} />;
  return <Text style={styles.rankNumber}>{rank}</Text>;
}

function EntryRow({ entry, rank, isPersonalBest }: { entry: LeaderboardEntry; rank: number; isPersonalBest: boolean }) {
  const skin = SKINS.find(s => s.id === entry.skinId) || SKINS[0];
  return (
    <View style={[styles.entryRow, isPersonalBest && styles.entryRowBest]}>
      <View style={styles.rankCell}>
        <RankIcon rank={rank} />
      </View>
      <View style={[styles.skinDot, { backgroundColor: skin.color }]} />
      <View style={styles.entryInfo}>
        <Text style={styles.entryDate}>{entry.date}</Text>
        {isPersonalBest && <Text style={styles.pbLabel}>BEST</Text>}
      </View>
      <Text style={[styles.entryScore, rank === 1 && styles.entryScoreGold]}>{entry.score}</Text>
    </View>
  );
}

export default function LeaderboardModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { leaderboard, bestScore } = useGame();
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
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>LEADERBOARD</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {bestScore > 0 && (
              <View style={styles.bestScoreCard}>
                <LinearGradient
                  colors={['rgba(255,230,0,0.12)', 'rgba(255,230,0,0.04)']}
                  style={styles.bestScoreGradient}
                >
                  <Ionicons name="trophy" size={20} color={COLORS.goldRank} />
                  <View>
                    <Text style={styles.bestScoreLabel}>PERSONAL BEST</Text>
                    <Text style={styles.bestScoreValue}>{bestScore}</Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>NO RUNS YET</Text>
                <Text style={styles.emptySubtext}>Complete your first run to appear here</Text>
              </View>
            ) : (
              <FlatList
                data={leaderboard}
                keyExtractor={item => item.id}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!!leaderboard.length}
                renderItem={({ item, index }) => (
                  <EntryRow
                    entry={item}
                    rank={index + 1}
                    isPersonalBest={item.score === bestScore && index === 0}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.12)',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  bestScoreCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.2)',
  },
  bestScoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  bestScoreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  bestScoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: COLORS.goldRank,
  },
  list: {
    flex: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  entryRowBest: {
    backgroundColor: 'rgba(255, 230, 0, 0.04)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  rankCell: {
    width: 24,
    alignItems: 'center',
  },
  rankNumber: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.textMuted,
  },
  skinDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pbLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: COLORS.goldRank,
    backgroundColor: 'rgba(255, 230, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 1,
  },
  entryScore: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  entryScoreGold: {
    color: COLORS.goldRank,
    textShadowColor: COLORS.goldRank,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 3,
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
