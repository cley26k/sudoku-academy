import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveExercise, Feedback } from '../../engine/exercise';
import { gradeEliminations, gradePlacement, gradeRecognition } from '../../engine/exercise';
import type { CD, Frame, Overlay, Step } from '../../engine/step';
import { cdKey } from '../../engine/step';
import { TECH_BY_ID } from '../../engine/techniques';
import { has, cloneState, place, eliminate } from '../../engine/grid';
import { sheetForTech } from '../../content/catalog';
import { Board } from './Board';
import { TutorBubble, Mood } from './Tutor';
import { Btn, I, DigitPad, useFrames, FrameControls, celebrate, CoordHint } from './common';
import { SudokuPlayer } from './SudokuPlayer';
import { BottomBar, ExLayout } from './layout';
import { sfx } from '../sound';

export type Task = 'recognize' | 'deduce' | 'execute';
export interface RunResult { ok: boolean; hints: number; errors: number; ms: number; note?: string; variant: string }

export interface RunnerProps {
  ex: LiveExercise; task: Task; hints: boolean; showCands?: boolean;
  intro?: React.ReactNode; title?: string;
  onResult?: (r: RunResult) => void;
  onWrong?: () => void;
  onNext?: () => void; nextLabel?: string;
  header?: React.ReactNode;
}

