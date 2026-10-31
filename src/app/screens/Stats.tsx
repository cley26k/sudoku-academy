import React, { useMemo, useState } from 'react';
import { READY, sheetForTech, UNITS_MAP } from '../../content/catalog';
import { useProgress, mastery, LEVEL_LABEL, dayKey, update, exportProgress, importProgress, resetProgress, resolveMistake, recordAttempt, storageAvailable, streak, xpTotal } from '../store';
import { Btn, I, Icon, Ring, Toggle } from '../ui/common';
import { exerciseFromId } from '../bank';
import { ExerciseRunner, Task } from '../ui/ExerciseRunner';
import { go } from '../router';
import { Tesela } from '../ui/Tutor';
import { LessonTop } from '../ui/layout';
import { setMusic } from '../sound';
import { AchievementsGrid } from '../ui/game';
import { levelOf } from '../gamify';

function Bars({ data, labels }: { data: (number | null)[]; labels: string[] }) {
  return (
    <div className="bars" role="img" aria-label="Aciertos sin pistas por día, últimas dos semanas">
      {data.map((v, i) => (
        <div key={i} className="bar-col" title={`${labels[i]}: ${v === null ? 'sin práctica' : Math.round(v * 100) + '%'}`}>
          <span className={`bar${v === null ? ' empty' : ''}`} style={{ height: `${v === null ? 6 : Math.max(10, v * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ProgressPage() {
  const p = useProgress();
  const [io, setIo] = useState(''); const [ioMsg, setIoMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const days = useMemo(() => Array.from({ length: 14 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (13 - k)); return dayKey(d.getTime()); }), []);
  const scored = p.attempts.filter(a => a.kind !== 'lesson' && a.kind !== 'full');
  const daily = days.map(d => { const xs = scored.filter(a => dayKey(a.t) === d); return xs.length ? xs.filter(a => a.ok && a.hints === 0).length / xs.length : null; });
  const rows = READY.map(s => ({ s, m: mastery(p, s.impl!) }));
  return (
    <div className="progress">
      <h1>Progreso</h1>
      {!storageAvailable() && <div className="notice">Este navegador no guarda datos. Usa «Exportar» en Ajustes.</div>}
      <div className="stat-tiles big">
        <div className="st st-orange"><Icon d={I.flame} size={26} /><b>{streak(p)}</b><span>Racha</span></div>
        <div className="st st-yellow"><Icon d={I.star} size={26} /><b>{levelOf(xpTotal(p)).level}</b><span>Nivel · {xpTotal(p)} XP</span></div>
        <div className="st st-blue"><Icon d={I.target} size={26} /><b>{scored.length}</b><span>Ejercicios</span></div>
        <div className="st st-purple"><Icon d={I.grid} size={26} /><b>{p.fullSolved}</b><span>Sudokus</span></div>
      </div>
      <div className="card"><div className="card-head"><h3>Últimos 14 días</h3><span className="muted small">aciertos sin pistas</span></div><Bars data={daily} labels={days} /></div>
      <h2 className="h-sub">Logros</h2>
      <AchievementsGrid />
      <h2 className="h-sub">Técnicas</h2>
      <div className="mlist">
        {rows.map(({ s, m }) => (
          <button key={s.id} className={`mrow c-${UNITS_MAP.find(u => u.n === s.unit)!.color}`} onClick={() => go(`tecnica-${s.id}`)}>
            <Ring value={m.score} size={52} tone={m.level === 'dominada' ? 'green' : 'unit'}><span className="lc-abbr">{s.abbr}</span></Ring>
            <span className="lc-txt"><b>{s.name}</b><small>{LEVEL_LABEL[m.level]}{m.due ? ' · toca repasar' : ''}{m.lesson && !m.test ? ' · falta la prueba' : ''}</small></span>
            <span className="mrow-pct">{m.score}%</span>
          </button>
        ))}
      </div>
      <details className="settings">
        <summary><Icon d={I.gear} size={18} /> Ajustes</summary>
        <Toggle id="set-streak" on={p.settings.streaks} onChange={v => update(pp => { pp.settings.streaks = v; })} label="Mostrar rachas" />
        <Toggle id="set-sound" on={p.settings.sound} onChange={v => update(pp => { pp.settings.sound = v; })} label="Efectos de sonido" />
        <Toggle id="set-music" on={p.settings.music} onChange={v => { update(pp => { pp.settings.music = v; }); setMusic(v); }} label="Música de fondo" />
        <p className="small muted">El dominio cuenta precisión sin pistas, variedad de casos y días distintos, no solo cantidad.</p>
        <div className="row-actions">
          <Btn onClick={() => { const t = exportProgress(); setIo(t); navigator.clipboard?.writeText(t).then(() => setIoMsg('Copiado.'), () => setIoMsg('Copia el texto de abajo.')); }}>Exportar</Btn>
          <Btn onClick={() => setIoMsg(importProgress(io) ? 'Importado.' : 'Texto no válido.')} disabled={!io}>Importar</Btn>
          {!confirmReset ? <Btn kind="danger" onClick={() => setConfirmReset(true)}>Borrar todo</Btn> : <><Btn kind="danger" onClick={() => { resetProgress(); setConfirmReset(false); }}>Sí, borrar</Btn><Btn onClick={() => setConfirmReset(false)}>No</Btn></>}
        </div>
        <textarea id="io" className="io" value={io} onChange={e => setIo(e.target.value)} placeholder="Pega aquí un progreso exportado" rows={3} />
        {ioMsg && <p className="small">{ioMsg}</p>}
      </details>
    </div>
  );
}

export function ReviewPage() {
  const p = useProgress();
  const [active, setActive] = useState<string | null>(null);
  const open = p.mistakes.filter(m => !m.resolved).slice().reverse();
  const m = p.mistakes.find(x => x.id === active);
  const ex = useMemo(() => (m ? exerciseFromId(m.exId) : null), [active]);
  if (m && ex) {
    const task: Task = m.kind === 'recognize' ? 'recognize' : 'deduce';
    return (
      <ExerciseRunner key={m.id} ex={ex} task={task} hints title="Otra oportunidad" header={<LessonTop progress={.5} onClose={() => setActive(null)} />}
        intro={<>La última vez: {m.note}</>}
        onResult={r => { recordAttempt({ tech: m.tech, kind: task, ok: r.ok, hints: r.hints, errors: r.errors, ms: r.ms, variant: r.variant, exId: m.exId }, r.ok ? undefined : r.note); if (r.ok) resolveMistake(m.id); }}
        onNext={() => setActive(null)} />
    );
  }
  return (
    <div className="reviewpage">
      <div className="tc-head"><Tesela mood={open.length ? 'think' : 'happy'} size={84} /><h1>{open.length ? 'Tus errores' : '¡Sin errores pendientes!'}</h1></div>
      <div className="mlist">
        {open.map(x => (
          <button key={x.id} className={`mrow c-${UNITS_MAP.find(u => u.n === sheetForTech(x.tech).unit)!.color}`} onClick={() => setActive(x.id)}>
            <span className="mk-ico"><Icon d={I.rewind} size={22} stroke={2.6} /></span>
            <span className="lc-txt"><b>{sheetForTech(x.tech).name}</b><small>{x.note}</small></span>
            <Icon d={I.arrow} />
          </button>
        ))}
      </div>
    </div>
  );
}
