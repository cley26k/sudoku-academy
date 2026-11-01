import React, { useId, useMemo, useRef } from 'react';
import type { Overlay, CellTone, CandTone, CD } from '../../engine/step';
import { rowOf, colOf, boxOf, has, cellName, digitsOf, unitKind, unitIndex } from '../../engine/grid';

export interface BoardProps {
  values: number[];
  cands: number[];
  givens: boolean[];
  locked?: boolean[];
  showCands?: boolean;
  overlays?: (Overlay | null | undefined)[];
  selected?: number | null;
  multi?: number[];
  marks?: CD[];
  errors?: number[];
  onCell?: (cell: number, subDigit: number) => void;
  onKey?: (key: string, e: React.KeyboardEvent) => void;
  onMove?: (cell: number) => void;
  label?: string;
  peerHighlight?: boolean;
  compact?: boolean;
  axes?: boolean;
  hlDigit?: number;
}

const S = 100;
const candXY = (cell: number, d: number) => ({ x: colOf(cell) * S + 20 + ((d - 1) % 3) * 30, y: rowOf(cell) * S + 21 + Math.floor((d - 1) / 3) * 29 });

function unitRect(u: number) {
  const k = unitKind(u), i = unitIndex(u);
  if (k === 'row') return { x: 0, y: i * S, w: 9 * S, h: S };
  if (k === 'col') return { x: i * S, y: 0, w: S, h: 9 * S };
  return { x: (i % 3) * 3 * S, y: Math.floor(i / 3) * 3 * S, w: 3 * S, h: 3 * S };
}

