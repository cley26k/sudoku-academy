import React, { useEffect, useMemo, useState } from 'react';
import { LEVELS, puzzleForLevel, dailyPuzzle, FullPuzzle, restrictedPuzzle } from '../bank';
import type { TechId } from '../../engine/step';
import { UNITS_MAP } from '../../content/catalog';
import { celebrate } from '../ui/common';
import { SudokuPlayer, SavedGame, fmt } from '../ui/SudokuPlayer';
import { Icon, I } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { stateFromValues } from '../../engine/grid';
import { update, dayKey, recordAttempt, useProgress } from '../store';
import { go } from '../router';
import { ConfirmSheet } from '../ui/layout';

const COLORS = ['green', 'blue', 'orange', 'red'];

// ---- Partidas guardadas (una libre y la del reto de cada día) ----
interface Stored { pz: FullPuzzle; lv: string; game: SavedGame }
const SAVE_KEY = (slot: string) => `sudoku-academy/game/${slot}`;
function loadGame(slot: string): Stored | null {
  try { const raw = localStorage.getItem(SAVE_KEY(slot)); return raw ? JSON.parse(raw) as Stored : null; } catch { return null; }
}
function storeGame(slot: string, s: Stored | null) {
  try { if (s) localStorage.setItem(SAVE_KEY(slot), JSON.stringify(s)); else localStorage.removeItem(SAVE_KEY(slot)); } catch { /* sin almacenamiento */ }
}
const dateLabel = (t: number) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'long' });

export function Play({ daily }: { daily?: boolean }) {
  const p = useProgress();
  const today = dayKey(Date.now());
  const slot = daily ? `daily-${today}` : 'free';
  const [stored, setStored] = useState<Stored | null>(() => loadGame(slot));
  const [pz, setPz] = useState<FullPuzzle | null>(null);
  const [lv, setLv] = useState('media');
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [resume, setResume] = useState<SavedGame | null>(() => (daily ? loadGame(slot)?.game ?? null : null));
  const dailyPz = useMemo(() => (daily ? dailyPuzzle(today) : null), [daily, today]);
  const dailyDone = p.daily[today]?.done;
  const [replay, setReplay] = useState(false);
  const [askNew, setAskNew] = useState<string | null>(null);
  const [doneOnEntry] = useState(!!dailyDone);
  const cur = daily ? dailyPz : pz;

  // Las partidas de retos de días anteriores ya no se pueden continuar: se borran.
  useEffect(() => {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith(SAVE_KEY('daily-')) && k !== SAVE_KEY(`daily-${today}`)) localStorage.removeItem(k); } catch { /* sin almacenamiento */ }
  }, [today]);

  // Generar un sudoku difícil puede tardar: se muestra «Preparando…» y se calcula en el siguiente fotograma.
  const start = (l: string) => {
    setBusy(l);
    window.setTimeout(() => { const np = puzzleForLevel(l); storeGame(slot, null); setStored(null); setResume(null); setLv(l); setPz(np); setN(x => x + 1); setBusy(null); window.scrollTo({ top: 0 }); }, 30);
  };
  const cont = () => { if (!stored) return; setLv(stored.lv); setPz(stored.pz); setResume(stored.game); setN(x => x + 1); };
  const onSave = (g: SavedGame | null) => { if (cur) storeGame(slot, g ? { pz: cur, lv, game: g } : null); };

  if (busy) return <div className="empty-state"><Tesela mood="think" size={110} /><h2>Preparando un sudoku {LEVELS.find(l => l.id === busy)?.label.toLowerCase()}…</h2></div>;

  if (!cur) return (
    <div className="play-pick">
      <div className="tc-head"><Tesela mood="happy" size={84} /><h1>Elige un nivel</h1></div>
      {stored && (
        <button className="level-card c-teal continue-card" onClick={cont}>
          <Icon d={I.play} size={28} />
          <span><b>Continuar partida</b><small>{LEVELS.find(l => l.id === stored.lv)?.label} · {fmt(stored.game.ms)} jugados</small></span>
        </button>
      )}
      <div className="level-grid">
        {LEVELS.map((l, i) => (
          <button key={l.id} className={`level-card c-${COLORS[i]}`} onClick={() => (stored ? setAskNew(l.id) : start(l.id))}>
            <span className="lv-stars" aria-label={`${i + 1} de 4`}>{'★'.repeat(i + 1)}</span>
            <b>{l.label}</b>
            <small>{l.blurb}</small>
          </button>
        ))}
        <button className={`level-card c-purple${dailyDone ? ' done' : ''}`} onClick={() => go('sudoku-diario')}>
          <Icon d={dailyDone ? I.check : I.calendar} size={30} />
          <b>Reto diario</b>
          <small>{dailyDone ? `Hecho hoy en ${fmt(p.daily[today].ms)}` : 'Uno nuevo cada día'}</small>
        </button>
      </div>
      {askNew && <ConfirmSheet title="¿Empezar un sudoku nuevo?" text="Perderás la partida que tienes a medias." stay="Seguir con la mía" leave="Empezar nuevo"
        onStay={() => { setAskNew(null); cont(); }} onLeave={() => { const l = askNew; setAskNew(null); start(l); }} />}
    </div>
  );

  const bar = (
    <>
      <button className="ltop-x" onClick={() => { if (daily) go('sudoku'); else { setPz(null); setStored(loadGame(slot)); window.scrollTo({ top: 0 }); } }} aria-label="Volver"><Icon d={I.back} size={22} stroke={2.6} /></button>
      <div className="tb-techs"><span className="chip">{daily ? `Reto del ${dateLabel(Date.now())}` : LEVELS.find(l => l.id === lv)?.label}</span></div>
    </>
  );

  // El reto diario cuenta una sola vez: si ya está hecho, se muestra el resultado (y se puede repetir sin premio).
  if (daily && doneOnEntry && !replay) return (
    <div className="playpage"><div className="train-bar">{bar}</div>
      <div className="empty-state">
        <Tesela mood="happy" size={110} />
        <h2>¡Reto de hoy completado!</h2>
        <p className="muted">Lo resolviste en {fmt(p.daily[today].ms)}. Mañana tendrás uno nuevo.</p>
        <div className="row-actions">
          <button className="btn btn-ghost btn-big" onClick={() => setReplay(true)}><span>Repetir sin premio</span></button>
          <button className="btn btn-primary btn-big" onClick={() => go('sudoku')}><span>Más sudokus</span></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="playpage">
      <SudokuPlayer bar={bar} practice={daily && replay} key={cur.id + n + (replay ? 'r' : '')} initial={stateFromValues(cur.givens)} givens={cur.givens.map(x => x > 0)} solution={cur.solution} allowed="all"
        autoCands={!daily && lv !== 'facil'} saved={replay ? null : resume} onSave={replay ? undefined : onSave}
        onComplete={r => {
          if (daily && (replay || dailyDone)) return;
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
