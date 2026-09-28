const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto("http://localhost:8899/aiman-khan-official.html", { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector("#pulse").scrollIntoView());
  await p.waitForTimeout(1400);
  await p.screenshot({ path: "shots/s-pulse.png" });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector("#pulse").scrollIntoView());
  await p.waitForTimeout(1200);
  await p.screenshot({ path: "shots/s-pulse-m.png" });
  await b.close();
})();
