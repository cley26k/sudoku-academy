// Mini-animaciones que explican la IDEA de cada técnica, paso a paso, antes de verla en un tablero real.
// Son escenas didácticas dibujadas a mano (no posiciones del banco): cada una está pensada para que
// la lógica se lea sin ruido. Coordenadas 1-based: fila r, columna c.

export type Tone = 'focus' | 'pat' | 'elim' | 'conf' | 'a' | 'b' | 'c' | 'd' | 'block';
export interface SCell { v?: number; given?: boolean; c?: number[]; tone?: Tone; ring?: Record<number, Tone>; x?: number[]; hypo?: Tone }
export interface SLink { a: number; ad?: number; b: number; bd?: number; kind: 'strong' | 'weak' | 'ray' }
export interface SBand { k: 'r' | 'c' | 'b'; i: number; tone?: Tone }
export interface SFrame { text: string; cells: Record<number, SCell>; bands: SBand[]; links: SLink[] }
export interface Scene { rows: number; cols: number; boxes: boolean; frames: SFrame[] }

class B {
  cells: Record<number, SCell> = {};
  frames: SFrame[] = [];
  bands: SBand[] = [];
  links: SLink[] = [];
  constructor(public rows = 9, public cols = 9, public boxes = true) {}
  at = (r: number, c: number) => (r - 1) * this.cols + (c - 1);
  /** Modifica una casilla (r, c). */
  s(r: number, c: number, p: SCell) { const i = this.at(r, c); this.cells[i] = { ...this.cells[i], ...p }; return this; }
  given(r: number, c: number, v: number, tone?: Tone) { return this.s(r, c, { v, given: true, c: undefined, tone }); }
  cand(r: number, c: number, ds: number[], tone?: Tone) { return this.s(r, c, { c: ds, tone }); }
  ring(r: number, c: number, d: number, t: Tone = 'pat') { const i = this.at(r, c); this.cells[i] = { ...this.cells[i], ring: { ...this.cells[i]?.ring, [d]: t } }; return this; }
  unring(r: number, c: number) { return this.s(r, c, { ring: undefined }); }
  strike(r: number, c: number, ...ds: number[]) { const i = this.at(r, c); const x = this.cells[i]?.x ?? []; return this.s(r, c, { x: [...x, ...ds] }); }
  hypo(r: number, c: number, v: number, t: Tone) { return this.s(r, c, { v, hypo: t }); }
  clearHypo() { for (const k in this.cells) if (this.cells[k].hypo) this.cells[k] = { ...this.cells[k], v: undefined, hypo: undefined }; return this; }
  tone(r: number, c: number, tone?: Tone) { return this.s(r, c, { tone }); }
  band(k: 'r' | 'c' | 'b', i: number, tone: Tone = 'focus') { this.bands.push({ k, i, tone }); return this; }
  noBands() { this.bands = []; return this; }
  link(r1: number, c1: number, r2: number, c2: number, kind: SLink['kind'], ad?: number, bd?: number) { this.links.push({ a: this.at(r1, c1), b: this.at(r2, c2), kind, ad, bd }); return this; }
  noLinks() { this.links = []; return this; }
  noRays() { this.links = this.links.filter(l => l.kind !== 'ray'); return this; }
  f(text: string) {
    this.frames.push({ text, cells: structuredClone(this.cells), bands: [...this.bands], links: [...this.links] });
    // Lo tachado se ve tachado en su paso y desaparece en el siguiente: el tablero no se ensucia.
    for (const k in this.cells) { const x = this.cells[k]; if (x.x?.length) this.cells[k] = { ...x, c: x.c?.filter(d => !x.x!.includes(d)), x: undefined }; }
    return this;
  }
  done(): Scene { return { rows: this.rows, cols: this.cols, boxes: this.boxes, frames: this.frames }; }
}
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const list = (ds: number[], sep = ' y ') => (ds.length < 2 ? String(ds[0]) : ds.slice(0, -1).join(', ') + sep + ds[ds.length - 1]);
const NUM = ['', 'uno', 'dos', 'tres', 'cuatro'];
/** Rellena con números dados las casillas vacías de una caja, usando dígitos que no aparecen como candidatos. */
function fillBox(b: B, avoid: number[] = []) {
  const used = new Set<number>(avoid); Object.values(b.cells).forEach(x => { x.c?.forEach(d => used.add(d)); if (x.v) used.add(x.v); });
  const free = ALL.filter(d => !used.has(d));
  for (let i = 0; i < 9; i++) if (!b.cells[i]) { const v = free.shift(); if (v) b.cells[i] = { v, given: true }; }
}

