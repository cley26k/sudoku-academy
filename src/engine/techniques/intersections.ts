import { State, UNITS, has, cellName, unitName, listCells, rowOf, colOf, boxOf, ROW_UNIT, COL_UNIT, BOX_UNIT } from '../grid';
import { Step, cd, CD } from '../step';

function build(kind: 'pointing' | 'claiming', s: State, from: number, to: number, d: number, pos: number[], elimCells: number[]): Step {
  const elims: CD[] = elimCells.map(c => cd(c, d));
  const patternCands = pos.map(c => cd(c, d));
  const pointing = kind === 'pointing';
  const near = (c: number) => pos.reduce((b, p) => (Math.abs(p - c) < Math.abs(b - c) ? p : b), pos[0]);
  const rays = elimCells.map(c => ({ from: near(c), to: c, tone: 'elim' as const }));
  const fromN = unitName(from), toN = unitName(to);
  const base = { u: from, tone: 'focus' as const }, cover = { u: to, tone: 'cover' as const };
  return {
    tech: kind, key: `${kind}${from}-${to}-${d}`, placements: [], elims,
    pattern: { cells: pos, cands: patternCands }, digits: [d],
    variant: pointing ? (to < 9 ? 'row' : 'col') : (from < 9 ? 'row' : 'col'),
    title: pointing ? `Bloqueo caja-línea: el ${d} de la ${fromN} en la ${toN}` : `Bloqueo línea-caja: el ${d} de la ${fromN} en la ${toN}`,
    hints: [
      { text: `Mira la ${fromN}.`, units: [base] },
      { text: `Observa dónde puede ir el ${d} dentro de la ${fromN}.`, units: [base], cands: patternCands.map(x => ({ ...x, tone: 'pattern' as const })), digitFocus: d },
      { text: pointing
          ? `Todas las posiciones del ${d} en la caja están en la ${toN}. La caja bloquea esa línea.`
          : `Todas las posiciones del ${d} en la ${fromN} caen dentro de la ${toN}. La línea bloquea esa caja.`,
        units: [base, cover], cands: patternCands.map(x => ({ ...x, tone: 'pattern' as const })), digitFocus: d },
      { text: `Se puede eliminar el ${d} de ${listCells(elimCells)}.`, units: [base, cover], cands: [...patternCands.map(x => ({ ...x, tone: 'pattern' as const })), ...elims.map(x => ({ ...x, tone: 'elim' as const }))], digitFocus: d },
    ],
    frames: [
      { text: `Dentro de la ${fromN}, el ${d} solo puede ir en ${listCells(pos)}.`, units: [base], cands: patternCands.map(x => ({ ...x, tone: 'pattern' as const })), digitFocus: d },
      { text: `Todas esas casillas pertenecen también a la ${toN}.`, units: [base, cover], cands: patternCands.map(x => ({ ...x, tone: 'pattern' as const })), digitFocus: d },
      { text: pointing
          ? `Esté donde esté el ${d} de la caja, la ${toN} recibirá su ${d} dentro de esta caja.`
          : `La ${fromN} necesita un ${d}, y solo puede ponerlo dentro de la ${toN}. Ese será también el ${d} de la caja.`,
        units: [base, cover], cands: patternCands.map(x => ({ ...x, tone: 'pattern' as const })), cells: elimCells.map(c => ({ cell: c, tone: 'target' as const })), digitFocus: d },
      { text: pointing
          ? `Por tanto, el resto de la ${toN} no puede tener ${d}: se elimina de ${listCells(elimCells)}.`
          : `Por tanto, el resto de la ${toN} no puede tener ${d}: se elimina de ${listCells(elimCells)}.`,
        units: [base, cover], cands: [...patternCands.map(x => ({ ...x, tone: 'pattern' as const })), ...elims.map(x => ({ ...x, tone: 'elim' as const }))], digitFocus: d, rays },
    ],
    scenarios: pos.map(p => ({
      label: `Si el ${d} está en ${cellName(p)}`,
      frames: [{ text: `Con el ${d} en ${cellName(p)}, ${pointing ? `la ${toN}` : `la ${toN}`} ya tiene su ${d}: ${listCells(elimCells)} no pueden tenerlo.`, hypo: [cd(p, d)], units: [base, cover], cands: elims.map(x => ({ ...x, tone: 'elim' as const })), digitFocus: d, rays: elimCells.map(c => ({ from: p, to: c, tone: 'elim' as const })) }],
    })),
    whyNot: (cell, digit) => {
      if (digit !== d) return `Este patrón solo trata el ${d}; no dice nada del ${digit}.`;
      if (pos.includes(cell)) return `${cellName(cell)} es una de las posiciones donde puede ir el ${d}; no se puede eliminar.`;
      if (!UNITS[to].includes(cell)) return `${cellName(cell)} no está en la ${toN}. La restricción solo afecta a esa ${pointing ? 'línea' : 'caja'}.`;
      return null;
    },
  };
}

export function findPointing(s: State): Step[] {
  const out: Step[] = [];
  for (let b = 18; b < 27; b++) for (let d = 1; d <= 9; d++) {
    const pos = UNITS[b].filter(c => !s.v[c] && has(s.c[c], d));
    if (pos.length < 2) continue;
    for (const lineOf of [ROW_UNIT, COL_UNIT]) {
      const line = lineOf(pos[0]);
      if (!pos.every(c => lineOf(c) === line)) continue;
      const elim = UNITS[line].filter(c => BOX_UNIT(c) !== b && !s.v[c] && has(s.c[c], d));
      if (elim.length) out.push(build('pointing', s, b, line, d, pos, elim));
    }
  }
  return out;
}

export function findClaiming(s: State): Step[] {
  const out: Step[] = [];
  for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
    const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d));
    if (pos.length < 2) continue;
    const b = BOX_UNIT(pos[0]);
    if (!pos.every(c => BOX_UNIT(c) === b)) continue;
    const elim = UNITS[b].filter(c => !UNITS[u].includes(c) && !s.v[c] && has(s.c[c], d));
    if (elim.length) out.push(build('claiming', s, u, b, d, pos, elim));
  }
  return out;
}

export const _unused = { rowOf, colOf, boxOf };
