const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:8899/aiman-khan-official.html", { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "shots/hero-only.png" });
  await b.close();
})();
