// Transformaciones que preservan la lógica del Sudoku (isomorfismos):
// permutación de dígitos, de filas dentro de una banda, de bandas, de columnas
// dentro de una pila, de pilas, y trasposición. Una deducción válida sigue
// siendo válida tras aplicarlas; aun así, cada ejercicio transformado se
// vuelve a verificar con el motor antes de mostrarse.
import { Rng, shuffle } from './random';
import { State } from './grid';

export interface Transform { cellMap: number[]; digitMap: number[] }

export function identity(): Transform {
  return { cellMap: Array.from({ length: 81 }, (_, i) => i), digitMap: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
}

export function randomTransform(rng: Rng): Transform {
  const perm3x3 = () => shuffle([0, 1, 2], rng).flatMap(b => shuffle([0, 1, 2], rng).map(x => b * 3 + x));
  const rows = perm3x3(), cols = perm3x3();
  const transpose = rng() < 0.5;
  const digits = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)];
  const cellMap = new Array(81);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    let nr = rows[r], nc = cols[c];
    if (transpose) [nr, nc] = [nc, nr];
    cellMap[r * 9 + c] = nr * 9 + nc;
  }
  return { cellMap, digitMap: digits };
}

export function mapValues(t: Transform, v: number[]): number[] {
  const out = new Array(81).fill(0);
  for (let i = 0; i < 81; i++) out[t.cellMap[i]] = t.digitMap[v[i]];
  return out;
}
export function mapMask(t: Transform, m: number): number {
  let r = 0; for (let d = 1; d <= 9; d++) if (m & (1 << d)) r |= 1 << t.digitMap[d]; return r;
}
export function mapState(t: Transform, s: State): State {
  const c = new Array(81).fill(0);
  for (let i = 0; i < 81; i++) c[t.cellMap[i]] = mapMask(t, s.c[i]);
  return { v: mapValues(t, s.v), c };
}
