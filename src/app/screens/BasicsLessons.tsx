import React, { useEffect, useMemo, useState } from 'react';
import { BANK } from '../bank';
import { parseGrid, basicCands, conflicts, digitsOf, PEERS, cellName, unitName, CELL_UNITS, UNITS, popcount, joinEs, ROW_UNIT, COL_UNIT, BOX_UNIT, rowOf, colOf, boxOf } from '../../engine/grid';
import type { Frame, Overlay } from '../../engine/step';
import { Board } from '../ui/Board';
import { TutorBubble, Mood, Tesela } from '../ui/Tutor';
import { Btn, DigitPad, useFrames, FrameControls, celebrate, CoordHint } from '../ui/common';
import { LessonTop, BottomBar, ExLayout } from '../ui/layout';
import { completeLesson } from '../store';
import { go } from '../router';
import { sfx } from '../sound';

const EMPTY = new Array(81).fill(0);

/** Reglas + coordenadas: qué es una fila, una columna y una caja, y cómo se nombran las casillas. */
export function RulesLesson() {
  const sol = useMemo(() => parseGrid(BANK.puzzles[0].s), []);
  const frames: Frame[] = useMemo(() => [
    { text: 'Una FILA va de lado a lado ↔. Hay 9, numeradas de arriba abajo.', units: [{ u: 1, tone: 'focus' }] },
    { text: 'Una COLUMNA va de arriba abajo ↕. Hay 9, numeradas de izquierda a derecha.', units: [{ u: 9 + 4, tone: 'cover' }] },
    { text: 'Una CAJA es un bloque de 3×3. También hay 9.', units: [{ u: 18 + 4, tone: 'base' }] },
    { text: 'Cada casilla se nombra por su fila y su columna: F2C5 = fila 2, columna 5.', units: [{ u: 1, tone: 'focus' }, { u: 9 + 4, tone: 'cover' }], cells: [{ cell: 13, tone: 'pivot' }] },
    { text: 'La regla: en cada fila, columna y caja van del 1 al 9, sin repetir.', units: [{ u: 6, tone: 'focus' }] },
  ], []);
  const ctl = useFrames(frames, true);
  const tasks = useMemo(() => [
    { q: 'Toca una casilla de la fila 3', ok: (c: number) => rowOf(c) === 2, show: { units: [{ u: 2, tone: 'focus' as const }] } },
    { q: 'Toca una casilla de la columna 7', ok: (c: number) => colOf(c) === 6, show: { units: [{ u: 15, tone: 'cover' as const }] } },
    { q: 'Toca una casilla de la caja 5', ok: (c: number) => boxOf(c) === 4, show: { units: [{ u: 22, tone: 'base' as const }] } },
    { q: 'Toca la casilla F6C2', ok: (c: number) => c === 46, show: { cells: [{ cell: 46, tone: 'pivot' as const }] } },
  ], []);
  const holes = useMemo(() => [2, 13, 24, 30, 40, 50, 56, 67, 78], []);
  const [stage, setStage] = useState<'learn' | 'tap' | 'fill' | 'done'>('learn');
  const [t, setT] = useState(0);
  const [tapFb, setTapFb] = useState<{ ok: boolean; cell: number } | null>(null);
  const [v, setV] = useState(() => sol.map((d, i) => (holes.includes(i) ? 0 : d)));
  const [sel, setSel] = useState<number | null>(holes[0]);
  const [msg, setMsg] = useState<{ t: string; mood: Mood; bad?: boolean } | null>(null);
  const progress = stage === 'learn' ? .1 + (ctl.i / frames.length) * .25 : stage === 'tap' ? .4 + (t / tasks.length) * .3 : stage === 'fill' ? .75 : 1;
  const top = <LessonTop progress={progress} onClose={() => go('inicio')} />;
  const bad = conflicts(v);
  useEffect(() => { if (stage === 'done') { completeLesson('rules'); celebrate(); sfx('complete'); } }, [stage]);

  if (stage === 'learn') return (
    <div className="runner">{top}
      <ExLayout title="Filas, columnas y cajas" tutor={<TutorBubble mood="point">{ctl.frame.text}</TutorBubble>}
        board={<Board values={sol} cands={EMPTY} givens={sol.map(() => true)} overlays={[ctl.frame]} />} below={<FrameControls ctl={ctl} />} />
      <BottomBar right={<Btn kind={ctl.i >= frames.length - 1 ? 'primary' : 'ghost'} big onClick={() => setStage('tap')}>{ctl.i >= frames.length - 1 ? 'Continuar' : 'Saltar'}</Btn>} />
    </div>
  );
  if (stage === 'tap') {
    const task = tasks[t];
    return (
      <div className="runner">{top}
        <ExLayout title={task.q} tutor={<TutorBubble mood={tapFb ? (tapFb.ok ? 'happy' : 'oops') : 'think'}>{tapFb ? (tapFb.ok ? '¡Eso es!' : `Esa es ${cellName(tapFb.cell)}: fila ${rowOf(tapFb.cell) + 1}, columna ${colOf(tapFb.cell) + 1}.`) : 'Mira los números del borde.'}</TutorBubble>}
          board={<Board values={sol} cands={EMPTY} givens={sol.map(() => true)} selected={tapFb?.cell ?? null} overlays={tapFb ? [task.show] : []}
            onCell={c => { if (!tapFb?.ok) { const ok = task.ok(c); sfx(ok ? 'correct' : 'wrong'); setTapFb({ ok, cell: c }); } }} />}
          below={<div className="board-tools"><CoordHint /></div>} />
        {tapFb?.ok ? <BottomBar tone="ok" title="¡Correcto!" right={<Btn kind="success" big onClick={() => { setTapFb(null); if (t + 1 < tasks.length) setT(t + 1); else setStage('fill'); }}>Continuar</Btn>} />
          : tapFb ? <BottomBar tone="bad" title="Casi" text="Prueba otra vez." right={<Btn kind="danger" big onClick={() => setTapFb(null)}>Seguir</Btn>} />
            : <BottomBar />}
      </div>
    );
  }
  function put(d: number) {
    if (sel === null || !holes.includes(sel)) return;
    const nv = v.slice(); nv[sel] = d; setV(nv);
    const peer = PEERS[sel].find(p => nv[p] === d);
    if (peer !== undefined) { const u = CELL_UNITS[sel].find(uu => UNITS[uu].includes(peer))!; setMsg({ t: `El ${d} ya está en la ${unitName(u)}.`, mood: 'oops', bad: true }); sfx('wrong'); }
    else if (nv.every((x, i) => !holes.includes(i) || x === sol[i])) setStage('done');
    else { sfx('place'); setMsg({ t: '¡Bien!', mood: 'happy' }); const nx = holes.find(h => !nv[h]); if (nx !== undefined) setSel(nx); }
  }
  if (stage === 'fill') return (
    <div className="runner">{top}
      <ExLayout title="Completa los huecos" tutor={<TutorBubble mood={msg?.mood ?? 'idle'}>{msg?.t ?? 'En cada hueco falta el número que no está en su fila.'}</TutorBubble>}
        board={<Board values={v} cands={EMPTY} givens={v.map((_, i) => !holes.includes(i))} errors={[...bad]} selected={sel} onCell={c => setSel(c)} onMove={setSel} onKey={k => /^[1-9]$/.test(k) && put(+k)} />}
        below={<DigitPad onDigit={put} disabled={sel === null || !holes.includes(sel)} />} />
      {msg?.bad ? <BottomBar tone="bad" title="Se repite" text={msg.t} right={<Btn kind="danger" big onClick={() => setMsg(null)}>Seguir</Btn>} /> : <BottomBar />}
    </div>
  );
  return (
    <div className="runner">{top}
      <div className="lesson-end"><Tesela mood="wow" size={150} /><h1>¡Ya conoces el tablero!</h1></div>
      <BottomBar left={<Btn onClick={() => go('inicio')}>Mapa</Btn>} right={<Btn kind="primary" big onClick={() => go('leccion-candidates')}>Siguiente</Btn>} />
    </div>
  );
}

