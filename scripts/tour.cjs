// Recorrido visual: captura todas las pantallas en móvil y escritorio, claro y oscuro, y anota errores y desbordes.
// Uso: node scripts/tour.cjs [carpeta-salida]   (requiere `npm run serve` en el puerto 5180)
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots';
const base = process.env.SA_URL || 'http://localhost:5180/';
const routes = (process.env.ROUTES || 'inicio,biblioteca,tecnica-x_wing,leccion-rules,leccion-candidates,leccion-hidden_single,leccion-x_wing,entrenar,entrenar-y_wing,entrenar-u2,prueba-u1,sudoku,sudoku-diario,contrarreloj,liga,progreso,revision,tienda,nivel,no-existe').split(',');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  // Usa el Chromium de Playwright si está instalado; si no, el Chrome del sistema.
  const b = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const report = [];
  for (const vp of [{ n: 's', w: 360, h: 740 }, { n: 'm', w: 390, h: 844 }, { n: 'd', w: 1366, h: 860 }]) for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: scheme, serviceWorkers: 'block' });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|supabase/.test(m.text())) errs.push(m.text()); });
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    for (const r of routes) {
      await pg.goto(base + '#' + r); await pg.waitForTimeout(r.startsWith('sudoku') || r.startsWith('entrenar') ? 1200 : 700);
      const ow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ow > 0) errs.push(`OVERFLOW ${r} ${ow}px`);
      await pg.screenshot({ path: `${out}/${vp.n}-${scheme}-${r}.png`, fullPage: true });
    }
    report.push(`${vp.n}-${scheme}: ${[...new Set(errs)].join(' | ') || 'sin errores'}`);
    await ctx.close();
  }
  console.log(report.join('\n'));
  await b.close();
})();
