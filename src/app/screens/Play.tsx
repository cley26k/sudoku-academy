import React, { useMemo, useState } from 'react';
import { LEVELS, puzzleForLevel, dailyPuzzle, FullPuzzle } from '../bank';
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
