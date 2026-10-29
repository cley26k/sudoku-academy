// Cadenas: X-Chain (familia X-Cycles), XY-Chain, coloreado múltiple, 3D Medusa y AIC.
// Todas se basan en dos tipos de enlace entre candidatos:
//  - fuerte: al menos uno de los dos es verdadero (único par de una unidad, o casilla de dos candidatos);
//  - débil: como mucho uno es verdadero (misma casilla, o mismo dígito en casillas que se ven).
import { State, UNITS, has, popcount, digitsOf, sees, cellName, listCells } from '../grid';
import { Step, cd, CD, Frame, TechId } from '../step';

type Node = number; // cell*10 + digit
const nc = (n: Node) => Math.floor(n / 10), nd = (n: Node) => n % 10;
const nName = (n: Node) => `${nd(n)} en ${cellName(nc(n))}`;
const MAX_STEPS = 40;

function conjugates(s: State, d: number): [number, number][] {
  const out: [number, number][] = []; const seen = new Set<string>();
  for (let u = 0; u < 27; u++) {
    const pos = UNITS[u].filter(c => !s.v[c] && has(s.c[c], d));
    if (pos.length === 2) { const k = pos.join(','); if (!seen.has(k)) { seen.add(k); out.push([pos[0], pos[1]]); } }
  }
  return out;
}

/** Grafo de enlaces fuertes entre candidatos. */
function strongGraph(s: State, digitOnly?: number, bivalue = true, conj = true): Map<Node, Set<Node>> {
  const g = new Map<Node, Set<Node>>();
  const add = (a: Node, b: Node) => { if (!g.has(a)) g.set(a, new Set()); if (!g.has(b)) g.set(b, new Set()); g.get(a)!.add(b); g.get(b)!.add(a); };
  for (let d = 1; d <= 9; d++) { if (digitOnly && d !== digitOnly) continue; if (conj) for (const [a, b] of conjugates(s, d)) add(a * 10 + d, b * 10 + d); }
  if (bivalue && !digitOnly) for (let c = 0; c < 81; c++) if (!s.v[c] && popcount(s.c[c]) === 2) { const [a, b] = digitsOf(s.c[c]); add(c * 10 + a, c * 10 + b); }
  return g;
}
const weakLinked = (a: Node, b: Node) => a !== b && ((nc(a) === nc(b)) || (nd(a) === nd(b) && sees(nc(a), nc(b))));

function chainFrames(chain: Node[], elims: CD[], conclusion: string): { frames: Frame[]; links: NonNullable<Frame['links']> } {
  const links = chain.slice(1).map((n, i) => ({ a: cd(nc(chain[i]), nd(chain[i])), b: cd(nc(n), nd(n)), kind: (i % 2 === 0 ? 'strong' : 'weak') as 'strong' | 'weak' }));
  const all = chain.map(n => ({ cell: nc(n), digit: nd(n), tone: 'pattern' as const }));
  const frames: Frame[] = [{ text: 'Sigue este camino. La línea continua dice «si uno no, el otro sí»; la discontinua, «si uno sí, el otro no».', cands: all, links }];
  for (let i = 0; i + 1 < chain.length; i += 2) {
    const tonesTrue = chain.slice(0, i + 2).map((n, k) => ({ cell: nc(n), digit: nd(n), tone: (k % 2 === 1 ? 'colorA' : 'colorB') as 'colorA' | 'colorB' }));
    const a = chain[i], b = chain[i + 1];
    frames.push({
      text: i === 0 ? `Supón que el ${nName(a)} es falso (rosa). Entonces el ${nName(b)} es verdadero (azul).` : `…así que el ${nName(a)} es falso, y el ${nName(b)} es verdadero.`,
      cands: [...all, ...tonesTrue], links: links.slice(0, i + 1),
    });
  }
  frames.push({ text: conclusion, cands: [...all, ...elims.map(e => ({ ...e, tone: 'elim' as const }))], links });
  return { frames, links };
}

