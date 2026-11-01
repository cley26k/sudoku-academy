import React, { useEffect, useRef, useState } from 'react';
import { READY } from '../../content/catalog';
import { pickExercise } from '../bank';
import type { LiveExercise } from '../../engine/exercise';
import type { TechId } from '../../engine/step';
import { ExerciseRunner } from '../ui/ExerciseRunner';
import { Btn, I, Icon, celebrate } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { useProgress, update, dayKey, recordAttempt, xpTotal, getProgress } from '../store';
import { sfx } from '../sound';
import { go } from '../router';

const SECONDS = 180, LIVES = 3;

/** Contrarreloj (estilo «puzzle rush»): 3 minutos, 3 vidas, sin pistas. */
export function Rush() {
  const p = useProgress();
  const [phase, setPhase] = useState<'intro' | 'play' | 'end'>('intro');
  const [left, setLeft] = useState(SECONDS);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [ex, setEx] = useState<LiveExercise | null>(null);
  const [record, setRecord] = useState(false);
  const recent = useRef(new Set<number>());
  const scoreRef = useRef(0);
  const ended = useRef(false);
  const xp0 = useRef(0);
  const learned = READY.filter(s => p.lessons[s.id]?.done).map(s => s.impl!) as TechId[];
  const pool: TechId[] = learned.length >= 2 ? learned : ['naked_single', 'hidden_single', 'pointing', 'claiming'];

  function next() {
    const r = pickExercise({ techs: pool, difficulty: 0, pureOnly: false, avoid: recent.current });
    if (r.ex) { recent.current.add(Number(r.ex.id.split(':')[0])); setEx(r.ex); }
  }
  function start() { ended.current = false; xp0.current = xpTotal(getProgress()); setLeft(SECONDS); setLives(LIVES); setScore(0); scoreRef.current = 0; setRecord(false); recent.current.clear(); next(); setPhase('play'); }
  function end(final: number) {
    // Se puede llegar a la vez por tiempo y por vidas: solo cuenta la primera.
    if (ended.current) return;
    ended.current = true;
    setPhase('end');
    const isRecord = final > (p.rushBest ?? 0);
    setRecord(isRecord);
    if (isRecord) { celebrate(); sfx('complete'); }
    const day = dayKey(Date.now());
    update(pp => { pp.rushBest = Math.max(pp.rushBest ?? 0, final); pp.rushDays = [...new Set([...(pp.rushDays ?? []), day])]; pp.bonusXp = { ...(pp.bonusXp ?? {}), [day]: (pp.bonusXp?.[day] ?? 0) + final * 2 }; });
  }
  useEffect(() => {
    if (phase !== 'play') return;
    if (left <= 0) { end(scoreRef.current); return; }
    const t = window.setTimeout(() => setLeft(l => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, left]);

  if (phase === 'intro') return (
    <div className="rush-intro">
      <button className="ltop-x rush-close" onClick={() => go('entrenar')} aria-label="Salir"><Icon d={I.x} size={24} stroke={2.6} /></button>
      <div className="rush-hero"><Tesela mood="wow" size={140} /><span className="rush-clock"><Icon d={I.clock} size={40} stroke={2.4} /></span></div>
      <h1>Contrarreloj</h1>
      <div className="rush-rules">
        <span><Icon d={I.clock} size={22} /> 3 minutos</span>
        <span><Icon d={I.heart} size={22} /> 3 vidas</span>
        <span><Icon d={I.bulb} size={22} /> Sin pistas</span>
      </div>
      <p className="muted">Resuelve todos los ejercicios que puedas con las técnicas que ya aprendiste. Cada fallo cuesta una vida.</p>
      <div className="rush-best"><Icon d={I.trophy} size={22} /> Tu récord: <b>{p.rushBest ?? 0}</b></div>
      <Btn kind="primary" big onClick={start}>Empezar</Btn>
    </div>
  );
  if (phase === 'end') return (
    <div className="lesson-end">
      <Tesela mood={record ? 'wow' : 'happy'} size={150} />
      <h1>{record ? '¡Nuevo récord!' : '¡Tiempo!'}</h1>
      <div className="stat-tiles">
        <div className="st st-yellow"><span>Puntos</span><b>{score}</b></div>
        <div className="st st-purple"><span>Récord</span><b>{Math.max(score, p.rushBest ?? 0)}</b></div>
        <div className="st st-green"><span>XP</span><b>+{Math.max(0, xpTotal(p) - xp0.current)}</b></div>
      </div>
      <div className="row-actions"><Btn onClick={() => go('inicio')}>Mapa</Btn><Btn kind="primary" big onClick={start}>Otra vez</Btn></div>
    </div>
  );
  const pct = (100 * left) / SECONDS;
  const header = (
    <div className="rush-bar">
      <button className="ltop-x" onClick={() => end(scoreRef.current)} aria-label="Terminar"><Icon d={I.x} size={24} stroke={2.6} /></button>
      <div className={`rush-time${left <= 20 ? ' low' : ''}`}><span style={{ width: `${pct}%` }} /><b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b></div>
      <div className="rush-lives" aria-label={`${lives} vidas`}>{Array.from({ length: LIVES }, (_, i) => <span key={i} className={i < lives ? 'on' : ''}><Icon d={I.heart} size={22} stroke={2.4} /></span>)}</div>
      <div className="rush-score" key={score}><Icon d={I.check} size={18} stroke={3} />{score}</div>
    </div>
  );
  return ex ? (
    <ExerciseRunner key={ex.id} ex={ex} task="deduce" hints={false} reveal={false} header={header} title="¡Rápido!"
      onWrong={() => { if (ended.current) return; setLives(l => { const n = l - 1; if (n <= 0) window.setTimeout(() => end(scoreRef.current), 600); return n; }); }}
      onResult={r => {
        if (ended.current || lives <= 0) return;
        recordAttempt({ tech: ex.tech, kind: 'deduce', ok: r.ok, hints: 0, errors: r.errors, ms: r.ms, variant: r.variant, exId: ex.id }, r.ok ? undefined : r.note);
        if (r.ok) { scoreRef.current++; setScore(scoreRef.current); window.setTimeout(next, 650); }
      }} />
  ) : <div className="empty-state"><Tesela mood="think" size={110} /></div>;
}
