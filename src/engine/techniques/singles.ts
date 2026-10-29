import { State, UNITS, PEERS, CELL_UNITS, BOX_UNIT, ROW_UNIT, COL_UNIT, popcount, digitsOf, has, cellName, unitName, joinEs, sees, listCells } from '../grid';
import { Step, Frame, cd } from '../step';

export function findNakedSingles(s: State): Step[] {
  const out: Step[] = [];
  for (let cell = 0; cell < 81; cell++) {
    if (s.v[cell] || popcount(s.c[cell]) !== 1) continue;
    const d = digitsOf(s.c[cell])[0];
    const frames: Frame[] = [{ text: `Fíjate en ${cellName(cell)}. ¿Qué números podrían ir aquí?`, cells: [{ cell, tone: 'focus' }] }];
    const seen = new Set<number>();
    for (const u of [ROW_UNIT(cell), COL_UNIT(cell), BOX_UNIT(cell)]) {
      const sources = UNITS[u].filter(x => s.v[x] && !seen.has(s.v[x]));
      const ds = sources.map(x => s.v[x]);
      ds.forEach(x => seen.add(x));
      frames.push({
        text: ds.length ? `Su ${unitName(u).split(' ')[0]} ya contiene ${joinEs(ds.sort((a, b) => a - b))}.` : `Su ${unitName(u).split(' ')[0]} no descarta números nuevos.`,
        units: [{ u, tone: 'focus' }], cells: [{ cell, tone: 'focus' }, ...sources.map(x => ({ cell: x, tone: 'source' as const }))],
      });
    }
    const unexplained = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== d && !seen.has(x));
    if (unexplained.length) frames.push({ text: `${joinEs(unexplained)} ya se descartaron en pasos anteriores.`, cells: [{ cell, tone: 'focus' }] });
    frames.push({ text: `Solo queda el ${d}: es la única posibilidad para ${cellName(cell)}.`, cells: [{ cell, tone: 'focus' }], place: [cd(cell, d)] });
    out.push({
      tech: 'naked_single', key: `ns${cell}`, placements: [cd(cell, d)], elims: [],
      pattern: { cells: [cell], cands: [cd(cell, d)] }, digits: [d], variant: 'cell',
      title: `Single desnudo en ${cellName(cell)}`,
      hints: [
        { text: `Busca en la ${unitName(BOX_UNIT(cell))} una casilla con una sola posibilidad.`, units: [{ u: BOX_UNIT(cell), tone: 'focus' }] },
        { text: `Mira ${cellName(cell)}.`, cells: [{ cell, tone: 'focus' }] },
        { text: `Repasa su fila, su columna y su caja: entre las tres ya aparecen ocho números distintos.`, cells: [{ cell, tone: 'focus' }], units: CELL_UNITS[cell].map(u => ({ u, tone: 'focus' as const })) },
        { text: `${cellName(cell)} solo puede ser ${d}.`, cells: [{ cell, tone: 'focus' }], place: [cd(cell, d)] },
      ],
      frames,
      whyNot: () => null,
    });
  }
  return out;
}

export function findHiddenSingles(s: State): Step[] {
  const out: Step[] = [];
  const done = new Set<number>();
  const order = [...Array(9).keys()].map(i => 18 + i).concat([...Array(18).keys()]);
  for (const u of order) {
    for (let d = 1; d <= 9; d++) {
      if (UNITS[u].some(c => s.v[c] === d)) continue;
      const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d));
      if (pos.length !== 1) continue;
      const cell = pos[0];
      if (done.has(cell * 10 + d)) continue;
      done.add(cell * 10 + d);
      // Escaneo: ¿qué bloquea el d en las demás casillas vacías de la unidad?
      const others = UNITS[u].filter(c => !s.v[c] && c !== cell);
      const bySource = new Map<number, number[]>();
      const byElim: number[] = [];
      for (const x of others) {
        const src = PEERS[x].find(p => s.v[p] === d && !UNITS[u].includes(p));
        if (src === undefined) byElim.push(x);
        else { if (!bySource.has(src)) bySource.set(src, []); bySource.get(src)!.push(x); }
      }
      const frames: Frame[] = [{ text: `¿Dónde puede ir el ${d} en la ${unitName(u)}?`, units: [{ u, tone: 'focus' }], digitFocus: d }];
      for (const [src, covered] of bySource) {
        const shared = CELL_UNITS[src].find(su => covered.every(x => UNITS[su].includes(x))) ?? CELL_UNITS[src].find(su => UNITS[su].includes(covered[0]))!;
        frames.push({
          text: `El ${d} de ${cellName(src)} cubre su ${unitName(shared)}: ${covered.length === 1 ? cellName(covered[0]) + ' queda descartada' : listCells(covered) + ' quedan descartadas'}.`,
          units: [{ u, tone: 'focus' }, { u: shared, tone: 'cover' }],
          cells: [{ cell: src, tone: 'source' }, ...covered.map(x => ({ cell: x, tone: 'dim' as const }))], digitFocus: d,
        });
      }
      if (byElim.length) frames.push({ text: `En ${listCells(byElim)} el ${d} ya se había descartado antes.`, units: [{ u, tone: 'focus' }], cells: byElim.map(x => ({ cell: x, tone: 'dim' as const })), digitFocus: d });
      frames.push({ text: `Solo queda ${cellName(cell)}: el ${d} tiene que ir ahí.`, units: [{ u, tone: 'focus' }], cells: [{ cell, tone: 'focus' }], place: [cd(cell, d)] });
      const sources = [...bySource.keys()];
      out.push({
        tech: 'hidden_single', key: `hs${cell}-${d}`, placements: [cd(cell, d)], elims: [],
        pattern: { cells: [cell], cands: [cd(cell, d)] }, digits: [d], variant: u < 9 ? 'row' : u < 18 ? 'col' : 'box',
        title: `Single oculto: ${d} en la ${unitName(u)}`,
        hints: [
          { text: `Concéntrate en la ${unitName(u)}.`, units: [{ u, tone: 'focus' }] },
          { text: `Mira dónde están los ${d} que rodean la ${unitName(u)}.`, units: [{ u, tone: 'focus' }], cells: sources.map(x => ({ cell: x, tone: 'source' as const })), digitFocus: d },
          { text: `Dentro de la ${unitName(u)}, el ${d} solo tiene un sitio posible. Las demás casillas están bloqueadas.`, units: [{ u, tone: 'focus' }], digitFocus: d },
          { text: `El ${d} va en ${cellName(cell)}.`, units: [{ u, tone: 'focus' }], cells: [{ cell, tone: 'focus' }], place: [cd(cell, d)] },
        ],
        frames,
        whyNot: () => null,
      });
    }
  }
  return out;
}

export { sees };
