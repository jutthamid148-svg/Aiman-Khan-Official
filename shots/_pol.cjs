const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({channel:'chrome'});
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  await p.goto('file:///F:/New%20folder/aiman-khan-official.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1800);

  console.log(JSON.stringify(await p.evaluate(()=>({
    subs: document.querySelector('#hdrSubs')?.textContent,
    shine: !!document.querySelector('.hdr__cta .btn__shine'),
    tk: document.querySelectorAll('#tkTrack .tk').length,
    dup: document.querySelector('#tkTrack').children.length,
    dur: document.querySelector('#tkTrack').style.animationDuration,
    shuf: !!document.querySelector('#shufBtn'),
    faq: document.querySelectorAll('#faqList .faq__i').length,
    upg: document.querySelectorAll('#upgGrid .upg__c').length,
  }))));

  // ticker pause toggle
  await p.click('#tkBtn'); await p.waitForTimeout(200);
  console.log('ticker paused:', await p.evaluate(()=>document.querySelector('#tkTrack').style.animationPlayState+' / pressed='+document.querySelector('#tkBtn').getAttribute('aria-pressed')));
  await p.click('#tkBtn'); await p.waitForTimeout(200);
  console.log('ticker resumed:', await p.evaluate(()=>document.querySelector('#tkTrack').style.animationPlayState));

  // shuffle -> player opens
  await p.locator('#videos').scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.click('#shufBtn'); await p.waitForTimeout(900);
  console.log('after shuffle:', await p.evaluate(()=>({
    iframes: document.querySelectorAll('iframe[src*="youtube"]').length,
    title: (document.querySelector('#mTitle')||{}).textContent })));

  await p.locator('#ticker').scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  await p.screenshot({path:'F:/New folder/shots/p-ticker.png',clip:await p.locator('#ticker').boundingBox()});
  await p.screenshot({path:'F:/New folder/shots/p-hdr.png',clip:await p.locator('.hdr__in').boundingBox()});
  console.log('ERRORS:',errs.length?errs:'none');
  await b.close();
})();
