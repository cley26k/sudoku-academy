import { State, UNITS, has, popcount, digitsOf, cellName, unitName, listCells, joinEs, combinations, commonUnits } from '../grid';
import { Step, cd, CD, Frame, TechId } from '../step';

const NAKED: Record<number, TechId> = { 2: 'naked_pair', 3: 'naked_triple', 4: 'naked_quad' };
const HIDDEN: Record<number, TechId> = { 2: 'hidden_pair', 3: 'hidden_triple', 4: 'hidden_quad' };
const GRP: Record<number, string> = { 2: 'par', 3: 'trío', 4: 'cuarteto' };
const GRPC: Record<number, string> = { 2: 'Par', 3: 'Trío', 4: 'Cuarteto' };
const WORD: Record<number, string> = { 2: 'Dos', 3: 'Tres', 4: 'Cuatro' };

export function findNakedSubsets(s: State, n: number): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  for (let u = 0; u < 27; u++) {
    const cand = UNITS[u].filter(c => !s.v[c] && popcount(s.c[c]) >= 2 && popcount(s.c[c]) <= n);
    for (const cells of combinations(cand, n)) {
      let m = 0; for (const c of cells) m |= s.c[c];
      if (popcount(m) !== n) continue;
      const key = cells.join(',');
      if (seen.has(key)) continue;
      const shared = commonUnits(cells);
      const elims: CD[] = [];
      const elimUnits: number[] = [];
      for (const su of shared) {
        let any = false;
        for (const x of UNITS[su]) {
          if (cells.includes(x) || s.v[x]) continue;
          for (const d of digitsOf(s.c[x] & m)) if (!elims.some(e => e.cell === x && e.digit === d)) { elims.push(cd(x, d)); any = true; }
        }
        if (any) elimUnits.push(su);
      }
      if (!elims.length) continue;
      seen.add(key);
      const ds = digitsOf(m);
      const unitsTxt = joinEs(elimUnits.map(unitName));
      const pat = cells.flatMap(c => digitsOf(s.c[c]).map(d => cd(c, d)));
      const patT = pat.map(x => ({ ...x, tone: 'pattern' as const }));
      const unitsO = shared.map(su => ({ u: su, tone: 'focus' as const }));
      const elimCells = [...new Set(elims.map(e => e.cell))];
      const frames: Frame[] = [
        { text: `Mira ${listCells(cells)}: entre todas solo admiten ${joinEs(ds)}.`, units: unitsO, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: patT },
        { text: n === 2
            ? `Dos casillas, dos números: una será ${ds[0]} y la otra ${ds[1]}, aunque todavía no sepamos cuál.`
            : `${WORD[n]} casillas y ${n} números: esos números se repartirán entre ellas, aunque no sepamos aún cómo.`,
          units: unitsO, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: patT },
        { text: `Así que ninguna otra casilla de la ${unitsTxt} puede contener ${joinEs(ds, 'ni')}. Se eliminan de ${listCells(elimCells)}.`,
          units: unitsO, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: [...patT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
      ];
      out.push({
        tech: NAKED[n], key: `n${n}-${key}`, placements: [], elims, pattern: { cells, cands: pat }, digits: ds,
        variant: shared.length > 1 ? 'line+box' : shared[0] < 18 ? 'line' : 'box',
        title: `${GRPC[n]} desnudo {${ds.join(',')}} en ${listCells(cells)}`,
        hints: [
          { text: `Mira la ${joinEs(shared.map(unitName))}.`, units: unitsO },
          { text: `Fíjate en las casillas con pocos candidatos: ${listCells(cells)}.`, units: unitsO, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })) },
          { text: `Esas ${n} casillas comparten exactamente ${n} candidatos (${ds.join(', ')}). Forman un ${GRP[n]} desnudo.`, units: unitsO, cands: patT },
          { text: `Elimina ${joinEs(ds, 'y')} del resto de la ${unitsTxt}.`, units: unitsO, cands: [...patT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
        ],
        frames,
        scenarios: n === 2 ? [0, 1].map(i => {
          const a = ds[i], b = ds[1 - i];
          return {
            label: `Si ${cellName(cells[0])} = ${a}`,
            frames: [{ text: `Si ${cellName(cells[0])} es ${a}, ${cellName(cells[1])} tiene que ser ${b}. Ambos números quedan ocupados en la ${unitsTxt}.`, hypo: [cd(cells[0], a), cd(cells[1], b)], units: unitsO, cands: elims.map(e => ({ ...e, tone: 'elim' as const })) }],
          };
        }) : undefined,
        whyNot: (cell, digit) => {
          if (cells.includes(cell)) return `${cellName(cell)} forma parte del grupo: sus candidatos son justo los que se reparten entre esas casillas.`;
          if (!ds.includes(digit)) return `El grupo solo ocupa ${joinEs(ds)}; el ${digit} no queda bloqueado.`;
          if (!shared.some(su => UNITS[su].includes(cell))) return `${cellName(cell)} no comparte fila, columna ni caja con todas las casillas del grupo.`;
          return null;
        },
      });
    }
  }
  return out;
}

