import { State, UNITS, PEERS, has, popcount, digitsOf, sees, cellName, unitName, listCells, joinEs, BOX_UNIT, boxOf } from '../grid';
import { Step, cd, CD } from '../step';

const bivalues = (s: State) => Array.from({ length: 81 }, (_, i) => i).filter(i => !s.v[i] && popcount(s.c[i]) === 2);
const candsT = (s: State, cells: number[], tone: 'pattern' | 'confirm' = 'pattern') => cells.flatMap(c => digitsOf(s.c[c]).map(d => ({ cell: c, digit: d, tone })));

export function findYWing(s: State): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  const bv = bivalues(s);
  for (const P of bv) {
    const [a, b] = digitsOf(s.c[P]);
    const peers = bv.filter(x => sees(P, x));
    for (const X of peers) {
      if (!has(s.c[X], a) || has(s.c[X], b)) continue;
      const c = digitsOf(s.c[X] & ~(1 << a))[0];
      for (const Y of peers) {
        if (Y === X || s.c[Y] !== ((1 << b) | (1 << c))) continue;
        const key = `${P}-${Math.min(X, Y)}-${Math.max(X, Y)}`;
        if (seen.has(key)) continue;
        const targets = PEERS[X].filter(z => z !== P && z !== Y && sees(z, Y) && !s.v[z] && has(s.c[z], c));
        if (!targets.length) continue;
        seen.add(key);
        const elims = targets.map(z => cd(z, c));
        const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
        const cellsT = [{ cell: P, tone: 'pivot' as const }, { cell: X, tone: 'pattern' as const }, { cell: Y, tone: 'pattern' as const }];
        const variant = BOX_UNIT(P) === BOX_UNIT(X) || BOX_UNIT(P) === BOX_UNIT(Y) ? 'box' : 'line';
        out.push({
          tech: 'y_wing', key: 'yw' + key, placements: [], elims,
          pattern: { cells: [P, X, Y], cands: [P, X, Y].flatMap(q => digitsOf(s.c[q]).map(d => cd(q, d))) }, digits: [a, b, c], variant,
          title: `Y-Wing: pivote ${cellName(P)}, pinzas ${cellName(X)} y ${cellName(Y)}`,
          hints: [
            { text: `Busca casillas con solo dos candidatos cerca de ${cellName(P)}.`, cells: [{ cell: P, tone: 'focus' }] },
            { text: `Mira ${cellName(P)} {${a},${b}}, ${cellName(X)} {${a},${c}} y ${cellName(Y)} {${b},${c}}.`, cells: cellsT, cands: candsT(s, [P, X, Y]) },
            { text: `${cellName(P)} es el pivote: sea ${a} o ${b}, una de las pinzas acaba siendo ${c}.`, cells: cellsT, cands: candsT(s, [P, X, Y]), links: [{ a: cd(P, a), b: cd(X, a), kind: 'weak' }, { a: cd(P, b), b: cd(Y, b), kind: 'weak' }] },
            { text: `Elimina el ${c} de las casillas que ven a las dos pinzas: ${listCells(targets)}.`, cells: cellsT, cands: [...candsT(s, [X, Y]).filter(x => x.digit === c), ...elT] },
          ],
          frames: [
            { text: `${cellName(P)} solo puede ser ${a} o ${b}. Será el pivote.`, cells: [{ cell: P, tone: 'pivot' }], cands: candsT(s, [P]) },
            { text: `Ve a ${cellName(X)} (${a} o ${c}) y a ${cellName(Y)} (${b} o ${c}). Son las pinzas.`, cells: cellsT, cands: candsT(s, [P, X, Y]) },
            { text: `Si el pivote es ${a}, ${cellName(X)} no puede ser ${a}: será ${c}.`, cells: cellsT, hypo: [cd(P, a), cd(X, c)], links: [{ a: cd(P, a), b: cd(X, a), kind: 'weak' }] },
            { text: `Si el pivote es ${b}, ${cellName(Y)} no puede ser ${b}: será ${c}.`, cells: cellsT, hypo: [cd(P, b), cd(Y, c)], links: [{ a: cd(P, b), b: cd(Y, b), kind: 'weak' }] },
            { text: `Pase lo que pase, una de las dos pinzas es ${c}.`, cells: cellsT, cands: [cd(X, c), cd(Y, c)].map(x => ({ ...x, tone: 'confirm' as const })) },
            { text: `Cualquier casilla que vea a ambas pinzas no puede ser ${c}: se elimina de ${listCells(targets)}.`, cells: [...cellsT, ...targets.map(z => ({ cell: z, tone: 'target' as const }))], cands: [...[cd(X, c), cd(Y, c)].map(x => ({ ...x, tone: 'confirm' as const })), ...elT] },
          ],
          scenarios: [
            { label: `Si ${cellName(P)} = ${a}`, frames: [{ text: `${cellName(P)} = ${a} obliga a ${cellName(X)} = ${c}. Las casillas que ven a ${cellName(X)} pierden el ${c}.`, cells: cellsT, hypo: [cd(P, a), cd(X, c)], cands: PEERS[X].filter(z => !s.v[z] && has(s.c[z], c) && z !== Y).map(z => ({ cell: z, digit: c, tone: (targets.includes(z) ? 'elim' : 'dim') as 'elim' | 'dim' })) }] },
            { label: `Si ${cellName(P)} = ${b}`, frames: [{ text: `${cellName(P)} = ${b} obliga a ${cellName(Y)} = ${c}. Las casillas que ven a ${cellName(Y)} pierden el ${c}.`, cells: cellsT, hypo: [cd(P, b), cd(Y, c)], cands: PEERS[Y].filter(z => !s.v[z] && has(s.c[z], c) && z !== X).map(z => ({ cell: z, digit: c, tone: (targets.includes(z) ? 'elim' : 'dim') as 'elim' | 'dim' })) }] },
          ],
          whyNot: (cell, digit) => {
            if ([P, X, Y].includes(cell)) return `${cellName(cell)} es parte del Y-Wing; el patrón no elimina candidatos de sus propias casillas.`;
            if (digit !== c) return `Lo único seguro es que una pinza será ${c}; el ${digit} no queda descartado.`;
            if (!sees(cell, X)) return `${cellName(cell)} no ve a ${cellName(X)}: si fuera ${cellName(X)} la que tiene el ${c}, ${cellName(cell)} podría tenerlo también.`;
            if (!sees(cell, Y)) return `${cellName(cell)} no ve a ${cellName(Y)}: si fuera ${cellName(Y)} la que tiene el ${c}, ${cellName(cell)} podría tenerlo también.`;
            return null;
          },
        });
      }
    }
  }
  return out;
}

