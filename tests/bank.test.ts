import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { instantiate, Bank } from '../src/engine/exercise';
import { parseGrid } from '../src/engine/grid';
import { countSolutions } from '../src/engine/bruteforce';
import { solveHuman } from '../src/engine/solver';
import { restrictedPuzzle } from '../src/app/bank';
import { nonDegenerate } from '../scripts/mine-rare';

const bank: Bank = JSON.parse(readFileSync(new URL('../src/data/bank.json', import.meta.url), 'utf8'));

test('banco: cada sudoku tiene solución única y coincide con la guardada', () => {
  for (const p of bank.puzzles) {
    const out = new Array(81).fill(0);
    assert.equal(countSolutions(parseGrid(p.g), 2, out), 1);
    assert.equal(out.join(''), p.s);
  }
});

test('banco: cada ejercicio es válido, estricto y coherente con la solución (original y transformado; las técnicas raras, no degeneradas)', () => {
  for (let i = 0; i < bank.ex.length; i++) {
    for (const seed of [0, 1000 + i]) {
      const ex = instantiate(bank, i, seed, true);
      assert.ok(ex, `ejercicio ${i} (${bank.ex[i].t}) no verifica con semilla ${seed}`);
      if (bank.ex[i].ns) assert.ok(nonDegenerate(bank.ex[i].t, ex!.state), `ejercicio ${i} (${bank.ex[i].t}) degenerado`);
      else assert.ok(ex!.strict, `ejercicio ${i} (${bank.ex[i].t}) no es el paso más sencillo`);
      assert.equal(ex!.tech, bank.ex[i].t);
    }
  }
});

test('modo restringido: el sudoku elegido se resuelve solo con las técnicas permitidas', () => {
  for (const allowed of [['pointing', 'claiming'], ['x_wing'], ['y_wing', 'naked_pair'], []] as never[][]) {
    const r = restrictedPuzzle(allowed);
    assert.ok(r.puzzle, `sin sudoku para ${allowed}`);
    const s = solveHuman(r.puzzle!.givens, allowed);
    assert.ok(s.solved);
    for (const t of s.used) assert.ok(['naked_single', 'hidden_single', ...allowed].includes(t as never));
  }
});
