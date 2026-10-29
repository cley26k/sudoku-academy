import { State, has, popcount, digitsOf, cellName, listCells, cellAt, boxOf, rowOf, colOf, sees, UNITS, ROW_UNIT, COL_UNIT, BOX_UNIT, unitName } from '../grid';
import { Step, cd } from '../step';

/** Rectángulo único tipo 1. Supone que el sudoku tiene solución única
 *  y que las cuatro casillas están sin resolver (no son pistas). */
export function findUniqueRect1(s: State): Step[] {
  const out: Step[] = [];
  for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++)
    for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
      const cells = [cellAt(r1, c1), cellAt(r1, c2), cellAt(r2, c1), cellAt(r2, c2)];
      if (cells.some(c => s.v[c])) continue;
      if (new Set(cells.map(boxOf)).size !== 2) continue;
      const bi = cells.filter(c => popcount(s.c[c]) === 2);
      if (bi.length !== 3) continue;
      const m = s.c[bi[0]];
      if (!bi.every(c => s.c[c] === m)) continue;
      const fourth = cells.find(c => !bi.includes(c))!;
      if ((s.c[fourth] & m) !== m) continue;
      const [a, b] = digitsOf(m);
      const elims = [cd(fourth, a), cd(fourth, b)];
      const cornersT = cells.map(c => ({ cell: c, tone: (c === fourth ? 'target' : 'pattern') as 'target' | 'pattern' }));
      const pairT = bi.flatMap(c => [cd(c, a), cd(c, b)]).map(x => ({ ...x, tone: 'pattern' as const }));
      out.push({
        tech: 'unique_rect1', key: `ur${cells.join(',')}`, placements: [], elims,
        pattern: { cells, cands: cells.flatMap(c => [cd(c, a), cd(c, b)]) }, digits: [a, b], variant: r2 - r1 < 3 && ((r1 / 3) | 0) === ((r2 / 3) | 0) ? 'rows-in-band' : 'cols-in-stack',
        title: `Rectángulo único {${a},${b}}`,
        hints: [
          { text: `Busca casillas con el mismo par de candidatos que formen las esquinas de un rectángulo.`, cells: bi.map(c => ({ cell: c, tone: 'focus' as const })) },
          { text: `Mira ${listCells(cells)}: cuatro esquinas en dos filas, dos columnas y dos cajas.`, cells: cornersT, cands: pairT },
          { text: `Si las cuatro quedaran en {${a},${b}}, podrían intercambiarse y habría dos soluciones. Con solución única, eso no puede pasar.`, cells: cornersT, cands: pairT },
          { text: `Elimina ${a} y ${b} de ${cellName(fourth)}.`, cells: cornersT, cands: [...pairT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
        ],
        frames: [
          { text: `${listCells(bi)} solo admiten ${a} o ${b}.`, cells: bi.map(c => ({ cell: c, tone: 'pattern' as const })), cands: pairT },
          { text: `Junto con ${cellName(fourth)} forman un rectángulo: dos filas, dos columnas y exactamente dos cajas.`, cells: cornersT, cands: pairT },
          { text: `Si ${cellName(fourth)} también fuera ${a} o ${b}, las cuatro esquinas podrían intercambiar ${a} y ${b} sin romper ninguna regla. Habría dos soluciones: es el «patrón mortal».`, cells: cornersT, hypo: [cd(bi[0], a), cd(fourth, b)], cands: pairT },
          { text: `Este razonamiento supone que el sudoku tiene solución única (los sudokus de esta app la tienen, verificada) y que ninguna esquina es una pista inicial.`, cells: cornersT, cands: pairT },
          { text: `Por tanto, ${cellName(fourth)} debe ser uno de sus otros candidatos: se eliminan ${a} y ${b}.`, cells: cornersT, cands: [...pairT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] },
        ],
        whyNot: (cell, digit) => {
          if (cell !== fourth) return `Solo la cuarta esquina (${cellName(fourth)}) pierde ${a} y ${b}; las otras tres los necesitan.`;
          if (digit !== a && digit !== b) return `El rectángulo único solo elimina ${a} y ${b}; el ${digit} sigue siendo posible.`;
          return null;
        },
      });
    }
  return out;
}
export const _h = has;

