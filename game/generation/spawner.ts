import { CHUNKS, ChunkDefinition, ChunkObstacleDef, DifficultyStage } from '@/game/generation/chunks';

const MIN_CHUNK_DURATION = 1;
const MAX_CHUNK_DURATION = 3;
const MIN_REACTION_SEC = 0.62;
const MIN_WALL_GAP_SPACING_SEC = 0.9;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpawnRequest {
  elapsedSec: number;
}

export interface SpawnEvent {
  chunkId: string;
  stage: DifficultyStage;
  obstacle: ChunkObstacleDef;
}

export class ChunkSpawner {
  private readonly random: () => number;
  private nextChunkAt = 0;
  private nextAllowedObstacleAt = 0;
  private lastHardGateAt = -Infinity;

  constructor(seed: number) {
    this.random = mulberry32(seed);
  }

  private stageForTime(elapsedSec: number): DifficultyStage {
    if (elapsedSec < 12) return 1;
    if (elapsedSec < 24) return 2;
    if (elapsedSec < 40) return 3;
    if (elapsedSec < 60) return 4;
    return 5;
  }

  spawn(req: SpawnRequest): SpawnEvent[] {
    if (req.elapsedSec < this.nextChunkAt) return [];

    const stage = this.stageForTime(req.elapsedSec);
    const candidates = CHUNKS.filter((c) => c.stage <= stage && c.durationSec >= MIN_CHUNK_DURATION && c.durationSec <= MAX_CHUNK_DURATION);
    if (!candidates.length) return [];

    const chunk = candidates[Math.floor(this.random() * candidates.length)] as ChunkDefinition;
    this.nextChunkAt = req.elapsedSec + chunk.durationSec;

    const out: SpawnEvent[] = [];
    for (const obstacle of chunk.obstacles) {
      const candidateAt = req.elapsedSec + obstacle.offsetSec;
      const violatesReaction = candidateAt < this.nextAllowedObstacleAt;
      const isHardGate = obstacle.type === 'spike_wall' || obstacle.type === 'laser_gate';
      const violatesHardGap = isHardGate && candidateAt - this.lastHardGateAt < MIN_WALL_GAP_SPACING_SEC;
      if (violatesReaction || violatesHardGap) continue;

      this.nextAllowedObstacleAt = candidateAt + MIN_REACTION_SEC;
      if (isHardGate) this.lastHardGateAt = candidateAt;
      out.push({ chunkId: chunk.id, stage, obstacle });
    }
    return out;
  }

  nextFloat() {
    return this.random();
  }
}
