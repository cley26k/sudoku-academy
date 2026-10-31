import React, { useMemo, useState } from 'react';
import { LEVELS, puzzleForLevel, dailyPuzzle, FullPuzzle, restrictedPuzzle } from '../bank';
import type { TechId } from '../../engine/step';
import { UNITS_MAP } from '../../content/catalog';
import { celebrate } from '../ui/common';
import { SudokuPlayer } from '../ui/SudokuPlayer';
import { Icon, I } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { stateFromValues } from '../../engine/grid';
import { update, dayKey, recordAttempt } from '../store';
import { go } from '../router';

const COLORS = ['green', 'blue', 'orange', 'red'];

export function Play({ daily }: { daily?: boolean }) {
  const [pz, setPz] = useState<FullPuzzle | null>(null);
  const [lv, setLv] = useState('media');
  const [n, setN] = useState(0);
  const today = dayKey(Date.now());
  const dailyPz = useMemo(() => (daily ? dailyPuzzle(today) : null), [daily, today]);
  const cur = daily ? dailyPz : pz;
  const start = (l: string) => { setLv(l); setPz(puzzleForLevel(l)); setN(x => x + 1); };

  if (!cur) return (
    <div className="play-pick">
      <div className="tc-head"><Tesela mood="happy" size={84} /><h1>Elige un nivel</h1></div>
      <div className="level-grid">
        {LEVELS.map((l, i) => (
          <button key={l.id} className={`level-card c-${COLORS[i]}`} onClick={() => start(l.id)}>
            <span className="lv-stars">{'★'.repeat(i + 1)}</span>
            <b>{l.label}</b>
            <small>{l.blurb}</small>
          </button>
        ))}
        <button className="level-card c-purple" onClick={() => go('sudoku-diario')}><Icon d={I.calendar} size={30} /><b>Reto diario</b><small>Uno nuevo cada día</small></button>
      </div>
    </div>
  );
  return (
    <div className="playpage">
      <div className="train-bar">
        <button className="ltop-x" onClick={() => (daily ? go('sudoku') : setPz(null))} aria-label="Volver"><Icon d={I.back} size={22} stroke={2.6} /></button>
        <div className="tb-techs"><span className="chip">{daily ? `Reto ${today}` : LEVELS.find(l => l.id === lv)?.label}</span></div>
      </div>
      <SudokuPlayer key={cur.id + n} initial={stateFromValues(cur.givens)} givens={cur.givens.map(x => x > 0)} solution={cur.solution} allowed="all" autoCands={!daily && lv !== 'facil'}
        onComplete={r => {
          update(pp => { pp.fullSolved++; if (daily) pp.daily[today] = { done: true, ms: r.ms }; });
          recordAttempt({ tech: cur.hardest ?? 'naked_single', kind: 'full', ok: true, hints: r.hints, errors: r.mistakes, ms: r.ms, variant: '', exId: '' });
        }}
        onNext={daily ? () => go('sudoku') : () => start(lv)} nextLabel={daily ? 'Más sudokus' : 'Otro'} />
    </div>
  );
}

/** Prueba de unidad: sudoku completo que se resuelve con lo aprendido y necesita técnicas de esta unidad. */
export function UnitTest({ unit, allowed, require }: { unit: number; allowed: TechId[]; require: TechId[] }) {
  const [n, setN] = useState(0);
  const r = useMemo(() => restrictedPuzzle(allowed, require), [n]);
  const u = UNITS_MAP.find(x => x.n === unit)!;
  return (
    <div className={`playpage c-${u.color}`}>
      <div className="train-bar">
        <button className="ltop-x" onClick={() => go('inicio')} aria-label="Volver"><Icon d={I.back} size={22} stroke={2.6} /></button>
        <div className="tb-techs"><span className="chip chip-unit">Prueba · {u.title}</span></div>
      </div>
      {!r.puzzle ? <div className="empty-state"><Tesela mood="oops" size={110} /><p>No encontré un sudoku para esta prueba.</p></div> : (
        <SudokuPlayer key={r.puzzle.id + n} initial={stateFromValues(r.puzzle.givens)} givens={r.puzzle.givens.map(x => x > 0)} solution={r.puzzle.solution} allowed={allowed}
          intro={`Prueba de la unidad ${unit}. Se resuelve solo con lo que ya sabes.`}
          onComplete={res => { update(pp => { pp.fullSolved++; }); celebrate(); for (const t of res.used.filter(x => require.includes(x))) recordAttempt({ tech: t, kind: 'full', ok: true, hints: res.hints, errors: res.mistakes, ms: res.ms, variant: '', exId: '' }); }}
          onNext={() => setN(x => x + 1)} nextLabel="Otra prueba" />
      )}
    </div>
  );
}