// ---------- Fundamentos ----------
function rules(): Scene {
  const b = new B();
  const row = [5, 3, 4, 6, 7, 8, 9, 1, 2];
  b.f('El tablero tiene 9×9 casillas. Hay tres tipos de zona y en cada una van los números del 1 al 9, sin repetir.');
  row.forEach((v, k) => b.given(1, k + 1, v));
  b.band('r', 0).f('Una FILA va de lado a lado (↔). Esta es la fila 1: tiene del 1 al 9, una vez cada uno.');
  const col = [5, 6, 1, 8, 4, 7, 9, 2, 3];
  b.noBands(); col.forEach((v, k) => b.given(k + 1, 1, v));
  b.band('c', 0).f('Una COLUMNA va de arriba abajo (↕). La columna 1 también tiene del 1 al 9.');
  b.noBands(); [[2, 2, 7], [2, 3, 2], [3, 2, 9], [3, 3, 8]].forEach(([r, c, v]) => b.given(r, c, v));
  b.band('b', 0).f('Una CAJA es un bloque de 3×3 (hay nueve). También lleva del 1 al 9.');
  b.noBands().given(5, 6, 4, 'elim').band('r', 4, 'elim').link(5, 1, 5, 6, 'ray')
    .f('¿Un 4 aquí? Choca con el 4 que ya hay en su fila. Esa es la única regla: no repetir en fila, columna ni caja.');
  return b.done();
}

function nakedSingle(candidatesOnly = false): Scene {
  const b = new B();
  b.cand(5, 5, ALL, 'focus').f('Esta casilla está vacía. Al principio podría ser cualquier número del 1 al 9.');
  b.given(5, 1, 1, 'pat').given(5, 3, 3, 'pat').given(5, 8, 7, 'pat').band('r', 4)
    .link(5, 1, 5, 5, 'ray').link(5, 8, 5, 5, 'ray').strike(5, 5, 1, 3, 7)
    .f('Mira su fila: ya tiene 1, 3 y 7. Esos números no pueden repetirse aquí.');
  b.noBands().noRays().tone(5, 1).tone(5, 3).tone(5, 8)
    .given(1, 5, 2, 'pat').given(3, 5, 5, 'pat').given(8, 5, 8, 'pat').band('c', 4)
    .link(1, 5, 5, 5, 'ray').link(8, 5, 5, 5, 'ray').strike(5, 5, 2, 5, 8)
    .f('Ahora su columna: tiene 2, 5 y 8. También fuera.');
  b.noBands().noRays().tone(1, 5).tone(3, 5).tone(8, 5)
    .given(4, 4, 4, 'pat').band('b', 4).link(4, 4, 5, 5, 'ray').strike(5, 5, 4);
  if (candidatesOnly) {
    b.f('Y su caja: tiene un 4. Fuera también.');
    b.noBands().noRays().tone(4, 4).s(5, 5, { c: [6, 9], x: [] }).ring(5, 5, 6, 'conf').ring(5, 5, 9, 'conf')
      .f('Lo que sobrevive son sus CANDIDATOS: 6 y 9. Se apuntan en pequeño para no olvidarlos.');
    return b.done();
  }
  b.given(6, 6, 6, 'pat').link(6, 6, 5, 5, 'ray').strike(5, 5, 6).f('Y su caja: tiene 4 y 6. Fuera.');
  b.noBands().noRays().tone(4, 4).tone(6, 6).ring(5, 5, 9, 'conf').f('Solo sobrevive un candidato: el 9.');
  b.s(5, 5, { v: 9, c: undefined, x: undefined, ring: undefined, tone: 'conf' }).f('Si solo queda una opción, ese es el número. ¡Candidato único!');
  return b.done();
}

function hiddenSingle(): Scene {
  const b = new B();
  b.given(1, 2, 7).given(2, 2, 4).band('b', 0).f('¿Dónde puede ir el 5 en esta caja? Toda caja necesita un 5.');
  b.given(2, 7, 5, 'pat').band('r', 1, 'block').link(2, 7, 2, 3, 'ray').tone(2, 1, 'block').tone(2, 3, 'block')
    .f('Hay un 5 en la fila 2. Bloquea toda su fila: en esa fila no cabe otro 5.');
  b.noRays().given(7, 1, 5, 'pat').band('c', 0, 'block').link(7, 1, 3, 1, 'ray').tone(1, 1, 'block').tone(3, 1, 'block')
    .f('Otro 5 en la columna 1: también la bloquea.');
  b.noRays().given(5, 3, 5, 'pat').band('c', 2, 'block').link(5, 3, 1, 3, 'ray').tone(1, 3, 'block').tone(3, 3, 'block')
    .f('Y este bloquea la columna 3.');
  b.noRays().noBands().band('b', 0).tone(3, 2, 'focus').f('Dentro de la caja, solo queda UNA casilla libre para el 5.');
  b.s(3, 2, { v: 5, tone: 'conf' }).f('¡Ahí va! Da igual qué más pudiera ir en esa casilla: el 5 solo cabe ahí. Lugar único.');
  return b.done();
}

