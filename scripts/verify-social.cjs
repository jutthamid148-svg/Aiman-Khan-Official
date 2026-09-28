const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push("CONSOLE: " + m.text()));

  await page.goto("http://localhost:8899/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    const box = (s) => {
      const el = q(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { h: Math.round(b.height), w: Math.round(b.width) };
    };
    return {
      igSection: !q("#instagram")?.hidden,
      igTiles: qa(".ig-tile").length,
      igReels: qa(".ig-tile--reel").length,
      igImgLoaded: qa(".ig-tile img").filter((i) => i.naturalWidth > 0).length,
      igBadge: q("#ig-followers")?.textContent,
      igBadgeHref: q("[data-bind='instagramUrl']")?.href,
      ttSection: !q("#tiktok")?.hidden,
      ttCards: qa(".tt-card").length,
      ttFrames: qa(".tt-card__frame").length,
      ttFrameRatio: box(".tt-card__frame"),
      ttImgLoaded: qa(".tt-card__frame img").filter((i) => i.naturalWidth > 0).length,
      ttFollow: q("#tt-followers")?.textContent,
      followChips: qa(".follow-chip").length,
      followHrefs: qa(".follow-chip").map((a) => a.getAttribute("href")),
      gallery: qa(".gallery-item").length,
      videos: qa(".video-card").length,
      shorts: qa(".short-card").length,
      badge: q("#data-source-label")?.textContent,
    };
  });

  // TikTok section screenshot
  await page.evaluate(() => document.querySelector("#tiktok")?.scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/ig-tiktok.png", fullPage: false });

  // gallery alignment: check no vertical gaps (all tiles same height bands)
  const galleryBox = await page.evaluate(() => {
    document.querySelector("#gallery")?.scrollIntoView();
    return [...document.querySelectorAll(".gallery-item")].map((el) => {
      const b = el.getBoundingClientRect();
      return { y: Math.round(b.y), h: Math.round(b.height) };
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/gallery.png" });

  // lightbox
  await page.click(".gallery-item");
  await page.waitForTimeout(700);
  const lightboxOpen = await page.evaluate(() => !document.querySelector("#lightbox").hidden);
  await page.screenshot({ path: "shots/lightbox.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // YouTube video modal
  await page.evaluate(() => document.querySelector("#videos")?.scrollIntoView());
  await page.waitForTimeout(400);
  await page.click(".video-card");
  await page.waitForTimeout(800);
  const modalOpen = await page.evaluate(() => !document.querySelector("#video-modal").hidden);
  const modalSrc = await page.evaluate(() => document.querySelector("#video-embed iframe")?.src || "");
  await page.screenshot({ path: "shots/video-modal.png" });
  await page.keyboard.press("Escape");

  // follow bar
  await page.evaluate(() => document.querySelector("#follow")?.scrollIntoView());
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/follow.png" });

  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.querySelector("#instagram")?.scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/mobile-instagram.png" });
  const mFollow = await page.evaluate(() => ({
    chips: document.querySelectorAll(".follow-chip").length,
    igCols: getComputedStyle(document.querySelector(".ig-masonry")).columnCount,
  }));

  console.log(JSON.stringify({ ...r, galleryBox: galleryBox.slice(0, 6), lightboxOpen, modalOpen, modalSrc, mFollow, errors }, null, 2));
  await browser.close();
})();
