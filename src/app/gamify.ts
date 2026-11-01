// Capa de juego: nivel, logros, misiones diarias, gemas, tienda, combos y protector de racha.
// Todo se calcula a partir de lo que el usuario hace de verdad (no hay rivales ni datos inventados).
import { Progress, update, xpTotal, xpToday, xpOn, dayKey, streak, mastery, getProgress, activeDays, earned } from './store';
import { READY } from '../content/catalog';
import { hashString } from '../engine/random';

// ---------- Nivel ----------
/** Nivel n necesita 60·n·(n-1)/2 XP acumulados (60, 180, 360, 600…). */
export function levelOf(xp: number) {
  let n = 1; while (60 * n * (n + 1) / 2 <= xp) n++;
  const base = 60 * n * (n - 1) / 2, next = 60 * n * (n + 1) / 2;
  return { level: n, into: xp - base, need: next - base, pct: (100 * (xp - base)) / (next - base) };
}

// ---------- Logros (3 niveles: bronce, plata, oro) ----------
export interface Achievement { id: string; name: string; desc: string; icon: string; tiers: [number, number, number]; value: (p: Progress) => number }
const today = () => dayKey(Date.now());
const clean = (p: Progress) => p.attempts.filter(a => a.ok && a.hints === 0 && a.kind !== 'full').length;
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'racha', name: 'En llamas', desc: 'Días seguidos practicando', icon: 'flame', tiers: [3, 7, 30], value: p => Math.max(p.bestStreak ?? 0, streak(p)) },
  { id: 'lecciones', name: 'Erudito', desc: 'Lecciones completadas', icon: 'book', tiers: [5, 15, 28], value: p => earned(p).length },
  { id: 'limpio', name: 'Sin ayuda', desc: 'Ejercicios resueltos sin pistas', icon: 'check', tiers: [10, 50, 200], value: clean },
  { id: 'veloz', name: 'Ojo rápido', desc: 'Aciertos sin pistas en menos de 15 s', icon: 'bolt', tiers: [1, 10, 50], value: p => p.attempts.filter(a => a.ok && a.hints === 0 && a.ms < 15000 && a.kind !== 'full').length },
  { id: 'sudokus', name: 'Resolutor', desc: 'Sudokus completos', icon: 'grid', tiers: [1, 10, 50], value: p => p.fullSolved },
  { id: 'perfecto', name: 'Perfeccionista', desc: 'Sudokus sin errores ni pistas', icon: 'star', tiers: [1, 5, 20], value: p => p.attempts.filter(a => a.kind === 'full' && a.ok && a.errors === 0 && a.hints === 0).length },
  { id: 'impecable', name: 'Impecable', desc: 'Lecciones perfectas', icon: 'medal', tiers: [1, 5, 15], value: p => p.perfect ?? 0 },
  { id: 'maestro', name: 'Maestro', desc: 'Técnicas dominadas', icon: 'crown', tiers: [1, 5, 15], value: p => READY.filter(s => mastery(p, s.impl!).level === 'dominada').length },
  { id: 'rush', name: 'Contrarreloj', desc: 'Mejor puntuación en contrarreloj', icon: 'clock', tiers: [5, 12, 25], value: p => p.rushBest ?? 0 },
  { id: 'cofres', name: 'Buscatesoros', desc: 'Cofres abiertos', icon: 'chest', tiers: [1, 3, 7], value: p => p.chests.length },
];
export const tierOf = (a: Achievement, p: Progress) => a.tiers.filter(t => a.value(p) >= t).length;
export const TIER_NAME = ['', 'Bronce', 'Plata', 'Oro'];

// ---------- Misiones diarias ----------
export interface Quest { id: string; text: string; goal: number; value: (p: Progress) => number }
const todays = (p: Progress) => p.attempts.filter(a => dayKey(a.t) === today());
const QUEST_POOL: Quest[] = [
  { id: 'xp', text: 'Gana 40 XP', goal: 40, value: p => xpToday(p) },
  { id: 'clean', text: 'Acierta 5 ejercicios sin pistas', goal: 5, value: p => todays(p).filter(a => a.ok && a.hints === 0 && a.kind !== 'full').length },
  { id: 'lesson', text: 'Completa 1 lección', goal: 1, value: p => earned(p).filter(l => dayKey(l.t) === today()).length },
  { id: 'sudoku', text: 'Termina 1 sudoku', goal: 1, value: p => todays(p).filter(a => a.kind === 'full').length },
  { id: 'variety', text: 'Practica 3 técnicas distintas', goal: 3, value: p => new Set(todays(p).filter(a => a.kind !== 'full').map(a => a.tech)).size },
  { id: 'combo', text: 'Consigue un combo de 5', goal: 5, value: p => (p.combo?.day === today() ? p.combo.best : 0) },
  { id: 'rush', text: 'Juega una contrarreloj', goal: 1, value: p => ((p.rushDays ?? []).includes(today()) ? 1 : 0) },
  { id: 'fast', text: 'Acierta 3 en menos de 20 s', goal: 3, value: p => todays(p).filter(a => a.ok && a.ms < 20000 && a.kind !== 'full').length },
];
export const QUEST_GEMS = 10, ALL_QUESTS_BONUS = 20;
export function dailyQuests(day = today()): Quest[] {
  const h = hashString('q' + day);
  const pool = QUEST_POOL.slice();
  const out: Quest[] = [pool.splice(0, 1)[0]]; // siempre: XP
  for (let k = 0; k < 2; k++) out.push(pool.splice((h >> (k * 5)) % pool.length, 1)[0]);
  return out;
}