// ---------- Intersecciones ----------
function pointing(): Scene {
  const b = new B();
  b.given(2, 1, 8).given(2, 2, 1).given(3, 3, 9).given(2, 3, 2).given(3, 1, 6).given(3, 2, 5).cand(1, 1, [4], 'pat').cand(1, 3, [4], 'pat').given(1, 2, 3)
    .band('b', 0).f('En esta caja, el 4 solo puede ir en dos casillas.');
  b.band('r', 0, 'pat').f('Las dos están en la misma fila: la fila 1.');
  b.cand(1, 5, [4]).cand(1, 8, [4]).f('Sea cual sea, el 4 de la caja estará en la fila 1… y una fila solo tiene un 4.');
  b.link(1, 3, 1, 5, 'ray').link(1, 3, 1, 8, 'ray').strike(1, 5, 4).strike(1, 8, 4).tone(1, 5, 'elim').tone(1, 8, 'elim')
    .f('Así que en el resto de la fila 1 no puede haber 4. La caja "apunta" a la fila.');
  return b.done();
}
function claiming(): Scene {
  const b = new B();
  [1, 2, 3, 7, 8, 9].forEach((c, k) => b.given(5, c, [2, 8, 1, 9, 3, 7][k]));
  b.given(5, 5, 4).cand(5, 4, [6], 'pat').cand(5, 6, [6], 'pat').band('r', 4).f('En la fila 5, el 6 solo puede ir en dos casillas.');
  b.band('b', 4, 'pat').f('Las dos están dentro de la misma caja.');
  b.cand(4, 5, [6]).cand(6, 4, [6]).cand(4, 6, [6]).f('El 6 de la fila 5 caerá dentro de esta caja… y la caja solo tiene sitio para un 6.');
  b.strike(4, 5, 6).strike(6, 4, 6).strike(4, 6, 6)
    .tone(4, 5, 'elim').tone(6, 4, 'elim').tone(4, 6, 'elim').f('Por eso el resto de la caja no puede tener 6. La fila "reclama" el número.');
  return b.done();
}

// ---------- Subconjuntos (en una caja 3×3) ----------
function nakedSubset(n: 2 | 3 | 4): Scene {
  const b = new B(3, 3, false);
  const pos: [number, number][] = [[1, 2], [3, 1], [2, 3], [3, 3]].slice(0, n) as [number, number][];
  const sets = n === 2 ? [[3, 8], [3, 8]] : n === 3 ? [[1, 4], [4, 7], [1, 7]] : [[2, 5], [5, 7, 9], [2, 9], [2, 5, 7]];
  const ds = [...new Set(sets.flat())].sort();
  const others: Record<string, number[]> = n === 2 ? { '1,1': [1, 3, 5], '1,3': [2, 8], '2,2': [3, 5, 8, 9], '3,2': [1, 9], '2,1': [2, 5], '3,3': [5, 8] }
    : n === 3 ? { '1,1': [1, 3], '1,3': [4, 6, 9], '2,1': [3, 7, 8], '2,2': [1, 6], '3,2': [4, 8, 9], '3,3': [6, 8] }
      : { '1,1': [1, 2], '1,3': [3, 5], '2,1': [1, 7, 8], '2,2': [6, 9] };
  const givens: [number, number, number][] = n === 4 ? [[3, 2, 4]] : [];
  givens.forEach(([r, c, v]) => b.given(r, c, v));
  for (const k in others) { const [r, c] = k.split(',').map(Number); if (!pos.some(p => p[0] === r && p[1] === c)) b.cand(r, c, others[k]); }
  pos.forEach((p, k) => b.cand(p[0], p[1], sets[k]));
  fillBox(b);
  b.f('Esta es una caja con sus candidatos (los números pequeños).');
  pos.forEach(p => b.tone(p[0], p[1], 'pat'));
  const names = ['', '', 'Dos', 'Tres', 'Cuatro'];
  b.f(`${names[n]} casillas que, entre todas, solo usan ${NUM[n]} números: ${list(ds)}.`);
  if (n === 2) {
    b.hypo(pos[0][0], pos[0][1], 3, 'a').hypo(pos[1][0], pos[1][1], 8, 'a').f('Puede que una sea 3 y la otra 8…');
    b.hypo(pos[0][0], pos[0][1], 8, 'b').hypo(pos[1][0], pos[1][1], 3, 'b').f('…o al revés. No sabemos cuál, pero no hay otra opción.');
    b.clearHypo().f('En los dos casos, el 3 y el 8 quedan "reservados" para estas dos casillas.');
  } else {
    b.f(`${names[n]} casillas, ${NUM[n]} números: cada casilla acabará con uno distinto. Esos números quedan reservados para ellas.`);
  }
  for (const k in others) {
    const [r, c] = k.split(',').map(Number); if (pos.some(p => p[0] === r && p[1] === c)) continue;
    const hit = others[k].filter(d => ds.includes(d)); if (hit.length) { b.strike(r, c, ...hit); b.tone(r, c, 'elim'); }
  }
  b.f(`Así que ninguna otra casilla de la caja puede tener ${list(ds, ' ni ')}. ¡Fuera!`);
  return b.done();
}
function hiddenSubset(n: 2 | 3 | 4): Scene {
  const b = new B(3, 3, false);
  const ds = n === 2 ? [2, 6] : n === 3 ? [1, 4, 7] : [1, 4, 7, 9];
  const cells: { p: [number, number]; c: number[] }[] = n === 2
    ? [{ p: [1, 1], c: [1, 2, 6, 9] }, { p: [2, 3], c: [2, 3, 6, 8] }]
    : n === 3 ? [{ p: [1, 1], c: [1, 4, 5, 8] }, { p: [2, 2], c: [4, 7, 3] }, { p: [3, 3], c: [1, 7, 6, 8] }]
      : [{ p: [1, 1], c: [1, 4, 5] }, { p: [2, 2], c: [4, 7, 3, 9] }, { p: [3, 3], c: [1, 7, 6] }, { p: [1, 3], c: [9, 1, 8] }];
  const rest: { p: [number, number]; c: number[] }[] = n === 2
    ? [{ p: [1, 2], c: [1, 3] }, { p: [1, 3], c: [3, 9] }, { p: [2, 1], c: [1, 7, 9] }, { p: [2, 2], c: [3, 7, 8] }, { p: [3, 1], c: [7, 8] }, { p: [3, 2], c: [8, 9] }]
    : n === 3 ? [{ p: [1, 2], c: [3, 5] }, { p: [1, 3], c: [6, 8] }, { p: [2, 1], c: [5, 6] }, { p: [2, 3], c: [3, 9] }, { p: [3, 1], c: [5, 9] }]
      : [{ p: [1, 2], c: [3, 5] }, { p: [2, 1], c: [5, 6] }, { p: [2, 3], c: [3, 8] }, { p: [3, 1], c: [6, 8] }];
  const filled = new Set([...cells, ...rest].map(x => x.p.join()));
  [...cells, ...rest].forEach(x => b.cand(x.p[0], x.p[1], x.c));
  void filled; fillBox(b, ds);
  b.f('Ahora no miramos casillas, miramos NÚMEROS. ¿Dónde puede ir cada uno?');
  const tones: Tone[] = ['a', 'b', 'c', 'd'];
  ds.forEach((d, k) => {
    cells.forEach(x => { if (x.c.includes(d)) b.ring(x.p[0], x.p[1], d, tones[k]); });
    b.f(k === 0 ? `El ${d} solo cabe en ${cells.filter(x => x.c.includes(d)).length === 1 ? 'una casilla' : 'estas casillas'}.` : k === ds.length - 1 ? `Y el ${d}… ¡siempre dentro de las mismas ${n} casillas!` : `El ${d}, también ahí.`);
  });
  cells.forEach(x => b.tone(x.p[0], x.p[1], 'pat'));
  b.f(`${NUM[n][0].toUpperCase() + NUM[n].slice(1)} números que solo caben en ${NUM[n]} casillas: se las tienen que repartir. No queda hueco para nada más.`);
  cells.forEach(x => { const o = x.c.filter(d => !ds.includes(d)); if (o.length) b.strike(x.p[0], x.p[1], ...o); });
  b.f('Así que esas casillas pierden sus otros candidatos. (El grupo estaba "escondido" entre ellos.)');
  return b.done();
}

