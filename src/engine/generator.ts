// Generador de sudokus con solución única verificada.
import { countSolutions } from './bruteforce';
import { Rng, shuffle } from './random';

export function randomSolution(rng: Rng): number[] {
  const empty = new Array(81).fill(0);
  const out = new Array(81).fill(0);
  const order = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  // Sembrar la primera fila aleatoriamente y completar
  for (let i = 0; i < 9; i++) empty[i] = order[i];
  countSolutions(empty, 1, out, shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng));
  return out;
}

/** Quita pistas mientras la solución siga siendo única. Simetría rotacional opcional. */
export function makePuzzle(rng: Rng, symmetric = true): { givens: number[]; solution: number[] } {
  const solution = randomSolution(rng);
  const g = solution.slice();
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  const done = new Set<number>();
  for (const c of cells) {
    if (done.has(c)) continue;
    const pair = symmetric ? [c, 80 - c] : [c];
    pair.forEach(x => done.add(x));
    const saved = pair.map(x => g[x]);
    pair.forEach(x => (g[x] = 0));
    if (countSolutions(g, 2) !== 1) pair.forEach((x, i) => (g[x] = saved[i]));
  }
  return { givens: g, solution };
}
