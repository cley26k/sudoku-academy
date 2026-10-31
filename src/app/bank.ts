// Selección de ejercicios y sudokus a partir del banco verificado.
import bankJson from '../data/bank.json';
import type { Bank, LiveExercise } from '../engine/exercise';
import { instantiate } from '../engine/exercise';
import type { TechId } from '../engine/step';
import { parseGrid, stateFromValues, State } from '../engine/grid';
import { solveHuman, hardestTech } from '../engine/solver';
import { randomTransform, mapValues, identity } from '../engine/transform';
import { mulberry32, hashString } from '../engine/random';
import { makePuzzle } from '../engine/generator';
import { SINGLES, techRank } from '../engine/techniques';

export const BANK = bankJson as unknown as Bank;
export const bankCount = (t: TechId) => BANK.ex.filter(e => e.t === t).length;
const randSeed = () => 1 + Math.floor(Math.random() * 2 ** 31);

export interface PickOpts { techs: TechId[]; difficulty: 0 | 1 | 2 | 3; pureOnly: boolean; avoid?: Set<number>; variantNot?: string; variantIs?: string; puzzleNot?: number; seed?: number }
export interface PickResult { ex: LiveExercise | null; reason?: string; poolSize: number }

export function pickExercise(o: PickOpts): PickResult {
  let pool = BANK.ex.map((e, i) => ({ e, i })).filter(({ e }) => o.techs.includes(e.t));
  if (!pool.length) return { ex: null, poolSize: 0, reason: 'El banco no contiene posiciones verificadas para esta selección.' };
  if (o.difficulty) { const f = pool.filter(({ e }) => e.d === o.difficulty); if (f.length) pool = f; }
  if (o.pureOnly) {
    pool = pool.filter(({ e }) => e.p === 1);
    if (!pool.length) return { ex: null, poolSize: 0, reason: 'Sin candidatos precargados solo hay posiciones para los singles: en las demás técnicas, la posición depende de eliminaciones anteriores que tendrías que reconstruir. Activa «Candidatos precargados».' };
  }
  if (o.variantNot) { const f = pool.filter(({ e }) => e.var !== o.variantNot); if (f.length) pool = f; }
  if (o.variantIs) { const f = pool.filter(({ e }) => e.var === o.variantIs); if (f.length) pool = f; }
  if (o.puzzleNot !== undefined) { const f = pool.filter(({ e }) => e.pz !== o.puzzleNot); if (f.length) pool = f; }
  if (o.avoid?.size) { const f = pool.filter(({ i }) => !o.avoid!.has(i)); if (f.length) pool = f; }
  // Repartir equitativamente entre técnicas seleccionadas
  const techsInPool = [...new Set(pool.map(p => p.e.t))];
  const rng = mulberry32(o.seed ?? randSeed());
  for (let tries = 0; tries < 12; tries++) {
    const t = techsInPool[Math.floor(rng() * techsInPool.length)];
    const sub = pool.filter(p => p.e.t === t);
    const { i } = sub[Math.floor(rng() * sub.length)];
    const ex = instantiate(BANK, i, 1 + Math.floor(rng() * 2 ** 31));
    if (ex && (!o.variantNot || ex.variant !== o.variantNot || tries > 8) && (!o.variantIs || ex.variant === o.variantIs || tries > 8)) return { ex, poolSize: pool.length };
  }
  return { ex: null, poolSize: pool.length, reason: 'No se pudo verificar ninguna posición para esta selección.' };
}

export function exerciseFromId(id: string): LiveExercise | null {
  const [i, s] = id.split(':').map(Number);
  return instantiate(BANK, i, s);
}

/** Ejercicio fijo y reproducible para la lección de una técnica. */
export function lessonExercise(t: TechId, slot: number, opts: { variantNot?: string; puzzleNot?: number } = {}): LiveExercise | null {
  const idx = BANK.ex.map((e, i) => ({ e, i })).filter(({ e }) => e.t === t);
  if (!idx.length) return null;
  let pool = slot === 0 ? idx.filter(({ e }) => e.d === 1) : idx;
  if (!pool.length) pool = idx;
  if (opts.variantNot) { const f = pool.filter(({ e }) => e.var !== opts.variantNot); if (f.length) pool = f; }
  if (opts.puzzleNot !== undefined) { const f = pool.filter(({ e }) => e.pz !== opts.puzzleNot); if (f.length) pool = f; }
  let fallback: LiveExercise | null = null;
  for (let k = 0; k < pool.length; k++) {
    const { i } = pool[(slot * 7 + k) % pool.length];
    for (let s = 0; s < (slot === 0 ? 1 : 6); s++) {
      const ex = instantiate(BANK, i, slot === 0 ? 0 : 1000 + slot * 31 + i + s * 7919);
      // La transformación puede trasponer la posición: se comprueba la variante ya transformada
      if (ex && ex.steps.length && (!opts.variantNot || ex.variant !== opts.variantNot)) return ex;
      if (ex && ex.steps.length && !fallback) fallback = ex;
    }
  }
  // Si la técnica no tiene otra variante (p. ej. el single desnudo), se usa otra posición de la misma variante
  return fallback;
}

