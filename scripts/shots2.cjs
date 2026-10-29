const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  for (const r of ['leccion-y_wing', 'inicio', 'sudoku-diario', 'biblioteca']) {
    await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#' + r); await pg.waitForTimeout(700);
    const ow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ow > 0) errs.push('overflow ' + r + ' ' + ow);
    await pg.screenshot({ path: `/tmp/claude-0/shots/dark-m-${r}.png` });
  }
  const pg2 = await (await b.newContext({ viewport: { width: 1300, height: 860 }, colorScheme: 'dark' })).newPage();
  await pg2.goto('file:///home/claude/sudoku-academy/dist/index.html#leccion-simple_coloring'); await pg2.waitForTimeout(400);
  await pg2.click('text=Pista 1/4'); await pg2.click('text=Pista 2/4'); await pg2.click('text=Pista 3/4');
  await pg2.screenshot({ path: `/tmp/claude-0/shots/dark-d-coloring.png` });
  console.log(errs); await b.close();
})();
