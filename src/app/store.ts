// Progreso del usuario: persistencia local, intentos, errores y cálculo de dominio.
import { useSyncExternalStore } from 'react';
import type { TechId } from '../engine/step';
import { SHEET_BY_ID, sheetForTech, READY } from '../content/catalog';

export type AttemptKind = 'recognize' | 'deduce' | 'execute' | 'lesson' | 'test' | 'full';
export interface Attempt { t: number; tech: TechId; kind: AttemptKind; ok: boolean; hints: number; errors: number; ms: number; variant: string; exId: string }
export interface Mistake { id: string; t: number; tech: TechId; exId: string; kind: AttemptKind; note: string; resolved: boolean }
export interface Session { start: number; end: number; count: number; ok: number }
export interface Progress {
  v: 1;
  lessons: Record<string, { done: boolean; test: boolean; t: number }>;
  attempts: Attempt[];
  mistakes: Mistake[];
  sessions: Session[];
  daily: Record<string, { done: boolean; ms: number }>;
  settings: { streaks: boolean; theme: 'system' | 'light' | 'dark'; sound: boolean; music: boolean };
  fullSolved: number;
  chests: number[];
  welcomed?: boolean;
}
const KEY = 'sudoku-academy/v1';
const fresh = (): Progress => ({ v: 1, lessons: {}, attempts: [], mistakes: [], sessions: [], daily: {}, settings: { streaks: true, theme: 'system', sound: true, music: false }, fullSolved: 0, chests: [] });

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (p && p.v === 1) return { ...fresh(), ...p, settings: { ...fresh().settings, ...p.settings } }; }
  } catch { /* almacenamiento no disponible */ }
  return fresh();
}
let state: Progress = load();
let storageOk = true;
const listeners = new Set<() => void>();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch { storageOk = false; }
}
export function update(fn: (p: Progress) => Progress | void) {
  const draft: Progress = structuredClone(state);
  const r = fn(draft);
  state = r ?? draft;
  save();
  listeners.forEach(l => l());
}
export const getProgress = () => state;
export const storageAvailable = () => storageOk;
export function useProgress(): Progress {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

// ---- Sesión actual ----
let session: Session | null = null;
function touchSession(ok: boolean) {
  const now = Date.now();
  if (!session || now - session.end > 30 * 60 * 1000) { session = { start: now, end: now, count: 0, ok: 0 }; state.sessions.push(session); }
  session.end = now; session.count++; if (ok) session.ok++;
  const last = state.sessions[state.sessions.length - 1];
  if (last && last.start === session.start) Object.assign(last, session);
  if (state.sessions.length > 200) state.sessions = state.sessions.slice(-200);
}

export function recordAttempt(a: Omit<Attempt, 't'>, mistakeNote?: string) {
  update(p => {
    const at: Attempt = { ...a, t: Date.now() };
    p.attempts.push(at);
    if (p.attempts.length > 3000) p.attempts = p.attempts.slice(-3000);
    if (!a.ok && mistakeNote && a.exId) {
      if (!p.mistakes.some(m => m.exId === a.exId && !m.resolved))
        p.mistakes.push({ id: `${at.t}-${a.exId}`, t: at.t, tech: a.tech, exId: a.exId, kind: a.kind, note: mistakeNote, resolved: false });
    }
    if (a.ok && a.exId) p.mistakes.forEach(m => { if (m.exId === a.exId) m.resolved = true; });
    state = p; touchSession(a.ok);
  });
}
export function resolveMistake(id: string) { update(p => { const m = p.mistakes.find(x => x.id === id); if (m) m.resolved = true; }); }

export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---- Dominio ----
export type Level = 'nuevo' | 'aprendiendo' | 'practicando' | 'dominada';
export interface Mastery { score: number; level: Level; acc: number; n: number; variety: number; varietyTotal: number; days: number; test: boolean; lesson: boolean; last: number | null; due: boolean; hintRate: number }
export const LEVEL_LABEL: Record<Level, string> = { nuevo: 'Sin empezar', aprendiendo: 'Aprendiendo', practicando: 'Practicando', dominada: 'Dominada' };

export function mastery(p: Progress, tech: TechId): Mastery {
  const sheet = sheetForTech(tech);
  const rel = p.attempts.filter(a => a.tech === tech && a.kind !== 'full');
  const scored = rel.filter(a => a.kind !== 'lesson').slice(-12);
  const val = (a: Attempt) => (a.ok ? Math.max(0, 1 - 0.2 * a.hints) * (a.errors ? 0.8 : 1) : 0);
  const acc = scored.length ? scored.reduce((s, a) => s + val(a), 0) / scored.length : 0;
  const volume = Math.min(1, scored.length / 8);
  const variants = Object.keys(sheet.variants ?? { x: 1 });
  const cleanVariants = new Set(rel.filter(a => a.ok && a.hints === 0).map(a => a.variant).filter(v => variants.includes(v)));
  const variety = Math.min(cleanVariants.size, variants.length);
  const days = new Set(rel.filter(a => a.ok).map(a => dayKey(a.t))).size;
  const lesson = !!p.lessons[sheet.id]?.done, test = !!p.lessons[sheet.id]?.test;
  const score = Math.round(100 * (0.55 * acc * volume + 0.25 * (variety / variants.length) + 0.2 * Math.min(1, days / 3)));
  const last = rel.length ? rel[rel.length - 1].t : null;
  let level: Level = 'nuevo';
  if (rel.length || lesson) level = 'aprendiendo';
  if (score >= 40) level = 'practicando';
  if (score >= 75 && test) level = 'dominada';
  const intervalDays = level === 'dominada' ? 7 : level === 'practicando' ? 3 : 2;
  const due = last !== null && (level === 'dominada' || level === 'practicando') && Date.now() - last > intervalDays * 86400000;
  const hintRate = scored.length ? scored.filter(a => a.hints > 0).length / scored.length : 0;
  return { score, level, acc, n: scored.length, variety, varietyTotal: variants.length, days, test, lesson, last, due, hintRate };
}

export function lessonUnlocked(p: Progress, sheetId: string): boolean {
  const sh = SHEET_BY_ID[sheetId];
  return sh.prereqs.every(pr => SHEET_BY_ID[pr]?.status === 'pending' || p.lessons[pr]?.done);
}
export function nextLesson(p: Progress): string | null {
  const order = ['rules', 'candidates', ...READY.map(s => s.id)];
  return order.find(id => !p.lessons[id]?.done && lessonUnlocked(p, id)) ?? null;
}
export function streak(p: Progress): number {
  const days = new Set(p.attempts.map(a => dayKey(a.t)));
  let n = 0; const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function exportProgress(): string { return JSON.stringify(state); }
export function importProgress(json: string): boolean {
  try { const p = JSON.parse(json); if (p?.v !== 1) return false; update(() => ({ ...fresh(), ...p })); return true; } catch { return false; }
}
export function resetProgress() { update(() => fresh()); }
export function completeLesson(id: string, test?: boolean) {
  update(p => { const cur = p.lessons[id] ?? { done: false, test: false, t: 0 }; p.lessons[id] = { done: true, test: cur.test || !!test, t: Date.now() }; });
}

// ---- XP (recompensa discreta; no afecta al cálculo de dominio) ----
export const DAILY_GOAL = 50;
export const xpFor = (a: Attempt) => (!a.ok ? 0 : a.kind === 'full' ? 30 : a.hints ? 5 : 10);
export function xpToday(p: Progress): number {
  const today = dayKey(Date.now());
  return p.attempts.filter(a => dayKey(a.t) === today).reduce((s, a) => s + xpFor(a), 0)
    + Object.values(p.lessons).filter(l => l.done && dayKey(l.t) === today).length * 20;
}
export function xpTotal(p: Progress): number {
  return p.attempts.reduce((s, a) => s + xpFor(a), 0) + Object.values(p.lessons).filter(l => l.done).length * 20 + p.chests.length * 25;
}
export function claimChest(unit: number) { update(p => { if (!p.chests.includes(unit)) p.chests.push(unit); }); }
