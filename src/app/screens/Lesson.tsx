import React, { useEffect, useMemo, useState } from 'react';
import { UNITS_MAP, GLOSSARY } from '../../content/catalog';
import type { Sheet } from '../../content/catalog';
import { lessonExercise } from '../bank';
import { ExerciseRunner, RunResult } from '../ui/ExerciseRunner';
import { Board } from '../ui/Board';
import { TutorBubble, Tesela } from '../ui/Tutor';
import { Btn, useFrames, FrameControls, celebrate, CoordHint, Icon, I } from '../ui/common';
import { CountUp } from '../ui/game';
import { ConceptPlayer } from '../ui/Concept';
import { sceneFor } from '../../content/scenes';
import { awardPerfect } from '../gamify';
import { LessonTop, BottomBar, ExLayout } from '../ui/layout';
import { recordAttempt, completeLesson } from '../store';
import { cellName, digitsOf } from '../../engine/grid';
import type { LiveExercise } from '../../engine/exercise';
import type { Overlay } from '../../engine/step';
import { go } from '../router';
import { Friend, FRIEND_BY_UNIT } from '../ui/friends';
import { sfx } from '../sound';

const N_PHASES = 6;

export function Lesson({ sheet }: { sheet: Sheet }) {
  const tech = sheet.impl!;
  const [phase, setPhase] = useState(0);
  const [retry, setRetry] = useState(0);
  // e0 se calcula al entrar; el resto se prepara en segundo plano para que la pantalla no se congele.
  const e0m = useMemo(() => lessonExercise(tech, 0), [tech]);
  const eD = useBackground(() => e0m && lessonExercise(tech, 1, { puzzleNot: e0m.puzzleIndex }), [tech], 60);
  const eE = useBackground(() => e0m && lessonExercise(tech, 2 + retry * 10, { puzzleNot: e0m.puzzleIndex }), [tech, retry], 160);
  const eF = useBackground(() => e0m && lessonExercise(tech, 3 + retry * 10, { variantNot: e0m.variant, puzzleNot: e0m.puzzleIndex }), [tech, retry], 260);
  const ex = { e0: e0m, eD };
  const [res, setRes] = useState<{ A?: RunResult; D?: RunResult; E?: RunResult; F?: RunResult }>({});
  const t0 = useMemo(() => Date.now(), [tech, retry]);
  const [finished, setFinished] = useState(false);
  const close = () => go(`tecnica-${sheet.id}`);

  if (!ex.e0) return <div className="empty-state"><Tesela mood="oops" size={110} /><h2>Aún no hay ejercicios</h2></div>;
  const need = phase === 3 ? ex.eD : phase === 4 ? eE : phase === 5 ? eF : true;
  if (need === undefined) return <div className="empty-state"><Tesela mood="think" size={110} /><h2>Preparando…</h2></div>;
  if (need === null) return <div className="empty-state"><Tesela mood="oops" size={110} /><h2>Aún no hay ejercicios</h2></div>;
  const e0 = ex.e0;

  const rec = (key: 'A' | 'D' | 'E' | 'F', e: LiveExercise, kind: 'lesson' | 'test') => (r: RunResult) => {
    setRes(x => ({ ...x, [key]: r }));
    recordAttempt({ tech, kind, ok: r.ok, hints: r.hints, errors: r.errors, ms: r.ms, variant: r.variant, exId: e.id }, r.ok ? undefined : r.note);
  };
  const testPassed = !!(res.E?.ok && res.F?.ok && res.E.hints === 0 && res.F.hints === 0 && (res.E.errors + res.F.errors) <= 1);
  const top = <LessonTop progress={finished ? 1 : phase / N_PHASES} onClose={close} />;

  if (finished) return <LessonEnd sheet={sheet} passed={testPassed} top={top} res={res} ms={Date.now() - t0} onRetry={() => { setRetry(r => r + 1); setRes({}); setFinished(false); setPhase(4); }} />;

  const common = { header: top };
  if (phase === 0) return <ExerciseRunner key="A" ex={e0} task="recognize" hints {...common} title="Encuentra el patrón"
    intro={<>{e0.steps[0].hints[0].text}</>} onResult={rec('A', e0, 'lesson')} onNext={() => setPhase(1)} />;
  if (phase === 1) return <Understand sheet={sheet} ex={e0} header={top} onNext={() => setPhase(2)} />;
  if (phase === 2) return <Demo ex={e0} header={top} onNext={() => setPhase(3)} />;
  if (phase === 3) return <ExerciseRunner key="D" ex={ex.eD!} task="deduce" hints {...common} title="Tu turno"
    intro="Ahora tú. Si te atascas, pide una pista." onResult={rec('D', ex.eD!, 'lesson')} onNext={() => setPhase(4)} />;
  if (phase === 4) return <ExerciseRunner key={'E' + eE!.id} ex={eE!} task="deduce" hints={false} {...common} title="Sin ayuda"
    intro="Esta vez sin pistas. ¡Tú puedes!" onResult={rec('E', eE!, 'test')} onNext={() => setPhase(5)} />;
  return <ExerciseRunner key={'F' + eF!.id} ex={eF!} task="deduce" hints={false} {...common} title="Nuevo reto"
    intro="Misma idea, otra forma. Busca la idea, no el dibujo." onResult={rec('F', eF!, 'test')} onNext={() => { completeLesson(sheet.id, testPassed); setFinished(true); }} />;
}

