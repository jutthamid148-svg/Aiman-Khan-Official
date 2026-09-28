const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({channel:'chrome'});
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  // /tmp/ak-live.html = same file but with a real-format AS_PUB
  await p.goto('file:///F:/New%20folder/shots/_live.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1500);

  console.log('BEFORE consent:',JSON.stringify(await p.evaluate(()=>({
    adsOn: document.body.classList.contains('ads-on'),
    ins: document.querySelectorAll('ins.adsbygoogle').length,
    googScripts: [...document.querySelectorAll('script[src]')].filter(s=>/googlesyndication/.test(s.src)).length,
    banner: !document.querySelector('#cc').hidden,
  }))));

  await p.click('#ccYes');
  await p.waitForTimeout(2500);

  console.log('AFTER accept:',JSON.stringify(await p.evaluate(()=>({
    adsOn: document.body.classList.contains('ads-on'),
    ins: document.querySelectorAll('ins.adsbygoogle').length,
    googScripts: [...document.querySelectorAll('script[src]')].filter(s=>/googlesyndication/.test(s.src)).length,
    banner: !document.querySelector('#cc').hidden,
    pushed: (window.adsbygoogle||[]).length,
    boxH: [...document.querySelectorAll('.adbox')].map(e=>e.offsetHeight),
  }))));

  await p.locator('.adbox').first().scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  await p.screenshot({path:'F:/New folder/shots/a-live.png'});

  console.log('ERRORS:',errs.length?errs.filter(e=>!/net::ERR|Failed to load|adsbygoogle/i.test(e)):'none');
  await b.close();
})();
