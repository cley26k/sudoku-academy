import React, { useEffect, useRef, useState } from 'react';
import { Icon, I } from './common';

/** Diálogo de confirmación: Escape cancela y el foco no sale del diálogo. */
export function ConfirmSheet({ title, text, stay, leave, onStay, onLeave }: { title: string; text: string; stay: string; leave: string; onStay: () => void; onLeave: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
  }, []);
  function key(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); onStay(); return; }
    if (e.key !== 'Tab') return;
    const bs = [...(box.current?.querySelectorAll('button') ?? [])];
    const i = bs.indexOf(document.activeElement as HTMLButtonElement);
    if (e.shiftKey ? i <= 0 : i === bs.length - 1) { e.preventDefault(); bs[e.shiftKey ? bs.length - 1 : 0]?.focus(); }
  }
  return (
    <div className="confirm-back" onClick={onStay} onKeyDown={key}>
      <div ref={box} className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-t" aria-describedby="confirm-d" onClick={e => e.stopPropagation()}>
        <h2 id="confirm-t">{title}</h2>
        <p id="confirm-d" className="muted">{text}</p>
        <div className="confirm-btns">
          <button className="btn btn-primary btn-big" autoFocus onClick={onStay}><span>{stay}</span></button>
          <button className="btn btn-danger-ghost btn-big" onClick={onLeave}><span>{leave}</span></button>
        </div>
      </div>
    </div>
  );
}

/** Barra superior de lección. Con `confirm`, salir pide confirmación para no perder el progreso por error. */
export function LessonTop({ progress, onClose, right, confirm }: { progress: number; onClose: () => void; right?: React.ReactNode; confirm?: string }) {
  const [ask, setAsk] = useState(false);
  const xRef = useRef<HTMLButtonElement>(null);
  const stay = () => { setAsk(false); requestAnimationFrame(() => xRef.current?.focus()); };
  return (
    <div className="ltop">
      <button ref={xRef} className="ltop-x" onClick={() => (confirm ? setAsk(true) : onClose())} aria-label="Salir"><Icon d={I.x} size={24} stroke={2.6} /></button>
      {ask && confirm && <ConfirmSheet title="¿Salir de la lección?" text={confirm} stay="Seguir aprendiendo" leave="Salir" onStay={stay} onLeave={onClose} />}
      <div className="lprog" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.max(4, progress * 100)}%` }}><i /></span>
      </div>
      {right}
    </div>
  );
}

export type BarTone = 'idle' | 'ok' | 'bad' | 'warn' | 'info';
export function BottomBar({ tone = 'idle', title, text, left, right, badge }: { tone?: BarTone; title?: React.ReactNode; text?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode; badge?: React.ReactNode }) {
  const ico = tone === 'ok' ? I.check : tone === 'bad' ? I.x : tone === 'warn' ? I.dots : tone === 'info' ? I.eye : null;
  return (
    <div className={`lbar lbar-${tone}`} role={tone === 'idle' ? undefined : 'status'} aria-live="polite">
      <div className="lbar-in">
        <div className="lbar-msg">
          {ico && <span className="lbar-ico"><Icon d={ico} size={26} stroke={3} /></span>}
          {(title || text) && (
            <div className="lbar-txt">
              {title && <b>{title}{badge}</b>}
              {text && <p>{text}</p>}
            </div>
          )}
          {!ico && left}
        </div>
        <div className="lbar-actions">{ico && left}{right}</div>
      </div>
    </div>
  );
}

/** Columna del tutor + tablero. En móvil se apilan (tutor arriba). */
export function ExLayout({ title, tutor, board, below }: { title?: React.ReactNode; tutor: React.ReactNode; board: React.ReactNode; below?: React.ReactNode }) {
  return (
    <div className="ex">
      {title && <h2 className="ex-title">{title}</h2>}
      <div className="ex-grid">
        <div className="ex-tutor">{tutor}</div>
        <div className="ex-board">{board}{below}</div>
      </div>
    </div>
  );
}
