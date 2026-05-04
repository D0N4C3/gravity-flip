export type DifficultyStage = 1 | 2 | 3 | 4 | 5;

export type ObstacleType =
  | 'floor_spike' | 'ceiling_spike'
  | 'floor_spikes' | 'ceiling_spikes'
  | 'moving_spike' | 'rotating_blade'
  | 'laser_gate' | 'spike_wall';

export interface ChunkObstacleDef {
  type: ObstacleType;
  offsetSec: number;
  spikeCount?: number;
  moveVelocityRange?: [number, number];
  laserCycleOn?: number;
  laserCycleOff?: number;
}

export interface ChunkDefinition {
  id: string;
  durationSec: number; // 1-3 seconds
  stage: DifficultyStage;
  tags: string[];
  obstacles: ChunkObstacleDef[];
}

export const CHUNKS: ChunkDefinition[] = [
  { id: 's1_intro_a', durationSec: 1.5, stage: 1, tags: ['intro', 'single'], obstacles: [{ type: 'floor_spike', offsetSec: 0.4 }] },
  { id: 's1_intro_b', durationSec: 1.6, stage: 1, tags: ['intro', 'single'], obstacles: [{ type: 'ceiling_spike', offsetSec: 0.5 }] },
  { id: 's2_flip_pair', durationSec: 1.8, stage: 2, tags: ['flip'], obstacles: [{ type: 'floor_spikes', offsetSec: 0.45, spikeCount: 2 }, { type: 'ceiling_spike', offsetSec: 1.2 }] },
  { id: 's2_alt_pair', durationSec: 1.9, stage: 2, tags: ['flip'], obstacles: [{ type: 'ceiling_spikes', offsetSec: 0.5, spikeCount: 2 }, { type: 'floor_spike', offsetSec: 1.25 }] },
  { id: 's3_mover_mix', durationSec: 2.1, stage: 3, tags: ['timing', 'moving'], obstacles: [{ type: 'moving_spike', offsetSec: 0.55, moveVelocityRange: [65, 95] }, { type: 'floor_spikes', offsetSec: 1.45, spikeCount: 2 }] },
  { id: 's3_blade_mix', durationSec: 2.0, stage: 3, tags: ['timing', 'blade'], obstacles: [{ type: 'rotating_blade', offsetSec: 0.6 }, { type: 'ceiling_spikes', offsetSec: 1.5, spikeCount: 2 }] },
  { id: 's4_gate_mix', durationSec: 2.4, stage: 4, tags: ['gate', 'rhythm'], obstacles: [{ type: 'laser_gate', offsetSec: 0.7, laserCycleOn: 0.55, laserCycleOff: 0.75 }, { type: 'moving_spike', offsetSec: 1.65, moveVelocityRange: [85, 120] }] },
  { id: 's4_wall_mix', durationSec: 2.3, stage: 4, tags: ['wall', 'flip'], obstacles: [{ type: 'spike_wall', offsetSec: 0.7 }, { type: 'floor_spikes', offsetSec: 1.7, spikeCount: 3 }] },
  { id: 's5_pressure_a', durationSec: 2.7, stage: 5, tags: ['pressure', 'mixed'], obstacles: [{ type: 'laser_gate', offsetSec: 0.55, laserCycleOn: 0.5, laserCycleOff: 0.7 }, { type: 'rotating_blade', offsetSec: 1.45 }, { type: 'ceiling_spikes', offsetSec: 2.15, spikeCount: 3 }] },
  { id: 's5_pressure_b', durationSec: 2.6, stage: 5, tags: ['pressure', 'mixed'], obstacles: [{ type: 'moving_spike', offsetSec: 0.6, moveVelocityRange: [95, 140] }, { type: 'spike_wall', offsetSec: 1.45 }, { type: 'floor_spikes', offsetSec: 2.1, spikeCount: 3 }] },
];
