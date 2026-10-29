// Técnicas poco frecuentes: se aceptan posiciones donde la técnica aplica de forma NO degenerada
// (sus eliminaciones no se obtienen con la versión menor de la misma familia), aunque exista otro
// camino más sencillo. Se marcan con ns=1 y la app lo indica.
import { writeFileSync } from 'fs';
import { makePuzzle } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/random';
import { solveHuman, hardestTech } from '../src/engine/solver';
import { gridToString, encodeCands, basicCands, popcount, State } from '../src/engine/grid';
import { TECH_BY_ID } from '../src/engine/techniques';
import type { TechId } from '../src/engine/step';
export const SMALLER: Partial<Record<TechId, TechId[]>> = {
  multi_coloring: ['simple_coloring'], jellyfish: ['x_wing', 'swordfish'],
  naked_quad: ['naked_pair', 'naked_triple', 'hidden_pair', 'hidden_triple'], hidden_quad: ['hidden_pair', 'hidden_triple', 'naked_pair', 'naked_triple'],
};
export function nonDegenerate(t: TechId, s: State): boolean {
  const mine = TECH_BY_ID[t].find(s).flatMap(st => st.elims.map(e => e.cell * 10 + e.digit));
  if (!mine.length) return false;
  const small = new Set((SMALLER[t] ?? []).flatMap(x => TECH_BY_ID[x].find(s).flatMap(st => st.elims.map(e => e.cell * 10 + e.digit))));
  return mine.some(k => !small.has(k));
}
if (process.argv[1]?.endsWith('mine-rare.ts')) {
  const rng = mulberry32(+(process.env.SEED || 7)); const MAX_MS = +(process.env.MAXMS || 480000);
  const want = Object.keys(SMALLER) as TechId[]; const cnt: Record<string, number> = {}; const out: any[] = []; const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < MAX_MS && want.some(t => (cnt[t] || 0) < 60)) {
    n++;
    const { givens, solution } = makePuzzle(rng, n % 3 !== 0);
    const r = solveHuman(givens);
    const got = new Set<string>();
    r.steps.forEach((st, i) => {
      if (st.tech === 'naked_single' || st.tech === 'hidden_single') return;
      const s = r.states[i];
      for (const t of want) {
        if (got.has(t) || (cnt[t] || 0) >= 60) continue;
        if (nonDegenerate(t, s)) {
          got.add(t); cnt[t] = (cnt[t] || 0) + 1;
          const bc = basicCands(s.v);
          out.push({ puzzle: { g: gridToString(givens), s: gridToString(solution), h: r.solved ? hardestTech(r.used) : 'unsolved', u: [...r.used] },
            ex: { t, v: gridToString(s.v), c: encodeCands(s.c), d: 1, p: s.c.every((m, k) => m === bc[k]) ? 1 : 0, var: TECH_BY_ID[t].find(s)[0].variant, ns: 1 } });
        }
      }
    });
    if (n % 200 === 0) writeFileSync(process.env.OUT!, JSON.stringify(out));
  }
  writeFileSync(process.env.OUT!, JSON.stringify(out));
  console.log(n, cnt);
}