// ---- Sudokus completos ----
export interface FullPuzzle { givens: number[]; solution: number[]; hardest: TechId | null; used: TechId[]; source: string; id: string }

export const LEVELS: { id: string; label: string; max: TechId; blurb: string }[] = [
  { id: 'facil', label: 'Fácil', max: 'hidden_single', blurb: 'Solo singles.' },
  { id: 'media', label: 'Media', max: 'hidden_triple', blurb: 'Intersecciones y subconjuntos.' },
  { id: 'dificil', label: 'Difícil', max: 'unique_rect1', blurb: 'Peces, alas y rectángulos únicos.' },
  { id: 'experta', label: 'Experta', max: 'jellyfish', blurb: 'Coloreado y peces grandes.' },
];

function rate(givens: number[], allowed: TechId[] | 'all') {
  const r = solveHuman(givens, allowed);
  return { solved: r.solved, hardest: hardestTech(r.used), used: [...r.used] };
}

/** Sudoku por nivel: se genera en el momento y se califica con el solver humano; si no, se usa el banco. */
export function puzzleForLevel(levelId: string): FullPuzzle {
  const lv = LEVELS.find(l => l.id === levelId)!;
  const lo = levelId === 'facil' ? -1 : techRank(LEVELS[LEVELS.findIndex(l => l.id === levelId) - 1].max);
  const hi = techRank(lv.max);
  const seed = randSeed();
  const rng = mulberry32(seed);
  const t0 = Date.now();
  while (Date.now() - t0 < 120) {
    const { givens, solution } = makePuzzle(rng);
    const r = rate(givens, 'all');
    if (!r.solved || !r.hardest) continue;
    const k = techRank(r.hardest);
    if (k > lo && k <= hi) return { givens, solution, hardest: r.hardest, used: r.used, source: 'generado', id: `g${seed}` };
  }
  const cands = BANK.puzzles.map((p, i) => ({ p, i })).filter(({ p }) => (p.h as string) !== 'unsolved' && techRank(p.h) > lo && techRank(p.h) <= hi);
  const { p, i } = cands[Math.floor(Math.random() * cands.length)];
  return fromBank(i, randSeed(), p.h, p.u);
}

function fromBank(i: number, seed: number, h: TechId | null, u: TechId[]): FullPuzzle {
  const p = BANK.puzzles[i];
  const t = randomTransform(mulberry32(seed));
  return { givens: mapValues(t, parseGrid(p.g)), solution: mapValues(t, parseGrid(p.s)), hardest: h, used: u, source: 'banco', id: `b${i}:${seed}` };
}

export interface RestrictedResult { puzzle: FullPuzzle | null; reason?: string; checked: number }
/** Sudoku que se resuelve EXCLUSIVAMENTE con las técnicas permitidas (singles siempre incluidos)
 *  y que necesita al menos una de las técnicas no triviales elegidas. */
export function restrictedPuzzle(allowed: TechId[], requireAny?: TechId[]): RestrictedResult {
  const nonSingles = (requireAny ?? allowed).filter(t => !SINGLES.includes(t));
  let checked = 0;
  const ok = (givens: number[]) => {
    checked++;
    const r = solveHuman(givens, allowed);
    if (!r.solved) return null;
    if (nonSingles.length && !nonSingles.some(t => r.used.has(t))) return null;
    return r;
  };
  const order = BANK.puzzles.map((_, i) => i).sort(() => Math.random() - 0.5);
  for (const i of order) {
    const p = BANK.puzzles[i];
    if (nonSingles.length && !nonSingles.some(t => p.u.includes(t))) continue;
    const r = ok(parseGrid(p.g));
    if (r) return { puzzle: fromBank(i, randSeed(), hardestTech(r.used), [...r.used]), checked };
    if (checked > 400) break;
  }
  if (!nonSingles.length) {
    const rng = mulberry32(randSeed());
    for (let k = 0; k < 40; k++) { const { givens, solution } = makePuzzle(rng); const r = ok(givens); if (r) return { puzzle: { givens, solution, hardest: hardestTech(r.used), used: [...r.used], source: 'generado', id: 'g' }, checked }; }
  }
  return { puzzle: null, checked, reason: `Revisé ${checked} sudokus verificados y ninguno se resuelve usando solo esta combinación de técnicas. Añade alguna técnica más (por ejemplo, intersecciones) o usa ejercicios breves.` };
}

export function dailyPuzzle(day: string): FullPuzzle {
  // Instantáneo: sudoku del banco (verificado) elegido y transformado según la fecha
  const pool = BANK.puzzles.map((p, i) => ({ p, i })).filter(({ p }) => (p.h as string) !== 'unsolved' && techRank(p.h) >= techRank('pointing') && techRank(p.h) <= techRank('aic'));
  const h = hashString(day);
  const { p, i } = pool[h % pool.length];
  const f = fromBank(i, h, p.h, p.u);
  return { ...f, source: 'reto diario', id: `d${day}` };
}

export const stateOf = (givens: number[]): State => stateFromValues(givens);
export const _id = identity;
