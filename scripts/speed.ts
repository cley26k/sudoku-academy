import { makePuzzle } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/random';
import { solveHuman, hardestTech } from '../src/engine/solver';
import { solveUnique } from '../src/engine/bruteforce';
const rng = mulberry32(1);
const t0 = Date.now(); const counts: Record<string, number> = {}; let unsolved = 0; let bad = 0;
const N = 200;
for (let i = 0; i < N; i++) {
  const { givens, solution } = makePuzzle(rng, i % 2 === 0);
  const r = solveHuman(givens);
  for (let k = 0; k < r.steps.length; k++) {
    const st = r.steps[k];
    if (st.elims.some(e => solution[e.cell] === e.digit) || st.placements.some(p => solution[p.cell] !== p.digit)) { bad++; console.log('UNSOUND', st.tech, st.title); }
  }
  if (!r.solved) unsolved++;
  for (const u of r.used) counts[u] = (counts[u] || 0) + 1;
}
console.log('ms/puzzle', (Date.now() - t0) / N, 'unsolved', unsolved, 'bad', bad, counts);
