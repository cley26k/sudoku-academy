import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL, cellAt, State, bit, stateFromValues, parseGrid, UNITS, sees, PEERS, encodeCands, decodeCands } from '../src/engine/grid';
import { countSolutions, solveUnique } from '../src/engine/bruteforce';
import { makePuzzle } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/random';
import { solveHuman, applyStep, nextStep } from '../src/engine/solver';
import { TECH_BY_ID } from '../src/engine/techniques';
import { randomTransform, mapState, mapValues } from '../src/engine/transform';
import { findFish } from '../src/engine/techniques/fish';
import { findYWing, findXYZWing, findWWing } from '../src/engine/techniques/wings';
import { findNakedSubsets, findHiddenSubsets } from '../src/engine/techniques/subsets';
import { findPointing, findClaiming } from '../src/engine/techniques/intersections';
import { findUniqueRect1 } from '../src/engine/techniques/uniqueness';
import { findSimpleColoring } from '../src/engine/techniques/coloring';
import { findHiddenSingles, findNakedSingles } from '../src/engine/techniques/singles';
import { gradeEliminations, gradePlacement, gradeRecognition, LiveExercise } from '../src/engine/exercise';

// Estado sintético: todas las casillas vacías con todos los candidatos.
const blank = (): State => ({ v: new Array(81).fill(0), c: new Array(81).fill(ALL) });
const rm = (s: State, cells: number[], d: number) => cells.forEach(c => (s.c[c] &= ~bit(d)));
const keys = (xs: { cell: number; digit: number }[]) => xs.map(x => x.cell * 10 + x.digit).sort((a, b) => a - b);

const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';

test('reglas: unidades, vecinos y cuadrícula', () => {
  assert.equal(UNITS.length, 27);
  assert.ok(PEERS.every(p => p.length === 20));
  assert.ok(sees(0, 8) && sees(0, 72) && sees(0, 20) && !sees(0, 30));
  const c = new Array(81).fill(0).map((_, i) => (i * 7) % 512 << 1);
  assert.deepEqual(decodeCands(encodeCands(c)), c);
});

test('fuerza bruta: solución única del clásico', () => {
  const g = parseGrid(EASY);
  assert.equal(countSolutions(g, 2), 1);
  const sol = solveUnique(g)!;
  assert.equal(sol.slice(0, 9).join(''), '534678912');
});

test('generador: sudokus con solución única', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 15; i++) {
    const { givens, solution } = makePuzzle(rng);
    assert.equal(countSolutions(givens, 2), 1);
    givens.forEach((d, k) => d && assert.equal(d, solution[k]));
  }
});

test('solver humano: resuelve el clásico solo con singles', () => {
  const r = solveHuman(parseGrid(EASY));
  assert.ok(r.solved);
  assert.ok([...r.used].every(t => t === 'naked_single' || t === 'hidden_single'));
  assert.deepEqual(r.final.v, solveUnique(parseGrid(EASY)));
});

test('solidez: ninguna deducción contradice la solución (150 sudokus aleatorios)', () => {
  const rng = mulberry32(99);
  for (let i = 0; i < 150; i++) {
    const { givens, solution } = makePuzzle(rng, i % 2 === 0);
    let s = stateFromValues(givens);
    for (let k = 0; k < 200; k++) {
      // Comprobar TODAS las instancias de TODAS las técnicas, no solo la elegida
      for (const id of Object.keys(TECH_BY_ID) as (keyof typeof TECH_BY_ID)[]) {
        for (const st of TECH_BY_ID[id].find(s)) {
          for (const e of st.elims) assert.notEqual(solution[e.cell], e.digit, `${id} elimina la solución: ${st.title}`);
          for (const p of st.placements) assert.equal(solution[p.cell], p.digit, `${id} coloca mal: ${st.title}`);
          assert.ok(st.elims.length + st.placements.length > 0, `${id} sin efecto`);
          for (const e of st.elims) assert.ok(s.c[e.cell] & bit(e.digit), `${id} elimina un candidato inexistente`);
        }
      }
      const st = nextStep(s);
      if (!st) break;
      s = applyStep(s, st);
      if (s.v.every(x => x)) break;
    }
  }
});

test('single desnudo y oculto', () => {
  const s = blank();
  s.c[40] = bit(5);
  const ns = findNakedSingles(s);
  assert.equal(ns.length, 1); assert.deepEqual(ns[0].placements, [{ cell: 40, digit: 5 }]);
  const h = blank();
  rm(h, UNITS[18].filter(c => c !== 10), 3);
  const hs = findHiddenSingles(h);
  assert.ok(hs.some(x => x.placements[0].cell === 10 && x.placements[0].digit === 3 && x.variant === 'box'));
});

