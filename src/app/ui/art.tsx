import React from 'react';

/** Ilustraciones planas de cada unidad (originales). */
export function UnitArt({ n }: { n: number }) {
  const s = { className: 'ua' };
  switch (n) {
    case 1: return <svg {...s} viewBox="0 0 80 80"><rect x="10" y="10" width="60" height="60" rx="12" className="ua-a" /><path d="M30 10v60M50 10v60M10 30h60M10 50h60" className="ua-l" /><text x="40" y="46" className="ua-t">5</text></svg>;
    case 2: return <svg {...s} viewBox="0 0 80 80"><rect x="22" y="22" width="36" height="36" rx="8" className="ua-a" /><rect x="6" y="34" width="68" height="12" rx="6" className="ua-b" /></svg>;
    case 3: return <svg {...s} viewBox="0 0 80 80"><rect x="8" y="24" width="28" height="32" rx="8" className="ua-a" /><rect x="44" y="24" width="28" height="32" rx="8" className="ua-a" /><path d="M36 40h8" className="ua-l thick" /><text x="22" y="46" className="ua-t sm">1·2</text><text x="58" y="46" className="ua-t sm">1·2</text></svg>;
    case 4: return <svg {...s} viewBox="0 0 80 80"><path d="M12 40c10-16 34-20 48-6l10-10v32L60 46c-14 14-38 10-48-6z" className="ua-a" /><circle cx="26" cy="37" r="4" className="ua-eye" /><path d="M40 30c4 6 4 14 0 20" className="ua-l" /></svg>;
    case 5: return <svg {...s} viewBox="0 0 80 80"><path d="M40 52C30 30 12 24 6 30c8 2 12 8 14 14-6-2-10 0-12 4 10-2 20 4 32 4z" className="ua-a" /><path d="M40 52c10-22 28-28 34-22-8 2-12 8-14 14 6-2 10 0 12 4-10-2-20 4-32 4z" className="ua-a" /><circle cx="40" cy="52" r="6" className="ua-b" /></svg>;
    case 6: return <svg {...s} viewBox="0 0 80 80"><rect x="14" y="18" width="52" height="44" rx="6" className="ua-dash" />{[[14, 18], [66, 18], [14, 62], [66, 62]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" className={i === 3 ? 'ua-b' : 'ua-a'} />)}</svg>;
    default: return <svg {...s} viewBox="0 0 80 80"><rect x="6" y="30" width="30" height="20" rx="10" className="ua-ring" /><rect x="26" y="30" width="30" height="20" rx="10" className="ua-ring" /><rect x="46" y="30" width="28" height="20" rx="10" className="ua-ring" /></svg>;
  }
}

export function Chest({ open }: { open: boolean }) {
  return (
    <svg className={`chest${open ? ' open' : ''}`} viewBox="0 0 80 72" aria-hidden="true">
      <ellipse cx="40" cy="66" rx="30" ry="5" className="ch-ground" />
      <rect x="10" y="30" width="60" height="32" rx="6" className="ch-base" />
      <rect x="10" y="50" width="60" height="12" rx="4" className="ch-base-d" />
      <g className="ch-lid"><path d="M10 32c0-14 8-20 30-20s30 6 30 20z" className="ch-top" /><rect x="10" y="26" width="60" height="8" rx="3" className="ch-band" /></g>
      <rect x="34" y="30" width="12" height="14" rx="3" className="ch-lock" />
      {open && <g className="ch-spark"><path d="M20 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /><path d="M60 4l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" /></g>}
    </svg>
  );
}
