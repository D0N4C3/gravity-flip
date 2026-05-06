import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SKINS, TRAILS, POWERUPS, UPGRADES } from '@/constants/game';
import HudAssetIcon, { type HudAssetName } from '@/components/HudAssetIcon';
import { useGame } from '@/context/GameContext';
import COLORS from '@/constants/colors';

const SKIN_HUD_ASSET_BY_ID: Record<string, HudAssetName> = { default: 'skin_runner', robot: 'skin_robot', ninja: 'skin_ninja', neon_cube: 'skin_neon_cube', ghost: 'skin_ghost', glitch: 'skin_glitch' };
const TRAIL_HUD_ASSET_BY_ID: Record<string, HudAssetName> = { neon: 'trail_neon_pulse', fire: 'trail_fire_blaze', ice: 'trail_ice_crystal', glitch: 'trail_glitch_wave', gold: 'trail_gold_rush', rainbow: 'trail_rainbow' };

export default function ShopModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { shopItems, coins, gems, buyShopItem, buyConsumable, buyBoost } = useGame();
  const [tab, setTab] = useState<'skins' | 'trails' | 'powerups' | 'boosts'>('skins');
  const item = (id: string) => shopItems.find(s => s.id === id);

  const tabItems = useMemo(() => {
    if (tab === 'skins') return SKINS.map(s => ({ id: s.id, name: s.name, rarity: s.unlockCoins >= 5000 ? 'LEGENDARY' : s.unlockCoins >= 2500 ? 'EPIC' : 'RARE', owned: !!item(s.id)?.owned, cost: item(s.id)?.costCoins || 0, gemsCost: item(s.id)?.costGems || 0, onBuy: () => buyShopItem(s.id), preview: <HudAssetIcon name={SKIN_HUD_ASSET_BY_ID[s.id]} size={38} /> }));
    if (tab === 'trails') return TRAILS.map(t => ({ id: t.id, name: t.name, rarity: t.unlockCoins >= 3000 ? 'LEGENDARY' : t.unlockCoins >= 1200 ? 'EPIC' : 'RARE', owned: !!item(t.id)?.owned, cost: item(t.id)?.costCoins || 0, gemsCost: item(t.id)?.costGems || 0, onBuy: () => buyShopItem(t.id), preview: <HudAssetIcon name={TRAIL_HUD_ASSET_BY_ID[t.id]} size={38} /> }));
    if (tab === 'powerups') return Object.values(POWERUPS).map(p => ({ id: p.id, name: `${p.label} Charge`, rarity: 'UTILITY', owned: false, cost: 80, gemsCost: 2, stack: item(p.id)?.stackCount || 0, onBuy: () => buyConsumable(p.id, 1), preview: <Ionicons name={p.icon as any} size={20} color={p.color} /> }));
    return UPGRADES.map(b => ({ id: b.id, name: b.name, rarity: 'BOOST', owned: !!item(b.id)?.owned, cost: 300, gemsCost: 8, onBuy: () => buyBoost(b.id), preview: <Ionicons name={b.icon as any} size={20} color={COLORS.neonCyan} /> }));
  }, [tab, shopItems, coins, gems, buyBoost, buyConsumable, buyShopItem]);

  return <Modal visible={visible} transparent onRequestClose={onClose}>
    <View style={styles.overlay}><TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}><LinearGradient colors={['#020B19', '#081A33', '#020B19']} style={styles.inner}>
        <View style={styles.headerRow}><Text style={styles.title}>BLACK MARKET</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textSecondary} /></TouchableOpacity></View>
        <Text style={styles.subtitle}>Upgrade your loadout and dominate longer runs.</Text>

        <LinearGradient colors={['rgba(255,220,0,0.16)', 'rgba(0,245,255,0.08)']} style={styles.walletRow}>
          <View style={styles.walletPill}><Ionicons name="ellipse" size={10} color={COLORS.neonYellow} /><Text style={styles.walletText}>{coins} coins</Text></View>
          <View style={styles.walletPill}><Ionicons name="diamond" size={10} color={COLORS.neonCyan} /><Text style={styles.walletText}>{gems} gems</Text></View>
        </LinearGradient>

        <View style={styles.tabs}>{(['skins', 'trails', 'powerups', 'boosts'] as const).map(t => <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}><Text style={[styles.tab, tab === t && styles.tabActive]}>{t.toUpperCase()}</Text></TouchableOpacity>)}</View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {tabItems.map(i => <Row key={i.id} {...i} affordable={coins >= i.cost && gems >= i.gemsCost} />)}
        </ScrollView>
      </LinearGradient></View></View></Modal>;
}

function Row({ name, owned, cost, gemsCost, onBuy, preview, rarity, stack, affordable }: any) {
  return <View style={styles.row}><LinearGradient colors={['rgba(0,245,255,0.11)', 'rgba(0,245,255,0.03)']} style={styles.rowGlow}><View style={styles.preview}>{preview}</View><View style={{ flex: 1 }}><Text style={styles.rarity}>{rarity}</Text><Text style={styles.name}>{name}</Text>{typeof stack === 'number' && <Text style={styles.stack}>Stock: {stack}</Text>}</View>{owned ? <Text style={styles.owned}>OWNED</Text> : <TouchableOpacity onPress={onBuy} style={[styles.buy, !affordable && styles.buyDisabled]}><Text style={styles.buyText}>{cost}C · {gemsCost}G</Text></TouchableOpacity>}</LinearGradient></View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  inner: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.textPrimary, fontFamily: 'Inter_700Bold', letterSpacing: 2, fontSize: 20 },
  subtitle: { color: COLORS.textMuted, marginTop: 4, marginBottom: 12 },
  walletRow: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  walletText: { color: COLORS.textPrimary, fontFamily: 'Inter_600SemiBold' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tabBtnActive: { backgroundColor: 'rgba(0,245,255,0.14)', borderColor: 'rgba(0,245,255,0.4)' },
  tab: { color: COLORS.textMuted, textAlign: 'center', fontSize: 11, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  tabActive: { color: COLORS.neonCyan },
  row: { marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  rowGlow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 10 },
  preview: { width: 44, alignItems: 'center' },
  rarity: { color: COLORS.neonYellow, fontSize: 9, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  name: { color: COLORS.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  stack: { color: COLORS.textMuted, fontSize: 12 },
  owned: { color: COLORS.neonCyan, fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  buy: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0,245,255,0.2)' },
  buyDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buyText: { color: COLORS.neonCyan, fontSize: 12, fontFamily: 'Inter_700Bold' },
});
