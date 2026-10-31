const { chromium } = require('playwright');
const D = JSON.parse(process.env.DATA);
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: +(process.env.W || 1300), height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///home/claude/sudoku-academy/dist/index.html#leccion-' + process.env.T.replace(/_/g, '-'));
  await pg.waitForTimeout(400);
  const btn = t => pg.locator(`button:has-text("${t}")`).last();
  const box = async () => (await pg.locator('svg.board').first().boundingBox());
  const O = 46, VB = 950;
  const at = async (x, y) => { const bb = await box(); await pg.mouse.click(bb.x + ((x + O) / VB) * bb.width, bb.y + ((y + O) / VB) * bb.height); };
  const clickCell = c => at((c % 9) * 100 + 50, Math.floor(c / 9) * 100 + 50);
  const clickCand = (c, d) => at((c % 9) * 100 + 20 + ((d - 1) % 3) * 30, Math.floor(c / 9) * 100 + 21 + Math.floor((d - 1) / 3) * 29);
  const bar = async () => ((await pg.locator('.lbar-txt').count()) ? (await pg.locator('.lbar-txt').innerText()).replace(/\n/g, ' | ') : '(idle)');
  const shot = n => pg.screenshot({ path: `/tmp/claude-0/shots/e2e-${process.env.T}-${n}.png` });
  for (const c of D.A.slice(0, -1)) await clickCell(c);
  if (D.A.length > 1) { await btn('Comprobar').click(); console.log('A partial:', await bar()); await btn('Seguir').click(); }
  await clickCell(D.A[D.A.length - 1]); await btn('Comprobar').click(); console.log('A:', await bar()); await shot('A');
  await btn('Continuar').click();
  if (await pg.locator('.concept').count()) { await pg.waitForTimeout(1200); await shot('IDEA'); await btn('Ahora en un sudoku real').click(); }
  const sc = pg.locator('.scen'); if (await sc.count()) { await sc.first().click(); await shot('B'); }
  await btn('Continuar').click();
  if (await pg.locator('.quiz-opt').count()) { await pg.locator('.quiz-opt').first().click(); console.log('Quiz:', await bar()); await btn('Continuar').click(); }
  await pg.waitForTimeout(300); await shot('C');
  await pg.locator('.lbar button').last().click();
  const act = async (elims, places) => {
    if (places.length) { for (const p of places) { await clickCell(p.cell); await pg.click(`[aria-label="Número ${p.digit}"]`); } }
    else { for (const e of elims) await clickCand(e.cell, e.digit); await btn('Comprobar').click(); }
  };
  await btn('Pista').click(); await btn('Pista').click(); console.log('D hint:', (await pg.locator('.bubble').first().innerText()).slice(0, 80));
  await act(D.D, D.Dp); console.log('D:', await bar()); await shot('D'); await btn('Continuar').click();
  await act(D.E, D.Ep); console.log('E:', await bar()); await btn('Continuar').click();
  await act(D.F, D.Fp); console.log('F:', await bar()); await shot('F'); await btn('Continuar').click();
  await pg.waitForTimeout(300); console.log('END:', await pg.locator('.lesson-end h1').innerText()); await shot('END');
  console.log('errors', errs);
  await b.close();
})();