export function findXYZWing(s: State): Step[] {
  const out: Step[] = [];
  const bv = bivalues(s);
  for (let P = 0; P < 81; P++) {
    if (s.v[P] || popcount(s.c[P]) !== 3) continue;
    const pk = bv.filter(x => sees(P, x) && (s.c[x] & ~s.c[P]) === 0);
    for (let i = 0; i < pk.length; i++) for (let j = i + 1; j < pk.length; j++) {
      const X = pk[i], Y = pk[j];
      if (s.c[X] === s.c[Y] || (s.c[X] | s.c[Y]) !== s.c[P]) continue;
      const c = digitsOf(s.c[X] & s.c[Y])[0];
      const targets = PEERS[P].filter(z => z !== X && z !== Y && sees(z, X) && sees(z, Y) && !s.v[z] && has(s.c[z], c));
      if (!targets.length) continue;
      const elims = targets.map(z => cd(z, c));
      const a = digitsOf(s.c[X] & ~(1 << c))[0], b = digitsOf(s.c[Y] & ~(1 << c))[0];
      const cellsT = [{ cell: P, tone: 'pivot' as const }, { cell: X, tone: 'pattern' as const }, { cell: Y, tone: 'pattern' as const }];
      const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
      const cConf = [P, X, Y].map(q => ({ cell: q, digit: c, tone: 'confirm' as const }));
      out.push({
        tech: 'xyz_wing', key: `xyz${P}-${X}-${Y}`, placements: [], elims,
        pattern: { cells: [P, X, Y], cands: [P, X, Y].flatMap(q => digitsOf(s.c[q]).map(d => cd(q, d))) }, digits: [a, b, c],
        variant: boxOf(P) === boxOf(X) || boxOf(P) === boxOf(Y) ? 'box' : 'line',
        title: `XYZ-Wing: pivote ${cellName(P)} {${digitsOf(s.c[P]).join(',')}}`,
        hints: [
          { text: `Busca una casilla con tres candidatos que vea a dos casillas de dos candidatos.`, cells: [{ cell: P, tone: 'focus' }] },
          { text: `Mira ${cellName(P)} {${a},${b},${c}}, ${cellName(X)} {${a},${c}} y ${cellName(Y)} {${b},${c}}.`, cells: cellsT, cands: candsT(s, [P, X, Y]) },
          { text: `El pivote es ${a}, ${b} o ${c}. En los tres casos, una de las tres casillas termina siendo ${c}.`, cells: cellsT, cands: cConf },
          { text: `Elimina el ${c} de las casillas que ven a las tres: ${listCells(targets)}.`, cells: cellsT, cands: [...cConf, ...elT] },
        ],
        frames: [
          { text: `${cellName(P)} admite ${a}, ${b} y ${c}. Es el pivote.`, cells: [{ cell: P, tone: 'pivot' }], cands: candsT(s, [P]) },
          { text: `Ve a ${cellName(X)} {${a},${c}} y ${cellName(Y)} {${b},${c}}, ambas contenidas en el pivote.`, cells: cellsT, cands: candsT(s, [P, X, Y]) },
          { text: `Si el pivote es ${a}, ${cellName(X)} será ${c}.`, cells: cellsT, hypo: [cd(P, a), cd(X, c)] },
          { text: `Si el pivote es ${b}, ${cellName(Y)} será ${c}.`, cells: cellsT, hypo: [cd(P, b), cd(Y, c)] },
          { text: `Y si el pivote es ${c}, el ${c} ya está en el pivote.`, cells: cellsT, hypo: [cd(P, c)] },
          { text: `Una de las tres casillas tiene el ${c}. Quien vea a las tres no puede tenerlo: ${listCells(targets)}.`, cells: [...cellsT, ...targets.map(z => ({ cell: z, tone: 'target' as const }))], cands: [...cConf, ...elT] },
        ],
        scenarios: [a, b, c].map(dd => ({
          label: `Si ${cellName(P)} = ${dd}`,
          frames: [{ text: dd === c ? `El ${c} está en el pivote.` : `${cellName(P)} = ${dd} obliga a ${cellName(dd === a ? X : Y)} = ${c}.`, cells: cellsT, hypo: dd === c ? [cd(P, c)] : [cd(P, dd), cd(dd === a ? X : Y, c)], cands: elT }],
        })),
        whyNot: (cell, digit) => {
          if ([P, X, Y].includes(cell)) return `${cellName(cell)} forma parte del patrón.`;
          if (digit !== c) return `El patrón solo garantiza un ${c} entre las tres casillas; el ${digit} no queda descartado.`;
          const miss = [P, X, Y].filter(q => !sees(cell, q));
          if (miss.length) return `${cellName(cell)} no ve a ${listCells(miss)}. En un XYZ-Wing hay que ver a las tres casillas, pivote incluido.`;
          return null;
        },
      });
    }
  }
  return out;
}

