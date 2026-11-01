import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SHEETS, SHEET_BY_ID, UNITS_MAP, Sheet, GLOSSARY } from '../../content/catalog';
import { useProgress, mastery, lessonUnlocked, nextLesson, streak, LEVEL_LABEL, dayKey, Progress, xpToday, xpTotal, DAILY_GOAL, claimChest } from '../store';
import { go } from '../router';
import { Btn, I, Icon, Ring, Meter, useFrames, FrameControls, celebrate } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { Board } from '../ui/Board';
import { UnitArt, Chest } from '../ui/art';
import { lessonExercise } from '../bank';
import { Friend, FRIEND_BY_UNIT } from '../ui/friends';
import { LevelGems, QuestsCard, StreakChip } from '../ui/game';
import { moment } from '../gamify';
import { sfx } from '../sound';
import { ConceptPlayer } from '../ui/Concept';
import { LeagueCard } from './League';
import { sceneFor } from '../../content/scenes';

type NodeKind = 'locked' | 'open' | 'done' | 'mastered' | 'pending';
function nodeKind(p: Progress, s: Sheet): NodeKind {
  if (s.status === 'pending') return 'pending';
  const done = !!p.lessons[s.id]?.done;
  if (s.impl && mastery(p, s.impl).level === 'dominada') return 'mastered';
  if (done) return 'done';
  return lessonUnlocked(p, s.id) ? 'open' : 'locked';
}
const unitColor = (s: Sheet) => UNITS_MAP.find(u => u.n === s.unit)!.color;
const OFF = [0, -64, -96, -64, 0, 64, 96, 64];

export function TopStats() {
  const p = useProgress();
  return (
    <div className="topstats">
      {p.settings.streaks && <StreakChip />}
      <LevelGems compact />
    </div>
  );
}

