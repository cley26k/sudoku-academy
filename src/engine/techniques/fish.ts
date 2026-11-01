import { State, UNITS, has, cellName, unitName, listCells, joinEs, combinations, rowOf, colOf, cellAt } from '../grid';
import { Step, cd, CD, Frame, TechId } from '../step';

const FISH: Record<number, TechId> = { 2: 'x_wing', 3: 'swordfish', 4: 'jellyfish' };
const NAME: Record<number, string> = { 2: 'X-Wing', 3: 'Swordfish', 4: 'Jellyfish' };
const NUM: Record<number, string> = { 2: 'dos', 3: 'tres', 4: 'cuatro' };

export function findFish(s: State, n: number): Step[] {
  const out: Step[] = [];
  for (let d = 1; d <= 9; d++) {
    for (const rowsBase of [true, false]) {
      const lineCells = (i: number) => UNITS[rowsBase ? i : 9 + i];
      const coverIdx = (c: number) => (rowsBase ? colOf(c) : rowOf(c));
      const bases: number[] = [];
      const posOf = new Map<number, number[]>();
      for (let i = 0; i < 9; i++) {
        if (lineCells(i).some(c => s.v[c] === d)) continue;
        const p = lineCells(i).filter(c => !s.v[c] && has(s.c[c], d));
        if (p.length >= 2 && p.length <= n) { bases.push(i); posOf.set(i, p); }
      }
      for (const bs of combinations(bases, n)) {
        const covers = [...new Set(bs.flatMap(b => posOf.get(b)!.map(coverIdx)))].sort((a, b) => a - b);
        if (covers.length !== n) continue;
        const elims: CD[] = [];
        for (const ci of covers) for (const c of UNITS[rowsBase ? 9 + ci : ci]) {
          const bi = rowsBase ? rowOf(c) : colOf(c);
          if (bs.includes(bi) || s.v[c] || !has(s.c[c], d)) continue;
          elims.push(cd(c, d));
        }
        if (!elims.length) continue;
        const baseU = bs.map(b => (rowsBase ? b : 9 + b));
        const coverU = covers.map(ci => (rowsBase ? 9 + ci : ci));
        const pat = bs.flatMap(b => posOf.get(b)!).map(c => cd(c, d));
        const patT = pat.map(x => ({ ...x, tone: 'pattern' as const }));
        const elT = elims.map(x => ({ ...x, tone: 'elim' as const }));
        const [lineW, linesW, coverW, coversW] = rowsBase ? ['fila', 'filas', 'columna', 'columnas'] : ['columna', 'columnas', 'fila', 'filas'];
        const baseTxt = `${linesW} ${joinEs(bs.map(b => b + 1))}`;
        const coverTxt = `${coversW} ${joinEs(covers.map(c => c + 1))}`;
        const bo = baseU.map(u => ({ u, tone: 'base' as const }));
        const co = coverU.map(u => ({ u, tone: 'cover' as const }));
        const frames: Frame[] = [{ text: `Fíjate solo en el ${d}. Busca ${linesW} donde tenga muy pocos sitios.`, digitFocus: d }];
        bs.forEach((b, i) => frames.push({
          text: `En la ${unitName(baseU[i])}, el ${d} solo puede ir en ${listCells(posOf.get(b)!)}.`,
          units: bo.slice(0, i + 1), cands: bs.slice(0, i + 1).flatMap(x => posOf.get(x)!).map(c => ({ cell: c, digit: d, tone: 'pattern' as const })), digitFocus: d,
        }));
        frames.push({ text: n === 2 ? `Las dos ${linesW} usan las mismas dos ${coversW}: ${coverTxt.split(' ').slice(1).join(' ')}.` : `Las ${NUM[n]} ${linesW} reparten sus posibles ${d} en solo ${NUM[n]} ${coversW}: ${coverTxt.split(' ').slice(1).join(' ')}.`, units: [...bo, ...co], cands: patT, digitFocus: d });
        frames.push({ text: n === 2
            ? `Cada ${coverW} admite un solo ${d}. Si una ${lineW} pone su ${d} en una ${coverW}, la otra ${lineW} tiene que usar la otra.`
            : `Cada ${lineW} debe colocar un ${d} y cada ${coverW} admite uno solo: los ${NUM[n]} ${d} de estas ${linesW} ocuparán exactamente esas ${NUM[n]} ${coversW}.`,
          units: [...bo, ...co], cands: patT, digitFocus: d });
        const fishRays = elims.map(e => { const same = pat.filter(p => coverIdx(p.cell) === coverIdx(e.cell)).map(p => p.cell); const from = same.reduce((b, c) => (Math.abs(c - e.cell) < Math.abs(b - e.cell) ? c : b), same[0] ?? pat[0].cell); return { from, to: e.cell, tone: 'elim' as const }; });
        frames.push({ text: `Las ${coverTxt} ya tienen su ${d} asegurado dentro de las ${baseTxt}. Fuera de ellas se elimina: ${listCells(elims.map(e => e.cell))}.`, units: [...bo, ...co], cands: [...patT, ...elT], digitFocus: d, rays: fishRays });
        let scenarios;
        if (n === 2) {
          const [b1, b2] = bs;
          scenarios = covers.map((cv, i) => {
            const other = covers[1 - i];
            const c1 = rowsBase ? cellAt(b1, cv) : cellAt(cv, b1);
            const c2 = rowsBase ? cellAt(b2, other) : cellAt(other, b2);
            return {
              label: `Si el ${d} está en ${cellName(c1)}`,
              frames: [{
                text: `Si el ${d} de la ${lineW} ${b1 + 1} está en ${cellName(c1)}, la ${coverW} ${cv + 1} queda ocupada y la ${lineW} ${b2 + 1} debe ponerlo en ${cellName(c2)}. Ambas ${coversW} quedan cubiertas.`,
                hypo: [cd(c1, d), cd(c2, d)], units: [...bo, ...co], cands: elT, digitFocus: d,
              }],
            };
          });
        }
        out.push({
          tech: FISH[n], key: `f${n}-${d}-${rowsBase ? 'r' : 'c'}${bs.join('')}`, placements: [], elims,
          pattern: { cells: pat.map(p => p.cell), cands: pat }, digits: [d], variant: rowsBase ? 'row' : 'col',
          title: `${NAME[n]} del ${d} (${baseTxt})`,
          hints: [
            { text: `Piensa en el ${d}. ¿En qué ${linesW} tiene ${n === 2 ? 'solo dos sitios posibles' : n === 3 ? 'tres sitios posibles o menos' : 'cuatro sitios posibles o menos'}?`, digitFocus: d },
            { text: `Mira las ${baseTxt}.`, units: bo, cands: patT, digitFocus: d },
            { text: `En esas ${linesW}, el ${d} solo puede estar en las ${coverTxt}. Forman un ${NAME[n]}.`, units: [...bo, ...co], cands: patT, digitFocus: d },
            { text: `Elimina el ${d} del resto de las ${coverTxt}.`, units: [...bo, ...co], cands: [...patT, ...elT], digitFocus: d },
          ],
          frames, scenarios,
          whyNot: (cell, digit) => {
            if (digit !== d) return `Este patrón solo trata el ${d}; no dice nada del ${digit}.`;
            const bi = rowsBase ? rowOf(cell) : colOf(cell);
            const ci = rowsBase ? colOf(cell) : rowOf(cell);
            if (bs.includes(bi)) return `${cellName(cell)} está en una de las ${linesW} base: ahí es donde el patrón coloca el ${d}.`;
            if (!covers.includes(ci)) return `${cellName(cell)} no está en las ${coverTxt}. El patrón solo asegura el ${d} de esas ${coversW}.`;
            return null;
          },
        });
      }
    }
  }
  return out;
}
export const FISH_NAME = NAME;
