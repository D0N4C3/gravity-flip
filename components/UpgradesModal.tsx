import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { UPGRADES, PlayerUpgrades, BALANCING } from '@/constants/game';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const UPGRADE_COLORS: Record<string, string> = {
  flip_speed: '#00F5FF',
  magnet_radius: '#FF44CC',
  shield_strength: '#00FF88',
  score_multiplier: '#FFE600',
};

const LEVEL_LABELS = ['MAX LVL 1', 'MAX LVL 2', 'MAX LVL 3'];

function UpgradeCard({ upgradeId }: { upgradeId: keyof PlayerUpgrades }) {
  const { upgrades, upgradeAbility, coins } = useGame();
  const def = UPGRADES.find(u => u.id === upgradeId)!;
  const level = upgrades[upgradeId];
  const isMaxed = level >= def.maxLevel;
  const cost = isMaxed ? 0 : def.costs[level];
  const canAfford = coins >= cost;
  const color = UPGRADE_COLORS[upgradeId] || COLORS.neonCyan;

  function handleUpgrade() {
    if (isMaxed || !canAfford) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upgradeAbility(upgradeId);
  }

  return (
    <View style={[styles.card, { borderColor: isMaxed ? `${color}44` : 'rgba(255,255,255,0.08)' }]}>
      <View style={[styles.iconBox, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Ionicons name={def.icon as any} size={22} color={isMaxed ? color : COLORS.textSecondary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{def.name.toUpperCase()}</Text>
        <Text style={styles.cardDesc}>{def.description}</Text>
        {/* Level pips */}
        <View style={styles.pipsRow}>
          {Array.from({ length: def.maxLevel }, (_, i) => (
            <View key={i} style={[styles.pip, i < level && { backgroundColor: color }]} />
          ))}
          <Text style={[styles.levelText, isMaxed && { color }]}>
            {isMaxed ? 'MAXED' : `LVL ${level}/${def.maxLevel}`}
          </Text>
        </View>
        {!isMaxed && (
          <Text style={[styles.effectText, { color }]}>
            Next: {def.effectLabels[level]}
          </Text>
        )}
        {isMaxed && (
          <Text style={[styles.effectText, { color }]}>
            {def.effectLabels[def.maxLevel - 1]}
          </Text>
        )}
      </View>
      <View style={styles.btnCol}>
        {isMaxed ? (
          <View style={[styles.maxBadge, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
            <Ionicons name="checkmark-circle" size={16} color={color} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleUpgrade}
            activeOpacity={canAfford ? 0.75 : 1}
            style={[styles.upgradeBtn, canAfford ? { backgroundColor: `${color}20`, borderColor: color } : styles.upgradeBtnDisabled]}
          >
            <View style={styles.coinRow}>
              <View style={[styles.costCoin, { backgroundColor: COLORS.neonYellow }]} />
              <Text style={[styles.costText, !canAfford && { color: COLORS.textMuted }]}>{cost}</Text>
            </View>
            <Text style={[styles.upgradeBtnText, canAfford ? { color } : { color: COLORS.textMuted }]}>UPGRADE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function UpgradesModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { coins } = useGame();
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

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { paddingBottom: bottomPadding + 16, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#0A1628', '#060E1A']} style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>UPGRADES</Text>
                <Text style={styles.subtitle}>SPEND COINS TO BOOST YOUR RUNNER</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.coinBadge}>
                  <View style={styles.coinDot} />
                  <Text style={styles.coinCount}>{coins}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {(UPGRADES.map(u => u.id) as (keyof PlayerUpgrades)[]).map(id => (
                <UpgradeCard key={id} upgradeId={id} />
              ))}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>
                  Upgrades are permanent and apply to every run. Mid-tier upgrades trend near {BALANCING.economy.midTierPriceTarget} coins, high-tier near {BALANCING.economy.highTierPriceTarget}.
                </Text>
              </View>
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
    maxHeight: '88%',
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,230,0,0.1)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,230,0,0.2)',
  },
  coinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.neonYellow },
  coinCount: { fontFamily: 'Inter_700Bold', fontSize: 14, color: COLORS.neonYellow },
  list: { paddingBottom: 12, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, padding: 14,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontFamily: 'Inter_700Bold', fontSize: 12, color: COLORS.textPrimary, letterSpacing: 1.5 },
  cardDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textMuted },
  pipsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  pip: { width: 16, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  levelText: { fontFamily: 'Inter_500Medium', fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, marginLeft: 2 },
  effectText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5, marginTop: 1 },
  btnCol: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  maxBadge: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  upgradeBtn: {
    width: 70, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', gap: 2, borderWidth: 1,
  },
  upgradeBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  costCoin: { width: 6, height: 6, borderRadius: 3 },
  costText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: COLORS.neonYellow },
  upgradeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1.5 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textMuted, flex: 1, lineHeight: 15 },
});
