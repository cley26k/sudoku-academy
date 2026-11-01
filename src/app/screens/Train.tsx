import React, { useEffect, useRef, useState } from 'react';
import type { TechId } from '../../engine/step';
import { READY, sheetForTech, UNITS_MAP } from '../../content/catalog';
import { pickExercise, restrictedPuzzle, FullPuzzle } from '../bank';
import type { LiveExercise } from '../../engine/exercise';
import { ExerciseRunner, Task } from '../ui/ExerciseRunner';
import { SudokuPlayer } from '../ui/SudokuPlayer';
import { Btn, I, Icon, Segmented, Toggle } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { recordAttempt, update, getProgress } from '../store';
import { stateFromValues } from '../../engine/grid';
import { go } from '../router';
import { comboHit } from '../gamify';

interface Cfg { techs: TechId[]; task: Task; difficulty: 0 | 1 | 2 | 3; cands: boolean; hints: boolean; length: 'short' | 'full' }
const CFG_KEY = 'sudoku-academy/train-cfg';
function loadCfg(): Cfg {
  try { const c = JSON.parse(localStorage.getItem(CFG_KEY) || ''); if (c?.techs) return c; } catch { /* sin almacenamiento */ }
  const p = getProgress();
  const learned = READY.filter(s => p.lessons[s.id]?.done && !p.lessons[s.id]?.placed).map(s => s.impl!);
  return { techs: learned.length ? learned : ['naked_single', 'hidden_single'], task: 'deduce', difficulty: 0, cands: true, hints: true, length: 'short' };
}

