import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/colors';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function SettingRow({
  icon,
  label,
  value,
  onToggle,
  color,
}: {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  color: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={v => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle(v);
        }}
        trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${color}50` }}
        thumbColor={value ? color : 'rgba(255,255,255,0.4)'}
        ios_backgroundColor="rgba(255,255,255,0.08)"
      />
    </View>
  );
}

export default function SettingsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useGame();
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
              <Text style={styles.title}>SETTINGS</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>AUDIO</Text>
              <View style={styles.settingsCard}>
                <SettingRow
                  icon="musical-notes-outline"
                  label="Background Music"
                  value={settings.music}
                  onToggle={v => updateSettings({ music: v })}
                  color={COLORS.neonCyan}
                />
                <View style={styles.divider} />
                <SettingRow
                  icon="volume-high-outline"
                  label="Sound Effects"
                  value={settings.sfx}
                  onToggle={v => updateSettings({ sfx: v })}
                  color={COLORS.neonGreen}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HAPTICS</Text>
              <View style={styles.settingsCard}>
                <SettingRow
                  icon="phone-portrait-outline"
                  label="Vibration Feedback"
                  value={settings.vibration}
                  onToggle={v => updateSettings({ vibration: v })}
                  color={COLORS.neonPurple}
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.infoText}>Gravity Flip — Survive the Corridor</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 3,
    paddingLeft: 4,
  },
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 64,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
