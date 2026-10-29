// Ejercicios verificados y evaluación determinista de las respuestas del usuario.
import { State, decodeCands, parseGrid, has, digitsOf, cellName, unitName, PEERS, CELL_UNITS, UNITS, listCells, joinEs } from './grid';
import { Step, TechId, CD, cdKey } from './step';
import { TECH_BY_ID, TECHS } from './techniques';
import { easiestTech } from './solver';
import { Transform, randomTransform, mapState, mapValues, identity } from './transform';
import { mulberry32 } from './random';

export interface PuzzleRec { g: string; s: string; h: TechId; u: TechId[] }
export interface ExerciseRec { t: TechId; pz: number; v: string; c: string; d: 1 | 2 | 3; p: 0 | 1; var: string; ns?: 1 }
export interface Bank { puzzles: PuzzleRec[]; ex: ExerciseRec[] }

export interface LiveExercise {
  id: string;            // índice en el banco + semilla de transformación
  tech: TechId;
  state: State;
  givens: boolean[];
  solution: number[];
  steps: Step[];         // todas las instancias de la técnica en esta posición
  strict: boolean;       // la técnica es el paso lógico más sencillo disponible
  difficulty: 1 | 2 | 3;
  pure: boolean;         // candidatos = candidatos básicos (sin eliminaciones previas)
  variant: string;
  puzzleIndex: number;
}

export function instantiate(bank: Bank, index: number, seed: number, verifyStrict = false): LiveExercise | null {
  const rec = bank.ex[index]; if (!rec) return null;
  const pz = bank.puzzles[rec.pz];
  const t: Transform = seed === 0 ? identity() : randomTransform(mulberry32(seed));
  const state = mapState(t, { v: parseGrid(rec.v), c: decodeCands(rec.c) });
  const givens = mapValues(t, parseGrid(pz.g)).map(d => d > 0);
  const solution = mapValues(t, parseGrid(pz.s));
  // Verificación: la técnica debe aplicarse realmente en esta posición
  const steps = TECH_BY_ID[rec.t].find(state);
  if (!steps.length) return null;
  // Consistencia con la solución: ninguna eliminación puede quitar el valor correcto
  for (const st of steps) {
    if (st.elims.some(e => solution[e.cell] === e.digit)) return null;
    if (st.placements.some(p => solution[p.cell] !== p.digit)) return null;
  }
  // El banco ya está verificado offline (tests/bank.test.ts); en la app no hace falta repetirlo
  const strict = verifyStrict ? easiestTech(state) === rec.t : !rec.ns;
  return { id: `${index}:${seed}`, tech: rec.t, state, givens, solution, steps, strict, difficulty: rec.d, pure: rec.p === 1, variant: steps[0].variant, puzzleIndex: rec.pz };
}

export type FeedbackStatus = 'correct' | 'partial' | 'wrong' | 'offtarget' | 'empty' | 'unjustified';
export interface FeedbackLine { text: string; kind: 'error' | 'ok' | 'info'; cell?: number; digit?: number }
export interface Feedback { status: FeedbackStatus; title: string; lines: FeedbackLine[]; matched?: Step; missing?: CD[]; wrong?: CD[] }

const techName = (id: TechId) => TECH_BY_ID[id].name;

const findCache = new WeakMap<State, Map<TechId, Step[]>>();
function cachedFind(state: State, id: TechId): Step[] {
  let m = findCache.get(state); if (!m) { m = new Map(); findCache.set(state, m); }
  if (!m.has(id)) m.set(id, TECH_BY_ID[id].find(state));
  return m.get(id)!;
}
function otherTechFor(state: State, target: TechId, pred: (st: Step) => boolean): TechId | null {
  for (const t of TECHS) {
    if (t.id === target) continue;
    if (cachedFind(state, t.id).some(pred)) return t.id;
  }
  return null;
}

