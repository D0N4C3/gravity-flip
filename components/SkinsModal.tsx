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
import { SKINS, TRAILS } from '@/constants/game';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'skins' | 'trails';

function SkinPreview({ skinId, size = 36 }: { skinId: string; size?: number }) {
  const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.7, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  if (skin.shape === 'circle') {
    return (
      <Animated.View style={[styles.previewCircle, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: skin.color, shadowColor: skin.glowColor, opacity: pulseAnim,
      }]} />
    );
  }
  if (skin.shape === 'diamond') {
    return (
      <Animated.View style={[styles.previewSquare, {
        width: size * 0.8, height: size * 0.8, backgroundColor: skin.color,
        shadowColor: skin.glowColor, opacity: pulseAnim, transform: [{ rotate: '45deg' }],
      }]} />
    );
  }
  return (
    <Animated.View style={[styles.previewSquare, {
      width: size, height: size, backgroundColor: skin.color,
      shadowColor: skin.glowColor, opacity: pulseAnim,
    }]} />
  );
}

function TrailPreview({ trailId }: { trailId: string }) {
  const trail = TRAILS.find(t => t.id === trailId) || TRAILS[0];
  return (
    <View style={styles.trailPreviewWrap}>
      {trail.colors.slice(0, 6).map((c, i) => (
        <View key={i} style={[styles.trailStreak, {
          backgroundColor: c,
          width: 22 - i * 2,
          opacity: 1 - i * 0.13,
          shadowColor: c,
        }]} />
      ))}
    </View>
  );
}

export default function SkinsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedSkinId, selectSkin, selectedTrailId, selectTrail, unlockedSkins, unlockedTrails, bestScore, coins } = useGame();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<Tab>('skins');

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

  function handleSelectSkin(skinId: string) {
    if (!unlockedSkins.includes(skinId)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectSkin(skinId);
  }

  function handleSelectTrail(trailId: string) {
    if (!unlockedTrails.includes(trailId)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectTrail(trailId);
  }

  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>CUSTOMIZE</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => setActiveTab('skins')}
                style={[styles.tab, activeTab === 'skins' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'skins' && styles.tabTextActive]}>SKINS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('trails')}
                style={[styles.tab, activeTab === 'trails' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'trails' && styles.tabTextActive]}>TRAILS</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {activeTab === 'skins' ? (
                <>
                  <View style={styles.grid}>
                    {SKINS.map(skin => {
                      const isUnlocked = unlockedSkins.includes(skin.id);
                      const isSelected = selectedSkinId === skin.id;
                      return (
                        <TouchableOpacity
                          key={skin.id}
                          onPress={() => handleSelectSkin(skin.id)}
                          activeOpacity={isUnlocked ? 0.75 : 1}
                          style={[
                            styles.skinCard,
                            isSelected && styles.skinCardSelected,
                            !isUnlocked && styles.skinCardLocked,
                            isSelected && { borderColor: skin.color },
                          ]}
                        >
                          <View style={styles.skinPreviewArea}>
                            {isUnlocked ? <SkinPreview skinId={skin.id} size={40} /> : (
                              <View style={styles.lockedIcon}>
                                <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                              </View>
                            )}
                          </View>
                          <Text style={[styles.skinName, !isUnlocked && styles.skinNameLocked]}>
                            {skin.name.toUpperCase()}
                          </Text>
                          {!isUnlocked && skin.unlockCoins > 0 && (
                            <View style={styles.unlockRow}>
                              <View style={styles.unlockCoinDot} />
                              <Text style={[styles.unlockScore, { color: COLORS.neonYellow }]}>
                                {coins}/{skin.unlockCoins}
                              </Text>
                            </View>
                          )}
                          {!isUnlocked && skin.unlockScore > 0 && (
                            <View style={styles.unlockRow}>
                              <Ionicons name="trophy-outline" size={10} color={COLORS.neonCyan} />
                              <Text style={styles.unlockScore}>{bestScore}/{skin.unlockScore}</Text>
                            </View>
                          )}
                          {isSelected && (
                            <View style={[styles.selectedBadge, { backgroundColor: skin.color }]}>
                              <Ionicons name="checkmark" size={10} color={COLORS.background} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>UNLOCK SKINS WITH SCORE MILESTONES OR COINS</Text>
                </>
              ) : (
                <>
                  <View style={styles.grid}>
                    {TRAILS.map(trail => {
                      const isUnlocked = unlockedTrails.includes(trail.id);
                      const isSelected = selectedTrailId === trail.id;
                      return (
                        <TouchableOpacity
                          key={trail.id}
                          onPress={() => handleSelectTrail(trail.id)}
                          activeOpacity={isUnlocked ? 0.75 : 1}
                          style={[
                            styles.skinCard,
                            isSelected && styles.trailCardSelected,
                            !isUnlocked && styles.skinCardLocked,
                            isSelected && { borderColor: trail.preview },
                          ]}
                        >
                          <View style={styles.skinPreviewArea}>
                            {isUnlocked ? (
                              <TrailPreview trailId={trail.id} />
                            ) : (
                              <View style={styles.lockedIcon}>
                                <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                              </View>
                            )}
                          </View>
                          <Text style={[styles.skinName, !isUnlocked && styles.skinNameLocked]}>
                            {trail.name.toUpperCase()}
                          </Text>
                          {trail.unlockCoins > 0 && !isUnlocked && (
                            <View style={styles.unlockRow}>
                              <View style={styles.unlockCoinDot} />
                              <Text style={[styles.unlockScore, { color: COLORS.neonYellow }]}>
                                {coins}/{trail.unlockCoins}
                              </Text>
                            </View>
                          )}
                          {trail.unlockCoins > 0 && isUnlocked && (
                            <View style={styles.unlockRow}>
                              <Ionicons name="checkmark-circle" size={10} color={COLORS.neonCyan} />
                              <Text style={[styles.unlockScore, { color: COLORS.neonCyan }]}>UNLOCKED</Text>
                            </View>
                          )}
                          {trail.unlockCoins === 0 && (
                            <View style={styles.unlockRow}>
                              <Text style={[styles.unlockScore, { color: COLORS.textMuted }]}>FREE</Text>
                            </View>
                          )}
                          {isSelected && (
                            <View style={[styles.selectedBadge, { backgroundColor: trail.preview }]}>
                              <Ionicons name="checkmark" size={10} color={COLORS.background} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>TRAIL UNLOCKS WHEN YOU HAVE ENOUGH COINS</Text>
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.12)',
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', padding: 3, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(0,245,255,0.12)' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  tabTextActive: { color: COLORS.neonCyan },
  scrollContent: { paddingBottom: 12, gap: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skinCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16,
    alignItems: 'center', gap: 8, position: 'relative',
  },
  skinCardSelected: { backgroundColor: 'rgba(0, 245, 255, 0.06)', borderWidth: 1.5 },
  trailCardSelected: { backgroundColor: 'rgba(0, 245, 255, 0.06)', borderWidth: 1.5 },
  skinCardLocked: { opacity: 0.45 },
  skinPreviewArea: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  previewSquare: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10 },
  previewCircle: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10 },
  trailPreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 40, justifyContent: 'center' },
  trailStreak: { height: 6, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6 },
  lockedIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  skinName: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textPrimary, letterSpacing: 1.5 },
  skinNameLocked: { color: COLORS.textMuted },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  unlockScore: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.neonCyan },
  unlockCoinDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.neonYellow },
  selectedBadge: {
    position: 'absolute', top: 8, right: 8, width: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, textAlign: 'center' },
});
