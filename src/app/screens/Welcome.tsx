import React, { useMemo, useState } from 'react';
import { Tesela } from '../ui/Tutor';
import { Friend } from '../ui/friends';
import { Btn, celebrate } from '../ui/common';
import { update, completeLesson } from '../store';
import { go } from '../router';
import { SHEETS, sheetForTech, UNITS_MAP } from '../../content/catalog';
import { pickExercise } from '../bank';
import { ExerciseRunner } from '../ui/ExerciseRunner';
import { LessonTop, BottomBar } from '../ui/layout';
import type { TechId } from '../../engine/step';
import { sfx } from '../sound';

/** Escena con todo el elenco: Tesela al centro y sus amigos alrededor. */
export function CastScene() {
  const tiles = [[0, 30, 3], [92, 32, 7], [93, 68, 5], [24, 82, 1], [47, 0, 9]];
  return (
    <div className="cast" aria-hidden="true">
      {tiles.map(([x, y, d], i) => <span key={i} className="cast-tile" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * .4}s` }}>{d}</span>)}
      <div className="cast-item c-blue" style={{ left: '62%', top: '46%' }}><Friend kind="gemelos" size={110} /></div>
      <div className="cast-item c-orange" style={{ left: '4%', top: '48%' }}><Friend kind="pez" size={104} /></div>
      <div className="cast-item c-pink cast-fly" style={{ left: '70%', top: '0%' }}><Friend kind="ave" size={92} /></div>
      <div className="cast-item c-purple" style={{ left: '10%', top: '6%' }}><Friend kind="cruz" size={76} /></div>
      <div className="cast-item cast-hero" style={{ left: '31%', top: '14%' }}><Tesela mood="happy" size={150} /></div>
    </div>
  );
}

export function Welcome() {
  const finish = (r: string) => { update(p => { p.welcomed = true; }); go(r); };
  return (
    <div className="welcome">
      <CastScene />
      <h1>Aprende Sudoku pensando,<br />no adivinando</h1>
      <p className="muted">Lecciones cortas, un tutor que te guía y práctica sin límite.</p>
      <div className="welcome-btns">
        <Btn kind="primary" big onClick={() => finish('leccion-rules')}>Empezar desde cero</Btn>
        <Btn kind="ghost" big onClick={() => finish('nivel')}>Ya sé jugar</Btn>
      </div>
    </div>
  );
}

const STAGES: TechId[] = ['hidden_single', 'pointing', 'naked_pair', 'x_wing', 'y_wing'];

/** Prueba de nivel: avanza mientras aciertes, sin pistas. Marca como vistas las unidades superadas. */
export function Placement() {
  const [k, setK] = useState(0);
  const [failed, setFailed] = useState<number | null>(null);
  const [res, setRes] = useState<boolean | null>(null);
  const ex = useMemo(() => (k < STAGES.length && failed === null ? pickExercise({ techs: [STAGES[k]], difficulty: 1, pureOnly: false }).ex : null), [k, failed]);
  const done = failed !== null || k >= STAGES.length;
  const passed = failed ?? k;
  const reachedUnit = passed === 0 ? 1 : sheetForTech(STAGES[passed - 1]).unit + 1;
  function finish() {
    const top = passed === 0 ? 0 : sheetForTech(STAGES[passed - 1]).unit;
    for (const s of SHEETS) if (s.status !== 'pending' && s.unit <= top) completeLesson(s.id);
    go('inicio');
  }
  const top = <LessonTop progress={done ? 1 : k / STAGES.length} onClose={() => go('inicio')} right={!done ? <button className="skip-btn" onClick={() => setFailed(k)}>No lo sé</button> : undefined} />;
  if (done) {
    const u = UNITS_MAP.find(x => x.n === Math.min(7, reachedUnit))!;
    return (
      <div className="runner">{top}
        <div className="lesson-end">
          <Tesela mood={passed ? 'wow' : 'happy'} size={150} />
          <h1>{passed ? `¡Empiezas en la unidad ${u.n}!` : '¡Empecemos por la base!'}</h1>
          <p className="muted">{passed ? `Superaste ${passed} de ${STAGES.length} retos. Te espera: ${u.title}.` : 'Las primeras lecciones van rápido.'}</p>
        </div>
        <BottomBar right={<Btn kind="primary" big onClick={finish}>Continuar</Btn>} />
      </div>
    );
  }
  if (!ex) return <div className="empty-state"><Tesela mood="think" size={110} /><h2>Preparando…</h2></div>;
  return (
    <ExerciseRunner key={ex.id} ex={ex} task="deduce" hints={false} header={top} title={`Reto ${k + 1} de ${STAGES.length}`}
      intro={`¿Lo ves? Es un ${sheetForTech(STAGES[k]).name.toLowerCase()}.`}
      onResult={r => { setRes(r.ok); if (!r.ok) { setFailed(k); sfx('partial'); } }}
      onNext={() => { if (res) { celebrate(); setK(k + 1); setRes(null); } }} nextLabel="Siguiente reto" />
  );
}
