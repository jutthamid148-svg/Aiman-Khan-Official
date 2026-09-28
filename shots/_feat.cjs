const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({channel:'chrome'});
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  await p.goto('file:///F:/New%20folder/aiman-khan-official.html');
  await p.waitForTimeout(1800);

  const counts=await p.evaluate(()=>({
    dashImg: !!document.querySelector('#bnrg'),
    dashInBody: document.body.innerText.includes('Download picture'),
    upg: document.querySelectorAll('#upgGrid .upg__c').length,
    cad: document.querySelectorAll('#cadGrid .cad__c').length,
    cadNums: [...document.querySelectorAll('#cadGrid .cad__n')].map(e=>e.textContent),
    mile: document.querySelectorAll('#mileGrid .mile__c').length,
    mileNums: [...document.querySelectorAll('#mileGrid .mile__n')].map(e=>e.textContent.trim()),
    faq: document.querySelectorAll('#faqList .faq__i').length,
    faqOpen: document.querySelectorAll('#faqList .faq__i.open').length,
    bms: document.querySelectorAll('.vcard .bm').length,
    vcards: document.querySelectorAll('.vcard').length,
    aCtrl: !!document.querySelector('.aCtrl'),
    nav: [...document.querySelectorAll('.nav a')].map(a=>a.getAttribute('href')),
    side: document.querySelectorAll('#sidenav a').length,
    sideIds: [...document.querySelectorAll('#sidenav a')].map(a=>a.dataset.sec),
  }));
  console.log(JSON.stringify(counts,null,1));

  // bookmark toggle
  await p.click('.vcard .bm');
  await p.waitForTimeout(400);
  const bm1=await p.evaluate(()=>({
    saved: document.querySelectorAll('#bmRow .bmcard').length,
    barHidden: document.querySelector('#bmBar').classList.contains('hide'),
    count: document.querySelector('#bmCount').textContent,
    ls: localStorage.getItem('ak_watchlist_v1'),
  }));
  console.log('after bookmark:',JSON.stringify(bm1));

  // text size
  await p.click('#aPlus'); await p.waitForTimeout(200);
  const fs=await p.evaluate(()=>({cls:document.documentElement.className,lbl:document.querySelector('#aLabel').textContent,ls:localStorage.getItem('ak_textsize_v1')}));
  console.log('fontsize:',JSON.stringify(fs));

  // faq toggle
  await p.click('#faqList .faq__i:nth-child(2) .faq__q');
  await p.waitForTimeout(450);
  const fq=await p.evaluate(()=>[...document.querySelectorAll('#faqList .faq__a')].map(a=>a.style.maxHeight));
  console.log('faq maxH:',JSON.stringify(fq));

  await p.locator('#recent').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('#recent').screenshot({path:'F:/New folder/shots/n-recent.png'});
  await p.locator('#rhythm').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('#rhythm').screenshot({path:'F:/New folder/shots/n-rhythm.png'});
  await p.locator('#milestones').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('#milestones').screenshot({path:'F:/New folder/shots/n-mile.png'});
  await p.locator('#faq').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('#faq').screenshot({path:'F:/New folder/shots/n-faq.png'});
  await p.locator('#videos').scrollIntoViewIfNeeded(); await p.waitForTimeout(700);
  await p.locator('#bmBar').screenshot({path:'F:/New folder/shots/n-bmbar.png'});

  console.log('ERRORS:',errs.length?errs:'none');
  await b.close();
})();
