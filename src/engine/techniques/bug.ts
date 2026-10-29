// BUG+1 (Bivalue Universal Grave + 1). Supone solución única.
import { State, UNITS, CELL_UNITS, has, popcount, digitsOf, cellName, unitName } from '../grid';
import { Step, cd } from '../step';

export function findBug1(s: State): Step[] {
  const empty = Array.from({ length: 81 }, (_, i) => i).filter(i => !s.v[i]);
  if (empty.length < 6) return [];
  const tri = empty.filter(i => popcount(s.c[i]) !== 2);
  if (tri.length !== 1 || popcount(s.c[tri[0]]) !== 3) return [];
  const cell = tri[0];
  // El dígito extra es el que aparece tres veces en las unidades de la casilla
  const extra = digitsOf(s.c[cell]).filter(d => CELL_UNITS[cell].every(u => UNITS[u].filter(c => !s.v[c] && has(s.c[c], d)).length === 3));
  if (extra.length !== 1) return [];
  const x = extra[0];
  // Condición BUG: en cada unidad, cada dígito aparece 0 o 2 veces (salvo el extra en las unidades de la casilla)
  for (let u = 0; u < 27; u++) for (let d = 1; d <= 9; d++) {
    const n = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d)).length;
    const allowed3 = d === x && CELL_UNITS[cell].includes(u);
    if (!(n === 0 || n === 2 || (allowed3 && n === 3))) return [];
  }
  const others = empty.filter(i => i !== cell);
  const u0 = CELL_UNITS[cell][0];
  return [{
    tech: 'bug1', key: `bug${cell}`, placements: [cd(cell, x)], elims: [],
    pattern: { cells: [cell], cands: digitsOf(s.c[cell]).map(d => cd(cell, d)) }, digits: [x], variant: 'bug',
    title: `BUG+1: ${x} en ${cellName(cell)}`,
    hints: [
      { text: 'Mira el tablero entero: casi todas las casillas tienen solo dos candidatos.', cells: others.map(c => ({ cell: c, tone: 'dim' as const })) },
      { text: `Solo ${cellName(cell)} tiene tres.`, cells: [{ cell, tone: 'focus' }] },
      { text: `Si ${cellName(cell)} no fuera ${x}, todo el tablero quedaría en parejas y tendría dos soluciones (o ninguna).`, cells: [{ cell, tone: 'focus' }] },
      { text: `${cellName(cell)} tiene que ser ${x}.`, cells: [{ cell, tone: 'focus' }], place: [cd(cell, x)] },
    ],
    frames: [
      { text: 'Todas las casillas vacías tienen dos candidatos… menos una.', cells: [...others.map(c => ({ cell: c, tone: 'pattern' as const })), { cell, tone: 'focus' as const }] },
      { text: `${cellName(cell)} tiene ${digitsOf(s.c[cell]).join(', ')}. El ${x} aparece tres veces en su ${unitName(u0).split(' ')[0]}; el resto, dos.`, units: [{ u: u0, tone: 'focus' }], cands: UNITS[u0].filter(c => !s.v[c] && has(s.c[c], x)).map(c => ({ cell: c, digit: x, tone: 'pattern' as const })) },
      { text: `Sin el ${x}, cada número aparecería dos veces en cada unidad: un «tablero mortal» con más de una solución.`, cells: [{ cell, tone: 'focus' }] },
      { text: `Como el sudoku tiene solución única, ${cellName(cell)} = ${x}.`, cells: [{ cell, tone: 'focus' }], place: [cd(cell, x)] },
    ],
    whyNot: () => null,
  }];
}
