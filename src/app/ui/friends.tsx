import React from 'react';

/** Amigos de Tesela: un personaje por unidad, hechos de formas geométricas simples
 *  (círculos, rectángulos redondeados), colores planos y sombra en un solo tono. */
export type FriendKind = 'cruz' | 'gemelos' | 'pez' | 'ave' | 'marco' | 'eslabon';

function Eyes({ x1, x2, y, r = 7, look = 0 }: { x1: number; x2: number; y: number; r?: number; look?: number }) {
  return (
    <g className="fr-eyes" style={{ transformOrigin: `${(x1 + x2) / 2}px ${y}px` }}>
      <ellipse cx={x1} cy={y} rx={r} ry={r * 1.12} className="fr-eye" />
      <ellipse cx={x2} cy={y} rx={r} ry={r * 1.12} className="fr-eye" />
      <circle cx={x1 + look} cy={y + 1} r={r * .52} className="fr-pupil" />
      <circle cx={x2 + look} cy={y + 1} r={r * .52} className="fr-pupil" />
      <circle cx={x1 + look + r * .25} cy={y - r * .2} r={r * .18} className="fr-glint" />
      <circle cx={x2 + look + r * .25} cy={y - r * .2} r={r * .18} className="fr-glint" />
    </g>
  );
}
const Smile = ({ x, y, w = 12 }: { x: number; y: number; w?: number }) => <path d={`M${x - w / 2} ${y} Q${x} ${y + w * .6} ${x + w / 2} ${y}`} className="fr-line" />;
const Cheeks = ({ x1, x2, y }: { x1: number; x2: number; y: number }) => <><ellipse cx={x1} cy={y} rx="5" ry="3.2" className="fr-cheek" /><ellipse cx={x2} cy={y} rx="5" ry="3.2" className="fr-cheek" /></>;

export function Friend({ kind, size = 100 }: { kind: FriendKind; size?: number }) {
  let body: React.ReactNode;
  switch (kind) {
    case 'cruz':
      body = <>
        <rect x="38" y="10" width="44" height="100" rx="18" className="fr-b" />
        <rect x="10" y="38" width="100" height="44" rx="18" className="fr-b" />
        <rect x="38" y="66" width="44" height="44" rx="18" className="fr-d" opacity=".35" />
        <rect x="44" y="16" width="14" height="7" rx="3.5" className="fr-shine" />
        <Eyes x1={50} x2={70} y={55} /><Smile x={60} y={68} /><Cheeks x1={40} x2={80} y={66} />
      </>; break;
    case 'gemelos':
      body = <g transform="translate(0 14)">
        <g className="fr-twin-a"><rect x="8" y="34" width="50" height="62" rx="18" className="fr-b" /><rect x="8" y="80" width="50" height="16" rx="8" className="fr-d" /><Eyes x1={24} x2={42} y={56} r={6} look={2} /><Smile x={33} y={70} w={10} /></g>
        <g className="fr-twin-b"><rect x="62" y="30" width="50" height="66" rx="18" className="fr-b" /><rect x="62" y="80" width="50" height="16" rx="8" className="fr-d" /><Eyes x1={78} x2={96} y={52} r={6} look={-2} /><Smile x={87} y={66} w={10} /></g>
        <path d="M52 78 Q60 86 68 78" className="fr-hand" />
        <text x="33" y="28" className="fr-tag">1</text><text x="87" y="24" className="fr-tag">2</text>
      </g>; break;
    case 'pez':
      body = <>
        <path d="M86 60 L114 36 Q108 60 114 84 Z" className="fr-d" />
        <ellipse cx="54" cy="60" rx="46" ry="36" className="fr-b" />
        <path d="M30 26 Q54 8 74 28 Z" className="fr-d" />
        <path d="M44 92 Q54 104 64 92 Z" className="fr-d" />
        <path d="M76 40 Q84 60 76 80" className="fr-stripe" /><path d="M64 30 Q74 60 64 90" className="fr-stripe" />
        <ellipse cx="34" cy="36" rx="10" ry="5" className="fr-shine" />
        <Eyes x1={28} x2={46} y={54} r={7.5} /><Smile x={36} y={70} w={11} /><Cheeks x1={20} x2={54} y={66} />
        <g className="fr-bubbles"><circle cx="8" cy="30" r="4" /><circle cx="14" cy="16" r="2.6" /></g>
      </>; break;
    case 'ave':
      body = <>
        <path d="M24 60 Q0 40 6 22 Q22 34 36 50 Z" className="fr-d fr-wing-l" />
        <path d="M96 60 Q120 40 114 22 Q98 34 84 50 Z" className="fr-d fr-wing-r" />
        <circle cx="60" cy="62" r="40" className="fr-b" />
        <path d="M52 22 Q58 8 64 22 Q70 12 72 26" className="fr-tuft" />
        <ellipse cx="60" cy="84" rx="22" ry="14" className="fr-belly" />
        <ellipse cx="40" cy="38" rx="9" ry="5" className="fr-shine" />
        <Eyes x1={48} x2={72} y={56} r={8} />
        <path d="M54 68 L66 68 L60 77 Z" className="fr-beak" />
        <Cheeks x1={36} x2={84} y={70} />
      </>; break;
    case 'marco':
      body = <>
        <rect x="14" y="20" width="92" height="80" rx="16" className="fr-b" />
        <rect x="28" y="34" width="64" height="52" rx="10" className="fr-in" />
        {[[14, 20], [106, 20], [14, 100], [106, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="10" className={i === 3 ? 'fr-hot' : 'fr-d'} />)}
        <Eyes x1={50} x2={70} y={56} r={7} /><Smile x={60} y={70} /><Cheeks x1={40} x2={80} y={68} />
      </>; break;
    default:
      body = <>
        <g className="fr-links">
          <rect x="70" y="58" width="44" height="30" rx="15" className="fr-ring" />
          <rect x="44" y="52" width="44" height="30" rx="15" className="fr-ring" />
        </g>
        <circle cx="34" cy="56" r="28" className="fr-b" />
        <ellipse cx="24" cy="38" rx="8" ry="4.5" className="fr-shine" />
        <Eyes x1={26} x2={44} y={52} r={6.5} /><Smile x={35} y={66} w={11} /><Cheeks x1={18} x2={52} y={64} />
      </>;
  }
  return (
    <svg className={`friend fr-${kind}`} width={size} height={size} viewBox="0 0 120 124" aria-hidden="true">
      <ellipse cx="60" cy="116" rx="34" ry="5" className="fr-ground" />
      <g className="fr-all">{body}</g>
    </svg>
  );
}

export const FRIEND_BY_UNIT: Record<number, FriendKind | 'tesela'> = { 1: 'tesela', 2: 'cruz', 3: 'gemelos', 4: 'pez', 5: 'ave', 6: 'marco', 7: 'eslabon' };
