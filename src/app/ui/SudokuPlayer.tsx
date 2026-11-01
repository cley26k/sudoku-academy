import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { State } from '../../engine/grid';
import { basicCands, has, BOX_UNIT, unitName, cellName } from '../../engine/grid';
import type { TechId, Step, Overlay } from '../../engine/step';
import { nextStep, solveHuman } from '../../engine/solver';
import { TECH_BY_ID } from '../../engine/techniques';
import { Board } from './Board';
import { TutorBubble, Mood } from './Tutor';
import { Btn, I, Icon, DigitPad, useFrames, FrameControls, celebrate, CoordHint } from './common';
import { BottomBar } from './layout';
import { sfx } from '../sound';

export interface PlayerProps {
  initial: State; givens: boolean[]; solution: number[]; allowed: TechId[] | 'all';
  autoCands?: boolean; hints?: boolean; intro?: string; title?: string;
  onComplete?: (r: { ms: number; mistakes: number; hints: number; used: TechId[] }) => void;
  onNext?: () => void; nextLabel?: string; onMistake?: (note: string) => void;
  /** Partida guardada de la que continuar y aviso de cada cambio (null al terminar). */
  saved?: SavedGame | null; onSave?: (g: SavedGame | null) => void;
  /** Contenido de la barra superior (volver, nivel); el cronómetro se añade a la derecha. */
  bar?: React.ReactNode;
  /** Repetición sin premio: sin celebración y con el aviso correspondiente. */
  practice?: boolean;
}
export interface SavedGame { v: number[]; elims: number[]; notes: number[]; auto: boolean; mistakes: number; counted: number[]; hints: number; ms: number }
interface Snap { v: number[]; elims: number[]; notes: number[] }

/** Cronómetro que solo corre con la pestaña visible y la partida en juego. */
function useClock(startMs: number, running: boolean) {
  const acc = useRef(startMs), since = useRef<number | null>(null);
  const get = () => acc.current + (since.current !== null ? Date.now() - since.current : 0);
  useEffect(() => {
    const pause = () => { if (since.current !== null) { acc.current += Date.now() - since.current; since.current = null; } };
    const resume = () => { if (since.current === null && running && document.visibilityState === 'visible') since.current = Date.now(); };
    const vis = () => (document.visibilityState === 'visible' ? resume() : pause());
    resume(); document.addEventListener('visibilitychange', vis);
    return () => { pause(); document.removeEventListener('visibilitychange', vis); };
  }, [running]);
  return get;
}
function Clock({ get }: { get: () => number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 1000); return () => window.clearInterval(t); }, []);
  return <span className="sp-clock" role="timer" aria-label={`Tiempo ${fmt(get())}`}><Icon d={I.clock} size={16} stroke={2.4} />{fmt(get())}</span>;
}

function Tool({ icon, label, onClick, on, disabled }: { icon: string; label: string; onClick: () => void; on?: boolean; disabled?: boolean }) {
  return <button className={`tool${on ? ' on' : ''}`} onClick={onClick} disabled={disabled} aria-pressed={on}><span className="tool-ico"><Icon d={icon} size={22} stroke={2.2} /></span><span>{label}</span></button>;
}