// ---------- Peces (un solo número) ----------
function fish(n: 2 | 3 | 4, d = 7): Scene {
  const b = new B();
  const cfg = n === 2 ? { rows: [2, 6], cands: [[2, 3], [2, 7], [6, 3], [6, 7]], cols: [3, 7], el: [[4, 3], [8, 7], [9, 3]], decoy: [[4, 5], [8, 1]] }
    : n === 3 ? { rows: [1, 5, 8], cands: [[1, 2], [1, 9], [5, 2], [5, 4], [8, 4], [8, 9]], cols: [2, 4, 9], el: [[3, 2], [6, 4], [9, 9]], decoy: [[3, 6], [6, 7]] }
      : { rows: [1, 3, 6, 8], cands: [[1, 2], [1, 7], [3, 4], [3, 9], [6, 2], [6, 4], [8, 7], [8, 9]], cols: [2, 4, 7, 9], el: [[4, 2], [5, 9], [9, 4]], decoy: [[5, 5]] };
  [...cfg.cands, ...cfg.el, ...cfg.decoy].forEach(([r, c]) => b.cand(r, c, [d]));
  b.f(`Fíjate solo en el ${d}. Cada número pequeño es un sitio donde todavía puede ir.`);
  const name = ['', '', 'X-Wing', 'Swordfish', 'Jellyfish'][n];
  if (n === 2) {
    b.band('r', 1, 'pat').ring(2, 3, d).ring(2, 7, d).f(`En la fila 2, el ${d} solo tiene dos sitios.`);
    b.band('r', 5, 'pat').ring(6, 3, d).ring(6, 7, d).f('En la fila 6, también dos… ¡y en las mismas columnas! Forman un rectángulo.');
    b.hypo(2, 3, d, 'a').hypo(6, 7, d, 'a').link(2, 3, 6, 7, 'weak').f(`Opción A: el ${d} va en estas dos esquinas…`);
    b.noLinks().clearHypo().hypo(2, 7, d, 'b').hypo(6, 3, d, 'b').link(2, 7, 6, 3, 'weak').f('Opción B: en las otras dos. No hay más opciones.');
    b.noLinks().clearHypo().noBands().band('c', 2).band('c', 6).f(`En ambos casos, las columnas 3 y 7 ya tienen su ${d} en las filas 2 y 6.`);
  } else {
    cfg.rows.forEach(r => b.band('r', r - 1, 'pat'));
    cfg.cands.forEach(([r, c]) => b.ring(r, c, d));
    b.f(`${n === 3 ? 'Tres' : 'Cuatro'} filas donde el ${d} solo cabe en ${n === 3 ? 'tres' : 'cuatro'} columnas en total.`);
    b.noBands(); cfg.cols.forEach(c => b.band('c', c - 1));
    b.f(`Cada fila necesita su ${d}, y todos caen en estas ${n} columnas: cada columna recibe exactamente uno.`);
  }
  cfg.el.forEach(([r, c]) => { b.strike(r, c, d); b.tone(r, c, 'elim'); });
  b.f(`Así que el resto de esas columnas no puede tener ${d}. ¡Eso es un ${name}!`);
  return b.done();
}
function finned(): Scene {
  const b = new B(); const d = 3;
  [[2, 2], [2, 8], [7, 2], [7, 8], [7, 9], [4, 8], [8, 8], [9, 8], [5, 2]].forEach(([r, c]) => b.cand(r, c, [d]));
  b.f('Volvemos a un solo número: el 3.');
  b.band('r', 1, 'pat').band('r', 6, 'pat').ring(2, 2, d).ring(2, 8, d).ring(7, 2, d).ring(7, 8, d).ring(7, 9, d, 'c')
    .f('Casi un X-Wing… pero la fila 7 tiene un 3 de más, pegado al rectángulo. Es la ALETA (en verde).');
  b.noBands().band('c', 1).band('c', 7).tone(4, 8, 'block').tone(8, 8, 'block').tone(9, 8, 'block').tone(5, 2, 'block')
    .f('Caso 1: la aleta NO es el 3. Entonces es un X-Wing normal y borra los 3 de las columnas 2 y 8.');
  b.noBands().tone(4, 8).tone(5, 2).band('b', 8, 'c').f('Caso 2: la aleta SÍ es el 3. Entonces borra los 3 de su caja.');
  b.noBands().band('b', 8, 'c').band('c', 7).strike(8, 8, d).strike(9, 8, d).tone(8, 8, 'elim').tone(9, 8, 'elim')
    .f('Solo es seguro lo que se borra en LOS DOS casos: los 3 de la columna que ven a la aleta.');
  return b.done();
}

