import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useRoute, go } from './router';
import { Home, Library, SheetPage, TopStats } from './screens/Learn';
import { Lesson } from './screens/Lesson';
import { RulesLesson, CandidatesLesson } from './screens/BasicsLessons';
import { Train } from './screens/Train';
import { Play } from './screens/Play';
import { ProgressPage, ReviewPage } from './screens/Stats';
import { SHEET_BY_ID, READY } from '../content/catalog';
import { UnitTest } from './screens/Play';
import { Welcome, Placement } from './screens/Welcome';
import { I, Icon, ConfettiLayer } from './ui/common';
import { useProgress, update, getProgress } from './store';
import { Tesela } from './ui/Tutor';
import type { TechId } from '../engine/step';
import { TECH_BY_ID } from '../engine/techniques';
import { initAudio, setMusic } from './sound';
initAudio();

const NAV = [
  { r: 'inicio', label: 'Aprender', icon: I.map, c: 'green' },
  { r: 'biblioteca', label: 'Técnicas', icon: I.book, c: 'blue' },
  { r: 'entrenar', label: 'Entrenar', icon: I.target, c: 'red' },
  { r: 'sudoku', label: 'Sudoku', icon: I.grid, c: 'purple' },
  { r: 'progreso', label: 'Progreso', icon: I.chart, c: 'orange' },
  { r: 'revision', label: 'Errores', icon: I.rewind, c: 'pink' },
];

function Screen({ route }: { route: string }) {
  const tail = (n: number) => route.slice(n).replace(/-/g, '_');
  if (route.startsWith('tecnica-')) { const s = SHEET_BY_ID[tail(8)]; if (s) return <SheetPage sheet={s} />; }
  if (route.startsWith('leccion-')) {
    const id = tail(8);
    if (id === 'rules') return <RulesLesson />;
    if (id === 'candidates') return <CandidatesLesson />;
    const s = SHEET_BY_ID[id]; if (s?.impl) return <Lesson key={id} sheet={s} />;
  }
  const um = route.match(/^(entrenar|prueba)-u(\d)$/);
  if (um) {
    const n = +um[2];
    const unitTechs = READY.filter(s => s.unit === n).map(s => s.impl!);
    if (um[1] === 'entrenar') return <Train key={route} presetTechs={unitTechs} />;
    return <UnitTest key={route} unit={n} allowed={READY.filter(s => s.unit <= n).map(s => s.impl!)} require={unitTechs} />;
  }
  if (route.startsWith('entrenar-')) { const t = tail(9) as TechId; if (TECH_BY_ID[t]) return <Train key={t} preset={t} />; }
  switch (route) {
    case 'inicio': { const p = getProgress(); if (!p.welcomed && !Object.keys(p.lessons).length && !p.attempts.length) return <Welcome />; return <Home />; }
    case 'nivel': return <Placement />;
    case 'biblioteca': return <Library />;
    case 'entrenar': return <Train key="free" />;
    case 'sudoku': return <Play key="free" />;
    case 'sudoku-diario': return <Play key="daily" daily />;
    case 'progreso': return <ProgressPage />;
    case 'revision': return <ReviewPage />;
  }
  return <div className="empty-state"><Tesela mood="oops" size={110} /><h2>No encontrado</h2><button className="btn btn-primary btn-big" onClick={() => go('inicio')}><span>Inicio</span></button></div>;
}

function App() {
  const route = useRoute();
  const p = useProgress();
  const focus = route.startsWith('leccion-') || route === 'nivel';
  const section = route.startsWith('tecnica-') ? 'biblioteca' : route.startsWith('entrenar') ? 'entrenar' : route.startsWith('sudoku') ? 'sudoku' : route;
  useEffect(() => {
    const t = p.settings.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }, [p.settings.theme]);
  const nextTheme = p.settings.theme === 'system' ? 'dark' : p.settings.theme === 'dark' ? 'light' : 'system';
  const openMistakes = p.mistakes.filter(m => !m.resolved).length;
  return (
    <div className={`shell${focus ? ' focus' : ''}`}>
      <ConfettiLayer />
      {!focus && (
        <nav className="rail" aria-label="Principal">
          <button className="brand" onClick={() => go('inicio')} aria-label="Sudoku Academy, inicio">
            <Tesela size={44} mood="idle" />
            <span className="wordmark">sudoku<br /><b>academy</b></span>
          </button>
          <div className="mobile-stats"><TopStats /></div>
          <ul>
            {NAV.map(n => (
              <li key={n.r}>
                <button className={`nav c-${n.c}${section === n.r ? ' on' : ''}`} aria-current={section === n.r ? 'page' : undefined} onClick={() => go(n.r)}>
                  <span className="nav-ico"><Icon d={n.icon} size={22} stroke={2.4} /></span><span className="nav-lbl">{n.label}</span>
                  {n.r === 'revision' && openMistakes > 0 && <span className="badge" aria-label={`${openMistakes} por revisar`}>{openMistakes}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="audio-btns">
            <button className={`icon-toggle${p.settings.sound ? ' on' : ''}`} onClick={() => update(pp => { pp.settings.sound = !pp.settings.sound; })} aria-pressed={p.settings.sound} aria-label={p.settings.sound ? 'Silenciar efectos' : 'Activar efectos de sonido'}><Icon d={p.settings.sound ? I.speaker : I.mute} /></button>
            <button className={`icon-toggle${p.settings.music ? ' on' : ''}`} onClick={() => { const on = !p.settings.music; update(pp => { pp.settings.music = on; }); setMusic(on); }} aria-pressed={p.settings.music} aria-label={p.settings.music ? 'Apagar música' : 'Poner música'}><Icon d={I.music} /></button>
          </div>
          <button className="theme-btn" onClick={() => update(pp => { pp.settings.theme = nextTheme; })} aria-label={`Tema: ${p.settings.theme === 'system' ? 'sistema' : p.settings.theme === 'dark' ? 'oscuro' : 'claro'}. Cambiar.`}>
            <Icon d={p.settings.theme === 'dark' ? I.moon : p.settings.theme === 'light' ? I.sun : I.eye} />
            <span>{p.settings.theme === 'system' ? 'Tema auto' : p.settings.theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
          </button>
        </nav>
      )}
      <main className="main" id="main"><div className="page" key={route.split('-')[0]}><Screen route={route} /></div></main>
    </div>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  constructor(p: { children: React.ReactNode }) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  render() {
    if (this.state.err) return <div className="empty-state"><Tesela mood="oops" size={110} /><h2>Algo ha fallado</h2><p>{this.state.err}</p><button className="btn btn-primary btn-big" onClick={() => { this.setState({ err: null }); go('inicio'); }}><span>Volver al inicio</span></button></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>);
