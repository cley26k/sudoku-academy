import React, { useEffect, useRef, useState } from 'react';
import type { Frame } from '../../engine/step';

export const I = {
  map: 'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h9',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1',
  grid: 'M4 4h16v16H4zM4 9.33h16M4 14.66h16M9.33 4v16M14.66 4v16',
  chart: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  rewind: 'M11 19l-7-7 7-7M20 19l-7-7 7-7',
  play: 'M7 5l12 7-12 7z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  next: 'M6 5l9 7-9 7zM17 5v14',
  prev: 'M18 5l-9 7 9 7zM7 5v14',
  restart: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  erase: 'M19 20H8l-4-4 10-10 7 7-6 7M9 11l6 6',
  pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  flame: 'M12 3c1 4 6 5 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  wand: 'M5 19L15 9M14 4v2M19 9h2M17.5 5.5l1-1M18 14l1 1',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  speaker: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6',
  music: 'M9 18V6l11-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
};
export function Icon({ d, size = 20, title, stroke = 2 }: { d: string; size?: number; title?: string; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>{title && <title>{title}</title>}<path d={d} /></svg>;
}

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger' | 'success' | 'white' | 'ghost-white';
export function Btn({ kind = 'ghost', icon, children, big, ...rest }: { kind?: BtnKind; icon?: string; big?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`btn btn-${kind}${big ? ' btn-big' : ''}${!children ? ' btn-icon' : ''}${rest.className ? ' ' + rest.className : ''}`}>{icon && <Icon d={icon} size={big ? 22 : 19} stroke={2.4} />}{children && <span>{children}</span>}</button>;
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(o => <button key={String(o.v)} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export function Toggle({ on, onChange, label, id }: { on: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-dot" /></span>
      <span>{label}</span>
    </label>
  );
}

export function Meter({ value, label, tone = 'primary' }: { value: number; label?: string; tone?: string }) {
  return <div className={`meter meter-${tone}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Ring({ value, size = 56, children, tone = 'primary' }: { value: number; size?: number; children?: React.ReactNode; tone?: string }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  return (
    <span className={`ring ring-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="ring-in">{children}</span>
    </span>
  );
}

export const prefersReducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** Confeti ligero en canvas. Se dispara con celebrate(). */
export function celebrate() { try { window.dispatchEvent(new Event('sa-confetti')); } catch { /* noop */ } }
export function ConfettiLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const fire = () => {
      if (prefersReducedMotion()) return;
      const cv = ref.current; if (!cv) return;
      const ctx = cv.getContext('2d'); if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
      const cols = ['#7c5cff', '#3dc86b', '#ffc83d', '#ff6fb5', '#2fa8ff', '#ff9b3d'];
      const ps = Array.from({ length: 110 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .62, vx: (Math.random() - .5) * 14, vy: -Math.random() * 15 - 6, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, s: Math.random() < .5 }));
      const t0 = performance.now();
      cancelAnimationFrame(raf);
      const step = (t: number) => {
        const k = (t - t0) / 1600;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        if (k > 1) return;
        for (const p of ps) {
          p.vy += .45; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.a += .15;
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
          if (p.s) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, 7); ctx.fill(); }
          ctx.restore();
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    window.addEventListener('sa-confetti', fire);
    return () => { window.removeEventListener('sa-confetti', fire); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}

/** Reproductor de fotogramas de razonamiento. */
export function useFrames(frames: Frame[], autoplay = false) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => { setI(0); setPlaying(autoplay); }, [frames]);
  useEffect(() => {
    window.clearTimeout(t.current);
    if (!playing) return;
    if (i >= frames.length - 1) { setPlaying(false); return; }
    const ms = 1900 + Math.min(2600, (frames[i]?.text.length ?? 40) * 30);
    t.current = window.setTimeout(() => setI(x => Math.min(frames.length - 1, x + 1)), ms);
    return () => window.clearTimeout(t.current);
  }, [i, playing, frames]);
  return {
    i, frame: frames[i], playing, total: frames.length,
    play: () => { if (i >= frames.length - 1) setI(0); setPlaying(true); }, pause: () => setPlaying(false),
    next: () => { setPlaying(false); setI(x => Math.min(frames.length - 1, x + 1)); },
    prev: () => { setPlaying(false); setI(x => Math.max(0, x - 1)); },
    restart: () => { setI(0); setPlaying(true); }, go: (k: number) => { setPlaying(false); setI(k); },
  };
}
export type FramesCtl = ReturnType<typeof useFrames>;

export function FrameControls({ ctl }: { ctl: FramesCtl }) {
  return (
    <div className="frame-ctl" role="group" aria-label="Controles de la demostración">
      <Btn icon={I.restart} onClick={ctl.restart} aria-label="Reiniciar" />
      <Btn icon={I.prev} onClick={ctl.prev} disabled={ctl.i === 0} aria-label="Paso anterior" />
      {ctl.playing ? <Btn kind="primary" icon={I.pause} onClick={ctl.pause} aria-label="Pausar" /> : <Btn kind="primary" icon={I.play} onClick={ctl.play} aria-label="Reproducir" />}
      <Btn icon={I.next} onClick={ctl.next} disabled={ctl.i >= ctl.total - 1} aria-label="Paso siguiente" />
      <div className="frame-dots" aria-label={`Paso ${ctl.i + 1} de ${ctl.total}`}>
        {Array.from({ length: ctl.total }, (_, k) => <button key={k} className={k === ctl.i ? 'on' : k < ctl.i ? 'past' : ''} onClick={() => ctl.go(k)} aria-label={`Ir al paso ${k + 1}`} />)}
      </div>
    </div>
  );
}

export function DigitPad({ onDigit, onErase, counts, disabled, active, allowed, pick, hl }: {
  onDigit: (d: number) => void; onErase?: () => void; counts?: number[]; disabled?: boolean; active?: number; allowed?: number; pick?: boolean; hl?: number;
}) {
  return (
    <div className="pad">
      <div className="pad-digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
          const off = disabled || (counts ? counts[d] >= 9 : false) || (allowed !== undefined && !(allowed & (1 << d)));
          return (
            <button key={d} onClick={() => onDigit(d)} disabled={off} className={`${active && active & (1 << d) ? (pick ? 'chosen' : 'picked') : ''}${hl === d ? ' hl' : ''}`} aria-pressed={active ? !!(active & (1 << d)) : undefined} aria-label={`Número ${d}`}>
              {d}
            </button>
          );
        })}
        {onErase && <button className="pad-erase" onClick={onErase} disabled={disabled} aria-label="Borrar"><Icon d={I.erase} size={22} /></button>}
      </div>
    </div>
  );
}

/** Ayuda de coordenadas: F = fila (horizontal), C = columna (vertical). */
export function CoordHint() {
  return (
    <div className="coord-hint" aria-label="F significa fila, horizontal. C significa columna, vertical.">
      <span><b>F</b> fila <span className="ch-row" aria-hidden="true" /></span>
      <span><b>C</b> columna <span className="ch-col" aria-hidden="true" /></span>
      <span className="muted">F2C5 = fila 2, columna 5</span>
    </div>
  );
}
