import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SKINS, TRAILS, POWERUPS, UPGRADES } from '@/constants/game';
import HudAssetIcon, { type HudAssetName } from '@/components/HudAssetIcon';
import { useGame } from '@/context/GameContext';
import COLORS from '@/constants/colors';

const SKIN_HUD_ASSET_BY_ID: Record<string, HudAssetName> = {
  default: 'skin_runner',
  robot: 'skin_robot',
  ninja: 'skin_ninja',
  neon_cube: 'skin_neon_cube',
  ghost: 'skin_ghost',
  glitch: 'skin_glitch',
};

const TRAIL_HUD_ASSET_BY_ID: Record<string, HudAssetName> = {
  neon: 'trail_neon_pulse',
  fire: 'trail_fire_blaze',
  ice: 'trail_ice_crystal',
  glitch: 'trail_glitch_wave',
  gold: 'trail_gold_rush',
  rainbow: 'trail_rainbow',
};

export default function ShopModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { shopItems, coins, gems, buyShopItem, buyConsumable, buyBoost } = useGame();
  const [tab, setTab] = useState<'skins' | 'trails' | 'powerups' | 'boosts'>('skins');
  const item = (id: string) => shopItems.find(s => s.id === id);
  return <Modal visible={visible} transparent onRequestClose={onClose}>
    <View style={styles.overlay}><TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}><LinearGradient colors={['#0A1628', '#060E1A']} style={styles.inner}>
        <Text style={styles.title}>SHOP · {coins} coins · {gems} gems</Text>
        <View style={styles.tabs}>{(['skins','trails','powerups','boosts'] as const).map(t => <TouchableOpacity key={t} onPress={() => setTab(t)}><Text style={[styles.tab, tab===t && styles.active]}>{t.toUpperCase()}</Text></TouchableOpacity>)}</View>
        <ScrollView>{tab==='skins' && SKINS.map(s => <Row key={s.id} name={s.name} owned={!!item(s.id)?.owned} cost={item(s.id)?.costCoins||0} gems={item(s.id)?.costGems} onBuy={() => buyShopItem(s.id)} preview={<HudAssetIcon name={SKIN_HUD_ASSET_BY_ID[s.id]} size={34} />} />)}
          {tab==='trails' && TRAILS.map(t => <Row key={t.id} name={t.name} owned={!!item(t.id)?.owned} cost={item(t.id)?.costCoins||0} gems={item(t.id)?.costGems} onBuy={() => buyShopItem(t.id)} preview={<HudAssetIcon name={TRAIL_HUD_ASSET_BY_ID[t.id]} size={34} />} />)}
          {tab==='powerups' && Object.values(POWERUPS).map(p => <Row key={p.id} name={`${p.label} x1`} owned={false} stack={item(p.id)?.stackCount} cost={80} gems={2} onBuy={() => buyConsumable(p.id,1)} preview={<Ionicons name={p.icon as any} size={18} color={p.color} />} />)}
          {tab==='boosts' && UPGRADES.map(b => <Row key={b.id} name={b.name} owned={!!item(b.id)?.owned} cost={300} gems={8} onBuy={() => buyBoost(b.id)} preview={<Ionicons name={b.icon as any} size={18} color={COLORS.neonCyan} />} />)}
        </ScrollView>
      </LinearGradient></View></View></Modal>;
}

function Row({ name, owned, cost, gems, onBuy, preview, stack }: any) { return <View style={styles.row}><View style={styles.preview}>{preview}</View><View style={{flex:1}}><Text style={styles.name}>{name}</Text>{typeof stack === 'number' && <Text style={styles.stack}>Owned: {stack}</Text>}</View>{owned ? <Text style={styles.owned}>OWNED</Text> : <TouchableOpacity onPress={onBuy} style={styles.buy}><Text style={styles.buyText}>{cost}C / {gems||0}G</Text></TouchableOpacity>}</View>; }

const styles = StyleSheet.create({ overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'}, sheet:{maxHeight:'84%',borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden'}, inner:{padding:16}, title:{color:COLORS.textPrimary,fontWeight:'700',marginBottom:10}, tabs:{flexDirection:'row',justifyContent:'space-between',marginBottom:10}, tab:{color:COLORS.textMuted,fontSize:12}, active:{color:COLORS.neonCyan}, row:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.06)'}, preview:{width:42,alignItems:'center'}, name:{color:COLORS.textPrimary}, stack:{color:COLORS.textMuted,fontSize:12}, owned:{color:COLORS.neonCyan,fontSize:12}, buy:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:'rgba(0,245,255,0.12)'}, buyText:{color:COLORS.neonCyan,fontSize:12} });
