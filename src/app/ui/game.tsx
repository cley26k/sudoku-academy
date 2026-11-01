import React, { useEffect, useRef, useState } from 'react';
import { useProgress, xpTotal, streak, activeDays, dayKey } from '../store';
import { levelOf, dailyQuests, ACHIEVEMENTS, tierOf, TIER_NAME, Toast, SHOP, buy, equip, QUEST_GEMS, Moment, moment, dailyChestState, openDailyChest, weekDays, weekXp, bestWeek, ALL_QUESTS_BONUS } from '../gamify';
import { Icon, I, Btn, Meter, prefersReducedMotion, celebrate } from './common';
import { Chest } from './art';
import { TierBadge } from '../screens/League';
import { TIERS } from '../online';
import { Tesela } from './Tutor';
import { sfx } from '../sound';
import { go } from '../router';

const ic = (name?: string) => (I as Record<string, string>)[name ?? 'star'] ?? I.star;

export function ToastLayer() {
  const [items, setItems] = useState<(Toast & { id: number })[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail; const id = ++n + Date.now();
      setItems(xs => [...xs.slice(-2), { ...t, id }]);
      sfx(t.tone === 'gold' || t.tone === 'level' ? 'complete' : 'chest');
      window.setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), 3200);
    };
    window.addEventListener('sa-toast', on);
    return () => window.removeEventListener('sa-toast', on);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`toast tone-${t.tone ?? 'quest'}`} role="status">
          <span className="toast-ico"><Icon d={ic(t.icon)} size={24} stroke={2.4} /></span>
          <span><b>{t.title}</b>{t.text && <small>{t.text}</small>}</span>
        </div>
      ))}
    </div>
  );
}

/** 1250 → «1,2k»: la cabecera móvil no crece con el saldo. */
const short = (n: number) => (n < 1000 ? String(n) : `${(Math.floor(n / 100) / 10).toLocaleString('es')}k`);
export function LevelGems({ compact }: { compact?: boolean }) {
  const p = useProgress();
  const lv = levelOf(xpTotal(p));
  return (
    <>
      <span className="ts ts-level" title={`Nivel ${lv.level}: ${lv.into}/${lv.need} XP para el siguiente`}>
        <span className="lv-badge" style={{ ['--pct' as never]: `${lv.pct}%` }}>{lv.level}</span>{!compact && <small>Nivel</small>}
      </span>
      <button className="ts ts-gems" onClick={() => go('tienda')} title={`${p.gems ?? 0} gemas: abre la tienda`} aria-label={`${p.gems ?? 0} gemas. Abrir la tienda`}><Icon d={I.gem} size={20} stroke={2.4} /><b>{short(p.gems ?? 0)}</b></button>
    </>
  );
}

export function QuestsCard() {
  const p = useProgress();
  const day = new Date(); const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const qs = dailyQuests(key);
  const claimed = p.quests?.[key] ?? [];
  const done = qs.filter(q => claimed.includes(q.id)).length;
  return (
    <div className="card quests">
      <div className="card-head"><h3>Misiones de hoy</h3><span className="muted small">{done}/{qs.length}</span></div>
      {qs.map(q => {
        const v = Math.min(q.goal, q.value(p)); const ok = claimed.includes(q.id) || v >= q.goal;
        return (
          <div key={q.id} className={`quest${ok ? ' ok' : ''}`}>
            <span className="q-ico"><Icon d={ok ? I.check : I.target} size={18} stroke={2.8} /></span>
            <div className="q-body"><span>{q.text}</span><div className="q-bar"><Meter value={(100 * v) / q.goal} tone="yellow" /><small>{v}/{q.goal}</small></div></div>
            <span className="q-gem"><Icon d={I.gem} size={14} stroke={2.6} />{QUEST_GEMS}</span>
          </div>
        );
      })}
      <DailyChestRow />
    </div>
  );
}