export function Train({ preset, presetTechs }: { preset?: TechId; presetTechs?: TechId[] }) {
  const [cfg, setCfg] = useState<Cfg>(() => { const c = loadCfg(); return preset ? { ...c, techs: [preset], length: 'short' } : presetTechs ? { ...c, techs: presetTechs, length: 'short', task: 'deduce' } : c; });
  const [running, setRunning] = useState(!!preset || !!presetTechs);
  const [ex, setEx] = useState<LiveExercise | null>(null);
  const [full, setFull] = useState<FullPuzzle | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [stats, setStats] = useState({ n: 0, ok: 0 });
  const [nonce, setNonce] = useState(0);
  const [combo, setCombo] = useState(0);
  const recent = useRef(new Set<number>());
  useEffect(() => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* noop */ } }, [cfg]);
  useEffect(() => { if (preset) { setCfg(c => ({ ...c, techs: [preset], length: 'short' })); setRunning(true); } }, [preset]);

  function next() {
    setReason(null);
    if (!cfg.techs.length) { setReason('Elige al menos una técnica.'); return; }
    if (cfg.length === 'full') {
      setEx(null);
      const r = restrictedPuzzle(cfg.techs);
      if (!r.puzzle) { setFull(null); setReason('Ningún sudoku se resuelve solo con esa combinación. Añade otra técnica.'); return; }
      setFull(r.puzzle); setNonce(n => n + 1); return;
    }
    setFull(null);
    const r = pickExercise({ techs: cfg.techs, difficulty: cfg.difficulty, pureOnly: !cfg.cands, avoid: recent.current });
    if (!r.ex) { setEx(null); setReason(cfg.cands ? 'No hay posiciones para esta selección.' : 'Sin candidatos solo hay ejercicios de singles. Activa «Candidatos».'); return; }
    recent.current.add(Number(r.ex.id.split(':')[0]));
    if (recent.current.size > 30) recent.current = new Set([...recent.current].slice(-30));
    setEx(r.ex);
  }
  useEffect(() => { if (running) next(); }, [running, cfg.techs.join(), cfg.length, cfg.difficulty, cfg.cands]);
  const toggleTech = (t: TechId) => setCfg(c => ({ ...c, techs: c.techs.includes(t) ? c.techs.filter(x => x !== t) : [...c.techs, t] }));

  if (!running) return (
    <div className="train-cfg">
      <div className="tc-head"><Tesela mood="point" size={84} /><h1>¿Qué quieres practicar?</h1></div>
      <button className="card card-cta c-orange rush-cta" onClick={() => go('contrarreloj')}><Icon d={I.clock} size={30} /><span><b>Contrarreloj</b><small>3 minutos, 3 vidas. ¿Cuántos resuelves?</small></span><Icon d={I.arrow} /></button>
      {UNITS_MAP.map(u => {
        const ts = READY.filter(s => s.unit === u.n);
        if (!ts.length) return null;
        return (
          <div key={u.n} className={`tc-group c-${u.color}`}>
            <span className="tc-label">{u.title}</span>
            <div className="chips">
              {ts.map(s => <button key={s.id} className={`tchip${cfg.techs.includes(s.impl!) ? ' on' : ''}`} aria-pressed={cfg.techs.includes(s.impl!)} onClick={() => toggleTech(s.impl!)}>{cfg.techs.includes(s.impl!) && <Icon d={I.check} size={16} stroke={3} />}{s.name}</button>)}
            </div>
          </div>
        );
      })}
      <div className="tc-opts">
        <div className="tc-opt"><span>Formato</span><Segmented label="Formato" value={cfg.length} onChange={v => setCfg(c => ({ ...c, length: v }))} options={[{ v: 'short', label: 'Ejercicios' }, { v: 'full', label: 'Sudoku' }]} /></div>
        {cfg.length === 'short' && <div className="tc-opt"><span>Modo</span><Segmented label="Modo" value={cfg.task} onChange={v => setCfg(c => ({ ...c, task: v }))} options={[{ v: 'recognize', label: 'Ver' }, { v: 'deduce', label: 'Deducir' }, { v: 'execute', label: 'Resolver' }]} /></div>}
        {cfg.length === 'short' && <div className="tc-opt"><span>Dificultad</span><Segmented label="Dificultad" value={cfg.difficulty} onChange={v => setCfg(c => ({ ...c, difficulty: v }))} options={[{ v: 0, label: 'Mixta' }, { v: 1, label: '★' }, { v: 2, label: '★★' }, { v: 3, label: '★★★' }]} /></div>}
        <div className="tc-opt"><span>Ayudas</span>
          <div className="tc-toggles">
            <Toggle id="tc-hints" on={cfg.hints} onChange={v => setCfg(c => ({ ...c, hints: v }))} label="Pistas" />
            {cfg.length === 'short' && <Toggle id="tc-cands" on={cfg.cands} onChange={v => setCfg(c => ({ ...c, cands: v }))} label="Candidatos" />}
          </div>
        </div>
      </div>
      <div className="tc-go">
        <Btn kind="ghost" icon={I.rewind} onClick={() => go('revision')}>Mis errores</Btn>
        <Btn kind="primary" big onClick={() => setRunning(true)} disabled={!cfg.techs.length}>Empezar</Btn>
      </div>
    </div>
  );

  const header = (
    <div className="train-bar">
      <button className="ltop-x" onClick={() => setRunning(false)} aria-label="Cambiar práctica"><Icon d={I.gear} size={22} /></button>
      <div className="tb-techs">{cfg.techs.map(t => <span key={t} className="chip">{sheetForTech(t).name}</span>)}</div>
      {combo >= 2 && <div className="combo" key={combo} aria-label={`Combo de ${combo}`}><Icon d={I.flame} size={18} stroke={2.6} />x{combo}{combo >= 3 && <small>+5 XP</small>}</div>}
      <div className="tb-score" aria-label="Sesión"><Icon d={I.check} size={18} stroke={3} /><b>{stats.ok}</b><span className="muted">/ {stats.n}</span></div>
    </div>
  );

  return (
    <div className="train">
      {reason && <>{header}<div className="empty-state"><Tesela mood="oops" size={110} /><p>{reason}</p><Btn kind="primary" big onClick={() => setRunning(false)}>Cambiar</Btn></div></>}
      {ex && cfg.length === 'short' && (
        <ExerciseRunner key={ex.id + cfg.task} ex={ex} task={cfg.task} hints={cfg.hints} showCands={cfg.cands || !ex.pure} header={header}
          title={cfg.techs.length > 1 ? '¿Qué técnica ves?' : undefined}
          onResult={r => {
            setStats(s => ({ n: s.n + 1, ok: s.ok + (r.ok ? 1 : 0) }));
            setCombo(comboHit(r.ok, r.hints));
            recordAttempt({ tech: ex.tech, kind: cfg.task, ok: r.ok, hints: r.hints, errors: r.errors, ms: r.ms, variant: r.variant, exId: ex.id }, r.ok ? undefined : r.note);
          }}
          onNext={next} />
      )}
      {full && cfg.length === 'full' && (
        <>
          {header}
          <SudokuPlayer key={full.id + nonce} initial={stateFromValues(full.givens)} givens={full.givens.map(x => x > 0)} solution={full.solution} allowed={cfg.techs} hints={cfg.hints}
            intro="Se resuelve solo con lo que elegiste."
            onComplete={r => { update(pp => { pp.fullSolved++; }); setStats(s => ({ n: s.n + 1, ok: s.ok + 1 })); for (const t of r.used.filter(x => cfg.techs.includes(x))) recordAttempt({ tech: t, kind: 'full', ok: true, hints: r.hints, errors: r.mistakes, ms: r.ms, variant: '', exId: '' }); }}
            onNext={next} nextLabel="Otro" />
        </>
      )}
    </div>
  );
}
