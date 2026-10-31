import React, { useId, useMemo } from 'react';
import { sceneFor, Scene, SFrame, SCell } from '../../content/scenes';
import { useFrames, FrameControls } from './common';
import type { Frame } from '../../engine/step';

const S = 100;

function candPos(sc: Scene, i: number, cell: SCell | undefined, d: number): [number, number] {
  const r = Math.floor(i / sc.cols), c = i % sc.cols;
  const cx = c * S + S / 2, cy = r * S + S / 2;
  const cs = cell?.c ?? [];
  if (sc.rows === 9 && cs.length <= 3) { const k = Math.max(0, cs.indexOf(d)); return [cx + (k - (cs.length - 1) / 2) * (cs.length === 3 ? 30 : 38), cy]; }
  return [cx - 30 + ((d - 1) % 3) * 30, cy - 30 + Math.floor((d - 1) / 3) * 30];
}
const center = (sc: Scene, i: number): [number, number] => [(i % sc.cols) * S + S / 2, Math.floor(i / sc.cols) * S + S / 2];

/** Dibuja un fotograma de una escena. Los elementos conservan su clave, así las transiciones CSS animan los cambios. */
export function SceneView({ sc, fr, onClick, label }: { sc: Scene; fr: SFrame; onClick?: () => void; label?: string }) {
  const uid = useId().replace(/:/g, '');
  const W = sc.cols * S, H = sc.rows * S;
  const big = sc.rows === 3;
  const fs = big ? 26 : 28, fsInline = 40;
  const cellsList = Array.from({ length: sc.rows * sc.cols }, (_, i) => i);
  return (
    <svg className={`scene${big ? ' scene-box' : ''}`} viewBox={big ? `-6 -6 ${W + 12} ${H + 12}` : `-44 -44 ${W + 50} ${H + 50}`} role="img" aria-label={label ?? fr.text} onClick={onClick}>
      <defs>
        <marker id={`ar${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="sc-arrow" /></marker>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={big ? 14 : 8} className="sc-bg" />
      {cellsList.map(i => { const t = fr.cells[i]?.tone; return <rect key={'t' + i} x={(i % sc.cols) * S + 2} y={Math.floor(i / sc.cols) * S + 2} width={S - 4} height={S - 4} rx={big ? 12 : 6} className={`sc-tone ${t ? 'sc-t-' + t : ''}`} />; })}
      {fr.bands.map(b => {
        const [x, y, w, h] = b.k === 'r' ? [0, b.i * S, W, S] : b.k === 'c' ? [b.i * S, 0, S, H] : [(b.i % 3) * 3 * S, Math.floor(b.i / 3) * 3 * S, 3 * S, 3 * S];
        return <rect key={`b${b.k}${b.i}`} x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={8} className={`sc-band sc-t-${b.tone ?? 'focus'}`} />;
      })}
      {!big && Array.from({ length: 9 }, (_, k) => {
        const onC = fr.bands.some(b => b.k === 'c' && b.i === k), onR = fr.bands.some(b => b.k === 'r' && b.i === k);
        return <g key={'ax' + k} className="sc-axis"><text x={k * S + S / 2} y={-20} className={onC ? 'on' : ''}>{k + 1}</text><text x={-22} y={k * S + S / 2} className={onR ? 'on' : ''}>{k + 1}</text></g>;
      })}
      {/* rejilla */}
      {Array.from({ length: sc.cols + 1 }, (_, k) => <line key={'v' + k} x1={k * S} y1={0} x2={k * S} y2={H} className={sc.boxes && k % 3 === 0 ? 'sc-thick' : 'sc-thin'} />)}
      {Array.from({ length: sc.rows + 1 }, (_, k) => <line key={'h' + k} x1={0} y1={k * S} x2={W} y2={k * S} className={sc.boxes && k % 3 === 0 ? 'sc-thick' : 'sc-thin'} />)}
      {!sc.boxes && <rect x={0} y={0} width={W} height={H} rx={14} className="sc-frame" />}
      {/* contenido */}
      {cellsList.map(i => {
        const cell = fr.cells[i]; if (!cell) return null;
        const [cx, cy] = center(sc, i);
        if (cell.v) return (
          <g key={'v' + i + '-' + cell.v + (cell.hypo ?? '')} className={`sc-val${cell.given ? ' given' : ''}${cell.hypo ? ' hypo sc-h-' + cell.hypo : ''}${cell.tone ? ' vt-' + cell.tone : ''}`}>
            {cell.hypo && <circle cx={cx} cy={cy} r={36} className="sc-hring" />}
            <text x={cx} y={cy + 2} fontSize={big ? 58 : 56}>{cell.v}</text>
          </g>
        );
        const inline = sc.rows === 9 && (cell.c?.length ?? 0) <= 3;
        return (
          <g key={'c' + i}>
            {(cell.c ?? []).map(d => {
              const [x, y] = candPos(sc, i, cell, d);
              const ring = cell.ring?.[d], gone = cell.x?.includes(d);
              const rr = inline ? ((cell.c?.length ?? 0) === 1 ? 25 : (cell.c?.length ?? 0) === 2 ? 20 : 16) : 14;
              return (
                <g key={d} className={`sc-cand${gone ? ' gone' : ''}`}>
                  {ring && !gone && <circle key={'r' + ring} cx={x} cy={y} r={rr} className={`sc-ring sc-r-${ring}`} />}
                  <text x={x} y={y + 1} fontSize={inline ? ((cell.c?.length ?? 0) === 1 ? 44 : fsInline) : fs}>{d}</text>
                  {gone && <line x1={x - rr} y1={y + rr * .6} x2={x + rr} y2={y - rr * .6} className="sc-strike" pathLength={1} />}
                </g>
              );
            })}
          </g>
        );
      })}
      {fr.links.map(l => {
        let [x1, y1] = l.ad ? candPos(sc, l.a, fr.cells[l.a], l.ad) : center(sc, l.a);
        let [x2, y2] = l.bd ? candPos(sc, l.b, fr.cells[l.b], l.bd) : center(sc, l.b);
        const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        // Sin dígito: la línea sale y llega al borde de la casilla, para no tapar los números.
        const edge = 47 / Math.max(Math.abs(ux), Math.abs(uy), 1e-6);
        const p1 = l.ad ? 20 : edge, p2 = l.bd ? (l.kind === 'ray' ? 26 : 20) : edge + (l.kind === 'ray' ? 2 : 0);
        x1 += ux * p1; y1 += uy * p1; x2 -= ux * p2; y2 -= uy * p2;
        return <line key={`l${l.a}-${l.b}-${l.kind}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`sc-link sc-${l.kind}`} pathLength={l.kind === 'weak' ? undefined : 1} markerEnd={l.kind === 'ray' ? `url(#ar${uid})` : undefined} />;
      })}
    </svg>
  );
}

/** Reproductor de la idea de una técnica: animación por pasos con texto breve. */
export function ConceptPlayer({ id, autoplay = true, compact }: { id: string; autoplay?: boolean; compact?: boolean }) {
  const sc = useMemo(() => sceneFor(id), [id]);
  const frames = (sc?.frames ?? []) as unknown as Frame[];
  const ctl = useFrames(frames, autoplay);
  if (!sc) return null;
  const fr = sc.frames[ctl.i] ?? sc.frames[0];
  return (
    <div className={`concept${compact ? ' compact' : ''}`}>
      <div className="concept-stage">
        <SceneView sc={sc} fr={fr} onClick={ctl.i < ctl.total - 1 ? ctl.next : ctl.restart} />
      </div>
      <p className="concept-cap" aria-live="polite" key={ctl.i}><span className="cc-n">{ctl.i + 1}/{ctl.total}</span>{fr.text}</p>
      <FrameControls ctl={ctl} />
    </div>
  );
}
export function useConceptDone(id: string) { return !!sceneFor(id); }
