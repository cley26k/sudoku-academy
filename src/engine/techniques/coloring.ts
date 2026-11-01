import { State, UNITS, has, popcount, digitsOf, sees, cellName, listCells, rowOf, colOf, boxOf, unitName } from '../grid';
import { Step, cd, CD, Frame } from '../step';

export function findSimpleColoring(s: State): Step[] {
  const out: Step[] = [];
  for (let d = 1; d <= 9; d++) {
    const adj = new Map<number, Set<number>>();
    const linkUnits: { u: number; a: number; b: number }[] = [];
    for (let u = 0; u < 27; u++) {
      const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d));
      if (pos.length !== 2) continue;
      const [a, b] = pos;
      if (adj.get(a)?.has(b)) continue;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b); adj.get(b)!.add(a);
      linkUnits.push({ u, a, b });
    }
    const color = new Map<number, number>();
    for (const start of adj.keys()) {
      if (color.has(start)) continue;
      const comp: number[] = [];
      color.set(start, 0);
      const queue = [start];
      while (queue.length) {
        const x = queue.shift()!; comp.push(x);
        for (const y of adj.get(x)!) if (!color.has(y)) { color.set(y, 1 - color.get(x)!); queue.push(y); }
      }
      if (comp.length < 3) continue;
      const A = comp.filter(x => color.get(x) === 0).sort((a, b) => a - b);
      const B = comp.filter(x => color.get(x) === 1).sort((a, b) => a - b);
      const links = linkUnits.filter(l => comp.includes(l.a)).map(l => ({ a: cd(l.a, d), b: cd(l.b, d), kind: 'strong' as const }));
      const colored = [...A.map(c => ({ cell: c, digit: d, tone: 'colorA' as const })), ...B.map(c => ({ cell: c, digit: d, tone: 'colorB' as const }))];
      const patternCells = comp.slice().sort((a, b) => a - b);
      const base: Frame[] = [
        { text: `Fíjate solo en el ${d}. Busca unidades donde tenga exactamente dos sitios.`, digitFocus: d },
        { text: `En cada una de estas unidades, si el ${d} no está en un extremo, está en el otro. Son enlaces fuertes.`, cands: comp.map(c => ({ cell: c, digit: d, tone: 'pattern' as const })), links, digitFocus: d },
        { text: `Pinta la cadena alternando dos colores. O todas las casillas azules tienen el ${d}, o todas las magenta.`, cands: colored, links, digitFocus: d },
      ];
      // Regla del color repetido (wrap)
      let wrap = null as { bad: number[]; p: number; q: number } | null;
      for (const grp of [A, B]) {
        for (let i = 0; i < grp.length && !wrap; i++) for (let j = i + 1; j < grp.length && !wrap; j++)
          if (sees(grp[i], grp[j])) wrap = { bad: grp, p: grp[i], q: grp[j] };
        if (wrap) break;
      }
      if (wrap) {
        const elims = wrap.bad.map(c => cd(c, d));
        const isA = wrap.bad === A;
        const nm = isA ? 'azul' : 'magenta';
        out.push(mk('wrap', d, patternCells, elims, links, colored, [...base,
          { text: `${cellName(wrap.p)} y ${cellName(wrap.q)} son ${nm} y se ven entre sí: no pueden tener el ${d} las dos. El color ${nm} es falso.`, cells: [{ cell: wrap.p, tone: 'target' }, { cell: wrap.q, tone: 'target' }], cands: colored, links, digitFocus: d },
          { text: `Se elimina el ${d} de todas las casillas ${nm}: ${listCells(wrap.bad)}.`, cands: [...colored.filter(c => c.tone !== (isA ? 'colorA' : 'colorB')), ...elims.map(e => ({ ...e, tone: 'elim' as const }))], links, digitFocus: d },
        ], A, B, (cell, digit) => {
          if (digit !== d) return `La cadena solo trata el ${d}.`;
          if (!comp.includes(cell)) return `${cellName(cell)} no forma parte de la cadena; con la regla del color repetido solo se eliminan las casillas del color falso.`;
          return `${cellName(cell)} es del color verdadero: tendrá el ${d}.`;
        }));
        continue;
      }
      // Regla de la trampa (trap)
      const targets: number[] = [];
      for (let z = 0; z < 81; z++) {
        if (s.v[z] || !has(s.c[z], d) || comp.includes(z)) continue;
        if (A.some(a => sees(a, z)) && B.some(b => sees(b, z))) targets.push(z);
      }
      if (!targets.length) continue;
      const elims = targets.map(z => cd(z, d));
      const z0 = targets[0];
      const sa = A.find(a => sees(a, z0))!, sb = B.find(b => sees(b, z0))!;
      out.push(mk('trap', d, patternCells, elims, links, colored, [...base,
        { text: `${cellName(z0)} ve una casilla azul (${cellName(sa)}) y una magenta (${cellName(sb)}). Sea cual sea el color verdadero, una de ellas tendrá el ${d}.`, cells: [{ cell: z0, tone: 'target' }, { cell: sa, tone: 'colorA' }, { cell: sb, tone: 'colorB' }], cands: colored, links, digitFocus: d },
        { text: `Así que ${targets.length > 1 ? 'las casillas que ven ambos colores pierden' : cellName(z0) + ' pierde'} el ${d}: ${listCells(targets)}.`, cands: [...colored, ...elims.map(e => ({ ...e, tone: 'elim' as const }))], links, digitFocus: d },
      ], A, B, (cell, digit) => {
        if (digit !== d) return `La cadena solo trata el ${d}.`;
        if (comp.includes(cell)) return `${cellName(cell)} forma parte de la cadena: si su color es el verdadero, tendrá el ${d}.`;
        const seesA = A.some(a => sees(a, cell)), seesB = B.some(b => sees(b, cell));
        if (!seesA || !seesB) return `${cellName(cell)} ${!seesA && !seesB ? 'no ve ninguna casilla de la cadena' : `solo ve casillas ${seesA ? 'azules' : 'magenta'}`}. Hace falta ver los dos colores.`;
        return null;
      }));
    }
  }
  return out;
}

