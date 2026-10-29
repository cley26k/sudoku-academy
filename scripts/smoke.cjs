const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const routes = (process.env.ROUTES || 'inicio,biblioteca,tecnica-x_wing,leccion-x_wing,entrenar-y_wing,sudoku,progreso,revision,leccion-rules,leccion-candidates').split(',');
  for (const vp of [{ n: 'd', w: 1400, h: 900 }, { n: 'm', w: 400, h: 860 }]) {
    const pg = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errs = [];
    pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    for (const r of routes) {
      await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#' + r);
      await pg.waitForTimeout(r === 'sudoku' ? 800 : 500);
      const ow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ow > 0) errs.push(`OVERFLOW ${r} ${ow}px`);
      await pg.screenshot({ path: `/tmp/claude-0/shots/${vp.n}-${r}.png`, fullPage: false });
    }
    console.log(vp.n, errs.filter(e => !e.includes('fonts.g')).join('\n') || 'no errors');
    await pg.close();
  }
  await b.close();
})();
