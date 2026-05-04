export type PowerupType = 'shield' | 'slowmo' | 'double_score' | 'magnet';

export interface PowerupDefinition {
  id: PowerupType;
  label: string;
  icon: string;
  color: string;
  durationMs: number;
  stackMode: 'refresh' | 'stack';
  multipliers: { speed: number; score: number; magnetRadius: number };
  shieldHits?: number;
}

export interface ActivePowerup {
  type: PowerupType;
  startedAt: number;
  endsAt: number;
  stacks: number;
  remainingShieldHits?: number;
}

export const POWERUP_DEFS: Record<PowerupType, PowerupDefinition> = {
  shield: { id: 'shield', label: 'SHIELD', icon: 'shield-checkmark', color: '#00F5FF', durationMs: 0, stackMode: 'stack', multipliers: { speed: 1, score: 1, magnetRadius: 1 }, shieldHits: 1 },
  slowmo: { id: 'slowmo', label: 'SLOW-MO', icon: 'timer-outline', color: '#FF9900', durationMs: 3000, stackMode: 'refresh', multipliers: { speed: 0.6, score: 1, magnetRadius: 1 } },
  magnet: { id: 'magnet', label: 'MAGNET', icon: 'magnet', color: '#FF44CC', durationMs: 8000, stackMode: 'refresh', multipliers: { speed: 1, score: 1, magnetRadius: 1.55 } },
  double_score: { id: 'double_score', label: '2× SCORE', icon: 'star', color: '#FFE600', durationMs: 10000, stackMode: 'refresh', multipliers: { speed: 1, score: 2, magnetRadius: 1 } },
};

export interface PowerupManagerState { active: Partial<Record<PowerupType, ActivePowerup>> }

export function createPowerupManagerState(): PowerupManagerState { return { active: {} }; }

export function applyPowerup(state: PowerupManagerState, type: PowerupType, nowMs: number, extraShieldHits = 0) {
  const def = POWERUP_DEFS[type];
  const existing = state.active[type];
  if (def.durationMs === 0) {
    const baseHits = (def.shieldHits ?? 1) + extraShieldHits;
    state.active[type] = { type, startedAt: nowMs, endsAt: Number.POSITIVE_INFINITY, stacks: (existing?.stacks ?? 0) + 1, remainingShieldHits: (existing?.remainingShieldHits ?? 0) + baseHits };
    return;
  }
  state.active[type] = { type, startedAt: nowMs, endsAt: def.stackMode === 'stack' && existing ? existing.endsAt + def.durationMs : nowMs + def.durationMs, stacks: def.stackMode === 'stack' && existing ? existing.stacks + 1 : 1 };
}

export function tickPowerups(state: PowerupManagerState, nowMs: number) {
  (Object.keys(state.active) as PowerupType[]).forEach((type) => {
    const active = state.active[type];
    if (active && Number.isFinite(active.endsAt) && active.endsAt <= nowMs) delete state.active[type];
  });
}

export function consumeShieldHit(state: PowerupManagerState): number {
  const shield = state.active.shield;
  if (!shield) return 0;
  shield.remainingShieldHits = Math.max(0, (shield.remainingShieldHits ?? 0) - 1);
  if (!shield.remainingShieldHits) delete state.active.shield;
  return shield.remainingShieldHits ?? 0;
}

export function getPowerupEffects(state: PowerupManagerState) {
  return (Object.keys(state.active) as PowerupType[]).reduce((acc, type) => {
    const m = POWERUP_DEFS[type].multipliers;
    acc.speed *= m.speed;
    acc.score *= m.score;
    acc.magnetRadius *= m.magnetRadius;
    return acc;
  }, { speed: 1, score: 1, magnetRadius: 1 });
}

export function getActivePowerups(state: PowerupManagerState, nowMs: number) {
  return (Object.keys(state.active) as PowerupType[]).map((type) => {
    const e = state.active[type]!;
    return { ...e, durationLeftMs: Number.isFinite(e.endsAt) ? Math.max(0, e.endsAt - nowMs) : 0 };
  });
}