function chainStep(tech: TechId, key: string, chain: Node[], elims: CD[], title: string, variant: string, endsText: string, whyNot: Step['whyNot']): Step {
  const conclusion = `${endsText} Se elimina: ${elims.map(e => `${e.digit} de ${cellName(e.cell)}`).join(', ')}.`;
  const { frames, links } = chainFrames(chain, elims, conclusion);
  const pat = chain.map(n => cd(nc(n), nd(n)));
  const patT = pat.map(x => ({ ...x, tone: 'pattern' as const }));
  const start = chain[0], end = chain[chain.length - 1];
  return {
    tech, key, placements: [], elims, pattern: { cells: [...new Set(chain.map(nc))], cands: pat }, digits: [...new Set(chain.map(nd))], variant, title,
    hints: [
      { text: `Empieza por el ${nName(start)}.`, cells: [{ cell: nc(start), tone: 'focus' }] },
      { text: `Hay una cadena de ${chain.length} candidatos entre ${cellName(nc(start))} y ${cellName(nc(end))}.`, cands: patT },
      { text: `${endsText}`, cands: patT, links },
      { text: conclusion, cands: [...patT, ...elims.map(e => ({ ...e, tone: 'elim' as const }))], links },
    ],
    frames,
    scenarios: [
      { label: `Si el ${nName(start)} es verdadero`, frames: [{ text: `Entonces ya está: el ${nName(start)} es verdadero y lo que lo ve pierde ese candidato.`, cands: [{ cell: nc(start), digit: nd(start), tone: 'colorA' }, ...elims.map(e => ({ ...e, tone: 'elim' as const }))] }] },
      { label: `Si el ${nName(start)} es falso`, frames: [frames[frames.length - 2]] },
    ],
    whyNot,
  };
}

function endpointElims(s: State, a: Node, b: Node, chain: Node[]): CD[] {
  const set = new Set(chain); const out: CD[] = [];
  const [ca, da, cb, db] = [nc(a), nd(a), nc(b), nd(b)];
  if (da === db && ca !== cb) {
    for (let z = 0; z < 81; z++) if (!s.v[z] && has(s.c[z], da) && !set.has(z * 10 + da) && sees(z, ca) && sees(z, cb)) out.push(cd(z, da));
  } else if (ca === cb && da !== db) {
    for (const d of digitsOf(s.c[ca])) if (d !== da && d !== db) out.push(cd(ca, d));
  } else if (da !== db && sees(ca, cb)) {
    if (has(s.c[ca], db) && !set.has(ca * 10 + db)) out.push(cd(ca, db));
    if (has(s.c[cb], da) && !set.has(cb * 10 + da)) out.push(cd(cb, da));
  }
  return out;
}

/** Búsqueda de cadenas alternas (fuerte-débil-...-fuerte) con profundidad iterativa: primero las más cortas. */
function searchChains(s: State, g: Map<Node, Set<Node>>, weakCands: (n: Node) => Node[], maxLinks: number, accept: (chain: Node[]) => CD[] | null, onFound: (chain: Node[], elims: CD[]) => boolean) {
  const starts = [...g.keys()].sort((a, b) => a - b);
  for (let lim = 3; lim <= maxLinks; lim += 2) {
    for (const st of starts) {
      const path: Node[] = [st];
      const onPath = new Set<Node>([st]);
      let stop = false;
      const dfs = (needStrong: boolean) => {
        if (stop) return;
        const links = path.length - 1;
        if (links >= lim) return;
        const last = path[path.length - 1];
        const nexts = needStrong ? [...(g.get(last) ?? [])] : weakCands(last);
        for (const nx of nexts) {
          if (onPath.has(nx)) continue;
          path.push(nx); onPath.add(nx);
          if (needStrong && path.length - 1 === lim) {
            const el = accept(path);
            if (el && el.length && onFound(path.slice(), el)) { stop = true; }
          } else if (path.length - 1 < lim) dfs(!needStrong);
          path.pop(); onPath.delete(nx);
          if (stop) return;
        }
      };
      dfs(true);
      if (stop) return;
    }
  }
}

