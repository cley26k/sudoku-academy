// Peces con aleta (Finned / Sashimi X-Wing y Swordfish).
import { State, UNITS, has, cellName, listCells, joinEs, combinations, rowOf, colOf, boxOf, unitName } from '../grid';
import { Step, cd, CD, Frame } from '../step';

const NAME: Record<number, string> = { 2: 'X-Wing', 3: 'Swordfish' };

export function findFinnedFish(s: State): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  for (const n of [2, 3]) for (let d = 1; d <= 9; d++) for (const rowsBase of [true, false]) {
    const line = (i: number) => UNITS[rowsBase ? i : 9 + i];
    const cov = (c: number) => (rowsBase ? colOf(c) : rowOf(c));
    const bas = (c: number) => (rowsBase ? rowOf(c) : colOf(c));
    const posOf = new Map<number, number[]>();
    for (let i = 0; i < 9; i++) {
      if (line(i).some(c => s.v[c] === d)) continue;
      const p = line(i).filter(c => !s.v[c] && has(s.c[c], d));
      if (p.length >= 2 && p.length <= n + 3) posOf.set(i, p);
    }
    for (const bs of combinations([...posOf.keys()], n)) {
      const all = bs.flatMap(b => posOf.get(b)!);
      for (const cs of combinations([0, 1, 2, 3, 4, 5, 6, 7, 8], n)) {
        if (!bs.every(b => posOf.get(b)!.some(c => cs.includes(cov(c))))) continue;
        if (!cs.every(ci => all.some(c => cov(c) === ci))) continue;
        const fins = all.filter(c => !cs.includes(cov(c)));
        if (!fins.length) continue;
        const fb = boxOf(fins[0]);
        if (!fins.every(f => boxOf(f) === fb)) continue;
        const targets = UNITS[18 + fb].filter(c => cs.includes(cov(c)) && !bs.includes(bas(c)) && !s.v[c] && has(s.c[c], d));
        if (!targets.length) continue;
        const key = `${d}${rowsBase ? 'r' : 'c'}${bs.join('')}|${cs.join('')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const body = all.filter(c => !fins.includes(c));
        const elims: CD[] = targets.map(c => cd(c, d));
        const [lineW, linesW, coversW] = rowsBase ? ['fila', 'filas', 'columnas'] : ['columna', 'columnas', 'filas'];
        const baseU = bs.map(b => (rowsBase ? b : 9 + b)), coverU = cs.map(c => (rowsBase ? 9 + c : c));
        const bo = baseU.map(u => ({ u, tone: 'base' as const })), co = coverU.map(u => ({ u, tone: 'cover' as const }));
        const bodyT = body.map(c => ({ cell: c, digit: d, tone: 'pattern' as const }));
        const finT = fins.map(c => ({ cell: c, digit: d, tone: 'colorB' as const }));
        const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
        const fishTxt = NAME[n];
        const baseTxt = `${linesW} ${joinEs(bs.map(b => b + 1))}`, coverTxt = `${coversW} ${joinEs(cs.map(c => c + 1))}`;
        const frames: Frame[] = [
          { text: `Fíjate en el ${d} de las ${baseTxt}.`, units: bo, cands: [...bodyT, ...finT], digitFocus: d },
          { text: `Casi es un ${fishTxt} en las ${coverTxt}… pero sobra ${fins.length > 1 ? 'un grupito' : 'un candidato'}: ${listCells(fins)}. Es la aleta.`, units: [...bo, ...co], cands: [...bodyT, ...finT], cells: fins.map(c => ({ cell: c, tone: 'colorB' as const })), digitFocus: d },
          { text: `Si la aleta NO tiene el ${d}, es un ${fishTxt} normal: las ${coverTxt} pierden el ${d} fuera de las ${linesW} base.`, units: [...bo, ...co], cands: [...bodyT, ...elT], digitFocus: d },
          { text: `Si la aleta SÍ tiene el ${d}, nada de su caja (caja ${fb + 1}) puede tenerlo.`, units: [{ u: 18 + fb, tone: 'focus' }], cands: [...finT, ...elT], digitFocus: d },
          { text: `Solo es seguro donde se cumplen los dos casos: dentro de la caja ${fb + 1} y en las ${coverTxt}. Se elimina de ${listCells(targets)}.`, units: [{ u: 18 + fb, tone: 'focus' }, ...co], cands: [...bodyT, ...finT, ...elT], digitFocus: d },
        ];
        out.push({
          tech: 'finned_fish', key: 'ff' + key, placements: [], elims, pattern: { cells: all, cands: all.map(c => cd(c, d)) }, digits: [d], variant: rowsBase ? 'row' : 'col',
          title: `${fishTxt} con aleta del ${d} (${baseTxt})`,
          hints: [
            { text: `Piensa en el ${d} en las ${linesW}. Casi forma un ${fishTxt}.`, digitFocus: d },
            { text: `Mira las ${baseTxt}.`, units: bo, cands: [...bodyT, ...finT], digitFocus: d },
            { text: `Es un ${fishTxt} en las ${coverTxt} con una aleta en ${listCells(fins)}.`, units: [...bo, ...co], cands: [...bodyT, ...finT], digitFocus: d },
            { text: `Elimina el ${d} de ${listCells(targets)}: ven a la aleta y están en las ${coversW} cubiertas.`, units: [{ u: 18 + fb, tone: 'focus' }, ...co], cands: [...bodyT, ...finT, ...elT], digitFocus: d },
          ],
          frames,
          scenarios: [
            { label: 'Si la aleta es falsa', frames: [frames[2]] },
            { label: 'Si la aleta es verdadera', frames: [frames[3]] },
          ],
          whyNot: (cell, digit) => {
            if (digit !== d) return `Este patrón solo trata el ${d}.`;
            if (bs.includes(bas(cell))) return `${cellName(cell)} está en una ${lineW} base: forma parte del pez.`;
            if (!cs.includes(cov(cell))) return `${cellName(cell)} no está en las ${coverTxt}.`;
            if (boxOf(cell) !== fb) return `${cellName(cell)} está fuera de la caja de la aleta. Si la aleta fuera el ${d}, ${cellName(cell)} podría tenerlo también.`;
            return null;
          },
        });
      }
    }
  }
  return out;
}
export const _f = unitName;
