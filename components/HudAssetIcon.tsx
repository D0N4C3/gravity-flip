import React from 'react';
import { ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const HUD_ASSETS = {
  character_default: require('@/assets/hud/character_default.svg'),
  character_phantom: require('@/assets/hud/character_phantom.svg'),
  character_legendary: require('@/assets/hud/character_legendary.svg'),
  skin_runner: require('@/assets/hud/skin_runner.svg'),
  skin_robot: require('@/assets/hud/skin_robot.svg'),
  skin_ninja: require('@/assets/hud/skin_ninja.svg'),
  skin_neon_cube: require('@/assets/hud/skin_neon_cube.svg'),
  skin_ghost: require('@/assets/hud/skin_ghost.svg'),
  skin_glitch: require('@/assets/hud/skin_glitch.svg'),
  trail_fire: require('@/assets/hud/trail_fire.svg'),
  trail_plasma: require('@/assets/hud/trail_plasma.svg'),
  trail_prismatic: require('@/assets/hud/trail_prismatic.svg'),
  trail_neon_pulse: require('@/assets/hud/trail_neon_pulse.svg'),
  trail_fire_blaze: require('@/assets/hud/trail_fire_blaze.svg'),
  trail_ice_crystal: require('@/assets/hud/trail_ice_crystal.svg'),
  trail_glitch_wave: require('@/assets/hud/trail_glitch_wave.svg'),
  trail_gold_rush: require('@/assets/hud/trail_gold_rush.svg'),
  trail_rainbow: require('@/assets/hud/trail_rainbow.svg'),
  coin_standard: require('@/assets/hud/coin-standard.svg'),
  coin_rare: require('@/assets/hud/coin-rare.svg'),
  coin_legendary: require('@/assets/hud/coin-legendary.svg'),
  obstacle_floor_spikes: require('@/assets/hud/obstacle_floor_spikes.svg'),
  obstacle_ceiling_spikes: require('@/assets/hud/obstacle_ceiling_spikes.svg'),
  obstacle_rotating_blade: require('@/assets/hud/obstacle_rotating_blade.svg'),
  obstacle_laser_gate: require('@/assets/hud/obstacle_laser_gate.svg'),
  powerup_shield: require('@/assets/hud/powerup_shield.svg'),
  powerup_slowmo: require('@/assets/hud/powerup_slowmo.svg'),
  powerup_magnet: require('@/assets/hud/powerup_magnet.svg'),
  powerup_doublescore: require('@/assets/hud/powerup_doublescore.svg'),
  effect_gravity_flip: require('@/assets/hud/effect_gravity_flip.svg'),
  effect_death_explosion: require('@/assets/hud/effect_death_explosion.svg'),
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