// ---------- Tienda ----------
export interface ShopItem { id: string; name: string; price: number; slot?: 'hat' | 'face' | 'neck'; desc: string }
export const SHOP: ShopItem[] = [
  { id: 'freeze', name: 'Protector de racha', price: 50, desc: 'Si un día no practicas, tu racha no se pierde. Máximo 2.' },
  { id: 'gorra', name: 'Gorra', price: 60, slot: 'hat', desc: 'Para Tesela, con estilo.' },
  { id: 'pajarita', name: 'Pajarita', price: 70, slot: 'neck', desc: 'Para los días de examen.' },
  { id: 'gafas', name: 'Gafas de estudio', price: 80, slot: 'face', desc: 'Para ver los patrones de lejos.' },
  { id: 'bufanda', name: 'Bufanda', price: 90, slot: 'neck', desc: 'Calentita en los sudokus largos.' },
  { id: 'auriculares', name: 'Auriculares', price: 120, slot: 'hat', desc: 'Para concentrarse con la música.' },
  { id: 'corona', name: 'Corona', price: 250, slot: 'hat', desc: 'Solo para maestros.' },
];
export function buy(id: string): string | null {
  const it = SHOP.find(s => s.id === id)!;
  const p = getProgress();
  if (p.gems < it.price) return 'No tienes gemas suficientes.';
  if (id === 'freeze' && p.freezes >= 2) return 'Ya tienes el máximo de protectores.';
  if (it.slot && p.owned.includes(id)) return null;
  update(pp => { pp.gems -= it.price; if (id === 'freeze') pp.freezes++; else { pp.owned.push(id); pp.equipped[it.slot!] = id; } });
  return null;
}
export function equip(id: string) {
  const it = SHOP.find(s => s.id === id)!;
  update(pp => { if (!it.slot) return; pp.equipped[it.slot] = pp.equipped[it.slot] === id ? undefined : id; });
}

// ---------- Avisos (toasts) ----------
export interface Toast { title: string; text?: string; icon?: string; tone?: string }
export function toast(t: Toast) { try { window.dispatchEvent(new CustomEvent('sa-toast', { detail: t })); } catch { /* noop */ } }

/** Revisa logros, nivel y misiones; entrega gemas y lanza avisos de lo nuevo. Devuelve si hubo cambios. */
export function checkRewards(p: Progress): Toast[] {
  const out: Toast[] = [];
  const gains: { gems: number; ach: Record<string, number>; level?: number; quests: string[]; bestStreak?: number } = { gems: 0, ach: {}, quests: [] };
  for (const a of ACHIEVEMENTS) {
    const t = tierOf(a, p), had = p.achievements?.[a.id] ?? 0;
    if (t > had) { gains.ach[a.id] = t; gains.gems += 10 * t; out.push({ title: `Logro: ${a.name} · ${TIER_NAME[t]}`, text: `${a.desc}: ${a.tiers[t - 1]}. +${10 * t} gemas`, icon: a.icon, tone: ['', 'bronze', 'silver', 'gold'][t] }); }
  }
  const lv = levelOf(xpTotal(p)).level;
  if (lv > (p.levelSeen ?? 1)) { gains.level = lv; gains.gems += 5; moment({ kind: 'level', n: lv }); }
  const day = today(); const claimed = p.quests?.[day] ?? [];
  const qs = dailyQuests(day);
  for (const q of qs) if (!claimed.includes(q.id) && q.value(p) >= q.goal) { gains.quests.push(q.id); gains.gems += QUEST_GEMS; out.push({ title: 'Misión cumplida', text: `${q.text}. +${QUEST_GEMS} gemas`, icon: 'target', tone: 'quest' }); }
  const allNow = qs.every(q => claimed.includes(q.id) || gains.quests.includes(q.id));
  const allBefore = qs.every(q => claimed.includes(q.id));
  if (allNow && !allBefore) out.push({ title: '¡Misiones completas!', text: 'Tu cofre del día está listo', icon: 'chest', tone: 'gold' });
  const st = streak(p); if (st > (p.bestStreak ?? 0)) gains.bestStreak = st;
  const streakDay = activeDays(p).has(day) && p.streakSeen !== day && p.settings.streaks;
  if (streakDay) moment({ kind: 'streak', n: st });
  if (out.length || gains.bestStreak || gains.level || streakDay) {
    update(pp => {
      pp.gems = (pp.gems ?? 0) + gains.gems;
      pp.achievements = { ...(pp.achievements ?? {}), ...gains.ach };
      if (gains.level) pp.levelSeen = gains.level;
      if (gains.quests.length) pp.quests = { ...(pp.quests ?? {}), [day]: [...claimed, ...gains.quests] };
      if (gains.bestStreak) pp.bestStreak = gains.bestStreak;
      if (streakDay) pp.streakSeen = day;
    });
  }
  return out;
}