// ---------- Alas ----------
function yWing(): Scene {
  const b = new B();
  b.cand(2, 2, [3, 5], 'pat').f('Esta casilla, el PIVOTE, solo puede ser 3 o 5.');
  b.cand(2, 7, [3, 8], 'focus').cand(7, 2, [5, 8], 'focus').link(2, 2, 2, 7, 'weak').link(2, 2, 7, 2, 'weak')
    .f('Ve a dos casillas, las PINZAS: una con 3 u 8, otra con 5 u 8.');
  b.hypo(2, 2, 3, 'a').hypo(2, 7, 8, 'a').f('Si el pivote es 3, la primera pinza no puede ser 3: será 8.');
  b.clearHypo().hypo(2, 2, 5, 'b').hypo(7, 2, 8, 'b').f('Si el pivote es 5, la otra pinza será 8.');
  b.clearHypo().ring(2, 7, 8, 'pat').ring(7, 2, 8, 'pat').f('Pase lo que pase, UNA de las pinzas es 8.');
  b.cand(7, 7, [1, 8], 'focus').link(2, 7, 7, 7, 'ray').link(7, 2, 7, 7, 'ray').strike(7, 7, 8).tone(7, 7, 'elim')
    .f('Esta casilla ve a las dos pinzas. Si fuera 8, chocaría con la que sea 8. ¡Fuera el 8!');
  return b.done();
}
function xyzWing(): Scene {
  const b = new B();
  b.cand(2, 2, [3, 5, 8], 'pat').f('Ahora el pivote tiene tres opciones: 3, 5 u 8.');
  b.cand(2, 6, [3, 8], 'focus').cand(3, 1, [5, 8], 'focus').link(2, 2, 2, 6, 'weak').link(2, 2, 3, 1, 'weak').f('Y dos pinzas: 3 u 8, y 5 u 8.');
  b.hypo(2, 2, 3, 'a').hypo(2, 6, 8, 'a').f('Si el pivote es 3 → la primera pinza es 8.');
  b.clearHypo().hypo(2, 2, 5, 'b').hypo(3, 1, 8, 'b').f('Si es 5 → la segunda pinza es 8.');
  b.clearHypo().hypo(2, 2, 8, 'c').f('Y si es 8… el propio pivote es el 8.');
  b.clearHypo().ring(2, 2, 8).ring(2, 6, 8).ring(3, 1, 8).f('Siempre hay un 8 entre estas tres casillas.');
  b.cand(2, 3, [8, 9], 'focus').link(2, 2, 2, 3, 'ray').link(2, 6, 2, 3, 'ray').link(3, 1, 2, 3, 'ray').strike(2, 3, 8).tone(2, 3, 'elim')
    .f('Esta casilla ve a LAS TRES a la vez: no puede ser 8.');
  return b.done();
}
function wWing(): Scene {
  const b = new B();
  b.cand(1, 2, [4, 9], 'pat').cand(8, 6, [4, 9], 'pat').f('Dos casillas iguales: 4 o 9. No se ven entre sí.');
  b.band('r', 4).cand(5, 2, [9]).cand(5, 6, [9]).ring(5, 2, 9, 'a').ring(5, 6, 9, 'a').link(5, 2, 5, 6, 'strong')
    .f('En la fila 5, el 9 solo tiene dos sitios. Uno de ellos ES el 9.');
  b.hypo(1, 2, 9, 'elim').hypo(8, 6, 9, 'elim').link(1, 2, 5, 2, 'ray').link(8, 6, 5, 6, 'ray').tone(5, 2, 'block').tone(5, 6, 'block')
    .f('Imagina que las dos fueran 9: bloquearían los dos sitios de la fila 5. ¡Imposible!');
  b.clearHypo().noRays().tone(5, 2).tone(5, 6).ring(1, 2, 4, 'conf').ring(8, 6, 4, 'conf').f('Así que al menos una de las dos es 4.');
  b.noBands().cand(1, 6, [4, 7], 'focus').cand(8, 2, [1, 4], 'focus').link(1, 2, 1, 6, 'ray').link(8, 6, 1, 6, 'ray').link(1, 2, 8, 2, 'ray').link(8, 6, 8, 2, 'ray')
    .strike(1, 6, 4).strike(8, 2, 4).tone(1, 6, 'elim').tone(8, 2, 'elim').f('Las casillas que ven a ambas pierden el 4.');
  return b.done();
}

