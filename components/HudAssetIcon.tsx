import React from 'react';
import { ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const HUD_ASSETS = {
  character_default: require('@/assets/hud/character_default.svg'),
  character_phantom: require('@/assets/hud/character_phantom.svg'),
  character_legendary: require('@/assets/hud/character_legendary.svg'),
  trail_fire: require('@/assets/hud/trail_fire.svg'),
  trail_plasma: require('@/assets/hud/trail_plasma.svg'),
  trail_prismatic: require('@/assets/hud/trail_prismatic.svg'),
  powerup_shield: require('@/assets/hud/powerup_shield.svg'),
  powerup_slowmo: require('@/assets/hud/powerup_slowmo.svg'),
  powerup_magnet: require('@/assets/hud/powerup_magnet.svg'),
} as const;

export type HudAssetName = keyof typeof HUD_ASSETS;

export default function HudAssetIcon({
  name,
  size,
  style,
}: {
  name: HudAssetName;
  size: number;
  style?: ViewStyle;
}) {
  return (
    <Image
      source={HUD_ASSETS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={80}
    />
  );
}