export function SudokuPlayer(p: PlayerProps) {
  const elims0 = useMemo(() => { const b = basicCands(p.initial.v); const out: number[] = []; for (let i = 0; i < 81; i++) for (let d = 1; d <= 9; d++) if (has(b[i], d) && !has(p.initial.c[i], d)) out.push(i * 10 + d); return out; }, [p.initial]);
  const sv = p.saved;
  const [v, setV] = useState<number[]>(sv?.v.slice() ?? p.initial.v.slice());
  const [elims, setElims] = useState<Set<number>>(new Set(sv?.elims ?? elims0));
  const [notes, setNotes] = useState<number[]>(() => sv?.notes.slice() ?? new Array(81).fill(0));
  const [auto, setAuto] = useState(sv ? sv.auto : p.autoCands !== false);
  const [noteMode, setNoteMode] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [hlD, setHlD] = useState(0);
  const [hist, setHist] = useState<Snap[]>([]);
  const [wrongShown, setWrongShown] = useState<number[]>([]);
  const [hint, setHint] = useState<{ step: Step | null; level: number; wrongCell?: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(sv?.hints ?? 0);
  const [thinking, setThinking] = useState(false);
  const [mistakes, setMistakes] = useState(sv?.mistakes ?? 0);
  // Cada número erróneo (casilla + dígito) cuenta una sola vez, aunque se revise varias veces.
  const counted = useRef(new Set<number>(sv?.counted ?? []));
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [doneMs, setDoneMs] = useState(0);
  const elapsed = useClock(sv?.ms ?? 0, doneAt === null);
  const [review, setReview] = useState<number | null>(null);
  const [demo, setDemo] = useState<Step | null>(null);
  const locked = p.initial.v.map(x => x > 0);

  const basic = useMemo(() => basicCands(v), [v]);
  const shownCands = useMemo(() => {
    if (!auto) return notes;
    const out = basic.slice(); elims.forEach(k => { out[Math.floor(k / 10)] &= ~(1 << (k % 10)); }); return out;
  }, [auto, basic, elims, notes]);
  const counts = useMemo(() => { const c = new Array(10).fill(0); v.forEach(d => d && c[d]++); return c; }, [v]);
  const complete = v.every((d, i) => d === p.solution[i]);

  useEffect(() => {
    if (complete && doneAt === null) {
      const ms = elapsed();
      setDoneAt(Date.now()); setDoneMs(ms); if (!p.practice) { celebrate(); sfx('complete'); }
      p.onSave?.(null);
      p.onComplete?.({ ms, mistakes, hints: hintsUsed, used: [...solveHuman(p.initial, p.allowed).used] });
    }
  }, [complete]);
  // Guarda la partida en cada cambio y al ocultar la pestaña, para continuarla más tarde.
  const save = () => { if (!complete) p.onSave?.({ v, elims: [...elims], notes, auto, mistakes, counted: [...counted.current], hints: hintsUsed, ms: elapsed() }); };
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { if (v.some((d, i) => d !== p.initial.v[i]) || elims.size !== elims0.length || notes.some(Boolean)) save(); }, [v, elims, notes, auto, mistakes, hintsUsed]);
  useEffect(() => { const h = () => { if (document.visibilityState === 'hidden') saveRef.current(); }; document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, []);

  function snap() { setHist(h => [...h.slice(-200), { v: v.slice(), elims: [...elims], notes: notes.slice() }]); }
  function undo() { const s = hist[hist.length - 1]; if (!s) return; setHist(h => h.slice(0, -1)); setV(s.v); setElims(new Set(s.elims)); setNotes(s.notes); }
  function input(d: number, asNote = noteMode) {
    if (doneAt) return;
    if (sel === null || locked[sel]) { setHlD(hlD === d ? 0 : d); return; }
    snap(); setHint(null); setWrongShown([]); setDemo(null);
    if (!asNote) { const nv = v.slice(); nv[sel] = nv[sel] === d ? 0 : d; setV(nv); sfx(nv[sel] ? 'place' : 'erase'); return; }
    sfx('select');
    if (v[sel]) return;
    if (auto) { const k = sel * 10 + d; const n = new Set(elims); if (n.has(k)) n.delete(k); else if (has(basic[sel], d)) n.add(k); setElims(n); }
    else { const n = notes.slice(); n[sel] ^= 1 << d; setNotes(n); }
  }
  function erase() { if (sel === null || locked[sel] || !v[sel]) return; snap(); const nv = v.slice(); nv[sel] = 0; setV(nv); sfx('erase'); }
  function check() {
    const wrong = v.map((d, i) => (d && !locked[i] && d !== p.solution[i] ? i : -1)).filter(i => i >= 0);
    setWrongShown(wrong);
    sfx(wrong.length ? 'wrong' : 'correct');
    const fresh = wrong.filter(i => !counted.current.has(i * 10 + v[i]));
    fresh.forEach(i => counted.current.add(i * 10 + v[i]));
    if (fresh.length) { setMistakes(m => m + fresh.length); p.onMistake?.(`Número incorrecto en ${cellName(fresh[0])}`); }
  }
  function logical(): State {
    const vv = v.map((d, i) => (d === p.solution[i] ? d : 0));
    const c = basicCands(vv);
    elims.forEach(k => { const cell = Math.floor(k / 10), d = k % 10; if (p.solution[cell] !== d) c[cell] &= ~(1 << d); });
    return { v: vv, c };
  }
  function askHint() {
    setDemo(null); sfx('hint');
    if (hint && hint.level < 4 && (hint.step || (hint.wrongCell !== undefined && hint.level < 2))) { setHint({ ...hint, level: hint.level + 1 }); return; }
    setHintsUsed(h => h + 1);
    const wrong = v.findIndex((d, i) => d && !locked[i] && d !== p.solution[i]);
    if (wrong >= 0) { setHint({ step: null, level: 1, wrongCell: wrong }); return; }
    const L = logical();
    setThinking(true);
    window.setTimeout(() => { setHint({ step: nextStep(L, p.allowed), level: 1 }); setThinking(false); }, 30);
  }
  function applyHint() {
    if (!hint?.step) return;
    snap();
    const st = hint.step;
    const nv = v.slice(); st.placements.forEach(q => (nv[q.cell] = q.digit)); setV(nv);
    const n = new Set(elims); st.elims.forEach(e => n.add(e.cell * 10 + e.digit)); setElims(n);
    if (!auto) { const nn = notes.slice(); st.elims.forEach(e => (nn[e.cell] &= ~(1 << e.digit))); setNotes(nn); }
    setHint(null); setDemo(null); sfx('place');
  }
  function key(k: string, e: React.KeyboardEvent) {
    if (/^[1-9]$/.test(k)) { e.preventDefault(); input(+k, e.shiftKey && !/^[1-9]$/.test(e.key) ? true : undefined); }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') erase();
    else if (k.toLowerCase() === 'n') setNoteMode(m => !m);
    else if (k.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) undo();
  }

  const path = useMemo(() => (doneAt ? solveHuman(p.initial, p.allowed) : null), [doneAt]);
  const reviewFrames = review !== null && path ? path.steps[review].frames : demo ? demo.frames : [];
  const ctl = useFrames(reviewFrames, true);

  const overlays: (Overlay | null)[] = [];
  if ((review !== null || demo) && ctl.frame) overlays.push(ctl.frame);
  else if (hint?.wrongCell !== undefined) overlays.push(hint.level === 1 ? { units: [{ u: BOX_UNIT(hint.wrongCell), tone: 'focus' }] } : { cells: [{ cell: hint.wrongCell, tone: 'target' }] });
  else if (hint?.step) overlays.push(hint.step.hints[hint.level - 1]);

  let mood: Mood = 'idle', text: React.ReactNode = p.intro ?? null;
  if (doneAt) { mood = 'happy'; text = p.practice ? 'Resuelto. Era una repetición: no suma premio.' : '¡Lo resolviste!'; }
  if ((review !== null || demo) && ctl.frame) { mood = 'point'; text = ctl.frame.text; }
  else if (hint) mood = hint.wrongCell !== undefined ? 'oops' : 'think';

  const reviewState = review !== null && path ? path.states[review] : null;

  let bar: React.ReactNode = null;
  if (!doneAt && hint) {
    if (hint.wrongCell !== undefined) bar = <BottomBar tone="bad" title="Hay un error" text={hint.level === 1 ? `Revisa la ${unitName(BOX_UNIT(hint.wrongCell))}.` : `Mira ${cellName(hint.wrongCell)}.`} left={hint.level < 2 && <Btn kind="white" onClick={askHint}>Más pista</Btn>} right={<Btn kind="danger" big onClick={() => setHint(null)}>Vale</Btn>} />;
    else if (!hint.step) bar = <BottomBar tone="warn" title="Sin paso" text="No encuentro el siguiente paso con estas técnicas." right={<Btn kind="primary" big onClick={() => setHint(null)}>Vale</Btn>} />;
    else bar = <BottomBar tone="info" title={hint.level >= 3 ? TECH_BY_ID[hint.step.tech].name : `Pista ${hint.level}`} text={hint.step.hints[hint.level - 1].text}
      left={<>{hint.level < 4 && <Btn kind="white" onClick={askHint}>Más pista</Btn>}{hint.level >= 3 && !demo && <Btn kind="white" icon={I.play} onClick={() => setDemo(hint.step)}>Ver por qué</Btn>}</>}
      right={<><Btn kind="white" onClick={() => { setHint(null); setDemo(null); }}>Cerrar</Btn>{hint.level >= 3 && <Btn kind="primary" big icon={I.wand} onClick={applyHint}>Aplicar</Btn>}</>} />;
  }
  if (thinking) bar = <BottomBar tone="info" title="Pensando…" text="Buscando el siguiente paso lógico." />;
  if (!doneAt && !hint && wrongShown.length) bar = <BottomBar tone="bad" title={`${wrongShown.length} error${wrongShown.length > 1 ? 'es' : ''}`} text="Marcados en rojo." right={<Btn kind="danger" big onClick={() => setWrongShown([])}>Vale</Btn>} />;
  if (!doneAt && !hint && !wrongShown.length && v.every(Boolean) && !complete) bar = <BottomBar tone="bad" title="Algo no cuadra" text="El tablero está lleno pero hay errores." right={<Btn kind="danger" big onClick={check}>Ver errores</Btn>} />;

  const hard = path ? path.steps.map((st, k) => ({ st, k })).filter(({ st }) => st.tech !== 'naked_single' && st.tech !== 'hidden_single') : [];
  const basicSteps = path ? path.steps.length - hard.length : 0;
  // Sin texto del tutor ni resumen final, el tablero ocupa el centro (no deja una columna vacía).
  const solo = !text && !doneAt;

  return (
    <div className="sp">
      {p.bar && <div className="train-bar">{p.bar}{!doneAt && <Clock get={elapsed} />}</div>}
      <div className={`ex-grid${solo ? ' solo' : ''}`}>
        <div className="ex-tutor">
          {(text || doneAt) && <TutorBubble mood={mood}>{text}</TutorBubble>}
          {doneAt && (
            <div className="done-card">
              <div className="stat-tiles">
                <div className="st st-yellow"><span>Tiempo</span><b>{fmt(doneMs)}</b></div>
                <div className="st st-red"><span>Errores</span><b>{mistakes}</b></div>
                <div className="st st-blue"><span>Pistas</span><b>{hintsUsed}</b></div>
              </div>
              {path && (
                <div className="review-path">
                  <h3>Cómo se resuelve</h3>
                  {hard.length > 0 && <ol>
                    {hard.map(({ st, k }) => (
                      <li key={k}><button className={review === k ? 'on' : ''} onClick={() => setReview(review === k ? null : k)}>{TECH_BY_ID[st.tech].name}<small>{st.title.replace(TECH_BY_ID[st.tech].name, '').replace(/^[:\s]+/, '')}</small></button></li>
                    ))}
                  </ol>}
                  <p className="muted small">{hard.length ? `Y ${basicSteps} pasos con candidato único o lugar único.` : `Todo con técnicas básicas: ${basicSteps} pasos con candidato único o lugar único.`}</p>
                </div>
              )}
              <div className="row-actions">
                {review !== null && <Btn icon={I.x} onClick={() => setReview(null)}>Mi tablero</Btn>}
                {p.onNext && <Btn kind="primary" big onClick={p.onNext}>{p.nextLabel ?? 'Otro sudoku'}</Btn>}
              </div>
            </div>
          )}
        </div>
        <div className="ex-board">
          <Board values={reviewState ? reviewState.v : v} cands={reviewState ? reviewState.c : shownCands} givens={p.givens} locked={locked}
            overlays={overlays} selected={reviewState ? null : sel} errors={wrongShown} onCell={c => { setSel(c); setHlD(0); }} onMove={setSel} onKey={key} hlDigit={hlD || undefined} />
          {(review !== null || demo) && <FrameControls ctl={ctl} />}
          {!doneAt && (
            <>
              <div className="tools">
                <Tool icon={I.undo} label="Deshacer" onClick={undo} disabled={!hist.length} />
                <Tool icon={I.erase} label="Borrar" onClick={erase} />
                <Tool icon={I.pencil} label={noteMode ? 'Notas: sí' : 'Notas'} onClick={() => setNoteMode(!noteMode)} on={noteMode} />
                <Tool icon={I.check} label="Revisar" onClick={check} />
                {p.hints !== false && <Tool icon={I.bulb} label="Pista" onClick={askHint} />}
              </div>
              <DigitPad onDigit={d => input(d)} counts={noteMode ? undefined : counts} hl={hlD} />
              <div className="board-tools">
                {!p.bar && <Clock get={elapsed} />}
                <span className="hide-sm"><CoordHint /></span>
                <button className="tool-chip" onClick={() => { if (auto) { setNotes(shownCands.map((m, i) => (v[i] ? 0 : m))); } setAuto(!auto); }} aria-pressed={auto}>{auto ? 'Candidatos: auto' : 'Candidatos: a mano'}</button>
              </div>
            </>
          )}
        </div>
      </div>
      {bar}
    </div>
  );
}

export const fmt = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
