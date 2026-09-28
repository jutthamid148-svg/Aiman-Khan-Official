const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({channel:'chrome'});
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  await p.goto('file:///F:/New%20folder/aiman-khan-official.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1800);

  // placeholder state: no google script, boxes hidden, banner visible
  console.log(JSON.stringify(await p.evaluate(()=>({
    configured: /^pub-\d{10,}$/.test(document.__as_pub||'') ,
    googScripts: [...document.querySelectorAll('script[src]')].map(s=>s.src).filter(s=>/googlesyndication|adsbygoogle|doubleclick/.test(s)).length,
    adsOn: document.body.classList.contains('ads-on'),
    boxes: document.querySelectorAll('.adbox').length,
    boxesVisible: [...document.querySelectorAll('.adbox')].map(e=>e.offsetHeight>0),
    ins: document.querySelectorAll('ins.adsbygoogle').length,
    banner: !document.querySelector('#cc').hidden,
    dataSec: !!document.querySelector('#data'),
    dataCards: document.querySelectorAll('.data__i').length,
  })),null,1));

  await p.screenshot({path:'F:/New folder/shots/a-cc.png',clip:await p.locator('#cc').boundingBox()});

  // accept -> no crash, ads-on, ins filled
  await p.click('#ccYes'); await p.waitForTimeout(800);
  console.log('after accept:',JSON.stringify(await p.evaluate(()=>({
    banner:!document.querySelector('#cc').hidden,
    ls: localStorage.getItem('ak_cookie_v1'),
    ins: document.querySelectorAll('ins.adsbygoogle').length,
  }))));

  // reject path
  await p.evaluate(()=>localStorage.removeItem('ak_cookie_v1'));
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
  console.log('reloaded banner:',await p.evaluate(()=>!document.querySelector('#cc').hidden));
  await p.click('#ccNo'); await p.waitForTimeout(500);
  console.log('after reject:',JSON.stringify(await p.evaluate(()=>localStorage.getItem('ak_cookie_v1'))));

  // data section shot
  await p.locator('#data').scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await p.locator('#data').screenshot({path:'F:/New folder/shots/a-data.png'});

  console.log('ERRORS:',errs.length?errs:'none');
  await b.close();
})();
