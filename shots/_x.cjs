const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///F:/New%20folder/aiman-khan-official.html', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.locator('#bnrg').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(() => {
    const i = document.querySelector('.bnrg__img');
    const r = i.getBoundingClientRect();
    return { dash: !!document.getElementById('dash'), nat: [i.naturalWidth, i.naturalHeight],
             w: Math.round(r.width), h: Math.round(r.height), of: i.currentSrc.split('/').pop() };
  })));
  await p.locator('.hero').screenshot({ path: 'F:/New folder/shots/bnrg.png' });
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.goto('file:///F:/New%20folder/aiman-khan-official.html', { waitUntil: 'load' });
  await m.waitForTimeout(1200);
  await m.locator('#bnrg').scrollIntoViewIfNeeded();
  await m.waitForTimeout(1000);
  await m.locator('#bnrg').screenshot({ path: 'F:/New folder/shots/bnrg-m.png' });
  console.log('errs', errs);
  await b.close();
})();