function LessonEnd({ sheet, passed, top, onRetry, res, ms }: { sheet: Sheet; passed: boolean; top: React.ReactNode; onRetry: () => void; res: Partial<Record<'A' | 'D' | 'E' | 'F', RunResult>>; ms: number }) {
  const rs = (['A', 'D', 'E', 'F'] as const).map(k => res[k]).filter(Boolean) as RunResult[];
  const first = rs.filter(r => r.ok && r.errors === 0).length;
  const acc = rs.length ? Math.round((100 * first) / rs.length) : 0;
  const perfect = passed && rs.length === 4 && first === 4 && rs.every(r => r.hints === 0);
  const [time] = useState(ms);
  useEffect(() => { celebrate(); sfx('complete'); if (perfect) awardPerfect(); }, []);
  const xp = 20 + (perfect ? 10 : 0) + rs.reduce((a, r) => a + (!r.ok ? 0 : r.hints ? 5 : 10), 0);
  const mmss = (t: number) => `${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, '0')}`;
  return (
    <div className="runner">
      {top}
      <div className={`lesson-end c-${UNITS_MAP.find(u => u.n === sheet.unit)!.color}`}>
        <div className="end-cast"><Tesela mood={passed ? 'wow' : 'happy'} size={150} />{FRIEND_BY_UNIT[sheet.unit] !== 'tesela' && <Friend kind={FRIEND_BY_UNIT[sheet.unit] as never} size={120} />}</div>
        <h1>{perfect ? '¡Lección perfecta!' : passed ? '¡Técnica superada!' : '¡Lección completada!'}</h1>
        <p className="muted">{sheet.name}</p>
        {perfect && <span className="perfect-ribbon"><Icon d={I.star} size={16} stroke={2.8} />Sin errores ni pistas · +10 XP</span>}
        <div className="stat-tiles three">
          <div className="st st-yellow"><span>XP</span><b>+<CountUp to={xp} delay={200} /></b></div>
          <div className={`st ${acc >= 75 ? 'st-green' : 'st-orange'}`}><span>Precisión</span><b><CountUp to={acc} delay={350} />%</b></div>
          <div className="st st-blue"><span>Tiempo</span><b>{mmss(time)}</b></div>
        </div>
        {!passed && <p className="small muted">La prueba sin pistas aún no está superada.</p>}
      </div>
      <BottomBar
        left={!passed ? <Btn kind="ghost" onClick={onRetry}>Repetir prueba</Btn> : <Btn kind="ghost" onClick={() => go('inicio')}>Mapa</Btn>}
        right={<Btn kind="primary" big onClick={() => go(`entrenar-${sheet.impl}`)}>Practicar</Btn>} />
    </div>
  );
}

