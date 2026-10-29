// Núcleo geométrico y de estado del Sudoku. Independiente de la interfaz.
// Celdas 0..80 (fila mayor). Unidades 0..26: filas 0-8, columnas 9-17, cajas 18-26.
// Candidatos como máscara de bits: bit d (1..9) => 1 << d.

export const rowOf = (c: number) => (c / 9) | 0;
export const colOf = (c: number) => c % 9;
export const boxOf = (c: number) => ((rowOf(c) / 3) | 0) * 3 + ((colOf(c) / 3) | 0);
export const cellAt = (r: number, c: number) => r * 9 + c;

export const UNITS: number[][] = [];
for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => cellAt(r, c)));
for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => cellAt(r, c)));
for (let b = 0; b < 9; b++) {
  const br = ((b / 3) | 0) * 3, bc = (b % 3) * 3;
  const u: number[] = [];
  for (let i = 0; i < 9; i++) u.push(cellAt(br + ((i / 3) | 0), bc + (i % 3)));
  UNITS.push(u);
}
export const ROW_UNIT = (c: number) => rowOf(c);
export const COL_UNIT = (c: number) => 9 + colOf(c);
export const BOX_UNIT = (c: number) => 18 + boxOf(c);
export const CELL_UNITS: number[][] = Array.from({ length: 81 }, (_, c) => [ROW_UNIT(c), COL_UNIT(c), BOX_UNIT(c)]);

export const PEERS: number[][] = [];
const PEER_FLAGS = new Uint8Array(81 * 81);
for (let c = 0; c < 81; c++) {
  const s = new Set<number>();
  for (const u of CELL_UNITS[c]) for (const x of UNITS[u]) if (x !== c) s.add(x);
  PEERS.push([...s].sort((a, b) => a - b));
  for (const x of s) PEER_FLAGS[c * 81 + x] = 1;
}
export const sees = (a: number, b: number) => a !== b && PEER_FLAGS[a * 81 + b] === 1;

export const ALL = 0x3fe;
export const bit = (d: number) => 1 << d;
export const has = (m: number, d: number) => (m & (1 << d)) !== 0;
export function popcount(m: number) { let n = 0; while (m) { m &= m - 1; n++; } return n; }
export function digitsOf(m: number): number[] { const r: number[] = []; for (let d = 1; d <= 9; d++) if (m & (1 << d)) r.push(d); return r; }
export function maskOf(ds: number[]) { let m = 0; for (const d of ds) m |= 1 << d; return m; }

export type UnitKind = 'row' | 'col' | 'box';
export const unitKind = (u: number): UnitKind => (u < 9 ? 'row' : u < 18 ? 'col' : 'box');
export const unitIndex = (u: number) => u % 9;
export function unitName(u: number): string {
  const k = unitKind(u);
  return `${k === 'row' ? 'fila' : k === 'col' ? 'columna' : 'caja'} ${unitIndex(u) + 1}`;
}
export const unitNameCap = (u: number) => { const s = unitName(u); return s[0].toUpperCase() + s.slice(1); };
export const cellName = (c: number) => `F${rowOf(c) + 1}C${colOf(c) + 1}`;
export function listCells(cs: number[]) { return joinEs(cs.map(cellName)); }
export function joinEs(xs: (string | number)[], last = 'y'): string {
  const s = xs.map(String);
  if (s.length <= 1) return s.join('');
  return s.slice(0, -1).join(', ') + ` ${last} ` + s[s.length - 1];
}

/** Unidades comunes a todas las celdas dadas. */
export function commonUnits(cells: number[]): number[] {
  return [0, 1, 2].map(k => CELL_UNITS[cells[0]][k]).filter(u => cells.every(c => CELL_UNITS[c].includes(u)));
}

export interface State { v: number[]; c: number[] }

export function parseGrid(s: string): number[] {
  const t = s.replace(/[^0-9.]/g, '');
  if (t.length !== 81) throw new Error('La cuadrícula debe tener 81 casillas');
  return [...t].map(ch => (ch === '.' ? 0 : +ch));
}
export const gridToString = (v: number[]) => v.map(d => (d ? String(d) : '.')).join('');

export function basicCands(v: number[]): number[] {
  const c = new Array(81).fill(0);
  for (let i = 0; i < 81; i++) {
    if (v[i]) continue;
    let m = ALL;
    for (const p of PEERS[i]) if (v[p]) m &= ~(1 << v[p]);
    c[i] = m;
  }
  return c;
}
export const stateFromValues = (v: number[]): State => ({ v: v.slice(), c: basicCands(v) });
export const cloneState = (s: State): State => ({ v: s.v.slice(), c: s.c.slice() });

export function place(s: State, cell: number, d: number) {
  s.v[cell] = d; s.c[cell] = 0;
  const b = ~(1 << d);
  for (const p of PEERS[cell]) s.c[p] &= b;
}
export function eliminate(s: State, cell: number, d: number) { s.c[cell] &= ~(1 << d); }

export const isComplete = (v: number[]) => v.every(d => d > 0);

/** Pares de casillas en conflicto (mismo valor en una unidad). */
export function conflicts(v: number[]): Set<number> {
  const bad = new Set<number>();
  for (const u of UNITS) {
    const seen = new Map<number, number>();
    for (const c of u) {
      const d = v[c]; if (!d) continue;
      if (seen.has(d)) { bad.add(c); bad.add(seen.get(d)!); } else seen.set(d, c);
    }
  }
  return bad;
}

/** Contradicción: casilla vacía sin candidatos, o dígito sin sitio en una unidad. */
export function contradiction(s: State): string | null {
  for (let i = 0; i < 81; i++) if (!s.v[i] && !s.c[i]) return `${cellName(i)} se ha quedado sin candidatos`;
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      let ok = false;
      for (const c of UNITS[u]) if (s.v[c] === d || (!s.v[c] && has(s.c[c], d))) { ok = true; break; }
      if (!ok) return `El ${d} no tiene sitio en la ${unitName(u)}`;
    }
  }
  if (conflicts(s.v).size) return 'Hay números repetidos en una unidad';
  return null;
}

export function encodeCands(c: number[]): string { return c.map(m => (m >> 1).toString(36).padStart(2, '0')).join(''); }
export function decodeCands(s: string): number[] { const r: number[] = []; for (let i = 0; i < 81; i++) r.push(parseInt(s.slice(i * 2, i * 2 + 2), 36) << 1); return r; }

export function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i <= arr.length - (k - acc.length); i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}
