// Solver por fuerza bruta (solo para verificar unicidad y obtener la solución).
// Nunca se usa para justificar deducciones ante el usuario.
import { rowOf, colOf, boxOf } from './grid';

const R = new Int32Array(81), C = new Int32Array(81), B = new Int32Array(81);
for (let i = 0; i < 81; i++) { R[i] = rowOf(i); C[i] = colOf(i); B[i] = boxOf(i); }

/** Cuenta soluciones hasta `limit`. Si `out` se da, guarda la primera solución. */
export function countSolutions(v: number[], limit = 2, out?: number[], order?: number[]): number {
  const g = v.slice();
  const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
  for (let i = 0; i < 81; i++) {
    const d = g[i]; if (!d) continue;
    const b = 1 << d;
    if ((rows[R[i]] | cols[C[i]] | boxes[B[i]]) & b) return 0;
    rows[R[i]] |= b; cols[C[i]] |= b; boxes[B[i]] |= b;
  }
  let count = 0;
  const digitOrder = order ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const rec = (): boolean => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ~(rows[R[i]] | cols[C[i]] | boxes[B[i]]) & 0x3fe;
      let n = 0, t = m; while (t) { t &= t - 1; n++; }
      if (n < bestN) { bestN = n; best = i; bestMask = m; if (n <= 1) break; }
    }
    if (best < 0) { count++; if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i]; return count >= limit; }
    if (bestN === 0) return false;
    for (const d of digitOrder) {
      const b = 1 << d; if (!(bestMask & b)) continue;
      g[best] = d; rows[R[best]] |= b; cols[C[best]] |= b; boxes[B[best]] |= b;
      if (rec()) return true;
      g[best] = 0; rows[R[best]] &= ~b; cols[C[best]] &= ~b; boxes[B[best]] &= ~b;
    }
    return false;
  };
  rec();
  return count;
}

export function solveUnique(v: number[]): number[] | null {
  const out = new Array(81).fill(0);
  return countSolutions(v, 2, out) === 1 ? out : null;
}
