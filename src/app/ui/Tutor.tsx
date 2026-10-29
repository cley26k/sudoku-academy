import React, { useId } from 'react';

export type Mood = 'idle' | 'think' | 'happy' | 'oops' | 'wow' | 'point';

/** Tesela: una casilla de sudoku con vida propia. Personaje original de Sudoku Academy. */
export function Tesela({ mood = 'idle', size = 72 }: { mood?: Mood; size?: number }) {
  const id = useId().replace(/:/g, '');
  const mouth: Record<Mood, React.ReactNode> = {
    idle: <path d="M52 74 Q60 80 68 74" className="tm-line" />,
    think: <path d="M53 76 Q60 73 67 76" className="tm-line" />,
    happy: <path d="M48 70 Q60 88 72 70 Z" className="tm-mouth" />,
    oops: <path d="M51 79 Q60 71 69 79" className="tm-line" />,
    wow: <ellipse cx="60" cy="77" rx="6" ry="7" className="tm-mouth" />,
    point: <path d="M50 72 Q60 84 70 72 Z" className="tm-mouth" />,
  };
  const brows: Record<Mood, [string, string]> = {
    idle: ['M38 37 Q45 33 52 36', 'M68 36 Q75 33 82 37'],
    think: ['M38 35 Q45 33 52 38', 'M68 33 Q75 29 82 33'],
    happy: ['M38 36 Q45 30 52 35', 'M68 35 Q75 30 82 36'],
    oops: ['M38 34 L52 39', 'M68 39 L82 34'],
    wow: ['M38 31 Q45 25 52 30', 'M68 30 Q75 25 82 31'],
    point: ['M38 36 Q45 32 52 36', 'M68 34 Q75 30 82 33'],
  };
  const look = mood === 'think' ? { x: 3, y: -3 } : mood === 'point' ? { x: 4, y: 1 } : mood === 'oops' ? { x: 0, y: 2 } : { x: 0, y: 0 };
  const armsUp = mood === 'happy' || mood === 'wow';
  return (
    <svg className={`tesela m-${mood}`} width={size} height={size} viewBox="0 0 120 124" aria-hidden="true">
      <defs><clipPath id={`b${id}`}><rect x="22" y="16" width="76" height="80" rx="26" /></clipPath></defs>
      <ellipse cx="60" cy="116" rx="30" ry="5" className="tm-ground" />
      <g className="tm-all">
        {/* brazos */}
        <g className="tm-arm tm-arm-l"><rect x={armsUp ? 10 : 12} y={armsUp ? 26 : 58} width="16" height="26" rx="8" className="tm-limb" transform={armsUp ? 'rotate(-25 18 40)' : 'rotate(18 20 70)'} /></g>
        <g className="tm-arm tm-arm-r"><rect x={armsUp ? 94 : 92} y={armsUp ? 26 : 58} width="16" height="26" rx="8" className="tm-limb" transform={armsUp ? 'rotate(25 102 40)' : mood === 'point' ? 'rotate(-70 100 66)' : 'rotate(-18 100 70)'} /></g>
        {/* pies */}
        <rect x="36" y="94" width="20" height="14" rx="7" className="tm-limb" />
        <rect x="64" y="94" width="20" height="14" rx="7" className="tm-limb" />
        {/* mechón */}
        <path d="M58 18 Q56 4 66 6 Q62 10 64 18" className="tm-tuft" />
        {/* cuerpo */}
        <g clipPath={`url(#b${id})`}>
          <rect x="22" y="16" width="76" height="80" className="tm-body" />
          <rect x="22" y="78" width="76" height="20" className="tm-shade" />
          <rect x="30" y="22" width="22" height="9" rx="4.5" className="tm-shine" />
        </g>
        {/* su cuadrícula 3×3 en la barriga */}
        <g className="tm-grid">
          {[0, 1, 2].map(c => <rect key={c} x={50 + c * 7} y={86} width="5" height="5" rx="1.5" className={c === 1 ? 'hot' : ''} />)}
        </g>
        {/* cara */}
        <g className="tm-eyes">
          {mood === 'happy' ? (
            <><path d="M38 54 Q45 44 52 54" className="tm-line thick" /><path d="M68 54 Q75 44 82 54" className="tm-line thick" /></>
          ) : (
            <>
              <ellipse cx="45" cy="53" rx="10" ry="11.5" className="tm-eye" />
              <ellipse cx="75" cy="53" rx="10" ry="11.5" className="tm-eye" />
              <circle cx={46 + look.x} cy={55 + look.y} r="5.5" className="tm-pupil" />
              <circle cx={76 + look.x} cy={55 + look.y} r="5.5" className="tm-pupil" />
              <circle cx={48 + look.x} cy={52 + look.y} r="1.8" className="tm-glint" />
              <circle cx={78 + look.x} cy={52 + look.y} r="1.8" className="tm-glint" />
            </>
          )}
        </g>
        <path d={brows[mood][0]} className="tm-line" />
        <path d={brows[mood][1]} className="tm-line" />
        <ellipse cx="34" cy="68" rx="6" ry="4" className="tm-cheek" />
        <ellipse cx="86" cy="68" rx="6" ry="4" className="tm-cheek" />
        {mouth[mood]}
        {mood === 'think' && <g className="tm-dots"><circle cx="104" cy="18" r="3" /><circle cx="112" cy="9" r="4.5" /></g>}
        {mood === 'wow' && <g className="tm-spark"><path d="M104 14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" /></g>}
      </g>
    </svg>
  );
}

export function TutorBubble({ mood, children, title, size = 72 }: { mood?: Mood; children?: React.ReactNode; title?: string; size?: number }) {
  return (
    <div className="tutor">
      <Tesela mood={mood} size={size} />
      {(title || children) && (
        <div className="bubble" role="status" aria-live="polite">
          {title && <div className="bubble-title">{title}</div>}
          {children && <div className="bubble-text">{children}</div>}
        </div>
      )}
    </div>
  );
}
