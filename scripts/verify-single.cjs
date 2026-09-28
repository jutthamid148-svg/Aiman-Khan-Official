const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push("CONSOLE: " + m.text()));

  await page.goto("http://localhost:8899/aiman-khan-official.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => {
    const qa = (s) => [...document.querySelectorAll(s)];
    const box = (s) => {
      const e = document.querySelector(s);
      return e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null;
    };
    return {
      statNums: qa(".stat__n").map((e) => e.textContent),
      videos: qa(".vcard").length,
      playlists: qa(".pcard").length,
      gallery: qa(".gitem").length,
      shorts: qa(".tt").length,
      ttFrame: box(".tt__fr"),
      // koi bhi "Loading..." ya "—" to nahi rehna chahiye
      loadingText: /loading/i.test(document.body.innerText),
      anyDash: document.body.innerText.includes("—"),
    };
  });

  // tabs
  await page.click('.tab[data-cat="viral"]');
  await page.waitForTimeout(400);
  const viralOrder = await page.evaluate(() =>
    [...document.querySelectorAll(".vcard .meta span:first-child")].map((s) => s.textContent.trim()).slice(0, 4)
  );

  await page.click('.tab[data-cat="all"]');
  await page.waitForTimeout(300);

  // video modal
  await page.evaluate(() => document.querySelector("#videos").scrollIntoView());
  await page.waitForTimeout(400);
  await page.click(".vcard");
  await page.waitForTimeout(900);
  const modal = await page.evaluate(() => ({
    open: document.querySelector("#modal").classList.contains("open"),
    src: document.querySelector("#mFrame iframe")?.src || "",
    title: document.querySelector("#mTitle").textContent.slice(0, 50),
  }));
  await page.screenshot({ path: "shots/s-modal.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // lightbox
  await page.evaluate(() => document.querySelector("#gallery").scrollIntoView());
  await page.waitForTimeout(500);
  await page.click(".gitem");
  await page.waitForTimeout(800);
  const lb1 = await page.evaluate(() => ({
    open: document.querySelector("#lb").classList.contains("open"),
    src: document.querySelector("#lbImg").src,
  }));
  await page.screenshot({ path: "shots/s-lightbox.png" });
  await page.click("[data-next]");
  await page.waitForTimeout(500);
  const lb2 = await page.evaluate(() => document.querySelector("#lbImg").src);
  await page.keyboard.press("Escape");

  // hero + gallery screenshots
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: "shots/s-hero.png" });
  await page.evaluate(() => document.querySelector("#shorts").scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: "shots/s-shorts.png" });

  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => ({
    cols: getComputedStyle(document.querySelector(".ggrid")).gridTemplateColumns.split(" ").length,
    burgerVisible: getComputedStyle(document.querySelector("#burger")).display !== "none",
  }));
  await page.screenshot({ path: "shots/s-mobile.png" });

  console.log(JSON.stringify({ ...r, viralOrder, modal, lb1, lbNext: lb2, m, errors }, null, 2));
  await browser.close();
})();