function mk(variant: 'trap' | 'wrap', d: number, cells: number[], elims: CD[], links: NonNullable<Frame['links']>, colored: NonNullable<Frame['cands']>, frames: Frame[], A: number[], B: number[], whyNot: Step['whyNot']): Step {
  const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
  return {
    tech: 'simple_coloring', key: `sc${variant}${d}-${cells.join(',')}`, placements: [], elims,
    pattern: { cells, cands: cells.map(c => cd(c, d)) }, digits: [d], variant,
    title: `Coloreado simple del ${d} (${variant === 'trap' ? 'trampa' : 'color repetido'})`,
    hints: [
      { text: `Piensa en el ${d}. ¿En qué unidades tiene exactamente dos sitios?`, digitFocus: d },
      { text: `Sigue la cadena de enlaces fuertes del ${d}.`, cands: cells.map(c => ({ cell: c, digit: d, tone: 'pattern' as const })), links, digitFocus: d },
      { text: variant === 'trap' ? `Colorea la cadena con dos colores. Busca casillas fuera de ella que vean ambos colores.` : `Colorea la cadena con dos colores. ¿Hay dos casillas del mismo color que se vean?`, cands: colored, links, digitFocus: d },
      { text: `Elimina el ${d} de ${listCells(elims.map(e => e.cell))}.`, cands: [...colored, ...elT], links, digitFocus: d },
    ],
    frames,
    scenarios: [
      { label: 'Si el azul es verdadero', frames: [{ text: `Todas las casillas azules tendrían el ${d}: ${listCells(A)}.`, hypo: A.map(c => cd(c, d)), links, cands: elT, digitFocus: d }] },
      { label: 'Si el magenta es verdadero', frames: [{ text: `Todas las casillas magenta tendrían el ${d}: ${listCells(B)}.`, hypo: B.map(c => cd(c, d)), links, cands: elT, digitFocus: d }] },
    ],
    whyNot,
  };
}

export const _u = { popcount, digitsOf, rowOf, colOf, boxOf, unitName };