export function AchievementsGrid() {
  const p = useProgress();
  return (
    <div className="achs">
      {ACHIEVEMENTS.map(a => {
        const t = tierOf(a, p), v = a.value(p), next = a.tiers[Math.min(2, t)];
        return (
          <div key={a.id} className={`ach t${t}`}>
            <span className="ach-medal"><Icon d={ic(a.icon)} size={26} stroke={2.4} /></span>
            <b>{a.name}</b>
            <small>{a.desc}</small>
            <div className="ach-prog">{t < 3 ? <><Meter value={(100 * v) / next} tone="yellow" /><small>{Math.min(v, next)}/{next}</small></> : <small className="ach-gold">¡Oro!</small>}</div>
            <span className="ach-tier">{t ? TIER_NAME[t] : 'Sin empezar'}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Shop() {
  const p = useProgress();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="shop">
      <div className="shop-head">
        <div><h1>Tienda</h1><p className="muted">Gana gemas con misiones, logros y subiendo de nivel.</p></div>
        <span className="gem-big"><Icon d={I.gem} size={26} stroke={2.4} />{p.gems ?? 0}</span>
      </div>
      <div className="shop-preview"><Tesela mood="happy" size={150} /></div>
      {msg && <div className="notice">{msg}</div>}
      <div className="shop-grid">
        {SHOP.map(it => {
          const owned = it.slot ? p.owned?.includes(it.id) : false;
          const on = it.slot ? p.equipped?.[it.slot] === it.id : false;
          return (
            <div key={it.id} className={`shop-item${on ? ' on' : ''}`}>
              <div className="si-art">{it.slot ? <Tesela mood="idle" size={86} wear={{ [it.slot]: it.id }} /> : <span className="si-shield"><Icon d={I.shield} size={42} stroke={2.2} /><b>{p.freezes ?? 0}/2</b></span>}</div>
              <b>{it.name}</b>
              <small>{it.desc}</small>
              {owned ? <>{on && <span className="si-on"><Icon d={I.check} size={14} stroke={3} /> Puesto</span>}<Btn kind={on ? 'ghost' : 'primary'} onClick={() => { equip(it.id); sfx('select'); }}>{on ? 'Quitar' : 'Ponérselo'}</Btn></>
                : <Btn kind="primary" disabled={(p.gems ?? 0) < it.price} onClick={() => { const e = buy(it.id); setMsg(e); if (!e) sfx('chest'); }}><Icon d={I.gem} size={16} stroke={2.6} /> {it.price}</Btn>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Número que cuenta hacia arriba (respeta «reducir movimiento»). */
export function CountUp({ to, from = 0, dur = 900, delay = 0, fmt = (n: number) => String(n) }: { to: number; from?: number; dur?: number; delay?: number; fmt?: (n: number) => string }) {
  const [v, setV] = useState(prefersReducedMotion() ? to : from);
  useEffect(() => {
    if (prefersReducedMotion()) { setV(to); return; }
    let raf = 0; const t0 = performance.now() + delay;
    const tick = (t: number) => { const k = Math.max(0, Math.min(1, (t - t0) / dur)); setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, from, dur, delay]);
  return <>{fmt(v)}</>;
}

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
/** Semana actual: un círculo por día. */
export function WeekStrip({ pop }: { pop?: boolean }) {
  const p = useProgress();
  const act = activeDays(p), frozen = new Set(p.freezeDays ?? []), today = dayKey(Date.now());
  const days = weekDays(0);
  return (
    <div className={`week${pop ? ' pop' : ''}`} role="img" aria-label={`Esta semana: ${days.filter(d => act.has(d)).length} de 7 días con práctica`}>
      {days.map((d, i) => {
        const k = frozen.has(d) ? 'frozen' : act.has(d) ? 'on' : d === today ? 'today' : d > today ? 'future' : 'off';
        return (
          <span key={d} className={`wd wd-${k}`} style={{ ['--i' as never]: i }}>
            <small>{DOW[i]}</small>
            <i>{k === 'on' ? <Icon d={I.flame} size={16} stroke={2.6} /> : k === 'frozen' ? <Icon d={I.shield} size={15} stroke={2.6} /> : null}</i>
          </span>
        );
      })}
    </div>
  );
}

/** Pastilla de racha con desplegable. */
export function StreakChip() {
  const p = useProgress();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const n = streak(p), todayOn = activeDays(p).has(dayKey(Date.now()));
  return (
    <span className="streak-wrap" ref={ref}>
      <button className={`ts ts-flame${todayOn ? '' : ' cold'}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`Racha: ${n} días`}><Icon d={I.flame} size={22} stroke={2.4} /><b>{n}</b></button>
      {open && (
        <div className="streak-pop" role="dialog" aria-label="Tu racha">
          <div className="sp-head"><b>{n}</b><span>{n === 1 ? 'día de racha' : 'días de racha'}</span></div>
          <WeekStrip />
          <p className="sp-note">{todayOn ? '¡Hoy ya cuenta!' : 'Practica hoy para no perderla.'}</p>
          <div className="sp-foot"><span><Icon d={I.trophy} size={16} stroke={2.6} />Récord {Math.max(p.bestStreak ?? 0, n)}</span><span><Icon d={I.shield} size={16} stroke={2.6} />{p.freezes ?? 0} protector{(p.freezes ?? 0) === 1 ? '' : 'es'}</span></div>
        </div>
      )}
    </span>
  );
}

function DailyChestRow() {
  const p = useProgress();
  const st = dailyChestState(p);
  if (st === 'ready') return <button className="q-chest ready" onClick={() => { if (openDailyChest()) moment({ kind: 'chest', n: ALL_QUESTS_BONUS }); }}><span className="qc-art"><Chest open={false} /></span><b>Abrir cofre del día</b></button>;
  return <div className={`q-chest${st === 'open' ? ' open' : ''}`}><span className="qc-art"><Chest open={st === 'open'} /></span>{st === 'open' ? <span>Abierto · vuelve mañana</span> : <span>Completa las 3 misiones</span>}</div>;
}

/** Pantallas de celebración: una a la vez y nunca en mitad de un ejercicio. */
export function MomentLayer({ paused }: { paused: boolean }) {
  const [queue, setQueue] = useState<Moment[]>([]);
  useEffect(() => {
    const on = (e: Event) => setQueue(q => { const m = (e as CustomEvent<Moment>).detail; return q.some(x => x.kind === m.kind) ? q.map(x => (x.kind === m.kind ? m : x)) : [...q, m]; });
    window.addEventListener('sa-moment', on); return () => window.removeEventListener('sa-moment', on);
  }, []);
  const m = paused ? null : queue[0];
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!m) return; celebrate(); btn.current?.focus(); }, [m]);
  if (!m) return null;
  const close = () => setQueue(q => q.slice(1));
  return (
    <div className={`moment m-${m.kind}`} role="dialog" aria-modal="true" aria-labelledby="moment-t" onKeyDown={e => e.key === 'Escape' && close()}>
      <div className="moment-in">
        {m.kind === 'streak' && <>
          <div className="mo-flame"><Icon d={I.flame} size={120} stroke={1.6} /><b><CountUp from={Math.max(0, m.n - 1)} to={m.n} delay={350} dur={500} /></b></div>
          <h1 id="moment-t">{m.n === 1 ? '¡Empieza tu racha!' : `¡${m.n} días seguidos!`}</h1>
          <WeekStrip pop />
          <p>Vuelve mañana para que siga creciendo.</p>
        </>}
        {m.kind === 'level' && <>
          <div className="mo-level"><span><CountUp from={m.n - 1} to={m.n} delay={500} dur={300} /></span></div>
          <h1 id="moment-t">¡Nivel {m.n}!</h1>
          <p className="mo-gems"><Icon d={I.gem} size={20} stroke={2.6} />+5</p>
        </>}
        {m.kind === 'chest' && <>
          <div className="mo-chest"><Chest open /></div>
          <h1 id="moment-t">Cofre del día</h1>
          <p className="mo-gems big"><Icon d={I.gem} size={28} stroke={2.4} />+<CountUp to={m.n} delay={500} /></p>
        </>}
        {m.kind === 'league' && <>
          <div className={`mo-tier${m.up === 1 ? ' up' : ' down'}`}><TierBadge tier={m.n} size={150} /></div>
          <h1 id="moment-t">{m.up === 1 ? `¡Subiste a Liga ${TIERS[m.n].name}!` : `Bajas a Liga ${TIERS[m.n].name}`}</h1>
          <p>{m.up === 1 ? `Terminaste ${m.rank}º la semana pasada.` : 'Una semana floja le pasa a cualquiera. ¡A por la revancha!'}</p>
        </>}
        {m.kind === 'unit' && <>
          <div className="mo-level unit"><Icon d={I.crown} size={64} stroke={2} /></div>
          <h1 id="moment-t">¡Unidad {m.n} completa!</h1>
          <p>Cofre de unidad: +25 XP</p>
        </>}
      </div>
      <div className="moment-bar"><button ref={btn} className="btn btn-primary btn-big" onClick={close}><span>Continuar</span></button></div>
    </div>
  );
}

/** Liga contigo mismo: esta semana frente a la anterior. */
export function WeekLeague() {
  const p = useProgress();
  const now = weekXp(p, 0), prev = weekXp(p, 1);
  const tNow = now.reduce((a, b) => a + b, 0), tPrev = prev.reduce((a, b) => a + b, 0), best = bestWeek(p);
  const max = Math.max(20, ...now, ...prev);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const delta = tNow - tPrev;
  return (
    <div className="card league">
      <div className="card-head"><h3>Tu semana</h3>{tPrev > 0 && <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '+' : ''}{delta} XP</span>}</div>
      <div className="lg-total"><b><CountUp to={tNow} /></b><span>XP</span>{tNow > best && best > 0 && <em className="lg-rec">Récord</em>}</div>
      <div className="lg-bars" role="img" aria-label={`Esta semana ${tNow} XP; la anterior ${tPrev} XP`}>
        {now.map((v, i) => (
          <div key={i} className={`lg-col${i === todayIdx ? ' today' : ''}`}>
            <div className="lg-track"><span className="lg-prev" style={{ height: `${(100 * prev[i]) / max}%` }} /><span className="lg-now" style={{ height: `${i > todayIdx ? 0 : Math.max(v ? 6 : 0, (100 * v) / max)}%`, ['--i' as never]: i }} /></div>
            <small>{DOW[i]}</small>
          </div>
        ))}
      </div>
      <div className="lg-legend"><span><i className="k-now" />Esta semana</span><span><i className="k-prev" />Anterior · {tPrev}</span></div>
    </div>
  );
}

/** Ficha del jugador: avatar con lo que lleva puesto, nivel y medallas. */
export function ProfileCard() {
  const p = useProgress();
  const xp = xpTotal(p), lv = levelOf(xp);
  const golds = ACHIEVEMENTS.filter(a => tierOf(a, p) === 3).length, medals = ACHIEVEMENTS.reduce((s, a) => s + tierOf(a, p), 0);
  return (
    <div className="profile">
      <button className="pf-avatar" onClick={() => go('tienda')} aria-label="Cambiar el aspecto de Tesela en la tienda"><Tesela mood="happy" size={112} /><span className="pf-edit"><Icon d={I.shop} size={16} stroke={2.6} /></span></button>
      <div className="pf-main">
        <div className="pf-level"><span className="lv-badge big" style={{ ['--pct' as never]: `${lv.pct}%` }}>{lv.level}</span><div><b>Nivel {lv.level}</b><small>{lv.need - lv.into} XP para el {lv.level + 1}</small></div></div>
        <Meter value={lv.pct} tone="yellow" />
        <div className="pf-chips">
          <span><Icon d={I.flame} size={16} stroke={2.6} />{Math.max(p.bestStreak ?? 0, streak(p))}<small>récord</small></span>
          <span><Icon d={I.medal} size={16} stroke={2.6} />{medals}<small>medallas{golds ? ` · ${golds} oro` : ''}</small></span>
          <span><Icon d={I.gem} size={16} stroke={2.6} />{p.gems ?? 0}<small>gemas</small></span>
        </div>
      </div>
    </div>
  );
}