function collector(tech: TechId, make: (chain: Node[], elims: CD[]) => Step) {
  const out: Step[] = []; const seen = new Set<string>();
  const onFound = (chain: Node[], elims: CD[]) => {
    const k = elims.map(e => e.cell * 10 + e.digit).sort((a, b) => a - b).join(',');
    if (!seen.has(k)) { seen.add(k); out.push(make(chain, elims)); }
    return out.length >= MAX_STEPS;
  };
  return { out, onFound, tech };
}

const chainWhyNot = (chain: Node[], elims: CD[]) => (cell: number, digit: number) => {
  if (chain.includes(cell * 10 + digit)) return `El ${digit} de ${cellName(cell)} forma parte de la cadena.`;
  const a = chain[0], b = chain[chain.length - 1];
  if (!elims.some(e => e.digit === digit)) return `Los extremos de la cadena son ${nName(a)} y ${nName(b)}; el ${digit} de ${cellName(cell)} no se ve afectado.`;
  if (!sees(cell, nc(a)) || !sees(cell, nc(b))) return `${cellName(cell)} no ve a los dos extremos (${cellName(nc(a))} y ${cellName(nc(b))}).`;
  return null;
};

// ---------- X-Chain: un solo dígito ----------
export function findXChain(s: State): Step[] {
  const all: Step[] = [];
  for (let d = 1; d <= 9 && all.length < MAX_STEPS; d++) {
    const g = strongGraph(s, d);
    const strongNodes = [...g.keys()];
    const col = collector('x_chain', (chain, elims) => chainStep('x_chain', `xc${chain.join('-')}`, chain, elims,
      `X-Chain del ${d} (${(chain.length) / 2} enlaces fuertes)`, chain.length <= 4 ? 'corta' : 'larga',
      `Uno de los extremos (${cellName(nc(chain[0]))} o ${cellName(nc(chain[chain.length - 1]))}) tiene el ${d}.`, chainWhyNot(chain, elims)));
    searchChains(s, g, n => strongNodes.filter(m => weakLinked(n, m)), 9,
      chain => endpointElims(s, chain[0], chain[chain.length - 1], chain), col.onFound);
    all.push(...col.out);
  }
  return all.slice(0, MAX_STEPS);
}

// ---------- XY-Chain: casillas de dos candidatos ----------
export function findXYChain(s: State): Step[] {
  const bv = Array.from({ length: 81 }, (_, i) => i).filter(i => !s.v[i] && popcount(s.c[i]) === 2);
  const out: Step[] = []; const seen = new Set<string>();
  const other = (c: number, d: number) => digitsOf(s.c[c]).find(x => x !== d)!;
  for (let maxLen = 3; maxLen <= 8 && out.length < MAX_STEPS; maxLen++) {
    for (const c0 of bv) for (const z of digitsOf(s.c[c0])) {
      const path = [c0];
      const dfs = (link: number) => {
        if (out.length >= MAX_STEPS) return;
        const last = path[path.length - 1];
        for (const nx of bv) {
          if (path.includes(nx) || !sees(last, nx) || !has(s.c[nx], link)) continue;
          path.push(nx);
          const o = other(nx, link);
          if (path.length === maxLen) {
            if (o === z) {
              const targets = Array.from({ length: 81 }, (_, i) => i).filter(t => !path.includes(t) && !s.v[t] && has(s.c[t], z) && sees(t, c0) && sees(t, nx));
              const k = targets.map(t => t * 10 + z).join(',');
              if (targets.length && !seen.has(k)) {
                seen.add(k);
                const chain: Node[] = []; let cur = z;
                for (const c of path) { chain.push(c * 10 + cur); const nxt = other(c, cur); chain.push(c * 10 + nxt); cur = nxt; }
                const elims = targets.map(t => cd(t, z));
                out.push(chainStep('xy_chain', `xy${path.join('-')}-${z}`, chain, elims, `XY-Chain de ${path.length} casillas (${z})`, path.length <= 4 ? 'corta' : 'larga',
                  `O ${cellName(c0)} es ${z}, o ${cellName(nx)} lo es.`, chainWhyNot(chain, elims)));
              }
            }
          } else dfs(o);
          path.pop();
          if (out.length >= MAX_STEPS) return;
        }
      };
      dfs(other(c0, z));
    }
  }
  return out;
}

