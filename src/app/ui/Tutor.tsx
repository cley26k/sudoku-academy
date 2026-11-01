import React, { useEffect, useId, useRef, useState } from 'react';
import { useProgress } from '../store';

export type Mood = 'idle' | 'think' | 'happy' | 'oops' | 'wow' | 'point';

/** Ángulos de brazo (grados, 0 = colgando; positivo = gira hacia la izquierda de la pantalla). */
const ARMS: Record<Mood, [number, number]> = {
  idle: [22, -22], think: [16, 132], happy: [122, -122], wow: [112, -112], oops: [160, -160], point: [14, -98],
};
const LOOK: Record<Mood, [number, number]> = { idle: [0, 0], think: [3, -4], happy: [0, 0], wow: [0, -1], oops: [0, 2], point: [5, 1] };

function Arm({ x, y, angle, hand = 'round', len = 30 }: { x: number; y: number; angle: number; hand?: 'round' | 'finger'; len?: number }) {
  return (
    <g className="tm-arm" style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${x}px ${y}px` }}>
      <rect x={x - 7} y={y - 2} width="14" height={len} rx="7" className="tm-limb" />
      <circle cx={x} cy={y + len} r="9" className="tm-hand" />
      {hand === 'finger' && <rect x={x - 3} y={y + len + 2} width="6" height="12" rx="3" className="tm-hand" />}
    </g>
  );
}

/** Tesela: una casilla de sudoku con vida propia (personaje original). */
type Wear = { hat?: string; face?: string; neck?: string };
const HATS: Record<string, React.ReactNode> = {
  gorra: <g><path d="M26 32 Q26 2 70 2 Q114 2 114 32 Z" className="acc-a" /><path d="M66 28 Q118 22 132 34 Q100 38 66 34 Z" className="acc-ad" /><circle cx="70" cy="4" r="4" className="acc-ad" /><path d="M40 14 Q70 6 100 14" className="acc-line" /></g>,
  corona: <g><path d="M36 24 L42 0 L56 14 L70 -4 L84 14 L98 0 L104 24 Z" className="acc-gold" /><circle cx="70" cy="14" r="4" className="acc-gem" /><circle cx="50" cy="18" r="3" className="acc-gem2" /><circle cx="90" cy="18" r="3" className="acc-gem2" /></g>,
  auriculares: <g><path d="M24 52 Q22 0 70 0 Q118 0 116 52" className="acc-band" /><rect x="10" y="40" width="20" height="32" rx="9" className="acc-a" /><rect x="110" y="40" width="20" height="32" rx="9" className="acc-a" /></g>,
};
const FACES: Record<string, React.ReactNode> = {
  gafas: <g><circle cx="49" cy="50" r="17" className="acc-glass" /><circle cx="91" cy="50" r="17" className="acc-glass" /><path d="M66 48 Q70 44 74 48" className="acc-frame" /><path d="M32 46 L22 42 M108 46 L118 42" className="acc-frame" /></g>,
};
const NECKS: Record<string, React.ReactNode> = {
  bufanda: <g><rect x="34" y="86" width="72" height="14" rx="7" className="acc-red" /><rect x="82" y="92" width="14" height="28" rx="6" className="acc-redd" transform="rotate(-10 89 92)" /><path d="M44 90 L44 97 M56 90 L56 97 M68 90 L68 97" className="acc-stripe" /></g>,
  pajarita: <g><path d="M70 96 L52 86 L52 106 Z M70 96 L88 86 L88 106 Z" className="acc-a" /><circle cx="70" cy="96" r="5" className="acc-ad" /></g>,
};

export function Tesela({ mood = 'idle', size = 84, talking = false, wear }: { mood?: Mood; size?: number; talking?: boolean; wear?: Wear }) {
  const id = useId().replace(/:/g, '');
  const prog = useProgress();
  const eq: Wear = wear ?? prog.equipped ?? {};
  const [la, ra] = ARMS[mood];
  const [lx, ly] = LOOK[mood];
  const closedEyes = mood === 'happy';
  const brows: Record<Mood, [string, string]> = {
    idle: ['M40 34 Q49 29 58 33', 'M82 33 Q91 29 100 34'],
    think: ['M40 31 Q49 30 58 36', 'M82 30 Q91 24 100 28'],
    happy: ['M40 33 Q49 26 58 32', 'M82 32 Q91 26 100 33'],
    wow: ['M40 27 Q49 20 58 26', 'M82 26 Q91 20 100 27'],
    oops: ['M40 37 Q49 31 58 28', 'M82 28 Q91 31 100 37'],
    point: ['M40 33 Q49 29 58 33', 'M82 31 Q91 26 100 30'],
  };
  const mouth = (open: boolean) => {
    if (mood === 'oops') return <path d="M58 78 Q64 72 70 77 Q76 82 82 76" className="tm-line" />;
    if (mood === 'wow') return <g><ellipse cx="70" cy="76" rx="8" ry="9" className="tm-mouth" /><ellipse cx="70" cy="80" rx="5" ry="3" className="tm-tongue" /></g>;
    if (mood === 'think' && !open) return <path d="M62 76 Q70 73 78 75" className="tm-line" />;
    if (mood === 'happy' || open) return <g><path d={mood === 'happy' ? 'M54 70 Q70 92 86 70 Z' : 'M58 71 Q70 86 82 71 Z'} className="tm-mouth" /><ellipse cx="70" cy={mood === 'happy' ? 81 : 79} rx={mood === 'happy' ? 8 : 6} ry="3.5" className="tm-tongue" /></g>;
    return <path d="M60 72 Q70 80 80 72" className="tm-line" />;
  };
  return (
    <svg className={`tesela m-${mood}${talking ? ' talking' : ''}`} width={size} height={(size * 160) / 140} viewBox="0 0 140 160" aria-hidden="true">
      <defs><clipPath id={`h${id}`}><rect x="22" y="10" width="96" height="86" rx="32" /></clipPath></defs>
      <ellipse cx="70" cy="153" rx="34" ry="5" className="tm-ground" />
      <g className="tm-all">
        {/* piernas */}
        <g className="tm-legs">
          <rect x="50" y="122" width="14" height="22" rx="7" className="tm-limb" /><ellipse cx="56" cy="145" rx="11" ry="6" className="tm-foot" />
          <rect x="76" y="122" width="14" height="22" rx="7" className="tm-limb" /><ellipse cx="84" cy="145" rx="11" ry="6" className="tm-foot" />
        </g>
        {/* cuerpo */}
        <rect x="40" y="88" width="60" height="44" rx="20" className="tm-body" />
        <rect x="52" y="98" width="36" height="26" rx="10" className="tm-belly" />
        <g className="tm-grid">{[0, 1, 2].map(r => [0, 1, 2].map(c => <rect key={`${r}${c}`} x={57 + c * 9} y={101 + r * 7.4} width="6" height="5" rx="1.6" className={r === 1 && c === 1 ? 'hot' : ''} />))}</g>
        {/* cabeza */}
        <g className="tm-head">
          <path d="M66 12 Q60 -2 72 0 Q68 4 72 8 Q80 -2 86 6 Q78 6 76 14 Z" className="tm-tuft" />
          <g clipPath={`url(#h${id})`}>
            <rect x="22" y="10" width="96" height="86" className="tm-skin" />
            <rect x="22" y="80" width="96" height="20" className="tm-shade" />
            <rect x="34" y="18" width="26" height="9" rx="4.5" className="tm-shine" />
            <rect x="64" y="18" width="8" height="9" rx="4" className="tm-shine" />
          </g>
          <ellipse cx="38" cy="66" rx="8" ry="5" className="tm-cheek" />
          <ellipse cx="102" cy="66" rx="8" ry="5" className="tm-cheek" />
          {closedEyes ? (
            <><path d="M40 52 Q49 40 58 52" className="tm-line thick" /><path d="M82 52 Q91 40 100 52" className="tm-line thick" /></>
          ) : (
            <g className="tm-eyes">
              <ellipse cx="49" cy="50" rx="12" ry="14" className="tm-eye" />
              <ellipse cx="91" cy="50" rx="12" ry="14" className="tm-eye" />
              <g className="tm-pupils" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
                <circle cx="50" cy="52" r="7.5" className="tm-iris" /><circle cx="92" cy="52" r="7.5" className="tm-iris" />
                <circle cx="50" cy="52" r="4" className="tm-pupil" /><circle cx="92" cy="52" r="4" className="tm-pupil" />
                <circle cx="53" cy="48" r="2.6" className="tm-glint" /><circle cx="95" cy="48" r="2.6" className="tm-glint" />
                <circle cx="47.5" cy="55.5" r="1.2" className="tm-glint" /><circle cx="89.5" cy="55.5" r="1.2" className="tm-glint" />
              </g>
              <g className="tm-lids"><rect x="35" y="34" width="28" height="32" rx="12" className="tm-skin" /><rect x="77" y="34" width="28" height="32" rx="12" className="tm-skin" /></g>
            </g>
          )}
          <path d={brows[mood][0]} className="tm-brow" />
          <path d={brows[mood][1]} className="tm-brow" />
          <g className="tm-mouth-closed">{mouth(false)}</g>
          <g className="tm-mouth-open">{mouth(true)}</g>
          {eq.face && FACES[eq.face]}
          {eq.hat && HATS[eq.hat]}
        </g>
        {eq.neck && NECKS[eq.neck]}
        <Arm x={42} y={96} angle={la} len={mood === 'happy' || mood === 'wow' ? 38 : 30} />
        <Arm x={98} y={96} angle={ra} hand={mood === 'point' ? 'finger' : 'round'} len={mood === 'happy' || mood === 'wow' ? 38 : 30} />
        {mood === 'think' && <g className="tm-dots"><circle cx="118" cy="22" r="4" /><circle cx="128" cy="10" r="6" /></g>}
        {(mood === 'wow' || mood === 'happy') && <g className="tm-spark"><path d="M122 18 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" /><path d="M14 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" /></g>}
        {mood === 'oops' && <g className="tm-sweat"><path d="M112 34 q6 10 0 14 q-6 -4 0 -14z" /></g>}
      </g>
    </svg>
  );
}

/** Mascota con globo. La boca «habla» unos instantes cada vez que cambia el texto. */
/** Guion no separable en nombres de técnicas (X-Wing, XY-Chain…) para que no se corten al final de línea. */
const nbHyphens = (s: string) => s.replace(/\b([A-Z0-9]{1,3})-([A-Z][a-z]+)\b/g, '$1\u2011$2');

export function TutorBubble({ mood, children, title, size = 84 }: { mood?: Mood; children?: React.ReactNode; title?: string; size?: number }) {
  const [talking, setTalking] = useState(false);
  const key = typeof children === 'string' ? children : title ?? '';
  const first = useRef(true);
  useEffect(() => {
    setTalking(true);
    const t = window.setTimeout(() => setTalking(false), Math.min(2200, 500 + String(key).length * 18));
    first.current = false;
    return () => window.clearTimeout(t);
  }, [key, mood]);
  return (
    <div className="tutor">
      <Tesela mood={mood} size={size} talking={talking} />
      {(title || children) && (
        <div className="bubble" role="status" aria-live="polite" key={String(key).slice(0, 40)}>
          {title && <div className="bubble-title">{title}</div>}
          {children && <div className="bubble-text">{typeof children === 'string' ? nbHyphens(children) : children}</div>}
        </div>
      )}
    </div>
  );
}