export function CandidatesLesson() {
  const g = useMemo(() => parseGrid(BANK.puzzles[1].g), []);
  const bc = useMemo(() => basicCands(g), []);
  const targets = useMemo(() => {
    const cs = bc.map((m, i) => ({ i, n: popcount(m) })).filter(x => !g[x.i] && x.n >= 2 && x.n <= 4);
    return [cs[0], cs[Math.floor(cs.length / 2)], cs[cs.length - 1]].map(x => x.i);
  }, []);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState(0);
  const [res, setRes] = useState<{ ok: boolean; line: string } | null>(null);
  const [shown, setShown] = useState<number[]>(new Array(81).fill(0));
  const done = k >= targets.length;
  const cell = targets[Math.min(k, targets.length - 1)];
  useEffect(() => { if (done) { completeLesson('candidates'); celebrate(); sfx('complete'); } }, [done]);
  const top = <LessonTop progress={(k + (res?.ok ? 1 : 0)) / targets.length} onClose={() => go('inicio')} />;

  function check() {
    const want = bc[cell];
    const extra = digitsOf(picked & ~want), missing = digitsOf(want & ~picked);
    let line = '';
    if (extra.length) { const d = extra[0]; const s = PEERS[cell].find(p => g[p] === d)!; const u = CELL_UNITS[cell].find(uu => UNITS[uu].includes(s))!; line = `El ${d} no: ya está en su ${unitName(u).split(' ')[0]}.`; }
    else if (missing.length) line = `Te falta ${missing.length === 1 ? 'un número' : missing.length + ' números'}.`;
    setRes({ ok: picked === want, line }); sfx(picked === want ? 'correct' : 'wrong');
    if (picked === want) { const s = shown.slice(); s[cell] = want; setShown(s); }
  }
  if (done) return (
    <div className="runner">{top}
      <div className="lesson-end"><Tesela mood="wow" size={150} /><h1>¡Sabes anotar candidatos!</h1></div>
      <BottomBar left={<Btn onClick={() => go('inicio')}>Mapa</Btn>} right={<Btn kind="primary" big onClick={() => go('leccion-naked_single')}>Siguiente</Btn>} />
    </div>
  );
  const overlay: Overlay = {
    cells: [{ cell, tone: 'focus' }, ...PEERS[cell].filter(p => g[p]).map(p => ({ cell: p, tone: 'source' as const }))],
    units: [ROW_UNIT(cell), COL_UNIT(cell), BOX_UNIT(cell)].map(u => ({ u, tone: 'base' as const })),
  };
  const cands = shown.slice(); cands[cell] = picked;
  return (
    <div className="runner">{top}
      <ExLayout title={`¿Qué números caben en ${cellName(cell)}?`}
        tutor={<TutorBubble mood={res ? (res.ok ? 'happy' : 'oops') : 'think'}>{res?.ok ? `¡Sí! ${joinEs(digitsOf(bc[cell]))}.` : 'Elige los que NO están en su fila, columna ni caja.'}</TutorBubble>}
        board={<Board values={g} cands={cands} givens={g.map(x => x > 0)} overlays={[overlay]} selected={cell} onKey={kk => /^[1-9]$/.test(kk) && !res?.ok && setPicked(p => p ^ (1 << +kk))} />}
        below={<><DigitPad onDigit={d => { if (!res?.ok) { setPicked(p => p ^ (1 << d)); setRes(null); } }} active={picked || undefined} pick /><div className="board-tools"><CoordHint /></div></>} />
      {res?.ok ? <BottomBar tone="ok" title="¡Correcto!" right={<Btn kind="success" big onClick={() => { setK(k + 1); setPicked(0); setRes(null); }}>Continuar</Btn>} />
        : res ? <BottomBar tone="bad" title="Casi" text={res.line} right={<Btn kind="danger" big onClick={() => setRes(null)}>Seguir</Btn>} />
          : <BottomBar right={<Btn kind="primary" big onClick={check} disabled={!picked}>Comprobar</Btn>} />}
    </div>
  );
}