// ---------- Coloreado múltiple ----------
function clusters(s: State, d: number) {
  const adj = new Map<number, number[]>();
  for (const [a, b] of conjugates(s, d)) { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); (adj.get(b) ?? adj.set(b, []).get(b)!).push(a); }
  const color = new Map<number, number>(); const out: { A: number[]; B: number[]; links: [number, number][] }[] = [];
  for (const st of adj.keys()) {
    if (color.has(st)) continue;
    color.set(st, 0); const q = [st]; const comp: number[] = []; let ok = true;
    while (q.length) { const x = q.shift()!; comp.push(x); for (const y of adj.get(x)!) { if (!color.has(y)) { color.set(y, 1 - color.get(x)!); q.push(y); } else if (color.get(y) === color.get(x)) ok = false; } }
    if (!ok) continue;
    const links: [number, number][] = [];
    for (const x of comp) for (const y of adj.get(x)!) if (x < y) links.push([x, y]);
    out.push({ A: comp.filter(x => color.get(x) === 0), B: comp.filter(x => color.get(x) === 1), links });
  }
  return out;
}

export function findMultiColoring(s: State): Step[] {
  const out: Step[] = [];
  for (let d = 1; d <= 9; d++) {
    const cl = clusters(s, d);
    for (let i = 0; i < cl.length; i++) for (let j = 0; j < cl.length; j++) {
      if (i === j) continue;
      const P = cl[i], Q = cl[j];
      const inAny = new Set([...P.A, ...P.B, ...Q.A, ...Q.B]);
      const links = [...P.links, ...Q.links].map(([a, b]) => ({ a: cd(a, d), b: cd(b, d), kind: 'strong' as const }));
      for (const [p, pn] of [[P.A, P.B], [P.B, P.A]]) for (const [q, qn] of [[Q.A, Q.B], [Q.B, Q.A]]) {
        const pair = p.flatMap(x => q.filter(y => sees(x, y)).map(y => [x, y] as [number, number]))[0];
        if (!pair) continue;
        // p y q no pueden ser verdaderos a la vez → pn o qn es verdadero
        const targets = Array.from({ length: 81 }, (_, z) => z).filter(z => !inAny.has(z) && !s.v[z] && has(s.c[z], d) && pn.some(x => sees(x, z)) && qn.some(y => sees(y, z)));
        if (!targets.length || i > j) continue;
        const elims = targets.map(z => cd(z, d));
        const tones = [...p.map(c => ({ cell: c, digit: d, tone: 'colorB' as const })), ...pn.map(c => ({ cell: c, digit: d, tone: 'colorA' as const })),
          ...q.map(c => ({ cell: c, digit: d, tone: 'colorB' as const })), ...qn.map(c => ({ cell: c, digit: d, tone: 'colorA' as const }))];
        const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
        const key = `mc${d}-${targets.join(',')}`;
        if (out.some(o => o.key === key)) continue;
        out.push({
          tech: 'multi_coloring', key, placements: [], elims, pattern: { cells: [...inAny], cands: [...inAny].map(c => cd(c, d)) }, digits: [d], variant: 'trampa',
          title: `Coloreado múltiple del ${d}`,
          hints: [
            { text: `Piensa en el ${d}: hay dos cadenas de enlaces fuertes separadas.`, digitFocus: d },
            { text: 'Colorea cada cadena con sus dos colores.', cands: tones, links, digitFocus: d },
            { text: `${cellName(pair[0])} y ${cellName(pair[1])} se ven: no pueden ser ${d} las dos. Así que uno de los otros colores (azul) es verdadero.`, cands: tones, links, cells: [{ cell: pair[0], tone: 'target' }, { cell: pair[1], tone: 'target' }], digitFocus: d },
            { text: `Elimina el ${d} de las casillas que ven un azul de cada cadena.`, cands: [...tones, ...elT], links, digitFocus: d },
          ],
          frames: [
            { text: `Fíjate en el ${d}. Hay dos cadenas de enlaces fuertes que no se tocan.`, cands: [...inAny].map(c => ({ cell: c, digit: d, tone: 'pattern' as const })), links, digitFocus: d },
            { text: 'En cada cadena, uno de sus dos colores es verdadero.', cands: tones, links, digitFocus: d },
            { text: `Pero ${cellName(pair[0])} y ${cellName(pair[1])} (rosa) se ven: no pueden ser ${d} las dos. Al menos una cadena tiene verdadero su color azul.`, cands: tones, links, cells: [{ cell: pair[0], tone: 'target' }, { cell: pair[1], tone: 'target' }], digitFocus: d },
            { text: `Quien vea un azul de cada cadena no puede ser ${d}: ${listCells(targets)}.`, cands: [...tones, ...elT], links, digitFocus: d },
          ],
          whyNot: (cell, digit) => {
            if (digit !== d) return `Este patrón solo trata el ${d}.`;
            if (inAny.has(cell)) return `${cellName(cell)} forma parte de una cadena.`;
            return `${cellName(cell)} no ve una casilla azul de cada cadena.`;
          },
        });
        if (out.length >= MAX_STEPS) return out;
      }
    }
  }
  return out;
}

