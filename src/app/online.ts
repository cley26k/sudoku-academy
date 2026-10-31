// Liga y ranking en línea (Supabase). Todo pasa por funciones RPC del servidor (ver supabase/schema.sql).
// Si no hay configuración, la app funciona igual y la liga lo dice con claridad: nunca hay datos inventados.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { getProgress, update, xpTotal, streak } from './store';
import { levelOf, weekXp, moment, toast } from './gamify';
import { useEffect, useState } from 'react';

export const onlineEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const TIERS = [
  { name: 'Bronce', c: '#d9925a', d: '#b06a33' }, { name: 'Plata', c: '#b8c2d1', d: '#8e99aa' }, { name: 'Oro', c: '#ffc83d', d: '#e3a500' },
  { name: 'Zafiro', c: '#4c7dff', d: '#2f5bd6' }, { name: 'Rubí', c: '#ff4f7b', d: '#d42e58' }, { name: 'Esmeralda', c: '#2fcf7f', d: '#1f9e5e' },
  { name: 'Amatista', c: '#a970ff', d: '#7e47d9' }, { name: 'Perla', c: '#f1c9d8', d: '#cf9db1' }, { name: 'Obsidiana', c: '#4a4e62', d: '#2c2f3d' },
  { name: 'Diamante', c: '#62d4ff', d: '#2aa6d6' },
];
export const PROMOTE = 7, DEMOTE = 5, DEMOTE_MIN = 10;

export class OnlineError extends Error { constructor(public code: string) { super(code); } }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!onlineEnabled()) throw new OnlineError('disabled');
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch { throw new OnlineError('offline'); }
  if (!r.ok) {
    const e = await r.json().catch(() => ({} as { message?: string }));
    const m = String((e as { message?: string }).message ?? r.status);
    throw new OnlineError(m.includes('bad_name') ? 'bad_name' : m.includes('auth') ? 'auth' : 'server');
  }
  return r.json() as Promise<T>;
}

export interface Row { name: string; xp: number; level: number; streak?: number; tier?: number; look: Record<string, string>; me: boolean }
export interface GroupRes { tier: number | null; ends_at: string; rows: Row[] }
export interface TopRes { rows: Row[]; me: { rank: number; xp: number } | null; players: number }
interface SyncRes { week: string; tier: number; xp: number; ends_at: string; name: string; moved: null | { week: string; rank: number; size: number; from: number; to: number; result: number } }

export const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_. -]{3,16}$/;

export async function join(name: string) {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(n)) throw new OnlineError('bad_name');
  const r = await rpc<{ id: string; secret: string }>('sa_register', { p_name: n });
  update(p => { p.online = { id: r.id, secret: r.secret, name: n }; });
  await sync();
}

let inflight: Promise<void> | null = null;
export function sync(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const p = getProgress();
    if (!onlineEnabled() || !p.online) return;
    const total = xpTotal(p);
    const r = await rpc<SyncRes>('sa_sync', {
      p_id: p.online.id, p_secret: p.online.secret, p_name: p.online.name, p_xp_total: total,
      p_week_xp: weekXp(p, 0).reduce((a, b) => a + b, 0), p_level: levelOf(total).level, p_streak: streak(p), p_look: p.equipped ?? {},
    });
    update(pp => { pp.league = { week: r.week, tier: r.tier, xp: r.xp, ends_at: r.ends_at, t: Date.now() }; if (pp.online) pp.online.name = r.name; });
    if (r.moved) {
      if (r.moved.result !== 0) moment({ kind: 'league', n: r.moved.to, up: r.moved.result, rank: r.moved.rank });
      else toast({ title: `Sigues en Liga ${TIERS[r.moved.to].name}`, text: `Acabaste ${r.moved.rank}º de ${r.moved.size}. Nueva semana, nuevo grupo.`, icon: 'trophy', tone: 'quest' });
    }
  })().catch(e => { if (e instanceof OnlineError && e.code === 'auth') update(pp => { pp.online = undefined; }); throw e; })
    .finally(() => { inflight = null; });
  return inflight;
}
export async function rename(name: string) {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(n)) throw new OnlineError('bad_name');
  const old = getProgress().online?.name;
  update(p => { if (p.online) p.online.name = n; });
  try { await sync(); } catch (e) { update(p => { if (p.online && old) p.online.name = old; }); throw e; }
}
export const fetchGroup = () => rpc<GroupRes>('sa_group', { p_id: getProgress().online?.id });
export const fetchTop = (kind: 'all' | 'week') => rpc<TopRes>('sa_top', { p_kind: kind, p_id: getProgress().online?.id ?? null });

/** Cuenta atrás legible hasta el cierre de la liga. */
export function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now(); if (!(ms > 0)) return 'cerrando…';
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

/** Hook de carga con estado explícito (cargando / listo / error). */
export function useRemote<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [st, setSt] = useState<{ s: 'load' | 'ok' | 'err'; v?: T; e?: string }>({ s: 'load' });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true; setSt(x => ({ ...x, s: x.v ? 'ok' : 'load' }));
    const t = window.setTimeout(() => alive && setSt(x => (x.s === 'load' ? { s: 'err', e: 'offline' } : x)), 10000);
    fn().then(v => alive && setSt({ s: 'ok', v }), e => alive && setSt({ s: 'err', e: e instanceof OnlineError ? e.code : 'server' })).finally(() => window.clearTimeout(t));
    return () => { alive = false; window.clearTimeout(t); };
  }, [...deps, n]);
  return { ...st, reload: () => setN(x => x + 1) };
}
