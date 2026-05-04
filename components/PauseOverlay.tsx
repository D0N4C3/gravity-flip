import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';

interface Props {
  visible: boolean;
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onSettings: () => void;
}

export default function PauseOverlay({ visible, score, onResume, onRestart, onMenu, onSettings }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 10 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 40, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handle(fn: () => void, style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
    Haptics.impactAsync(style);
    fn();
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['#0A1628', '#060E1A']}
            style={styles.cardGradient}
          >
            <View style={styles.pauseIconRow}>
              <MaterialCommunityIcons name="pause-circle-outline" size={32} color={COLORS.neonCyan} />
              <Text style={styles.title}>PAUSED</Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>CURRENT SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={() => handle(onResume, Haptics.ImpactFeedbackStyle.Heavy)}
                activeOpacity={0.85}
                style={styles.resumeButton}
              >
                <LinearGradient
                  colors={['#00F5FF', '#00C2CC']}
                  style={styles.resumeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="play" size={20} color={COLORS.background} />
                  <Text style={styles.resumeText}>RESUME</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.rowButtons}>
                <TouchableOpacity
                  onPress={() => handle(onRestart)}
                  activeOpacity={0.75}
                  style={styles.iconButton}
                >
                  <Ionicons name="refresh" size={22} color={COLORS.neonCyan} />
                  <Text style={styles.iconButtonText}>RESTART</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handle(onSettings)}
                  activeOpacity={0.75}
                  style={styles.iconButton}
                >
                  <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
                  <Text style={[styles.iconButtonText, { color: COLORS.textSecondary }]}>SETTINGS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handle(onMenu)}
                  activeOpacity={0.75}
                  style={styles.iconButton}
                >
                  <Ionicons name="home-outline" size={22} color={COLORS.textMuted} />
                  <Text style={[styles.iconButtonText, { color: COLORS.textMuted }]}>MENU</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 16, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.15)',
  },
  cardGradient: {
    padding: 28,
    gap: 24,
    alignItems: 'center',
  },
  pauseIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: COLORS.neonCyan,
    letterSpacing: 5,
  },
  scoreRow: {
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    color: COLORS.textPrimary,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  resumeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  resumeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  resumeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.background,
    letterSpacing: 3,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  iconButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: COLORS.neonCyan,
    letterSpacing: 1.5,
  },
});