export function findWWing(s: State): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  const bv = bivalues(s);
  for (let i = 0; i < bv.length; i++) for (let j = i + 1; j < bv.length; j++) {
    const A = bv[i], B = bv[j];
    if (s.c[A] !== s.c[B] || sees(A, B)) continue;
    const ds = digitsOf(s.c[A]);
    for (const y of ds) {
      const x = ds.find(t => t !== y)!;
      const key = `${A}-${B}-${x}`;
      if (seen.has(key)) continue;
      const targets = PEERS[A].filter(z => z !== B && sees(z, B) && !s.v[z] && has(s.c[z], x));
      if (!targets.length) continue;
      let link: { u: number; p: number; q: number } | null = null;
      for (let u = 0; u < 27 && !link; u++) {
        const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], y));
        if (pos.length !== 2 || pos.includes(A) || pos.includes(B)) continue;
        const [p, q] = pos;
        if (sees(p, A) && sees(q, B)) link = { u, p, q };
        else if (sees(q, A) && sees(p, B)) link = { u, p: q, q: p };
      }
      if (!link) continue;
      seen.add(key);
      const { u, p, q } = link;
      const elims = targets.map(z => cd(z, x));
      const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
      const cellsT = [{ cell: A, tone: 'pivot' as const }, { cell: B, tone: 'pivot' as const }, { cell: p, tone: 'pattern' as const }, { cell: q, tone: 'pattern' as const }];
      const strong = { a: cd(p, y), b: cd(q, y), kind: 'strong' as const };
      const weak = [{ a: cd(A, y), b: cd(p, y), kind: 'weak' as const }, { a: cd(B, y), b: cd(q, y), kind: 'weak' as const }];
      out.push({
        tech: 'w_wing', key: 'ww' + key, placements: [], elims,
        pattern: { cells: [A, B, p, q], cands: [cd(A, x), cd(A, y), cd(B, x), cd(B, y), cd(p, y), cd(q, y)] }, digits: [x, y], variant: u < 18 ? 'line' : 'box',
        title: `W-Wing {${x},${y}}: ${cellName(A)} y ${cellName(B)}`,
        hints: [
          { text: `Busca dos casillas lejanas con el mismo par de candidatos {${x},${y}}.`, cells: [{ cell: A, tone: 'focus' }, { cell: B, tone: 'focus' }] },
          { text: `${cellName(A)} y ${cellName(B)} comparten {${x},${y}}. Mira ahora el ${y} en la ${unitName(u)}.`, units: [{ u, tone: 'focus' }], cells: cellsT, cands: [cd(p, y), cd(q, y)].map(t => ({ ...t, tone: 'pattern' as const })) },
          { text: `En la ${unitName(u)}, el ${y} solo puede estar en ${cellName(p)} o ${cellName(q)}, y cada una ve a una de las dos casillas. Eso obliga a que al menos una de ellas sea ${x}.`, units: [{ u, tone: 'focus' }], cells: cellsT, links: [strong, ...weak] },
          { text: `Elimina el ${x} de las casillas que ven a ${cellName(A)} y a ${cellName(B)}.`, cells: cellsT, cands: elT },
        ],
        frames: [
          { text: `${cellName(A)} y ${cellName(B)} solo admiten ${x} o ${y}, y no se ven entre sí.`, cells: cellsT.slice(0, 2), cands: candsT(s, [A, B]) },
          { text: `En la ${unitName(u)}, el ${y} solo puede ir en ${cellName(p)} o ${cellName(q)}: uno de los dos lo tendrá.`, units: [{ u, tone: 'focus' }], cells: cellsT, cands: [cd(p, y), cd(q, y)].map(t => ({ ...t, tone: 'pattern' as const })), links: [strong] },
          { text: `${cellName(p)} ve a ${cellName(A)} y ${cellName(q)} ve a ${cellName(B)}.`, units: [{ u, tone: 'focus' }], cells: cellsT, links: [strong, ...weak] },
          { text: `Supón que ninguna fuera ${x}: ambas serían ${y}, y entonces ni ${cellName(p)} ni ${cellName(q)} podrían tener el ${y}. La ${unitName(u)} se quedaría sin ${y}. Imposible.`, units: [{ u, tone: 'focus' }], cells: cellsT, hypo: [cd(A, y), cd(B, y)], cands: [cd(p, y), cd(q, y)].map(t => ({ ...t, tone: 'elim' as const })), links: weak },
          { text: `Por tanto, al menos una de las dos es ${x}.`, cells: cellsT.slice(0, 2), cands: [cd(A, x), cd(B, x)].map(t => ({ ...t, tone: 'confirm' as const })) },
          { text: `Las casillas que ven a ambas no pueden ser ${x}: ${listCells(targets)}.`, cells: [...cellsT.slice(0, 2), ...targets.map(z => ({ cell: z, tone: 'target' as const }))], cands: [...[cd(A, x), cd(B, x)].map(t => ({ ...t, tone: 'confirm' as const })), ...elT] },
        ],
        scenarios: [
          { label: `Si el ${y} está en ${cellName(p)}`, frames: [{ text: `${cellName(p)} = ${y} quita el ${y} a ${cellName(A)}, que pasa a ser ${x}.`, cells: cellsT, hypo: [cd(p, y), cd(A, x)], cands: elT }] },
          { label: `Si el ${y} está en ${cellName(q)}`, frames: [{ text: `${cellName(q)} = ${y} quita el ${y} a ${cellName(B)}, que pasa a ser ${x}.`, cells: cellsT, hypo: [cd(q, y), cd(B, x)], cands: elT }] },
        ],
        whyNot: (cell, digit) => {
          if (cell === A || cell === B) return `${cellName(cell)} es uno de los extremos del W-Wing; una de las dos tendrá el ${x}.`;
          if (digit !== x) return `El W-Wing garantiza un ${x} en ${cellName(A)} o ${cellName(B)}; el ${digit} no queda descartado.`;
          if (!sees(cell, A) || !sees(cell, B)) return `${cellName(cell)} no ve a ${!sees(cell, A) ? cellName(A) : cellName(B)}; si el ${x} estuviera allí, ${cellName(cell)} podría tenerlo también.`;
          return null;
        },
      });
    }
  }
  return out;
}

export const _j = joinEs;