/** Rectángulo único tipos 2 y 4: suelo {a,b} en un lado, techo con extras. Supone solución única. */
export function findUniqueRectPlus(s: State): Step[] {
  const out: Step[] = [];
  for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++)
    for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
      const cells = [cellAt(r1, c1), cellAt(r1, c2), cellAt(r2, c1), cellAt(r2, c2)];
      if (cells.some(c => s.v[c])) continue;
      if (new Set(cells.map(boxOf)).size !== 2) continue;
      const bi = cells.filter(c => popcount(s.c[c]) === 2);
      if (bi.length !== 2 || s.c[bi[0]] !== s.c[bi[1]]) continue;
      const [f1, f2] = bi;
      if (rowOf(f1) !== rowOf(f2) && colOf(f1) !== colOf(f2)) continue; // suelo en un lado, no en diagonal
      const m = s.c[f1];
      const roof = cells.filter(c => !bi.includes(c));
      if (!roof.every(c => (s.c[c] & m) === m)) continue;
      const [a, b] = digitsOf(m);
      const [x, y] = roof;
      const sharedU = [ROW_UNIT(x), COL_UNIT(x), BOX_UNIT(x)].filter(u => UNITS[u].includes(y));
      const cornersT = cells.map(c => ({ cell: c, tone: (bi.includes(c) ? 'pattern' : 'target') as 'pattern' | 'target' }));
      const pairT = cells.flatMap(c => [cd(c, a), cd(c, b)]).map(t => ({ ...t, tone: 'pattern' as const }));
      const intro = { text: `${listCells(bi)} son {${a},${b}}. ${listCells(roof)} también tienen ${a} y ${b}, y algo más.`, cells: cornersT, cands: pairT };
      const deadly = { text: `Si el techo (${listCells(roof)}) se quedara solo con {${a},${b}}, las cuatro esquinas podrían intercambiarse: dos soluciones. Con solución única, algo del techo tiene que ser distinto.`, cells: cornersT, cands: pairT };
      // Tipo 2: ambos techos = {a,b,c}
      const ex2 = s.c[x] & ~m;
      if (s.c[x] === s.c[y] && popcount(ex2) === 1) {
        const c = digitsOf(ex2)[0];
        const targets = Array.from({ length: 81 }, (_, i) => i).filter(z => z !== x && z !== y && !s.v[z] && has(s.c[z], c) && sees(z, x) && sees(z, y));
        if (targets.length) {
          const elims = targets.map(z => cd(z, c));
          const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
          out.push({
            tech: 'unique_rect_plus', key: `ur2${cells.join(',')}`, placements: [], elims, pattern: { cells, cands: cells.flatMap(q => digitsOf(s.c[q]).map(d => cd(q, d))) }, digits: [a, b, c], variant: 'tipo2',
            title: `Rectángulo único tipo 2 {${a},${b}} + ${c}`,
            hints: [
              { text: 'Busca un rectángulo con dos esquinas de pareja igual.', cells: bi.map(q => ({ cell: q, tone: 'focus' as const })) },
              { text: `Mira ${listCells(cells)}.`, cells: cornersT, cands: pairT },
              { text: `Las dos esquinas del techo tienen el mismo extra: ${c}. Para evitar dos soluciones, una de ellas es ${c}.`, cells: cornersT, cands: [...pairT, cd(x, c), cd(y, c)].map(t => ({ ...t, tone: 'pattern' as const })) },
              { text: `Elimina el ${c} de las casillas que ven a ${cellName(x)} y ${cellName(y)}.`, cells: cornersT, cands: elT },
            ],
            frames: [intro, deadly,
              { text: `Lo único distinto en el techo es el ${c}: una de las dos esquinas del techo tiene que ser ${c}.`, cells: cornersT, cands: [cd(x, c), cd(y, c)].map(t => ({ ...t, tone: 'confirm' as const })) },
              { text: `Así que quien vea a ambas no puede ser ${c}: ${listCells(targets)}.`, cells: [...cornersT, ...targets.map(z => ({ cell: z, tone: 'target' as const }))], cands: [...[cd(x, c), cd(y, c)].map(t => ({ ...t, tone: 'confirm' as const })), ...elT] },
            ],
            whyNot: (cell, digit) => {
              if (cells.includes(cell)) return `${cellName(cell)} es una esquina del rectángulo.`;
              if (digit !== c) return `El tipo 2 solo elimina el extra común (${c}).`;
              if (!sees(cell, x) || !sees(cell, y)) return `${cellName(cell)} no ve a las dos esquinas del techo.`;
              return null;
            },
          });
        }
      }
      // Tipo 4: en una unidad común a los techos, a (o b) solo está en los techos
      for (const u of sharedU) for (const [lock, del] of [[a, b], [b, a]]) {
        const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], lock));
        if (pos.length !== 2 || !pos.includes(x) || !pos.includes(y)) continue;
        const elims = [cd(x, del), cd(y, del)];
        out.push({
          tech: 'unique_rect_plus', key: `ur4${cells.join(',')}-${lock}`, placements: [], elims, pattern: { cells, cands: cells.flatMap(q => [cd(q, a), cd(q, b)]) }, digits: [a, b], variant: 'tipo4',
          title: `Rectángulo único tipo 4 {${a},${b}}`,
          hints: [
            { text: 'Busca un rectángulo con dos esquinas de pareja igual.', cells: bi.map(q => ({ cell: q, tone: 'focus' as const })) },
            { text: `Mira ${listCells(cells)} y la ${unitName(u)}.`, cells: cornersT, units: [{ u, tone: 'focus' }] },
            { text: `En la ${unitName(u)}, el ${lock} solo puede ir en el techo: uno de los dos será ${lock}.`, units: [{ u, tone: 'focus' }], cells: cornersT, cands: [cd(x, lock), cd(y, lock)].map(t => ({ ...t, tone: 'pattern' as const })) },
            { text: `Si alguna fuera ${del}, el techo quedaría {${a},${b}}: patrón mortal. Elimina el ${del} del techo.`, cells: cornersT, cands: elims.map(e => ({ ...e, tone: 'elim' as const })) },
          ],
          frames: [intro,
            { text: `En la ${unitName(u)}, el ${lock} solo cabe en ${listCells(roof)}: una de las dos es ${lock}.`, units: [{ u, tone: 'focus' }], cells: cornersT, cands: [cd(x, lock), cd(y, lock)].map(t => ({ ...t, tone: 'confirm' as const })) },
            deadly,
            { text: `Si la otra esquina del techo fuera ${del}, el techo sería exactamente {${a},${b}}: dos soluciones. Por eso ninguna puede ser ${del}.`, cells: cornersT, cands: elims.map(e => ({ ...e, tone: 'elim' as const })) },
          ],
          whyNot: (cell, digit) => {
            if (!roof.includes(cell)) return `El tipo 4 solo limpia el techo (${listCells(roof)}).`;
            if (digit !== del) return `En el techo solo se elimina el ${del}.`;
            return null;
          },
        });
      }
    }
  return out;
}
