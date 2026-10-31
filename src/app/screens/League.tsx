import React, { useState } from 'react';
import { useProgress } from '../store';
import { onlineEnabled, TIERS, PROMOTE, DEMOTE, DEMOTE_MIN, join, rename, fetchGroup, fetchTop, timeLeft, useRemote, OnlineError, NAME_RE, Row, sync } from '../online';
import { Btn, I, Icon, Segmented } from '../ui/common';
import { Tesela } from '../ui/Tutor';
import { sfx } from '../sound';
import { go } from '../router';

/** Escudo de liga: forma limpia, color plano y «labio» inferior, como el resto de la app. */
export function TierBadge({ tier, size = 56, locked }: { tier: number; size?: number; locked?: boolean }) {
  const t = TIERS[Math.max(0, Math.min(9, tier))];
  const c = locked ? 'var(--surface-3)' : t.c, d = locked ? 'var(--line-d)' : t.d;
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 60 66" aria-hidden="true" className="tier-badge">
      <path d="M30 6 L52 14 V32 C52 46 42 56 30 61 C18 56 8 46 8 32 V14 Z" fill={d} transform="translate(0 4)" />
      <path d="M30 4 L52 12 V30 C52 44 42 54 30 59 C18 54 8 44 8 30 V12 Z" fill={c} />
      {!locked && <path d="M30 13 L44 18.5 V30 C44 39 38 45.5 30 49 Z" fill="#fff" opacity=".28" />}
      {!locked && <path d="M22 30 l5 -8 h6 l5 8 l-8 10 z" fill="#fff" opacity=".9" />}
      {locked && <path d="M24 30 h12 v9 h-12z M26.5 30 v-3 a3.5 3.5 0 0 1 7 0 v3" fill="none" stroke="var(--ink-3)" strokeWidth="2.6" strokeLinejoin="round" />}
    </svg>
  );
}

function errText(code?: string) {
  if (code === 'bad_name') return 'Usa de 3 a 16 letras, números, espacios, puntos o guiones.';
  if (code === 'offline') return 'No hay conexión con la liga. Tu progreso sigue guardado y se enviará después.';
  return 'La liga no responde ahora mismo. Inténtalo en un rato.';
}

function JoinCard() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = NAME_RE.test(name.trim());
  return (
    <div className="league-join">
      <div className="lj-badges">{[0, 1, 2].map(t => <TierBadge key={t} tier={t} size={t === 1 ? 74 : 56} />)}</div>
      <h1>Compite cada semana</h1>
      <p className="muted">Un grupo de hasta 30 personas. Los {PROMOTE} primeros suben de liga el lunes.</p>
      <form onSubmit={async e => { e.preventDefault(); if (!ok || busy) return; setBusy(true); setErr(null); try { await join(name); sfx('complete'); } catch (x) { setErr(errText(x instanceof OnlineError ? x.code : 'server')); } finally { setBusy(false); } }}>
        <label htmlFor="lg-name" className="sr-only">Tu nombre en la liga</label>
        <input id="lg-name" className="lj-input" value={name} maxLength={16} autoComplete="nickname" placeholder="Tu nombre en la liga" onChange={e => setName(e.target.value)} />
        <Btn kind="primary" big disabled={!ok || busy}>{busy ? 'Entrando…' : 'Unirme'}</Btn>
      </form>
      {err && <p className="lj-err" role="alert">{err}</p>}
      <p className="small muted">Solo se publica tu nombre, tu XP, tu nivel y el aspecto de Tesela.</p>
    </div>
  );
}

