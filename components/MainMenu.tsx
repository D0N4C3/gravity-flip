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
import { useGame } from '@/context/GameContext';

interface Props {
  onPlay: () => void;
  onSkins: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  onChallenges: () => void;
}

export default function MainMenu({ onPlay, onSkins, onLeaderboard, onSettings, onChallenges }: Props) {
  const insets = useSafeAreaInsets();
  const { bestScore, coins, dailyChallenges } = useGame();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const playerAnim = useRef(new Animated.Value(0)).current;
  const eyeAnim = useRef(new Animated.Value(0)).current;

  const pendingChallenges = dailyChallenges.challenges.filter(
    ch => !dailyChallenges.claimed.includes(ch.id) && (dailyChallenges.progress[ch.id] || 0) >= ch.target
  ).length;

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

    // Player bouncing between floor/ceiling
    Animated.loop(Animated.sequence([
      Animated.timing(playerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(playerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(400),
    ])).start();

    // Eye blink
    Animated.loop(Animated.sequence([
      Animated.delay(2000),
      Animated.timing(eyeAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(eyeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ])).start();
  }, []);

  function handlePlay() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onPlay(); }
  function handleBtn(fn: () => void) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fn(); }

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={['#020810', '#050A14', '#070E1C']}
      style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding + 20 }]}
    >
      <GridLines />

      <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ translateY: floatAnim }, { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }] }]}>
        {/* Animated player character */}
        <Animated.View style={[styles.heroPlayer, {
          transform: [{
            translateY: playerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -36] })
          }],
        }]}>
          <View style={styles.heroPlayerBody}>
            {/* Eyes */}
            <Animated.View style={[styles.heroEyeL, { transform: [{ scaleY: eyeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) }] }]} />
            <Animated.View style={[styles.heroEyeR, { transform: [{ scaleY: eyeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) }] }]} />
          </View>
          <View style={styles.heroTrail} />
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

        <View style={styles.gridRow}>
          <TouchableOpacity onPress={() => handleBtn(onChallenges)} activeOpacity={0.75} style={styles.gridBtn}>
            <LinearGradient colors={['rgba(255,230,0,0.15)', 'rgba(255,230,0,0.04)']} style={styles.gridBtnInner}>
              <View style={styles.challengeIconWrap}>
                <Ionicons name="flash" size={20} color={COLORS.neonYellow} />
                {pendingChallenges > 0 && <View style={styles.pendingDot} />}
              </View>
              <Text style={[styles.gridBtnText, { color: COLORS.neonYellow }]}>DAILY</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onSkins)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <MaterialCommunityIcons name="palette-outline" size={20} color={COLORS.neonCyan} />
              <Text style={styles.gridBtnText}>SKINS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onLeaderboard)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <Ionicons name="trophy-outline" size={20} color={COLORS.neonYellow} />
              <Text style={[styles.gridBtnText, { color: COLORS.neonYellow }]}>RANKS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleBtn(onSettings)} activeOpacity={0.75} style={styles.gridBtn}>
            <View style={styles.gridBtnInner}>
              <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.gridBtnText, { color: COLORS.textSecondary }]}>CONFIG</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

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
    width: 34, height: 34, borderRadius: 7, backgroundColor: COLORS.neonCyan,
    shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 16,
  },
  heroEyeL: {
    position: 'absolute', left: 7, top: 10, width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#001A1E',
  },
  heroEyeR: {
    position: 'absolute', left: 20, top: 10, width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#001A1E',
  },
  heroTrail: {
    width: 28, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(0,245,255,0.3)',
    marginTop: 4,
  },
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
  buttonsSection: { width: '100%', paddingHorizontal: 20, gap: 14 },
  playButton: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: COLORS.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 8,
  },
  playGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  playText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: COLORS.background, letterSpacing: 4 },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,245,255,0.12)', backgroundColor: 'rgba(0,245,255,0.04)' },
  gridBtnInner: { alignItems: 'center', paddingVertical: 14, gap: 5 },
  gridBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: COLORS.neonCyan, letterSpacing: 2 },
  challengeIconWrap: { position: 'relative' },
  pendingDot: {
    position: 'absolute', top: -2, right: -2, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.neonPink,
    borderWidth: 1.5, borderColor: '#070E1C',
  },
  tapHint: { fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textMuted, letterSpacing: 3 },
});