export function findHiddenSubsets(s: State, n: number): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  for (let u = 0; u < 27; u++) {
    const posOf = new Map<number, number[]>();
    for (let d = 1; d <= 9; d++) {
      if (UNITS[u].some(c => s.v[c] === d)) continue;
      const p = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d));
      if (p.length >= 2 && p.length <= n) posOf.set(d, p);
    }
    for (const ds of combinations([...posOf.keys()], n)) {
      const cells = [...new Set(ds.flatMap(d => posOf.get(d)!))].sort((a, b) => a - b);
      if (cells.length !== n) continue;
      const m = ds.reduce((a, d) => a | (1 << d), 0);
      const elims: CD[] = [];
      for (const c of cells) for (const d of digitsOf(s.c[c] & ~m)) elims.push(cd(c, d));
      if (!elims.length) continue;
      const key = cells.join(',') + '|' + ds.join('');
      if (seen.has(key)) continue;
      seen.add(key);
      const pat = cells.flatMap(c => ds.filter(d => has(s.c[c], d)).map(d => cd(c, d)));
      const patT = pat.map(x => ({ ...x, tone: 'pattern' as const }));
      const uo = [{ u, tone: 'focus' as const }];
      out.push({
        tech: HIDDEN[n], key: `h${n}-${key}`, placements: [], elims, pattern: { cells, cands: pat }, digits: ds,
        variant: u < 18 ? 'line' : 'box',
        title: `${GRPC[n]} oculto {${ds.join(',')}} en la ${unitName(u)}`,
        hints: [
          { text: `Mira la ${unitName(u)}.`, units: uo },
          { text: `Busca números que tengan muy pocos sitios posibles en la ${unitName(u)}: ${joinEs(ds)}.`, units: uo, cands: patT },
          { text: `${joinEs(ds)} solo pueden ir en ${listCells(cells)}. Esas casillas quedan reservadas para ellos.`, units: uo, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: patT },
          { text: `Elimina los demás candidatos de ${listCells(cells)}.`, units: uo, cands: [...patT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
        ],
        frames: [
          { text: `En la ${unitName(u)}, ¿dónde pueden ir ${joinEs(ds)}?`, units: uo, cands: patT },
          { text: `Solo en ${listCells(cells)}. ${WORD[n]} números necesitan sitio y solo disponen de ${n} casillas.`, units: uo, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: patT },
          { text: `Esas casillas tienen que quedarse con ${joinEs(ds)}. Cualquier otro candidato en ellas sobra.`, units: uo, cells: cells.map(c => ({ cell: c, tone: 'pattern' as const })), cands: [...patT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
        ],
        whyNot: (cell, digit) => {
          if (!cells.includes(cell)) return `Un grupo oculto solo limpia sus propias casillas (${listCells(cells)}); no elimina nada fuera de ellas.`;
          if (ds.includes(digit)) return `El ${digit} forma parte del grupo oculto: es justo lo que esas casillas deben conservar.`;
          return null;
        },
      });
    }
  }
  return out;
}