const seen = new WeakSet<Element>();
function RankRow({ r, i, zone }: { r: Row; i: number; zone?: 'up' | 'down' }) {
  return (
    <li ref={r.me ? (el => { if (el && !seen.has(el)) { seen.add(el); window.setTimeout(() => { const b = el.getBoundingClientRect(); if (b.bottom > innerHeight - 90 || b.top < 0) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 500); } }) : undefined} className={`lrow${r.me ? ' me' : ''}${zone ? ' z-' + zone : ''}`} style={{ ['--i' as never]: Math.min(i, 20) }}>
      <span className={`lr-n${i < 3 ? ' top' + (i + 1) : ''}`}>{i + 1}</span>
      <span className="lr-av"><Tesela mood={r.me ? 'happy' : 'idle'} size={40} wear={r.look ?? {}} /></span>
      <span className="lr-name"><b>{r.name}</b>{r.me && <small>Tú</small>}</span>
      {r.tier !== undefined && <span className="lr-tier" title={`Liga ${TIERS[r.tier].name}`}><TierBadge tier={r.tier} size={20} /></span>}
      <span className="lr-xp">{r.xp} XP</span>
    </li>
  );
}

function GroupView() {
  const p = useProgress();
  const g = useRemote(fetchGroup, [p.league?.t]);
  if (g.s === 'load') return <div className="league-skel" aria-busy="true">{Array.from({ length: 6 }, (_, k) => <div key={k} />)}</div>;
  if (g.s === 'err' || !g.v) return <div className="notice">{errText(g.e)} <button className="link" onClick={g.reload}>Reintentar</button></div>;
  const rows = g.v.rows, n = rows.length;
  const up = rows.filter(r => r.xp > 0).length >= 1 ? PROMOTE : 0;
  const down = n >= DEMOTE_MIN && (g.v.tier ?? 0) > 0 ? DEMOTE : 0;
  return (
    <ol className="lrows">
      {rows.map((r, i) => {
        const zone = i < up && r.xp > 0 && (g.v!.tier ?? 0) < 9 ? 'up' : i >= n - down ? 'down' : undefined;
        return (
          <React.Fragment key={i}>
            {down > 0 && i === n - down && <li className="lzone down" aria-hidden="true"><Icon d="M12 5v14M6 13l6 6 6-6" size={16} stroke={3} />Zona de descenso</li>}
            <RankRow r={r} i={i} zone={zone} />
            {i === up - 1 && i < n - 1 && (g.v!.tier ?? 0) < 9 && <li className="lzone up" aria-hidden="true"><Icon d="M12 19V5M6 11l6-6 6 6" size={16} stroke={3} />Zona de ascenso</li>}
          </React.Fragment>
        );
      })}
      {n === 1 && <li className="lempty">De momento estás solo en tu grupo. Se irá llenando a medida que entre gente esta semana.</li>}
    </ol>
  );
}

function TopView({ kind }: { kind: 'all' | 'week' }) {
  const p = useProgress();
  const t = useRemote(() => fetchTop(kind), [kind, p.league?.t]);
  if (t.s === 'load') return <div className="league-skel" aria-busy="true">{Array.from({ length: 6 }, (_, k) => <div key={k} />)}</div>;
  if (t.s === 'err' || !t.v) return <div className="notice">{errText(t.e)} <button className="link" onClick={t.reload}>Reintentar</button></div>;
  const inTop = t.v.rows.some(r => r.me);
  return (
    <>
      <p className="small muted lt-sub">{t.v.players} {t.v.players === 1 ? 'jugador' : 'jugadores'} en total{t.v.me && !inTop ? ` · tu puesto: ${t.v.me.rank}º con ${t.v.me.xp} XP` : ''}</p>
      {t.v.rows.length ? <ol className="lrows">{t.v.rows.map((r, i) => <RankRow key={i} r={r} i={i} />)}</ol> : <p className="lempty">Aún nadie ha sumado XP {kind === 'week' ? 'esta semana' : ''}. ¡Sé el primero!</p>}
    </>
  );
}

export function League() {
  const p = useProgress();
  const [tab, setTab] = useState<'group' | 'week' | 'all'>('group');
  const [editing, setEditing] = useState(false);
  const [nm, setNm] = useState(p.online?.name ?? '');
  const [err, setErr] = useState<string | null>(null);
  if (!onlineEnabled()) return (
    <div className="league">
      <div className="empty-state"><Tesela mood="think" size={120} /><h2>La liga aún no está conectada</h2><p className="muted">Esta versión no tiene servidor de ranking. Cuando se active, aquí verás tu grupo de la semana y el top global.</p></div>
    </div>
  );
  if (!p.online) return <div className="league"><JoinCard /></div>;
  const tier = p.league?.tier ?? 0;
  return (
    <div className="league">
      <div className="lg-head">
        <div className="lg-strip" aria-label={`Ligas: estás en ${TIERS[tier].name}`}>
          {TIERS.map((_, k) => <span key={k} className={k === tier ? 'cur' : ''}><TierBadge tier={k} size={k === tier ? 64 : 34} locked={k > tier} /></span>)}
        </div>
        <h1>Liga {TIERS[tier].name}</h1>
        <p className="muted">{p.league ? <>Los {PROMOTE} primeros suben · termina en <b>{timeLeft(p.league.ends_at)}</b></> : 'Conectando…'}</p>
        <div className="lg-me">
          {!editing ? <>
            <span>Juegas como <b>{p.online.name}</b></span>
            <button className="link" onClick={() => { setNm(p.online!.name); setEditing(true); setErr(null); }}>Cambiar</button>
          </> : (
            <form onSubmit={async e => { e.preventDefault(); try { await rename(nm); setEditing(false); } catch (x) { setErr(errText(x instanceof OnlineError ? x.code : 'server')); } }}>
              <input className="lj-input sm" value={nm} maxLength={16} onChange={e => setNm(e.target.value)} aria-label="Nuevo nombre" autoFocus />
              <Btn kind="primary" disabled={!NAME_RE.test(nm.trim())}>Guardar</Btn>
              <Btn kind="ghost" type="button" onClick={() => setEditing(false)}>Cancelar</Btn>
            </form>
          )}
        </div>
        {err && <p className="lj-err" role="alert">{err}</p>}
      </div>
      <div className="lg-tabs"><Segmented label="Ranking" value={tab} onChange={v => { setTab(v); sync().catch(() => {}); }} options={[{ v: 'group', label: 'Mi grupo' }, { v: 'week', label: 'Semana' }, { v: 'all', label: 'Histórico' }]} /></div>
      {tab === 'group' ? <GroupView /> : <TopView kind={tab} key={tab} />}
    </div>
  );
}

/** Tarjeta pequeña para el mapa. */
export function LeagueCard() {
  const p = useProgress();
  if (!onlineEnabled()) return null;
  const tier = p.league?.tier ?? 0;
  return (
    <button className="card card-cta league-card" onClick={() => go('liga')}>
      <TierBadge tier={tier} size={40} locked={!p.online} />
      <span><b>{p.online ? `Liga ${TIERS[tier].name}` : 'Ligas semanales'}</b><small>{p.online && p.league ? `${p.league.xp} XP esta semana · ${timeLeft(p.league.ends_at)}` : 'Compite con otros jugadores'}</small></span>
      <Icon d={I.arrow} />
    </button>
  );
}
