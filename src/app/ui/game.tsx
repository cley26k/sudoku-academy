import React, { useEffect, useState } from 'react';
import { useProgress, xpTotal } from '../store';
import { levelOf, dailyQuests, ACHIEVEMENTS, tierOf, TIER_NAME, Toast, SHOP, buy, equip, QUEST_GEMS } from '../gamify';
import { Icon, I, Btn, Meter } from './common';
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

export function LevelGems({ compact }: { compact?: boolean }) {
  const p = useProgress();
  const lv = levelOf(xpTotal(p));
  return (
    <>
      <span className="ts ts-level" title={`Nivel ${lv.level}: ${lv.into}/${lv.need} XP para el siguiente`}>
        <span className="lv-badge" style={{ ['--pct' as never]: `${lv.pct}%` }}>{lv.level}</span>{!compact && <small>Nivel</small>}
      </span>
      <button className="ts ts-gems" onClick={() => go('tienda')} title="Gemas: abre la tienda"><Icon d={I.gem} size={20} stroke={2.4} /><b>{p.gems ?? 0}</b></button>
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
      <div className={`q-chest${done === qs.length ? ' open' : ''}`}><Icon d={I.chest} size={18} /> {done === qs.length ? '¡Cofre del día abierto!' : 'Completa las 3 para abrir el cofre del día'}</div>
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
              {owned ? <Btn kind={on ? 'primary' : 'ghost'} onClick={() => { equip(it.id); sfx('select'); }}>{on ? 'Puesto' : 'Ponérselo'}</Btn>
                : <Btn kind="primary" disabled={(p.gems ?? 0) < it.price} onClick={() => { const e = buy(it.id); setMsg(e); if (!e) sfx('chest'); }}><Icon d={I.gem} size={16} stroke={2.6} /> {it.price}</Btn>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