test('pointing y claiming', () => {
  const s = blank();
  // En la caja 1, el 4 solo en la fila 1 (celdas 0,1)
  rm(s, UNITS[18].filter(c => c !== 0 && c !== 1), 4);
  const p = findPointing(s).find(x => x.digits[0] === 4)!;
  assert.ok(p);
  assert.deepEqual(keys(p.elims), keys([2, 3, 4, 5, 6, 7, 8].map(c => ({ cell: c, digit: 4 }))).filter(k => k !== 24));
  const t = blank();
  // En la fila 5, el 7 solo en la caja 5 (columnas 4,5)
  rm(t, UNITS[4].filter(c => ![cellAt(4, 4), cellAt(4, 5)].includes(c)), 7);
  const cl = findClaiming(t).find(x => x.digits[0] === 7 && x.pattern.cells.includes(cellAt(4, 4)))!;
  assert.ok(cl);
  assert.equal(cl.elims.length, 6);
  assert.ok(cl.elims.every(e => e.cell !== cellAt(4, 3) && Math.floor(e.cell / 9) !== 4));
});

test('par desnudo y par oculto', () => {
  const s = blank();
  s.c[0] = bit(1) | bit(2); s.c[5] = bit(1) | bit(2);
  const np = findNakedSubsets(s, 2).find(x => x.pattern.cells.join() === '0,5')!;
  assert.ok(np);
  assert.equal(np.elims.length, 14); // 7 casillas de la fila x 2 dígitos
  const h = blank();
  rm(h, UNITS[0].filter(c => c !== 2 && c !== 6), 8);
  rm(h, UNITS[0].filter(c => c !== 2 && c !== 6), 9);
  const hp = findHiddenSubsets(h, 2).find(x => x.pattern.cells.join() === '2,6')!;
  assert.ok(hp);
  assert.deepEqual(hp.digits, [8, 9]);
  assert.equal(hp.elims.length, 14); // 7 candidatos sobrantes en cada casilla
});

test('X-Wing en filas', () => {
  const s = blank();
  for (const r of [1, 6]) rm(s, UNITS[r].filter(c => c % 9 !== 2 && c % 9 !== 7), 4);
  const xw = findFish(s, 2).find(x => x.digits[0] === 4 && x.variant === 'row')!;
  assert.ok(xw);
  assert.equal(xw.elims.length, 14);
  assert.ok(xw.elims.every(e => [2, 7].includes(e.cell % 9) && ![1, 6].includes(Math.floor(e.cell / 9))));
  assert.match(xw.whyNot!(cellAt(3, 3), 4)!, /no está en las columnas/);
  assert.match(xw.whyNot!(cellAt(1, 2), 4)!, /filas base/);
});

test('Swordfish en columnas', () => {
  const s = blank();
  const rowsAllowed = [[0, 4], [4, 8], [0, 8]];
  [1, 3, 5].forEach((col, i) => rm(s, UNITS[9 + col].filter(c => !rowsAllowed[i].includes(Math.floor(c / 9))), 6));
  const sf = findFish(s, 3).find(x => x.digits[0] === 6 && x.variant === 'col')!;
  assert.ok(sf);
  assert.ok(sf.elims.every(e => [0, 4, 8].includes(Math.floor(e.cell / 9)) && ![1, 3, 5].includes(e.cell % 9)));
  assert.equal(sf.elims.length, 18);
});

test('Y-Wing, XYZ-Wing y W-Wing', () => {
  const s = blank();
  const P = cellAt(4, 4), X = cellAt(4, 0), Y = cellAt(0, 4);
  s.c[P] = bit(1) | bit(2); s.c[X] = bit(1) | bit(3); s.c[Y] = bit(2) | bit(3);
  const yw = findYWing(s).find(x => x.pattern.cells[0] === P)!;
  assert.ok(yw);
  assert.deepEqual(keys(yw.elims), [cellAt(0, 0) * 10 + 3]);
  const t = blank();
  const P2 = cellAt(0, 0), X2 = cellAt(0, 5), Y2 = cellAt(1, 1);
  t.c[P2] = bit(1) | bit(2) | bit(3); t.c[X2] = bit(1) | bit(3); t.c[Y2] = bit(2) | bit(3);
  const xyz = findXYZWing(t).find(x => x.pattern.cells[0] === P2)!;
  assert.ok(xyz);
  assert.deepEqual(keys(xyz.elims), keys([1, 2].map(c => ({ cell: c, digit: 3 }))));
  const w = blank();
  const A = cellAt(0, 0), B = cellAt(8, 8);
  w.c[A] = bit(5) | bit(6); w.c[B] = bit(5) | bit(6);
  // Enlace fuerte del 6 en la fila 5: solo en (4,0) y (4,8)
  rm(w, UNITS[4].filter(c => c !== cellAt(4, 0) && c !== cellAt(4, 8)), 6);
  const ww = findWWing(w).find(x => x.digits[0] === 5)!;
  assert.ok(ww);
  assert.deepEqual(keys(ww.elims), keys([cellAt(0, 8), cellAt(8, 0)].map(c => ({ cell: c, digit: 5 }))));
});