export function gradeEliminations(ex: LiveExercise, marks: CD[]): Feedback {
  if (!marks.length) return { status: 'empty', title: 'Marca primero los candidatos que quieres eliminar.', lines: [] };
  const all = new Set(ex.steps.flatMap(s => s.elims.map(cdKey)));
  let best = ex.steps[0], bestHit = -1;
  for (const st of ex.steps) {
    const hit = st.elims.filter(e => marks.some(m => cdKey(m) === cdKey(e))).length;
    if (hit > bestHit) { best = st; bestHit = hit; }
  }
  const lines: FeedbackLine[] = [];
  const wrong: CD[] = [];
  let off = 0;
  for (const m of marks) {
    if (all.has(cdKey(m))) continue;
    const other = otherTechFor(ex.state, ex.tech, st => st.elims.some(e => cdKey(e) === cdKey(m)));
    if (other) { off++; lines.push({ kind: 'info', cell: m.cell, digit: m.digit, text: `Eliminar el ${m.digit} de ${cellName(m.cell)} es lógico, pero se deduce con ${techName(other)}, no con ${techName(ex.tech)}.` }); continue; }
    wrong.push(m);
    const why = best.whyNot?.(m.cell, m.digit) ?? ex.steps.map(s => s.whyNot?.(m.cell, m.digit)).find(Boolean);
    lines.push({ kind: 'error', cell: m.cell, digit: m.digit, text: why ?? `Nada en esta posición justifica eliminar el ${m.digit} de ${cellName(m.cell)}.` });
  }
  if (wrong.length) return { status: 'wrong', title: wrong.length === 1 ? 'Esa eliminación no está justificada.' : `${wrong.length} eliminaciones no están justificadas.`, lines, wrong, matched: best };
  const missing = best.elims.filter(e => !marks.some(m => cdKey(m) === cdKey(e)));
  if (off && marks.length === off) return { status: 'offtarget', title: `Eliminaciones válidas, pero no son de ${techName(ex.tech)}.`, lines };
  if (missing.length) {
    lines.push({ kind: 'info', text: `El mismo patrón justifica ${missing.length === 1 ? 'una eliminación más' : `${missing.length} eliminaciones más`}.` });
    return { status: 'partial', title: 'Vas bien: todo lo que marcaste es correcto.', lines, matched: best, missing };
  }
  return { status: 'correct', title: '¡Exacto! Deducción completa y justificada.', lines: [{ kind: 'ok', text: best.title }], matched: best };
}

export function gradeRecognition(ex: LiveExercise, selected: number[]): Feedback {
  if (!selected.length) return { status: 'empty', title: 'Selecciona las casillas que forman el patrón.', lines: [] };
  const S = new Set(selected);
  let best = ex.steps[0], score = -Infinity;
  for (const st of ex.steps) {
    const P = new Set(st.pattern.cells);
    const sc = [...S].filter(c => P.has(c)).length - [...S].filter(c => !P.has(c)).length - [...P].filter(c => !S.has(c)).length * 0.5;
    if (sc > score) { score = sc; best = st; }
  }
  const P = new Set(best.pattern.cells);
  const extra = [...S].filter(c => !P.has(c));
  const missing = [...P].filter(c => !S.has(c));
  if (!extra.length && !missing.length) return { status: 'correct', title: '¡Lo has encontrado!', lines: [{ kind: 'ok', text: best.title }], matched: best };
  const lines: FeedbackLine[] = [];
  for (const c of extra) lines.push({ kind: 'error', cell: c, text: `${cellName(c)} no forma parte del patrón.` });
  if (missing.length) lines.push({ kind: 'info', text: `Falta${missing.length > 1 ? 'n' : ''} ${missing.length} casilla${missing.length > 1 ? 's' : ''} del patrón.` });
  return { status: extra.length ? 'wrong' : 'partial', title: extra.length ? 'Ese no es el patrón completo.' : 'Vas bien, pero falta parte del patrón.', lines, matched: best };
}

export function gradePlacement(ex: LiveExercise, cell: number, digit: number): Feedback {
  const s = ex.state;
  if (ex.solution[cell] !== digit) {
    const peer = PEERS[cell].find(p => s.v[p] === digit);
    let text: string;
    if (peer !== undefined) {
      const u = CELL_UNITS[cell].find(uu => UNITS[uu].includes(peer))!;
      text = `Ya hay un ${digit} en la ${unitName(u)} (${cellName(peer)}).`;
    } else if (!has(s.c[cell], digit)) text = `El ${digit} ya está descartado en ${cellName(cell)}.`;
    else text = `${cellName(cell)} todavía admite ${joinEs(digitsOf(s.c[cell]))}: nada obliga a que sea ${digit}.`;
    return { status: 'wrong', title: 'Ese número no se puede deducir ahí.', lines: [{ kind: 'error', cell, digit, text }], wrong: [{ cell, digit }] };
  }
  const match = ex.steps.find(st => st.placements.some(p => p.cell === cell && p.digit === digit));
  if (match) return { status: 'correct', title: '¡Bien deducido!', lines: [{ kind: 'ok', text: match.title }], matched: match };
  const other = otherTechFor(s, ex.tech, st => st.placements.some(p => p.cell === cell && p.digit === digit));
  if (other) return { status: 'offtarget', title: `Correcto, pero se deduce con ${techName(other)}.`, lines: [{ kind: 'info', cell, text: `Buscamos un ${techName(ex.tech)}. Intenta encontrarlo.` }] };
  const reason = ex.tech === 'naked_single'
    ? `${cellName(cell)} todavía tiene ${digitsOf(s.c[cell]).length} candidatos (${joinEs(digitsOf(s.c[cell]))}).`
    : `En ninguna unidad de ${cellName(cell)} el ${digit} tiene un único sitio.`;
  return { status: 'unjustified', title: 'El número es correcto, pero aún no se deduce con esta técnica.', lines: [{ kind: 'info', cell, text: reason + ' Acertar sin una razón no cuenta como deducción.' }] };
}

export const _x = listCells;