export function Home() {
  const p = useProgress();
  const next = nextLesson(p);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.pnode-wrap')) setOpen(null); };
    document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close);
  }, []);
  const today = dayKey(Date.now());
  const xp = xpToday(p);
  const due = SHEETS.filter(s => s.impl && mastery(p, s.impl).due);
  const openMistakes = p.mistakes.filter(m => !m.resolved).length;
  // Nodos recién desbloqueados: se animan una vez
  const openNow = SHEETS.filter(s => s.status !== 'pending' && nodeKind(p, s) !== 'locked').map(s => s.id);
  const [seen] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('sa-seen-open') || '[]')); } catch { return new Set(); } });
  useEffect(() => { try { localStorage.setItem('sa-seen-open', JSON.stringify(openNow)); } catch { /* noop */ } }, [openNow.join()]);

  return (
    <div className="home">
      <section className="path-col" aria-label="Ruta de aprendizaje">
        {UNITS_MAP.map(u => {
          const items = SHEETS.filter(s => s.unit === u.n && s.status !== 'pending');
          const pend = SHEETS.filter(s => s.unit === u.n && s.status === 'pending');
          const allDone = items.length > 0 && items.every(s => p.lessons[s.id]?.done);
          const claimed = p.chests.includes(u.n) || !!p.placedChests?.includes(u.n);
          let row = 0;
          return (
            <div className={`unit c-${u.color}`} key={u.n}>
              <div className="ubanner">
                <div className="ub-txt"><span className="ub-n">Unidad {u.n}</span><h2>{u.title}</h2><p>{u.blurb}</p></div>
                <UnitArt n={u.n} />
              </div>
              <div className="path">
                <PathRoad deps={`${u.n}-${items.map(s => nodeKind(p, s)).join()}-${claimed}`} />
                {items.map((s, idx) => {
                  const k = nodeKind(p, s); const i = row++;
                  const isNext = s.id === next;
                  const m = s.impl ? mastery(p, s.impl) : null;
                  const node = (
                    <div className="prow" style={{ ['--off' as never]: `${OFF[i % 8]}px` }}>
                      <div className="pnode-wrap">
                        {isNext && open !== s.id && <span className="pnode-tip">Empezar</span>}
                        <button className={`pnode k-${k}${isNext ? ' is-next' : ''}${k !== 'locked' && !seen.has(s.id) ? ' just' : ''}`} onClick={() => setOpen(open === s.id ? null : s.id)} aria-label={`${s.name}${k === 'locked' ? ', bloqueada' : k === 'done' ? ', completada' : k === 'mastered' ? ', dominada' : ''}`} aria-expanded={open === s.id}>
                          {isNext && <Ring value={m?.score ?? 0} size={100} />}
                          <span className="pnode-face" data-pt="" data-done={k === 'done' || k === 'mastered' ? '1' : '0'}><Icon d={k === 'locked' ? I.lock : k === 'done' ? I.check : k === 'mastered' ? I.crown : I.star} size={34} stroke={k === 'locked' ? 2.6 : 3} /></span>
                        </button>
                        {open === s.id && <NodePop s={s} k={k} isNext={isNext} />}
                      </div>
                      {i === 1 && <div className={`path-mascot ${OFF[1] < 0 ? 'right' : 'left'}`}><div className="mascot-stage">{FRIEND_BY_UNIT[u.n] === 'tesela' ? <Tesela mood={allDone ? 'happy' : 'idle'} size={112} /> : <Friend kind={FRIEND_BY_UNIT[u.n] as never} size={112} />}</div></div>}
                    </div>
                  );
                  const unitTechs = items.filter(x => x.impl).map(x => x.impl!);
                  const practice = idx % 2 === 1 && idx < items.length - 1 && unitTechs.length > 0 ? (() => {
                    const pi = row++; const id = `pr${u.n}-${idx}`; const ready = items.slice(0, idx + 1).some(x => p.lessons[x.id]?.done);
                    return (
                      <div className="prow" key={id} style={{ ['--off' as never]: `${OFF[pi % 8]}px` }}>
                        <div className="pnode-wrap">
                          <button className={`pnode k-${ready ? 'open' : 'locked'} pnode-practice`} onClick={() => setOpen(open === id ? null : id)} aria-label="Práctica de la unidad">
                            <span className="pnode-face" data-pt="" data-done={ready ? '1' : '0'}><Icon d={ready ? I.dumbbell : I.lock} size={34} stroke={2.8} /></span>
                          </button>
                          {open === id && <div className="pnode-pop"><b>Práctica</b><p>Repasa lo de esta unidad con ejercicios nuevos.</p><Btn kind="white" big onClick={() => go(`entrenar-u${u.n}`)}>Practicar +10 XP</Btn></div>}
                        </div>
                      </div>
                    );
                  })() : null;
                  return <React.Fragment key={s.id}>{node}{practice}</React.Fragment>;
                })}
                {items.some(x => x.impl) && (() => {
                  const ti = row++; const id = `tr${u.n}`;
                  return (
                    <div className="prow" key={id} style={{ ['--off' as never]: `${OFF[ti % 8]}px` }}>
                      <div className="pnode-wrap">
                        <button className={`pnode k-${allDone ? 'open' : 'locked'} pnode-trophy`} onClick={() => setOpen(open === id ? null : id)} aria-label="Prueba de la unidad">
                          <span className="pnode-face" data-pt="" data-done={allDone ? '1' : '0'}><Icon d={allDone ? I.trophy : I.lock} size={34} stroke={2.8} /></span>
                        </button>
                        {open === id && <div className="pnode-pop"><b>Prueba de unidad</b><p>{allDone ? 'Un sudoku entero que necesita lo de esta unidad.' : 'Completa las lecciones de la unidad para desbloquearla.'}</p>{allDone && <Btn kind="white" big onClick={() => go(`prueba-u${u.n}`)}>Jugar</Btn>}</div>}
                      </div>
                    </div>
                  );
                })()}
                {pend.length > 0 && (
                  <div className="prow" style={{ ['--off' as never]: `${OFF[row++ % 8]}px` }}>
                    <div className="pnode-wrap">
                      <button className="pnode k-pending" data-pt-wrap onClick={() => setOpen(open === 'p' + u.n ? null : 'p' + u.n)} aria-label="Próximamente"><span className="pnode-face" data-pt="" data-done="0"><Icon d={I.dots} size={34} stroke={4} /></span></button>
                      {open === 'p' + u.n && <div className="pnode-pop"><b>Próximamente</b><p>{pend.map(x => x.name).join(', ')}</p><Btn kind="white" onClick={() => go('biblioteca')}>Ver en técnicas</Btn></div>}
                    </div>
                  </div>
                )}
                {items.length > 0 && (
                  <div className="prow" style={{ ['--off' as never]: `${OFF[row++ % 8]}px` }}>
                    <button className={`chest-btn${allDone && !claimed ? ' ready' : ''}`} disabled={!allDone || claimed} onClick={() => { claimChest(u.n); sfx('chest'); moment({ kind: 'unit', n: u.n }); }} aria-label={claimed ? 'Cofre abierto' : allDone ? 'Abrir cofre: +25 XP' : 'Cofre: completa la unidad'}>
                      <span data-pt="" data-done={allDone ? '1' : '0'} className="chest-pt"><Chest open={claimed} /></span>
                      {allDone && !claimed && <span className="pnode-tip">+25 XP</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
      <aside className="home-side">
        <div className="side-top"><TopStats /></div>
        <QuestsCard />
        <LeagueCard />
        <button className="card card-cta c-purple" onClick={() => go('sudoku-diario')}>
          <Icon d={I.calendar} size={30} />
          <span><b>Reto diario</b><small>{p.daily[today]?.done ? '¡Hecho hoy!' : 'Un sudoku nuevo cada día'}</small></span>
          <Icon d={I.arrow} />
        </button>
        <button className="card card-cta c-orange" onClick={() => go('contrarreloj')}>
          <Icon d={I.clock} size={30} />
          <span><b>Contrarreloj</b><small>Récord: {p.rushBest ?? 0}</small></span>
          <Icon d={I.arrow} />
        </button>
        <button className="card card-cta c-blue" onClick={() => go('entrenar')}>
          <Icon d={I.target} size={30} />
          <span><b>Práctica libre</b><small>Elige técnicas y entrena</small></span>
          <Icon d={I.arrow} />
        </button>
        {(due.length > 0 || openMistakes > 0) && (
          <button className="card card-cta c-orange" onClick={() => go(due.length ? `entrenar-${due[0].impl}` : 'revision')}>
            <Icon d={I.rewind} size={30} />
            <span><b>Repaso</b><small>{due.length ? `${due[0].name}${due.length > 1 ? ` y ${due.length - 1} más` : ''}` : `${openMistakes} por revisar`}</small></span>
            <Icon d={I.arrow} />
          </button>
        )}
      </aside>
    </div>
  );
}

function NodePop({ s, k, isNext }: { s: Sheet; k: NodeKind; isNext: boolean }) {
  const lessonRoute = `leccion-${s.id}`;
  return (
    <div className="pnode-pop" role="dialog" aria-label={s.name}>
      <b>{s.name}</b>
      <p>{k === 'locked' ? `Antes: ${s.prereqs.map(id => SHEET_BY_ID[id]?.name).join(', ')}` : s.intuition}</p>
      <Btn kind="white" big onClick={() => go(lessonRoute)}>{k === 'done' || k === 'mastered' ? 'Repasar' : k === 'locked' ? 'Empezar igual' : 'Empezar'}{isNext ? ' +20 XP' : ''}</Btn>
      <div className="pop-links">
        {s.impl && <button onClick={() => go(`entrenar-${s.impl}`)}>Practicar</button>}
        {s.status === 'ready' && <button onClick={() => go(`tecnica-${s.id}`)}>Ficha</button>}
      </div>
    </div>
  );
}

export function Library() {
  const p = useProgress();
  const [level, setLevel] = useState('Todos');
  const [q, setQ] = useState('');
  const list = SHEETS.filter(s => (level === 'Todos' || s.level === level) && (q === '' || (s.name + ' ' + (s.gloss ?? '') + ' ' + s.aliases.join(' ')).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="library">
      <div className="lib-head">
        <h1>Técnicas</h1>
        <input id="lib-q" className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" aria-label="Buscar técnica" />
      </div>
      <div className="chips lib-levels">
        {['Todos', 'Fundamentos', 'Intermedio', 'Avanzado'].map(l => <button key={l} className={`chip chip-toggle${level === l ? ' on' : ''}`} onClick={() => setLevel(l)} aria-pressed={level === l}>{l}</button>)}
      </div>
      <div className="lcards">
        {list.map(s => {
          const k = nodeKind(p, s);
          const m = s.impl ? mastery(p, s.impl) : null;
          return (
            <button key={s.id} className={`lcard c-${unitColor(s)} k-${k}`} onClick={() => go(s.status === 'concept' ? `leccion-${s.id}` : `tecnica-${s.id}`)}>
              <Ring value={k === 'pending' ? 0 : m ? m.score : p.lessons[s.id]?.done ? 100 : 0} size={58} tone={k === 'mastered' ? 'green' : 'unit'}><span className="lc-abbr">{s.abbr}</span></Ring>
              <span className="lc-txt"><b>{s.name}</b>{s.gloss && <small className="lc-gloss">{s.gloss}</small>}<small>{k === 'pending' ? 'Pronto' : m ? LEVEL_LABEL[m.level] : p.lessons[s.id]?.done ? 'Completada' : 'Sin empezar'}</small></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SheetPage({ sheet }: { sheet: Sheet }) {
  const p = useProgress();
  const ex = useMemo(() => (sheet.impl ? lessonExercise(sheet.impl, 0) : null), [sheet.id]);
  const st = ex?.steps[0];
  const ctl = useFrames(st?.frames ?? [], true);
  const [ans, setAns] = useState<number | null>(null);
  const m = sheet.impl ? mastery(p, sheet.impl) : null;
  const q = sheet.questions[0];
  return (
    <article className={`sheet c-${unitColor(sheet)}`}>
      <div className="sheet-hero">
        <button className="hero-back" onClick={() => go('biblioteca')} aria-label="Volver"><Icon d={I.back} size={22} stroke={2.6} /></button>
        <div className="sh-txt">
          <span className="ub-n">{sheet.level}</span>
          <h1>{sheet.name}</h1>
          {sheet.gloss && <p className="sh-gloss">{sheet.gloss}</p>}
          <p>{sheet.intuition}</p>
          {sheet.status !== 'pending' && (
            <div className="row-actions">
              <Btn kind="white" big icon={I.play} onClick={() => go(`leccion-${sheet.id}`)}>{p.lessons[sheet.id]?.done ? 'Repasar' : 'Empezar'}</Btn>
              {sheet.impl && <Btn kind="ghost-white" big icon={I.target} onClick={() => go(`entrenar-${sheet.impl}`)}>Practicar</Btn>}
            </div>
          )}
        </div>
        {m && <Ring value={m.score} size={96} tone="white"><span className="hero-pct">{m.score}%</span></Ring>}
      </div>
      {sheet.status === 'pending' ? (
        <div className="empty-state"><Tesela mood="think" size={120} /><h2>Próximamente</h2><p className="muted">Aún no está en el motor. No mostramos ejemplos falsos.</p></div>
      ) : (
        <>
        {sceneFor(sheet.id) && <section className="sheet-idea"><h2>La idea, paso a paso</h2><ConceptPlayer id={sheet.id} compact /></section>}
        <div className="sheet-grid">
          {ex && st && (
            <div className="sheet-example">
              <Board values={ex.state.v} cands={ex.state.c} givens={ex.givens} locked={ex.state.v.map(x => x > 0)} overlays={[ctl.frame]} compact />
              <FrameControls ctl={ctl} />
              <p className="caption">{ctl.frame?.text}</p>
            </div>
          )}
          <div className="sheet-info">
            {sheet.analogy && <details open><summary>Imagínalo así</summary><p className="analogy">{sheet.analogy}</p></details>}
            <details><summary>¿Por qué funciona?</summary><p>{sheet.principle}</p></details>
            {sheet.terms && <details><summary>Palabras clave</summary><dl className="terms">{sheet.terms.map(t => <div key={t}><dt>{t}</dt><dd>{GLOSSARY[t]}</dd></div>)}</dl></details>}
            {sheet.conditions.length > 0 && <details><summary>Condiciones</summary><ul>{sheet.conditions.map((c, i) => <li key={i}>{c}</li>)}</ul></details>}
            {sheet.errors.length > 0 && <details><summary>Errores típicos</summary><ul>{sheet.errors.map((e, i) => <li key={i}><b>{e.text}.</b> {e.why}</li>)}</ul></details>}
            {q && (
              <details><summary>Pregunta rápida</summary>
                <p className="quiz-q">{q.q}</p>
                <div className="quiz-opts">{q.options.map((o, k) => <button key={k} className={`quiz-opt${ans !== null && k === q.answer ? ' right' : ans === k ? ' wrong' : ''}`} onClick={() => setAns(k)}><span className="qo-n">{k + 1}</span>{o}</button>)}</div>
                {ans !== null && <p className="small">{q.why}</p>}
              </details>
            )}
            {m && (
              <details><summary>Tu dominio</summary>
                <div className="stat-tiles">
                  <div className="st st-blue"><span>Precisión</span><b>{Math.round(m.acc * 100)}%</b></div>
                  <div className="st st-purple"><span>Variantes</span><b>{m.variety}/{m.varietyTotal}</b></div>
                  <div className="st st-orange"><span>Días</span><b>{m.days}</b></div>
                </div>
                <p className="small muted">{sheet.mastery}</p>
              </details>
            )}
            {sheet.aliases.length > 0 && <p className="small muted">También: {sheet.aliases.join(', ')}</p>}
          </div>
        </div>
        </>
      )}
    </article>
  );
}

/** Camino que une los nodos de una unidad. Se mide el DOM para seguir exactamente el zigzag. */
function PathRoad({ deps }: { deps: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; pts: { x: number; y: number; done: boolean }[] }>({ w: 0, h: 0, pts: [] });
  useLayoutEffect(() => {
    const svg = ref.current; const path = svg?.parentElement; if (!svg || !path) return;
    const measure = () => {
      const r = path.getBoundingClientRect();
      const pts = [...path.querySelectorAll<HTMLElement>('[data-pt]')].map(el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top, done: el.dataset.done === '1' }; });
      setGeo({ w: r.width, h: r.height, pts });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(path);
    return () => ro.disconnect();
  }, [deps]);
  const segs = geo.pts.slice(1).map((b, i) => {
    const a = geo.pts[i]; const dy = (b.y - a.y) / 2;
    return { d: `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`, done: a.done };
  });
  const first = geo.pts[0];
  const last = geo.pts[geo.pts.length - 1];
  if (last && geo.h) { const cx = geo.w / 2, dy = (geo.h - last.y) / 2; segs.push({ d: `M${last.x} ${last.y} C${last.x} ${last.y + dy} ${cx} ${geo.h - dy} ${cx} ${geo.h + 26}`, done: last.done }); }
  return (
    <svg ref={ref} className="road" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`} aria-hidden="true">
      {first && <path d={`M${first.x} 0 L${first.x} ${first.y}`} className="road-base done" />}
      {first && <path d={`M${first.x} 0 L${first.x} ${first.y}`} className="road-top done" />}
      {segs.map((sg, i) => <path key={'b' + i} d={sg.d} className={`road-base${sg.done ? ' done' : ''}`} />)}
      {segs.map((sg, i) => <path key={'t' + i} d={sg.d} className={`road-top${sg.done ? ' done' : ''}`} />)}
      {segs.map((sg, i) => <path key={'c' + i} d={sg.d} className={`road-dash${sg.done ? ' done' : ''}`} />)}
    </svg>
  );
}