test('Rectángulo único tipo 1', () => {
  const s = blank();
  const a = cellAt(0, 0), b = cellAt(0, 4), c = cellAt(1, 0), d = cellAt(1, 4);
  s.c[a] = s.c[b] = s.c[c] = bit(3) | bit(8);
  s.c[d] = bit(3) | bit(8) | bit(1);
  const ur = findUniqueRect1(s).find(x => x.pattern.cells.includes(d))!;
  assert.ok(ur);
  assert.deepEqual(keys(ur.elims), keys([{ cell: d, digit: 3 }, { cell: d, digit: 8 }]));
});

test('Coloreado simple: trampa', () => {
  const s = blank();
  // Cadena del 2: (0,0)-(0,6) fila 1, (0,6)-(6,6) columna 7, (6,6)-(6,1) fila 7
  rm(s, UNITS[0].filter(c => c !== cellAt(0, 0) && c !== cellAt(0, 6)), 2);
  rm(s, UNITS[9 + 6].filter(c => c !== cellAt(0, 6) && c !== cellAt(6, 6)), 2);
  rm(s, UNITS[6].filter(c => c !== cellAt(6, 6) && c !== cellAt(6, 1)), 2);
  const sc = findSimpleColoring(s).find(x => x.digits[0] === 2 && x.variant === 'trap')!;
  assert.ok(sc);
  // (0,0) y (6,1) tienen colores opuestos; las casillas que ven a ambas pierden el 2
  const A = [cellAt(0, 0), cellAt(6, 6)], B = [cellAt(0, 6), cellAt(6, 1)];
  for (const e of sc.elims) assert.ok(A.some(a => sees(a, e.cell)) && B.some(b => sees(b, e.cell)));
  assert.ok(sc.elims.some(e => e.cell === cellAt(7, 0)));
  assert.ok(sc.elims.some(e => e.cell === cellAt(1, 1)));
});

test('transformaciones preservan soluciones y deducciones', () => {
  const rng = mulberry32(3);
  const { givens, solution } = makePuzzle(rng);
  const t = randomTransform(rng);
  const g2 = mapValues(t, givens);
  assert.deepEqual(solveUnique(g2), mapValues(t, solution));
  const r1 = solveHuman(givens), r2 = solveHuman(g2);
  assert.equal(r1.solved, r2.solved);
  const s = mapState(t, stateFromValues(givens));
  assert.deepEqual(s.c, stateFromValues(g2).c);
});

function liveFrom(s: State, solution: number[], tech: keyof typeof TECH_BY_ID): LiveExercise {
  return { id: 't', tech, state: s, givens: s.v.map(x => x > 0), solution, steps: TECH_BY_ID[tech].find(s), strict: true, difficulty: 1, pure: false, variant: '', puzzleIndex: 0 };
}

test('evaluación: eliminaciones correctas, parciales e injustificadas', () => {
  const s = blank();
  for (const r of [1, 6]) rm(s, UNITS[r].filter(c => c % 9 !== 2 && c % 9 !== 7), 4);
  const sol = new Array(81).fill(1); // solución ficticia sin 4 en las eliminaciones
  const ex = liveFrom(s, sol, 'x_wing');
  const elims = ex.steps.find(x => x.variant === 'row')!.elims;
  assert.equal(gradeEliminations(ex, elims).status, 'correct');
  assert.equal(gradeEliminations(ex, elims.slice(0, 3)).status, 'partial');
  const bad = gradeEliminations(ex, [...elims.slice(0, 2), { cell: cellAt(3, 3), digit: 4 }]);
  assert.equal(bad.status, 'wrong');
  assert.equal(bad.wrong!.length, 1);
  assert.equal(gradeEliminations(ex, []).status, 'empty');
  assert.equal(gradeRecognition(ex, [cellAt(1, 2), cellAt(1, 7), cellAt(6, 2), cellAt(6, 7)]).status, 'correct');
  assert.equal(gradeRecognition(ex, [cellAt(1, 2), cellAt(1, 7)]).status, 'partial');
});

test('evaluación de colocaciones: distingue número correcto de deducción válida', () => {
  const g = parseGrid(EASY);
  const sol = solveUnique(g)!;
  const s = stateFromValues(g);
  const ex = liveFrom(s, sol, 'naked_single');
  const st = ex.steps[0];
  const p = st.placements[0];
  assert.equal(gradePlacement(ex, p.cell, p.digit).status, 'correct');
  // Un número correcto en una casilla que todavía no está determinada
  const undetermined = s.v.findIndex((v, i) => !v && s.c[i] && (s.c[i] & (s.c[i] - 1)) && !findHiddenSingles(s).some(h => h.placements[0].cell === i));
  assert.equal(gradePlacement(ex, undetermined, sol[undetermined]).status, 'unjustified');
  const wrongDigit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => d !== sol[p.cell])!;
  assert.equal(gradePlacement(ex, p.cell, wrongDigit).status, 'wrong');
});
