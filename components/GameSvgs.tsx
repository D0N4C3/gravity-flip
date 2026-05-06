import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import {
  coin_standard, coin_rare, coin_legendary,
  obstacle_floor_spikes, obstacle_ceiling_spikes,
  obstacle_rotating_blade, obstacle_laser_gate,
  powerup_shield, powerup_magnet, powerup_slowmo, powerup_doublescore,
  character_default, character_phantom, character_legendary,
} from '@/assets/hud/index';

// ─── Coins ───────────────────────────────────────────────────────────────────

export function CoinStandardSvg({ size }: { size: number }) {
  return <SvgXml xml={coin_standard} width={size} height={size} />;
}

export function CoinRareSvg({ size }: { size: number }) {
  return <SvgXml xml={coin_rare} width={size} height={size} />;
}

export function CoinLegendarySvg({ size }: { size: number }) {
  return <SvgXml xml={coin_legendary} width={size} height={size} />;
}

// ─── Obstacles ───────────────────────────────────────────────────────────────

export function ObstacleFloorSpikesSvg({ width, height }: { width: number; height: number }) {
  return <SvgXml xml={obstacle_floor_spikes} width={width} height={height} />;
}

export function ObstacleCeilingSpikesSvg({ width, height }: { width: number; height: number }) {
  return <SvgXml xml={obstacle_ceiling_spikes} width={width} height={height} />;
}

export function ObstacleRotatingBladeSvg({ size, rotation }: { size: number; rotation: number }) {
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }}>
      <SvgXml xml={obstacle_rotating_blade} width={size} height={size} />
    </View>
  );
}

export function ObstacleLaserGateSvg({ width, height, opacity }: { width: number; height: number; opacity: number }) {
  return (
    <View style={{ width, height, opacity }}>
      <SvgXml xml={obstacle_laser_gate} width={width} height={height} preserveAspectRatio="none" />
    </View>
  );
}

// ─── Power-up pickups ─────────────────────────────────────────────────────────

export function PowerupShieldSvg({ size }: { size: number }) {
  return <SvgXml xml={powerup_shield} width={size} height={size} />;
}

export function PowerupMagnetSvg({ size }: { size: number }) {
  return <SvgXml xml={powerup_magnet} width={size} height={size} />;
}

export function PowerupSlowmoSvg({ size }: { size: number }) {
  return <SvgXml xml={powerup_slowmo} width={size} height={size} />;
}

export function PowerupDoubleScoreSvg({ size }: { size: number }) {
  return <SvgXml xml={powerup_doublescore} width={size} height={size} />;
}

export function PowerupSvg({ type, size }: { type: 'shield' | 'magnet' | 'slowmo' | 'double_score'; size: number }) {
  switch (type) {
    case 'shield': return <PowerupShieldSvg size={size} />;
    case 'magnet': return <PowerupMagnetSvg size={size} />;
    case 'slowmo': return <PowerupSlowmoSvg size={size} />;
    case 'double_score': return <PowerupDoubleScoreSvg size={size} />;
  }
}

// ─── Characters ──────────────────────────────────────────────────────────────

export function CharacterDefaultSvg({ size }: { size: number }) {
  return <SvgXml xml={character_default} width={size} height={size} />;
}

export function CharacterPhantomSvg({ size }: { size: number }) {
  return <SvgXml xml={character_phantom} width={size} height={size} />;
}

export function CharacterLegendarySvg({ size }: { size: number }) {
  return <SvgXml xml={character_legendary} width={size} height={size} />;
}

export function CharacterSvg({ skinId, size }: { skinId: string; size: number }) {
  if (skinId === 'ghost' || skinId === 'ninja') {
    return <CharacterPhantomSvg size={size} />;
  }
  if (skinId === 'neon_cube' || skinId === 'glitch') {
    return <CharacterLegendarySvg size={size} />;
  }
  return <CharacterDefaultSvg size={size} />;
}