// ---------- Unicidad ----------
function ur(plus: boolean): Scene {
  const b = new B();
  b.cand(1, 2, [2, 7], 'pat').cand(1, 5, [2, 7], 'pat').cand(3, 2, plus ? [2, 5, 7] : [2, 7], 'pat').cand(3, 5, [2, 5, 7], 'pat')
    .f('Cuatro casillas en rectángulo, repartidas en dos cajas, todas con 2 y 7.');
  b.hypo(1, 2, 2, 'a').hypo(1, 5, 7, 'a').hypo(3, 2, 7, 'a').hypo(3, 5, 2, 'a').f('Si solo pudieran ser 2 o 7, podríamos ponerlas así…');
  b.hypo(1, 2, 7, 'b').hypo(1, 5, 2, 'b').hypo(3, 2, 2, 'b').hypo(3, 5, 7, 'b').f('…o así. Nada diría cuál: el sudoku tendría DOS soluciones.');
  b.clearHypo().f('Pero un sudoku bien hecho tiene una sola solución. Esto es un patrón mortal: hay que evitarlo.');
  if (!plus) {
    b.tone(3, 5, 'focus').ring(3, 5, 5, 'c').f('La única salida es esta casilla: tiene un número extra, el 5.');
    b.strike(3, 5, 2, 7).tone(3, 5, 'elim').f('Así que aquí no puede ser 2 ni 7…');
    b.s(3, 5, { v: 5, ring: undefined, tone: 'conf' }).f('…¡tiene que ser 5! El patrón mortal queda roto.');
  } else {
    b.ring(3, 2, 5, 'c').ring(3, 5, 5, 'c').f('Ahora hay dos casillas con el mismo extra: el 5.');
    b.f('Para escapar del patrón mortal, una de las dos TIENE que ser 5.');
    b.cand(3, 8, [5, 9], 'focus').link(3, 2, 3, 8, 'ray').link(3, 5, 3, 8, 'ray').strike(3, 8, 5).tone(3, 8, 'elim')
      .f('Toda casilla que vea a las dos pierde el 5.');
  }
  return b.done();
}
function bug(): Scene {
  const b = new B(3, 3, false);
  b.given(1, 1, 1).cand(1, 2, [3, 8]).given(1, 3, 2).given(2, 1, 4).cand(2, 2, [3, 5, 8]).given(2, 3, 6).cand(3, 1, [5, 8]).given(3, 2, 7).given(3, 3, 9);
  b.f('Casi al final de un sudoku difícil: todas las casillas vacías tienen 2 candidatos… menos una.');
  b.tone(2, 2, 'focus').f('Si TODAS tuvieran dos, el tablero tendría dos soluciones (se llama BUG). Eso no puede pasar.');
  b.ring(1, 2, 3, 'a').ring(2, 2, 3, 'a').ring(2, 2, 5, 'b').ring(3, 1, 5, 'b').f('Cuenta en la caja: el 3 aparece dos veces, el 5 también…');
  b.ring(1, 2, 8, 'c').ring(2, 2, 8, 'c').ring(3, 1, 8, 'c').f('…pero el 8 aparece TRES veces. Sobra uno.');
  b.s(2, 2, { v: 8, ring: undefined, tone: 'conf' }).f('La casilla de tres opciones debe quedarse con el que sobra: el 8. Así se rompe el BUG.');
  b.s(1, 2, { v: 3, ring: undefined, tone: 'conf' }).s(3, 1, { v: 5, ring: undefined, tone: 'conf' }).f('Y el resto cae solo: 3 y 5. Una sola solución.');
  return b.done();
}