export function ExerciseRunner(p: RunnerProps) {
  const { ex, task } = p;
  const impl = TECH_BY_ID[ex.tech];
  const sheet = sheetForTech(ex.tech);
  const placeMode = impl.action === 'place' && task !== 'recognize';
  const [sel, setSel] = useState<number | null>(null);
  const [marks, setMarks] = useState<CD[]>([]);
  const [multi, setMulti] = useState<number[]>([]);
  const [hint, setHint] = useState(0);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState<Step | null>(null);
  const [demo, setDemo] = useState<Frame[] | null>(null);
  const [cont, setCont] = useState(false);
  const [showC, setShowC] = useState(p.showCands !== false);
  const reported = useRef(false);
  const t0 = useRef(Date.now());
  const firstErr = useRef<string | undefined>(undefined);

  useEffect(() => {
    setSel(null); setMarks([]); setMulti([]); setHint(0); setFb(null); setErrors(0); setDone(null); setDemo(null); setCont(false);
    setShowC(p.showCands !== false); reported.current = false; t0.current = Date.now(); firstErr.current = undefined;
  }, [ex.id, task]);

  const ctl = useFrames(demo ?? [], true);
  const ref = fb?.matched ?? ex.steps[0];

  function report(ok: boolean, h: number, variant: string) {
    if (reported.current) return;
    reported.current = true;
    p.onResult?.({ ok, hints: h, errors, ms: Date.now() - t0.current, note: firstErr.current, variant });
  }
  function onFeedback(f: Feedback) {
    setFb(f);
    sfx(f.status === 'correct' ? 'correct' : f.status === 'wrong' ? 'wrong' : f.status === 'empty' ? 'tap' : 'partial');
    if (f.status === 'wrong') { p.onWrong?.(); setErrors(e => e + 1); if (!firstErr.current) firstErr.current = f.lines.find(l => l.kind === 'error')?.text ?? f.title; }
    if (f.status === 'correct') { const st = f.matched ?? ex.steps[0]; setDone(st); celebrate(); report(true, hint, st.variant); }
  }
  function check() {
    if (done) return;
    onFeedback(task === 'recognize' ? gradeRecognition(ex, multi) : gradeEliminations(ex, marks));
  }
  function cellClick(cell: number, sub: number) {
    setSel(cell);
    if (done) return;
    if (task === 'recognize') { if (!ex.state.v[cell]) { sfx('select'); setFb(null); setMulti(m => (m.includes(cell) ? m.filter(x => x !== cell) : [...m, cell])); } return; }
    if (!placeMode && showC && !ex.state.v[cell] && has(ex.state.c[cell], sub)) toggleMark(cell, sub);
  }
  function toggleMark(cell: number, d: number) {
    if (ex.state.v[cell] || !has(ex.state.c[cell], d) || done) return;
    setFb(null); sfx('select');
    setMarks(m => (m.some(x => x.cell === cell && x.digit === d) ? m.filter(x => !(x.cell === cell && x.digit === d)) : [...m, { cell, digit: d }]));
  }
  function digit(d: number) {
    if (sel === null || done) return;
    if (placeMode) { if (!ex.state.v[sel]) onFeedback(gradePlacement(ex, sel, d)); }
    else if (task !== 'recognize') toggleMark(sel, d);
  }
  function key(k: string) {
    if (/^[1-9]$/.test(k)) digit(+k);
    else if ((k === ' ' || k === 'Enter') && sel !== null && task === 'recognize') cellClick(sel, 0);
    else if (k === 'Enter' && !placeMode) check();
  }
  function nextHint() {
    if (done) return;
    const n = Math.min(5, hint + 1);
    setHint(n); setFb(null); sfx('hint');
    if (n === 5) { if (!firstErr.current) firstErr.current = 'Viste la solución completa.'; setDemo(ref.frames); report(false, 5, ref.variant); }
  }

  const overlays: (Overlay | null)[] = [];
  if (demo && ctl.frame) overlays.push(ctl.frame);
  else if (done) overlays.push(done.hints[3]);
  else if (hint > 0 && hint < 5) overlays.push(ref.hints[hint - 1]);
  if (fb?.status === 'wrong' && !done) overlays.push({ cells: (fb.wrong ?? []).map(w => ({ cell: w.cell, tone: 'target' as const })).concat(task === 'recognize' ? fb.lines.filter(l => l.cell !== undefined).map(l => ({ cell: l.cell!, tone: 'target' as const })) : []) });

  const defaultTitle = task === 'recognize' ? (impl.action === 'place' ? 'Encuentra la casilla' : 'Encuentra el patrón') : placeMode ? '¿Qué número va?' : 'Tacha lo que sobra';
  const defaultText = task === 'recognize' ? 'Toca las casillas que forman el patrón.' : placeMode ? 'Toca una casilla y elige su número.' : 'Toca los candidatos que se pueden eliminar.';

  let mood: Mood = 'idle'; let bubble: React.ReactNode = p.intro ?? defaultText;
  if (demo && ctl.frame) { mood = 'point'; bubble = ctl.frame.text; }
  else if (done) { mood = 'happy'; bubble = done.title + '.'; }
  else if (fb?.status === 'wrong') mood = 'oops';
  else if (fb) mood = 'think';
  else if (hint > 0) { mood = 'think'; bubble = ref.hints[hint - 1]?.text; }

  const playerState = useMemo(() => {
    if (!cont || !done) return null;
    const s = cloneState(ex.state);
    if (placeMode) done.placements.forEach(q => place(s, q.cell, q.digit));
    else { const keys = new Set(marks.map(cdKey)); done.elims.forEach(e => keys.add(cdKey(e))); keys.forEach(k => eliminate(s, Math.floor(k / 10), k % 10)); }
    return s;
  }, [cont]);
  if (cont && playerState) {
    return (
      <div className="runner">
        {p.header}
        <SudokuPlayer key={ex.id + 'cont'} initial={playerState} givens={ex.givens} solution={ex.solution} allowed="all" autoCands
          intro="¡Ahora termínalo!" onNext={p.onNext} nextLabel={p.nextLabel} />
      </div>
    );
  }

  const hasSelection = task === 'recognize' ? multi.length > 0 : marks.length > 0;
  const hintBtn = p.hints && !done && hint < 5
    ? <Btn kind="ghost" icon={I.bulb} onClick={nextHint} className="hint-btn">{hint === 4 ? 'Solución' : 'Pista'}{hint > 0 && hint < 4 && <small className="hint-n">{hint}/4</small>}</Btn>
    : null;

  let bar: React.ReactNode;
  const firstLine = fb?.lines.find(l => l.kind === 'error') ?? fb?.lines[0];
  const extra = fb ? fb.lines.filter(l => l.kind === 'error').length - 1 : 0;
  if (done) {
    bar = <BottomBar tone="ok" title="¡Excelente!" badge={<span className="xp-pop">+{hint ? 5 : 10} XP</span>} text={!demo ? undefined : null}
      left={!demo ? <Btn kind="white" icon={I.play} onClick={() => setDemo(done.frames)}>Ver por qué</Btn> : <Btn kind="white" icon={I.x} onClick={() => setDemo(null)}>Cerrar</Btn>}
      right={<>{task === 'execute' && <Btn kind="white" icon={I.grid} onClick={() => setCont(true)}>Terminar sudoku</Btn>}{p.onNext && <Btn kind="success" big onClick={p.onNext}>{p.nextLabel ?? 'Continuar'}</Btn>}</>} />;
  } else if (demo) {
    bar = <BottomBar tone="info" title="Así se resuelve" text="Inténtalo tú en el siguiente." right={p.onNext && <Btn kind="primary" big onClick={p.onNext}>{p.nextLabel ?? 'Continuar'}</Btn>} />;
  } else if (fb && fb.status !== 'empty') {
    const tone = fb.status === 'wrong' ? 'bad' : 'warn';
    bar = <BottomBar tone={tone} title={fb.status === 'wrong' ? 'Casi…' : fb.status === 'partial' ? '¡Vas bien!' : 'Mmm…'}
      text={<>{fb.status === 'partial' && task !== 'recognize' ? fb.lines[fb.lines.length - 1]?.text : firstLine?.text ?? fb.title}{extra > 0 && <span className="muted"> (+{extra} más)</span>}</>}
      left={hintBtn} right={<Btn kind={tone === 'bad' ? 'danger' : 'primary'} big onClick={() => setFb(null)}>Seguir</Btn>} />;
  } else {
    bar = <BottomBar left={hintBtn} right={!placeMode && <Btn kind="primary" big onClick={check} disabled={!hasSelection}>Comprobar</Btn>} />;
  }

  const showPad = !done && task !== 'recognize' && sel !== null && !ex.state.v[sel];
  const cellMarks = sel !== null ? marks.filter(m => m.cell === sel).reduce((a, m) => a | (1 << m.digit), 0) : 0;

  return (
    <div className="runner">
      {p.header}
      <ExLayout
        title={p.title ?? defaultTitle}
        tutor={<TutorBubble mood={mood}>{bubble}</TutorBubble>}
        board={<Board values={ex.state.v} cands={ex.state.c} givens={ex.givens} locked={ex.state.v.map(v => v > 0)} showCands={showC || !!demo || !!done}
          overlays={overlays} selected={sel} peerHighlight={!done && !demo} multi={task === 'recognize' ? multi : undefined} marks={marks} onCell={cellClick} onMove={setSel} onKey={key}
          label={`Ejercicio de ${sheet.name}. Flechas para moverte, números para ${placeMode ? 'colocar' : 'tachar'}.`} />}
        below={<>
          {demo && <FrameControls ctl={ctl} />}
          {showPad && <DigitPad onDigit={digit} allowed={placeMode ? undefined : ex.state.c[sel!]} active={placeMode ? undefined : cellMarks} />}
          <div className="board-tools">
            <CoordHint />
            {ex.pure && p.showCands === false && <button className="tool-chip" onClick={() => setShowC(!showC)} aria-pressed={showC}>{showC ? 'Ocultar candidatos' : 'Ver candidatos'}</button>}
          </div>
        </>}
      />
      {bar}
    </div>
  );
}
