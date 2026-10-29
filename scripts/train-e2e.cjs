const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const W = +(process.env.W || 1300);
  const pg = await b.newPage({ viewport: { width: W, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const btn = t => pg.locator(`button:has-text("${t}")`).last();
  const bar = async () => ((await pg.locator('.lbar-txt').count()) ? (await pg.locator('.lbar-txt').innerText()).replace(/\n/g, ' | ') : '(idle)');
  const box = async () => (await pg.locator('svg.board').first().boundingBox());
  const at = async (x, y) => { const bb = await box(); await pg.mouse.click(bb.x + ((x + 46) / 950) * bb.width, bb.y + ((y + 46) / 950) * bb.height); };
  const candsWith = sel => pg.$$eval(sel, gs => gs.map(g => { const t = g.querySelector('text'); return { x: +t.getAttribute('x'), y: +t.getAttribute('y') }; }));
  for (const tech of ['x-wing', 'naked-pair']) {
    await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#entrenar-' + tech); await pg.waitForTimeout(500);
    for (let k = 1; k <= 4; k++) await btn('Pista').click();
    const elims = await candsWith('g.b-cand.t-elim'), plain = await candsWith('g.b-cand:not([class*="t-"])');
    await at(elims[0].x, elims[0].y); await at(plain[5].x, plain[5].y); await btn('Comprobar').click();
    console.log(tech, 'WRONG:', await bar()); await pg.screenshot({ path: `/tmp/claude-0/shots/e2e-wrong-${W}.png` });
    await btn('Seguir').click(); await at(plain[5].x, plain[5].y);
    for (const e of elims.slice(1)) await at(e.x, e.y);
    await btn('Comprobar').click(); console.log(tech, 'FIX:', await bar()); await pg.screenshot({ path: `/tmp/claude-0/shots/e2e-ok-${W}.png` });
    await btn('Continuar').click(); await pg.waitForTimeout(200);
  }
  await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#sudoku'); await pg.waitForTimeout(300);
  await pg.locator('.level-card').nth(1).click(); await pg.waitForTimeout(600);
  let n = 0;
  while (n < 200 && !(await pg.locator('.done-card').count())) {
    await pg.locator('.tool:has-text("Pista")').click(); await btn('Más pista').click(); await btn('Más pista').click();
    await btn('Aplicar').click(); n++;
  }
  console.log('steps', n, await pg.locator('.bubble').first().innerText());
  await pg.screenshot({ path: `/tmp/claude-0/shots/e2e-full-${W}.png` });
  await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#inicio'); await pg.waitForTimeout(300);
  await pg.locator('.pnode').first().click(); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `/tmp/claude-0/shots/e2e-home-${W}.png` });
  await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#progreso'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `/tmp/claude-0/shots/e2e-progress-${W}.png` });
  console.log('errors', errs); await b.close();
})();