// ---------- Coloreado ----------
function simpleColoring(): Scene {
  const b = new B(); const d = 3;
  [[1, 1], [1, 7], [6, 7], [6, 3], [5, 1], [8, 5], [3, 5]].forEach(([r, c]) => b.cand(r, c, [d]));
  b.f('Seguimos al 3. Cuando solo tiene dos sitios en una zona, uno es verdad y el otro no.');
  b.ring(1, 1, d, 'a').ring(1, 7, d, 'b').band('r', 0).link(1, 1, 1, 7, 'strong').f('Fila 1: dos sitios. Los pintamos de azul y rosa: si uno es el 3, el otro no.');
  b.noBands().band('c', 6).ring(6, 7, d, 'a').link(1, 7, 6, 7, 'strong').f('Columna 7: dos sitios. Alternamos el color.');
  b.noBands().band('r', 5).ring(6, 3, d, 'b').link(6, 7, 6, 3, 'strong').f('Fila 6: otra vez.');
  b.noBands().f('O todos los azules son el 3, o todos los rosas. Aún no sabemos cuál.');
  b.tone(5, 1, 'focus').link(1, 1, 5, 1, 'ray').link(6, 3, 5, 1, 'ray').strike(5, 1, d).tone(5, 1, 'elim')
    .f('Esta casilla ve un azul y un rosa: uno de los dos es el 3 seguro. Aquí no cabe.');
  return b.done();
}
function multiColoring(): Scene {
  const b = new B(); const d = 3;
  [[1, 1], [1, 5], [2, 6], [8, 6], [8, 1], [5, 3]].forEach(([r, c]) => b.cand(r, c, [d]));
  b.ring(1, 1, d, 'a').ring(1, 5, d, 'b').link(1, 1, 1, 5, 'strong').f('Un grupo de colores sobre el 3: azul y rosa.');
  b.ring(2, 6, d, 'c').ring(8, 6, d, 'd').link(2, 6, 8, 6, 'strong').f('Otro grupo, separado: verde y naranja.');
  b.link(1, 5, 2, 6, 'weak').f('El rosa y el verde están en la misma caja: no pueden ser el 3 los dos.');
  b.f('Así que el azul o el naranja tiene que ser verdad (al menos uno).');
  b.tone(8, 1, 'focus').link(1, 1, 8, 1, 'ray').link(8, 6, 8, 1, 'ray').strike(8, 1, d).tone(8, 1, 'elim')
    .f('Esta casilla ve al azul y al naranja: no puede ser 3.');
  return b.done();
}
function medusa(): Scene {
  const b = new B();
  b.cand(2, 2, [4, 7], 'focus').f('Medusa colorea varios números a la vez. Empezamos en una casilla con 4 o 7.');
  b.ring(2, 2, 4, 'a').ring(2, 2, 7, 'b').f('Dentro de la casilla: si el 4 es azul, el 7 es rosa (solo uno es verdad).');
  b.cand(6, 2, [4, 9]).ring(6, 2, 4, 'b').link(2, 2, 6, 2, 'strong', 4, 4).band('c', 1).f('El 4 solo tiene dos sitios en la columna 2: el otro lleva el color contrario.');
  b.noBands().ring(6, 2, 9, 'a').f('Esa casilla es 4 o 9: el 9 se pinta al revés que su 4.');
  b.cand(6, 8, [7, 9]).ring(6, 8, 9, 'b').ring(6, 8, 7, 'a').link(6, 2, 6, 8, 'strong', 9, 9).f('El 9 de la fila 6 salta a otra casilla, y dentro de ella el 7 cambia de color.');
  b.cand(2, 8, [1, 7], 'focus').link(2, 2, 2, 8, 'ray', 7, 7).link(6, 8, 2, 8, 'ray', 7, 7).strike(2, 8, 7).tone(2, 8, 'elim')
    .f('Esta casilla ve un 7 rosa y un 7 azul: uno de ellos es verdad. Aquí no cabe el 7.');
  return b.done();
}

