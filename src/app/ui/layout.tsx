import React from 'react';
import { Icon, I } from './common';

export function LessonTop({ progress, onClose, right }: { progress: number; onClose: () => void; right?: React.ReactNode }) {
  return (
    <div className="ltop">
      <button className="ltop-x" onClick={onClose} aria-label="Salir"><Icon d={I.x} size={24} stroke={2.6} /></button>
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
