// Mina ejercicios verificados: posiciones donde la técnica objetivo es el paso
// lógico más sencillo disponible (el solver humano la elige primero).
import { writeFileSync } from 'fs';
import { makePuzzle } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/random';
import { solveHuman, hardestTech } from '../src/engine/solver';
import { gridToString, encodeCands, basicCands, popcount } from '../src/engine/grid';
import { TECHS } from '../src/engine/techniques';
import type { ExerciseRec, PuzzleRec } from '../src/engine/exercise';
import type { TechId } from '../src/engine/step';

const CAP = +(process.env.CAP || 120), MAX_P = +(process.env.MAXP || 40000), MAX_MS = +(process.env.MAXMS || 480000);
const PER_HARD = 30;
const rng = mulberry32(+(process.env.SEED || 20261028));
const puzzles: PuzzleRec[] = []; const ex: (ExerciseRec & { n: number })[] = [];
const count: Record<string, number> = {}; const hardCount: Record<string, number> = {};
const t0 = Date.now(); let generated = 0;
const full = () => TECHS.every(t => (count[t.id] || 0) >= CAP);
while (generated < MAX_P && Date.now() - t0 < MAX_MS && !full()) {
  generated++;
  const { givens, solution } = makePuzzle(rng, generated % 3 !== 0);
  const r = solveHuman(givens);
  const hard = hardestTech(r.used) as TechId;
  const wanted: { i: number; t: TechId }[] = [];
  const byTech = new Map<TechId, number[]>();
  r.steps.forEach((st, i) => { if (!byTech.has(st.tech)) byTech.set(st.tech, []); byTech.get(st.tech)!.push(i); });
  for (const [t, idxs] of byTech) {
    if ((count[t] || 0) >= CAP) continue;
    if (t === 'naked_single' || t === 'hidden_single') { if (rng() > 0.15) continue; }
    wanted.push({ i: idxs[Math.floor(rng() * idxs.length)], t });
  }
  const keepForFull = r.solved && (hardCount[hard] || 0) < PER_HARD;
  if (!wanted.length && !keepForFull) continue;
  const pz = puzzles.length;
  puzzles.push({ g: gridToString(givens), s: gridToString(solution), h: r.solved ? hard : ('unsolved' as TechId), u: [...r.used] });
  if (keepForFull) hardCount[hard] = (hardCount[hard] || 0) + 1;
  for (const w of wanted) {
    const st = r.states[w.i];
    const bc = basicCands(st.v);
    const pure = st.c.every((m, k) => m === bc[k]) ? 1 : 0;
    const n = st.c.reduce((a, m) => a + popcount(m), 0);
    ex.push({ t: w.t, pz, v: gridToString(st.v), c: encodeCands(st.c), d: 1, p: pure as 0 | 1, var: r.steps[w.i].variant, n });
    count[w.t] = (count[w.t] || 0) + 1;
  }
}
// Dificultad por terciles de densidad de candidatos (más ruido visual = más difícil)
for (const t of TECHS) {
  const xs = ex.filter(e => e.t === t.id).sort((a, b) => a.n - b.n);
  xs.forEach((e, i) => (e.d = (1 + Math.floor((3 * i) / Math.max(1, xs.length))) as 1 | 2 | 3));
}
const out = { puzzles, ex: ex.map(({ n, ...e }) => e), meta: { generated, ms: Date.now() - t0, count, hardCount } };
writeFileSync(process.env.OUT || 'src/data/bank.json', JSON.stringify(out));
console.log(JSON.stringify(out.meta));