// ---------- Cadenas ----------
function xChain(): Scene {
  const b = new B(); const d = 5;
  [[2, 2], [6, 2], [6, 7], [3, 7], [3, 3], [8, 5]].forEach(([r, c]) => b.cand(r, c, [d]));
  b.f('Una cadena salta de casilla en casilla siguiendo un mismo número: el 5.');
  b.ring(2, 2, d, 'a').ring(6, 2, d, 'a').link(2, 2, 6, 2, 'strong').f('Enlace FUERTE (línea continua): en la columna 2 solo hay dos sitios. Si arriba no es 5, abajo sí.');
  b.ring(6, 7, d, 'b').link(6, 2, 6, 7, 'weak').f('Enlace DÉBIL (discontinua): se ven, así que no pueden ser 5 las dos.');
  b.ring(3, 7, d, 'a').link(6, 7, 3, 7, 'strong').f('Otro fuerte en la columna 7.');
  b.tone(2, 2, 'block').tone(6, 2, 'conf').tone(6, 7, 'block').tone(3, 7, 'conf').f('Sigue la pista: si el primero NO es 5 → el 2º sí → el 3º no → el último SÍ.');
  b.tone(2, 2).tone(6, 2).tone(6, 7).tone(3, 7).ring(2, 2, d, 'conf').ring(3, 7, d, 'conf').f('Conclusión: uno de los dos extremos es el 5, seguro.');
  b.tone(3, 3, 'focus').link(2, 2, 3, 3, 'ray').link(3, 7, 3, 3, 'ray').strike(3, 3, d).tone(3, 3, 'elim')
    .f('Esta casilla ve a los dos extremos: no puede ser 5.');
  return b.done();
}
function xyChain(): Scene {
  const b = new B();
  b.cand(1, 1, [1, 2], 'pat').cand(1, 5, [2, 3]).cand(4, 5, [3, 4]).cand(4, 9, [1, 4], 'pat')
    .link(1, 1, 1, 5, 'weak').link(1, 5, 4, 5, 'weak').link(4, 5, 4, 9, 'weak').f('Una cadena de casillas con solo dos opciones. Cada una ve a la siguiente.');
  b.hypo(1, 1, 2, 'a').f('Si la primera NO es 1, es 2…');
  b.hypo(1, 5, 3, 'a').f('…entonces la siguiente no puede ser 2: es 3…');
  b.hypo(4, 5, 4, 'a').f('…la siguiente, 4…');
  b.hypo(4, 9, 1, 'a').f('…y la última es 1.');
  b.clearHypo().ring(1, 1, 1, 'conf').ring(4, 9, 1, 'conf').f('O sea: siempre hay un 1 en uno de los dos extremos.');
  b.cand(1, 9, [1, 6], 'focus').link(1, 1, 1, 9, 'ray').link(4, 9, 1, 9, 'ray').strike(1, 9, 1).tone(1, 9, 'elim')
    .f('La casilla que ve a los dos extremos pierde el 1.');
  return b.done();
}
function aic(): Scene {
  const b = new B();
  b.cand(1, 1, [6, 8]).cand(6, 1, [1, 6]).cand(6, 5, [1, 6]).cand(3, 5, [6, 9]).cand(3, 3, [2, 6]);
  b.f('Una AIC mezcla números y casillas. Solo hay que alternar: fuerte, débil, fuerte…');
  b.ring(1, 1, 6, 'a').ring(6, 1, 6, 'a').link(1, 1, 6, 1, 'strong', 6, 6).f('Fuerte: el 6 solo tiene dos sitios en la columna 1.');
  b.ring(6, 1, 1, 'b').f('Débil, dentro de una casilla: si es 6, no es 1.');
  b.ring(6, 5, 1, 'b').link(6, 1, 6, 5, 'strong', 1, 1).f('Fuerte: el 1 solo tiene dos sitios en la fila 6.');
  b.ring(6, 5, 6, 'a').f('Débil, otra vez dentro de la casilla: si es 1, no es 6.');
  b.ring(3, 5, 6, 'a').link(6, 5, 3, 5, 'strong', 6, 6).f('Y fuerte: el 6 solo tiene dos sitios en la columna 5.');
  b.ring(1, 1, 6, 'conf').ring(3, 5, 6, 'conf').f('Empieza y acaba en enlace fuerte: uno de los dos extremos es el 6.');
  b.tone(3, 3, 'focus').link(1, 1, 3, 3, 'ray', 6, 6).link(3, 5, 3, 3, 'ray', 6, 6).strike(3, 3, 6).tone(3, 3, 'elim')
    .f('Esta casilla ve a ambos extremos: fuera el 6.');
  return b.done();
}

const BUILD: Record<string, () => Scene> = {
  rules, candidates: () => nakedSingle(true), naked_single: () => nakedSingle(), hidden_single: hiddenSingle,
  pointing, claiming,
  naked_pair: () => nakedSubset(2), naked_triple: () => nakedSubset(3), naked_quad: () => nakedSubset(4),
  hidden_pair: () => hiddenSubset(2), hidden_triple: () => hiddenSubset(3), hidden_quad: () => hiddenSubset(4),
  x_wing: () => fish(2), swordfish: () => fish(3), jellyfish: () => fish(4), finned_fish: finned,
  y_wing: yWing, xyz_wing: xyzWing, w_wing: wWing,
  unique_rect1: () => ur(false), unique_rect_plus: () => ur(true), bug1: bug,
  simple_coloring: simpleColoring, multi_coloring: multiColoring, medusa,
  x_chain: xChain, xy_chain: xyChain, aic,
};
const cache: Record<string, Scene> = {};
export function sceneFor(id: string): Scene | null {
  if (!BUILD[id]) return null;
  return (cache[id] ??= BUILD[id]());
}
export const SCENE_IDS = Object.keys(BUILD);