/** Protector de racha: si ayer no hubo práctica, anteayer sí, y hay protectores, se consume uno. */
export function applyStreakFreeze() {
  const p = getProgress();
  if (!p.freezes) return;
  const d = new Date(); d.setDate(d.getDate() - 1); const y = dayKey(d.getTime());
  d.setDate(d.getDate() - 1); const yy = dayKey(d.getTime());
  const active = activeDays(p);
  if (!active.has(y) && active.has(yy)) {
    update(pp => { pp.freezes--; pp.freezeDays = [...(pp.freezeDays ?? []), y]; });
    toast({ title: 'Protector de racha usado', text: 'Ayer no practicaste, pero tu racha sigue viva.', icon: 'shield', tone: 'quest' });
  }
}

// ---------- Combo ----------
let combo = 0;
export function comboHit(ok: boolean, hints: number): number {
  if (!ok || hints > 0) { combo = 0; return 0; }
  combo++;
  const day = today();
  update(pp => {
    if (combo >= 3) pp.bonusXp = { ...(pp.bonusXp ?? {}), [day]: (pp.bonusXp?.[day] ?? 0) + 5 };
    if (pp.combo?.day !== day) pp.combo = { day, best: 0 };
    pp.combo.best = Math.max(pp.combo.best, combo);
  });
  return combo;
}
export const resetCombo = () => { combo = 0; };
export const comboNow = () => combo;

// ---------- Momentos grandes (pantalla completa, sobrios) ----------
export interface Moment { kind: 'level' | 'streak' | 'chest' | 'unit' | 'league'; n: number; up?: number; rank?: number }
export function moment(m: Moment) { try { window.dispatchEvent(new CustomEvent('sa-moment', { detail: m })); } catch { /* noop */ } }

// ---------- Cofre diario ----------
export function dailyChestState(p: Progress, day = today()): 'locked' | 'ready' | 'open' {
  if ((p.dailyChests ?? []).includes(day)) return 'open';
  const claimed = p.quests?.[day] ?? [];
  return dailyQuests(day).every(q => claimed.includes(q.id)) ? 'ready' : 'locked';
}
/** Abre el cofre del día: devuelve las gemas ganadas (0 si no procede). */
export function openDailyChest(): number {
  const p = getProgress(), day = today();
  if (dailyChestState(p, day) !== 'ready') return 0;
  update(pp => { pp.dailyChests = [...(pp.dailyChests ?? []), day]; pp.gems = (pp.gems ?? 0) + ALL_QUESTS_BONUS; });
  return ALL_QUESTS_BONUS;
}

// ---------- Semanas (liga contigo mismo) ----------
/** Las 7 fechas (lunes→domingo) de la semana actual desplazada `back` semanas. */
export function weekDays(back = 0): string[] {
  const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow - 7 * back);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return dayKey(x.getTime()); });
}
export const weekXp = (p: Progress, back = 0) => weekDays(back).map(d => xpOn(p, d));
/** Mejor semana registrada (hasta 26 semanas atrás) */
export function bestWeek(p: Progress): number { let b = 0; for (let k = 1; k <= 26; k++) b = Math.max(b, weekXp(p, k).reduce((a, x) => a + x, 0)); return b; }

/** Lección perfecta: +10 XP extra */
export function awardPerfect() {
  const day = today();
  update(pp => { pp.perfect = (pp.perfect ?? 0) + 1; pp.bonusXp = { ...(pp.bonusXp ?? {}), [day]: (pp.bonusXp?.[day] ?? 0) + 10 }; });
}
