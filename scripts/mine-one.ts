import { writeFileSync } from 'fs';
import { makePuzzle } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/random';
import { solveHuman, hardestTech } from '../src/engine/solver';
import { gridToString, encodeCands, basicCands, popcount } from '../src/engine/grid';
const T = process.env.TECH!, SEED = +(process.env.SEED || 1), MAX_MS = +(process.env.MAXMS || 900000);
const rng = mulberry32(SEED); const out: any[] = []; const t0 = Date.now(); let n = 0;
while (Date.now() - t0 < MAX_MS) {
  n++;
  const { givens, solution } = makePuzzle(rng, n % 3 !== 0);
  const r = solveHuman(givens);
  const i = r.steps.findIndex(s => s.tech === T);
  if (i < 0) continue;
  const st = r.states[i]; const bc = basicCands(st.v);
  out.push({ puzzle: { g: gridToString(givens), s: gridToString(solution), h: r.solved ? hardestTech(r.used) : 'unsolved', u: [...r.used] },
    ex: { t: T, v: gridToString(st.v), c: encodeCands(st.c), d: 1, p: st.c.every((m, k) => m === bc[k]) ? 1 : 0, var: r.steps[i].variant, n: st.c.reduce((a, m) => a + popcount(m), 0) } });
  writeFileSync(`/tmp/claude-0/extra-${T}-${SEED}.json`, JSON.stringify(out));
}
console.log(T, SEED, n, out.length);