function Understand({ sheet, ex, header, onNext }: { sheet: Sheet; ex: LiveExercise; header: React.ReactNode; onNext: () => void }) {
  const st = ex.steps[0];
  const [sel, setSel] = useState<number | null>(null);
  const [scen, setScen] = useState<number | null>(null);
  const [step, setStep] = useState<'idea' | 'explore' | 'quiz'>(() => (sceneFor(sheet.id) ? 'idea' : 'explore'));
  const [answer, setAnswer] = useState<number | null>(null);
  const q = sheet.questions[0];
  const overlays: (Overlay | null)[] = [scen !== null && st.scenarios ? st.scenarios[scen].frames[0] : st.hints[2]];
  let text: React.ReactNode = sheet.analogy ?? sheet.intuition;
  if (scen !== null && st.scenarios) text = st.scenarios[scen].frames[0].text;
  else if (sel !== null && !ex.state.v[sel]) text = `${cellName(sel)} puede ser ${digitsOf(ex.state.c[sel]).join(', ')}.`;

  if (step === 'idea') return (
    <div className="runner">
      {header}
      <div className="idea-screen">
        <h2 className="ex-title">La idea</h2>
        <ConceptPlayer id={sheet.id} />
      </div>
      <BottomBar left={<Btn kind="ghost" onClick={() => setStep('explore')}>Saltar</Btn>} right={<Btn kind="primary" big onClick={() => setStep('explore')}>Ahora en un sudoku real</Btn>} />
    </div>
  );
  if (step === 'quiz' && q) {
    const ok = answer === q.answer;
    return (
      <div className="runner">
        {header}
        <div className="quiz-screen">
          <h2 className="ex-title">{q.q}</h2>
          <div className="quiz-opts">
            {q.options.map((o, k) => (
              <button key={k} className={`quiz-opt${answer === k ? (k === q.answer ? ' right' : ' wrong') : ''}${answer !== null && k === q.answer ? ' right' : ''}`} onClick={() => answer === null && setAnswer(k)} disabled={answer !== null}>
                <span className="qo-n">{k + 1}</span>{o}
              </button>
            ))}
          </div>
        </div>
        {answer === null ? <BottomBar right={<Btn kind="primary" big disabled>Comprobar</Btn>} />
          : <BottomBar tone={ok ? 'ok' : 'bad'} title={ok ? '¡Correcto!' : 'No exactamente'} text={q.why} right={<Btn kind={ok ? 'success' : 'danger'} big onClick={onNext}>Continuar</Btn>} />}
      </div>
    );
  }
  return (
    <div className="runner">
      {header}
      <ExLayout title="¿Qué pasaría si…?"
        tutor={<TutorBubble mood="think">{text}</TutorBubble>}
        board={<Board values={ex.state.v} cands={ex.state.c} givens={ex.givens} locked={ex.state.v.map(x => x > 0)} overlays={overlays} selected={sel} onCell={c => { setSel(c); setScen(null); }} onMove={setSel} />}
        below={<>
          {sheet.terms && <dl className="terms">{sheet.terms.map(t => <div key={t}><dt>{t}</dt><dd>{GLOSSARY[t]}</dd></div>)}</dl>}
          {st.scenarios && <div className="scen-chips">{st.scenarios.map((s, i) => <button key={i} className={`scen${scen === i ? ' on' : ''}`} onClick={() => setScen(scen === i ? null : i)}>{s.label}</button>)}</div>}
          <div className="board-tools"><CoordHint /></div>
        </>}
      />
      <BottomBar right={<Btn kind="primary" big onClick={() => (q ? setStep('quiz') : onNext())}>Continuar</Btn>} />
    </div>
  );
}

function Demo({ ex, header, onNext }: { ex: LiveExercise; header: React.ReactNode; onNext: () => void }) {
  const st = ex.steps[0];
  const ctl = useFrames(st.frames, true);
  const end = ctl.i >= ctl.total - 1;
  return (
    <div className="runner">
      {header}
      <ExLayout title="Mira cómo funciona"
        tutor={<TutorBubble mood="point">{ctl.frame?.text}</TutorBubble>}
        board={<Board values={ex.state.v} cands={ex.state.c} givens={ex.givens} locked={ex.state.v.map(x => x > 0)} overlays={[ctl.frame]} />}
        below={<FrameControls ctl={ctl} />}
      />
      <BottomBar right={<Btn kind={end ? 'primary' : 'ghost'} big onClick={onNext}>{end ? 'Continuar' : 'Saltar'}</Btn>} />
    </div>
  );
}

/** Calcula un valor fuera del primer pintado. undefined = aún no está listo. */
function useBackground<T>(fn: () => T, deps: unknown[], delay: number): T | undefined {
  const [v, setV] = useState<{ k: string; v: T } | null>(null);
  const k = JSON.stringify(deps);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => { const r = fn(); if (alive) setV({ k, v: r }); }, delay);
    return () => { alive = false; window.clearTimeout(t); };
  }, [k]);
  return v && v.k === k ? v.v : undefined;
}