// ---------- 3D Medusa ----------
export function findMedusa(s: State): Step[] {
  const g = strongGraph(s);
  const color = new Map<Node, number>();
  const out: Step[] = [];
  for (const st of [...g.keys()].sort((a, b) => a - b)) {
    if (color.has(st)) continue;
    color.set(st, 0); const q = [st]; const comp: Node[] = []; let ok = true;
    while (q.length) { const x = q.shift()!; comp.push(x); for (const y of g.get(x)!) { if (!color.has(y)) { color.set(y, 1 - color.get(x)!); q.push(y); } else if (color.get(y) === color.get(x)) ok = false; } }
    if (!ok || comp.length < 4 || new Set(comp.map(nd)).size < 2) continue;
    const inComp = new Set(comp);
    const A = comp.filter(n => color.get(n) === 0), B = comp.filter(n => color.get(n) === 1);
    const links: NonNullable<Frame['links']> = [];
    for (const x of comp) for (const y of g.get(x)!) if (x < y) links.push({ a: cd(nc(x), nd(x)), b: cd(nc(y), nd(y)), kind: 'strong' });
    const tones = [...A.map(n => ({ cell: nc(n), digit: nd(n), tone: 'colorA' as const })), ...B.map(n => ({ cell: nc(n), digit: nd(n), tone: 'colorB' as const }))];
    const base: Frame[] = [
      { text: 'Esta red mezcla dos tipos de enlace fuerte: casillas con dos candidatos y números con solo dos sitios en una unidad.', cands: comp.map(n => ({ cell: nc(n), digit: nd(n), tone: 'pattern' as const })), links },
      { text: 'Píntala alternando azul y rosa: todos los azules son verdaderos, o todos los rosas.', cands: tones, links },
    ];
    let falseColor: Node[] | null = null; let reason = '';
    for (const [grp, nm] of [[A, 'azul'], [B, 'rosa']] as [Node[], string][]) {
      for (let i = 0; i < grp.length && !falseColor; i++) for (let j = i + 1; j < grp.length && !falseColor; j++) {
        const x = grp[i], y = grp[j];
        if (nc(x) === nc(y)) { falseColor = grp; reason = `${cellName(nc(x))} tendría dos números ${nm} a la vez (${nd(x)} y ${nd(y)}). Imposible: el ${nm} es falso.`; }
        else if (nd(x) === nd(y) && sees(nc(x), nc(y))) { falseColor = grp; reason = `Hay dos ${nd(x)} ${nm} que se ven (${cellName(nc(x))} y ${cellName(nc(y))}). Imposible: el ${nm} es falso.`; }
      }
      if (falseColor) break;
    }
    let elims: CD[] = []; let variant = '';
    if (falseColor) { elims = falseColor.map(n => cd(nc(n), nd(n))); variant = 'color falso'; }
    else {
      const set = new Set<number>(); const why: string[] = [];
      for (let c = 0; c < 81; c++) {
        if (s.v[c]) continue;
        const colsHere = comp.filter(n => nc(n) === c);
        for (const d of digitsOf(s.c[c])) {
          const n = c * 10 + d;
          if (inComp.has(n)) continue;
          const seesA = A.some(m => nd(m) === d && sees(nc(m), c)), seesB = B.some(m => nd(m) === d && sees(nc(m), c));
          const cellA = colsHere.some(m => color.get(m) === 0), cellB = colsHere.some(m => color.get(m) === 1);
          if ((cellA && cellB) || (seesA && seesB) || (cellA && seesB) || (cellB && seesA)) { set.add(n); if (why.length < 1) why.push(cellA && cellB ? `${cellName(c)} tiene un azul y un rosa: será uno de ellos, así que sus otros candidatos sobran.` : seesA && seesB ? `El ${d} de ${cellName(c)} ve un ${d} azul y un ${d} rosa: uno de los dos es verdadero.` : `En ${cellName(c)}, o es el número coloreado, o el ${d} que ve del otro color es verdadero.`); }
        }
      }
      elims = [...set].map(n => cd(nc(n), nd(n))); reason = why[0] ?? ''; variant = 'trampa';
    }
    if (!elims.length) continue;
    const elT = elims.map(e => ({ ...e, tone: 'elim' as const }));
    out.push({
      tech: 'medusa', key: `md${comp.slice(0, 4).join(',')}`, placements: [], elims, pattern: { cells: [...new Set(comp.map(nc))], cands: comp.map(n => cd(nc(n), nd(n))) }, digits: [...new Set(comp.map(nd))], variant,
      title: `3D Medusa (${variant})`,
      hints: [
        { text: `Empieza en ${cellName(nc(st))} y sigue los enlaces fuertes de cualquier número.`, cells: [{ cell: nc(st), tone: 'focus' }] },
        { text: 'Colorea la red alternando dos colores.', cands: tones, links },
        { text: reason, cands: tones, links },
        { text: `Se elimina: ${elims.slice(0, 6).map(e => `${e.digit} de ${cellName(e.cell)}`).join(', ')}${elims.length > 6 ? '…' : ''}.`, cands: [...tones, ...elT], links },
      ],
      frames: [...base, { text: reason, cands: tones, links }, { text: `Se eliminan ${elims.length} candidato${elims.length > 1 ? 's' : ''}.`, cands: [...tones, ...elT], links }],
      scenarios: [
        { label: 'Si el azul es verdadero', frames: [{ text: 'Todos los azules serían ciertos.', hypo: A.map(n => cd(nc(n), nd(n))), links }] },
        { label: 'Si el rosa es verdadero', frames: [{ text: 'Todos los rosas serían ciertos.', hypo: B.map(n => cd(nc(n), nd(n))), links }] },
      ],
      whyNot: (cell, digit) => (inComp.has(cell * 10 + digit) ? `El ${digit} de ${cellName(cell)} está coloreado: puede ser verdadero.` : `Ninguna regla de color descarta el ${digit} de ${cellName(cell)}.`),
    });
    if (out.length >= MAX_STEPS) break;
  }
  return out;
}

// ---------- AIC: cadena general ----------
export function findAIC(s: State): Step[] {
  const g = strongGraph(s);
  const nodes = [...g.keys()];
  const col = collector('aic', (chain, elims) => {
    const a = chain[0], b = chain[chain.length - 1];
    const ends = nd(a) === nd(b) ? `O el ${nName(a)} es verdadero, o el ${nName(b)} lo es.` : `O el ${nName(a)} es verdadero, o el ${nName(b)} lo es (al menos uno).`;
    return chainStep('aic', `aic${chain.join('-')}`, chain, elims, `AIC de ${chain.length} nodos`, new Set(chain.map(nd)).size > 1 ? 'mixta' : 'un dígito', ends, chainWhyNot(chain, elims));
  });
  searchChains(s, g, n => nodes.filter(m => weakLinked(n, m)), 9, chain => endpointElims(s, chain[0], chain[chain.length - 1], chain), col.onFound);
  return col.out;
}