export function Board(p: BoardProps) {
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const merged = useMemo(() => {
    const units: NonNullable<Overlay['units']> = [], cells: NonNullable<Overlay['cells']> = [], cands: NonNullable<Overlay['cands']> = [],
      links: NonNullable<Overlay['links']> = [], place: CD[] = [], hypo: CD[] = [], rays: NonNullable<Overlay['rays']> = [];
    let digitFocus: number | undefined;
    for (const o of p.overlays ?? []) {
      if (!o) continue;
      units.push(...(o.units ?? [])); cells.push(...(o.cells ?? [])); cands.push(...(o.cands ?? []));
      links.push(...(o.links ?? [])); place.push(...(o.place ?? [])); hypo.push(...(o.hypo ?? [])); rays.push(...(o.rays ?? []));
      if (o.digitFocus) digitFocus = o.digitFocus;
    }
    const cellTone = new Map<number, CellTone>(); cells.forEach(c => cellTone.set(c.cell, c.tone));
    const candTone = new Map<number, CandTone>(); cands.forEach(c => candTone.set(c.cell * 10 + c.digit, c.tone));
    (p.marks ?? []).forEach(m => { if (!candTone.has(m.cell * 10 + m.digit) || candTone.get(m.cell * 10 + m.digit) === 'dim') candTone.set(m.cell * 10 + m.digit, 'mark'); });
    return { units, cellTone, candTone, links, place, hypo, digitFocus, rays };
  }, [p.overlays, p.marks]);

  const sel = p.selected ?? null;
  const selVal = sel !== null && p.values[sel] ? p.values[sel] : p.hlDigit ?? 0;
  const multi = new Set(p.multi ?? []);
  const errors = new Set(p.errors ?? []);
  const showC = p.showCands !== false;
  const axes = p.axes !== false;
  const O = axes ? 46 : 4, VB = 904 + O;

  function hit(e: React.PointerEvent) {
    const svg = ref.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VB - O, y = ((e.clientY - r.top) / r.height) * VB - O;
    if (x < 0 || y < 0 || x >= 900 || y >= 900) return;
    const c = Math.floor(x / S), rr = Math.floor(y / S);
    const sub = Math.floor(((y % S) / S) * 3) * 3 + Math.floor(((x % S) / S) * 3) + 1;
    p.onCell?.(rr * 9 + c, sub);
  }
  function key(e: React.KeyboardEvent) {
    const cur = sel ?? 40;
    const mv: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in mv) {
      e.preventDefault();
      // La primera flecha solo selecciona la casilla central.
      if (sel === null) { p.onMove?.(40); return; }
      let n = cur + mv[e.key];
      if (e.key === 'ArrowLeft' && colOf(cur) === 0) n = cur + 8;
      if (e.key === 'ArrowRight' && colOf(cur) === 8) n = cur - 8;
      if (n < 0) n += 81; if (n > 80) n -= 81;
      p.onMove?.(n);
      return;
    }
    // Con Mayúsculas, e.key es «%», «!»…: el dígito se toma de la tecla física.
    const dg = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    p.onKey?.(dg ? dg[1] : e.key, e);
  }
  const live = sel !== null
    ? `${cellName(sel)}: ${p.values[sel] ? `contiene ${p.values[sel]}${p.givens[sel] ? ' (pista)' : ''}` : showC && p.cands[sel] ? `vacía, candidatos ${digitsOf(p.cands[sel]).join(' ')}` : 'vacía'}`
    : '';

  return (
    <div className={`board-wrap${p.compact ? ' compact' : ''}`} tabIndex={0} role="application" aria-label={p.label ?? 'Tablero de sudoku. Usa las flechas para moverte y los números para jugar.'} onKeyDown={key}>
      <svg ref={ref} viewBox={`${-O} ${-O} ${VB} ${VB}`} className="board" onPointerDown={hit} aria-hidden="true">
        {axes && Array.from({ length: 9 }, (_, i) => (
          <g key={'ax' + i} className="b-axis">
            <text x={-24} y={i * S + 52} className={sel !== null && rowOf(sel) === i ? 'on' : ''}>{i + 1}</text>
            <text x={i * S + 50} y={-22} className={sel !== null && colOf(sel) === i ? 'on' : ''}>{i + 1}</text>
          </g>
        ))}
        <rect x={-6} y={-6} width={912} height={912} rx={22} className="b-bg" />
        {/* Resaltado de vecinos de la selección */}
        {p.peerHighlight !== false && sel !== null && Array.from({ length: 81 }, (_, c) =>
          c !== sel && (rowOf(c) === rowOf(sel) || colOf(c) === colOf(sel) || boxOf(c) === boxOf(sel))
            ? <rect key={'p' + c} x={colOf(c) * S} y={rowOf(c) * S} width={S} height={S} className="b-peer" /> : null)}
        {selVal > 0 && Array.from({ length: 81 }, (_, c) => (c !== sel && p.values[c] === selVal
          ? <rect key={'s' + c} x={colOf(c) * S} y={rowOf(c) * S} width={S} height={S} className="b-same" /> : null))}
        {/* Unidades del razonamiento */}
        {merged.units.map((u, i) => { const r = unitRect(u.u); return <rect key={'u' + i} x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} rx={8} className={`b-unit t-${u.tone}`} />; })}
        {/* Tonos de casilla */}
        {[...merged.cellTone].map(([c, t]) => <rect key={'c' + c} x={colOf(c) * S + 4} y={rowOf(c) * S + 4} width={S - 8} height={S - 8} rx={10} className={`b-cell t-${t}`} />)}
        {[...multi].map(c => <rect key={'m' + c} x={colOf(c) * S + 5} y={rowOf(c) * S + 5} width={S - 10} height={S - 10} rx={10} className="b-multi" />)}
        {/* Líneas de la cuadrícula */}
        {Array.from({ length: 10 }, (_, i) => (
          <g key={'g' + i}>
            <line x1={i * S} y1={0} x2={i * S} y2={900} className={i % 3 === 0 ? 'b-thick' : 'b-thin'} />
            <line x1={0} y1={i * S} x2={900} y2={i * S} className={i % 3 === 0 ? 'b-thick' : 'b-thin'} />
          </g>
        ))}
        {/* Enlaces */}
        {merged.links.map((l, i) => {
          const a = candXY(l.a.cell, l.a.digit), b = candXY(l.b.cell, l.b.digit);
          return <line key={'l' + i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`b-link ${l.kind}`} />;
        })}
        {/* Flechas: quién bloquea a quién */}
        <defs>
          <marker id={`ab${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" className="b-arrow-head" /></marker>
          <marker id={`ae${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" className="b-arrow-head elim" /></marker>
        </defs>
        {merged.rays.map((r, i) => {
          const x1 = colOf(r.from) * S + 50, y1 = rowOf(r.from) * S + 50, x2 = colOf(r.to) * S + 50, y2 = rowOf(r.to) * S + 50;
          const len = Math.hypot(x2 - x1, y2 - y1) || 1, k = Math.max(0, (len - 34) / len), k0 = 28 / len;
          return <line key={`r${i}-${r.from}-${r.to}`} x1={x1 + (x2 - x1) * k0} y1={y1 + (y2 - y1) * k0} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k}
            className={`b-ray${r.tone === 'elim' ? ' elim' : ''}`} style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }} markerEnd={`url(#${r.tone === 'elim' ? 'ae' : 'ab'}${uid})`} />;
        })}
        {/* Valores y candidatos */}
        {Array.from({ length: 81 }, (_, c) => {
          const v = p.values[c];
          const x = colOf(c) * S, y = rowOf(c) * S;
          if (v) {
            const kind = p.givens[c] ? 'given' : p.locked?.[c] ? 'solved' : 'user';
            return <text key={'v' + c} x={x + 50} y={y + 52} className={`b-val ${kind}${errors.has(c) ? ' err' : ''}`}>{v}</text>;
          }
          const placed = merged.place.find(q => q.cell === c);
          if (placed) return <g key={'pl' + c} className="b-place"><circle cx={x + 50} cy={y + 50} r={38} /><text x={x + 50} y={y + 52} className="b-val placed">{placed.digit}</text></g>;
          const hyp = merged.hypo.find(q => q.cell === c);
          const items: React.ReactNode[] = [];
          if (hyp) items.push(<g key="h" className="b-hypo"><circle cx={x + 50} cy={y + 50} r={36} /><text x={x + 50} y={y + 52} className="b-val hypo">{hyp.digit}</text></g>);
          if (showC && !hyp) {
            for (let d = 1; d <= 9; d++) {
              if (!has(p.cands[c], d)) continue;
              const { x: cx, y: cy } = candXY(c, d);
              const tone = merged.candTone.get(c * 10 + d);
              const dim = merged.digitFocus && merged.digitFocus !== d && !tone;
              const focus = merged.digitFocus === d && !tone;
              items.push(
                <g key={d} className={`b-cand${tone ? ' t-' + tone : ''}${dim ? ' dimmed' : ''}${focus ? ' focus' : ''}`}>
                  {tone && tone !== 'dim' && <circle cx={cx} cy={cy} r={14} />}
                  <text x={cx} y={cy + 1}>{d}</text>
                  {(tone === 'elim' || tone === 'mark') && <line x1={cx - 12} y1={cy + 12} x2={cx + 12} y2={cy - 12} />}
                </g>);
            }
          }
          return <g key={'e' + c}>{items}</g>;
        })}
        {[...errors].filter(c => !p.values[c]).map(c => <rect key={'er' + c} x={colOf(c) * S + 4} y={rowOf(c) * S + 4} width={S - 8} height={S - 8} rx={10} className="b-err" />)}
        {sel !== null && <rect x={colOf(sel) * S + 3} y={rowOf(sel) * S + 3} width={S - 6} height={S - 6} rx={10} className="b-sel" />}
      </svg>
      <div className="sr-only" aria-live="polite">{live}</div>
    </div>
  );
}
