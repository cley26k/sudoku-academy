// Solver basado exclusivamente en técnicas humanas explícitas.
import { State, cloneState, place, eliminate, stateFromValues, isComplete, contradiction } from './grid';
import { Step, TechId } from './step';
import { TECHS, TECH_BY_ID, SINGLES } from './techniques';

export function applyStep(s: State, st: Step): State {
  const n = cloneState(s);
  for (const p of st.placements) place(n, p.cell, p.digit);
  for (const e of st.elims) eliminate(n, e.cell, e.digit);
  return n;
}

/** Conjunto permitido + singles (siempre permitidos), en orden de dificultad. */
export function allowedOrder(allowed: TechId[] | 'all'): TechId[] {
  if (allowed === 'all') return TECHS.map(t => t.id);
  const set = new Set<TechId>([...SINGLES, ...allowed]);
  return TECHS.map(t => t.id).filter(id => set.has(id));
}

export function nextStep(s: State, allowed: TechId[] | 'all' = 'all'): Step | null {
  for (const id of allowedOrder(allowed)) {
    const steps = TECH_BY_ID[id].find(s);
    if (steps.length) return steps[0];
  }
  return null;
}

/** Primera técnica (la más sencilla) que progresa en este estado. */
export function easiestTech(s: State, allowed: TechId[] | 'all' = 'all'): TechId | null {
  return nextStep(s, allowed)?.tech ?? null;
}

export interface SolveResult { solved: boolean; steps: Step[]; states: State[]; final: State; used: Set<TechId>; stuckReason?: string }

export function solveHuman(start: State | number[], allowed: TechId[] | 'all' = 'all', maxSteps = 400): SolveResult {
  let s = Array.isArray(start) ? stateFromValues(start) : cloneState(start);
  const steps: Step[] = [], states: State[] = [];
  const used = new Set<TechId>();
  for (let i = 0; i < maxSteps; i++) {
    if (isComplete(s.v)) return { solved: true, steps, states, final: s, used };
    const bad = contradiction(s);
    if (bad) return { solved: false, steps, states, final: s, used, stuckReason: bad };
    const st = nextStep(s, allowed);
    if (!st) return { solved: false, steps, states, final: s, used, stuckReason: 'Ninguna técnica permitida progresa' };
    states.push(s); steps.push(st); used.add(st.tech);
    s = applyStep(s, st);
  }
  return { solved: isComplete(s.v), steps, states, final: s, used };
}

export function hardestTech(used: Set<TechId>): TechId | null {
  let best: TechId | null = null;
  for (const t of TECHS) if (used.has(t.id)) best = t.id;
  return best;
}
