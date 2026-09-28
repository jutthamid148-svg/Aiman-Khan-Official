const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8899/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // force reveals so screenshots show content
  await page.evaluate(() =>
    document.querySelectorAll(".reveal,.reveal-scale,.gallery-item").forEach((e) => e.classList.add("is-visible"))
  );
  await page.waitForTimeout(600);

  const report = await page.evaluate(() => ({
    stats: [...document.querySelectorAll("[data-stat]")].map((e) => e.textContent),
    videos: document.querySelectorAll(".video-card").length,
    filters: document.querySelectorAll("#filter-bar .filter-chip").length,
    gallery: document.querySelectorAll(".gallery-item").length,
    playlists: document.querySelectorAll(".playlist-card").length,
    socials: document.querySelectorAll("#social-links a").length,
    aboutParas: document.querySelectorAll("#about-text p").length,
    badge: document.querySelector("#data-source-label")?.textContent,
    badgeHidden: document.querySelector("#data-source-badge")?.hidden,
  }));
  console.log("REPORT", JSON.stringify(report, null, 2));
  console.log("ERRORS", errors.length ? errors : "none");

  await page.screenshot({ path: "shots/01-hero.png" });
  for (const id of ["stats", "videos", "shorts", "playlists", "gallery", "about", "contact"]) {
    const el = await page.$("#" + id);
    if (el) await el.screenshot({ path: `shots/sec-${id}.png` }).catch(() => {});
  }

  // interaction tests
  await page.click("#filter-bar .filter-chip:nth-child(2)").catch(() => {});
  await page.waitForTimeout(500);
  console.log("AFTER FILTER", await page.$$eval(".video-card", (n) => n.length));

  await page.click(".video-card").catch(() => {});
  await page.waitForTimeout(1200);
  console.log("MODAL OPEN", !(await page.$eval("#video-modal", (e) => e.hidden)));
  await page.screenshot({ path: "shots/02-modal.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.click(".gallery-item").catch(() => {});
  await page.waitForTimeout(800);
  console.log("LIGHTBOX OPEN", !(await page.$eval("#lightbox", (e) => e.hidden)));
  await page.screenshot({ path: "shots/03-lightbox.png" });
  await page.keyboard.press("Escape");

  // mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto("http://localhost:8899/index.html", { waitUntil: "networkidle" });
  await m.waitForTimeout(2000);
  await m.evaluate(() => document.querySelectorAll(".reveal,.reveal-scale,.gallery-item").forEach((e) => e.classList.add("is-visible")));
  await m.screenshot({ path: "shots/04-mobile.png", fullPage: false });
  await m.click(".menu-toggle");
  await m.waitForTimeout(600);
  await m.screenshot({ path: "shots/05-mobile-menu.png" });

  await browser.close();
})();
