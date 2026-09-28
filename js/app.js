/* ============================================================================
   AIMAN KHAN OFFICIAL — Application
   ----------------------------------------------------------------------------
   HTML ko data se fill karta hai, filters chalata hai, modal/lightbox
   manage karta hai. Sab kuch vanilla JS — koi framework nahi.
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.AIMAN_CONFIG;
  const YT = window.AIMAN;
  const SOCIAL = window.SOCIAL;

  /* ---------------------------------------------------------------- utils */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const icon = (n) => `<svg aria-hidden="true"><use href="#icon-${n}"></use></svg>`;

  const escapeHtml = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer;
  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }

  /* ------------------------------------------------------------ app state */

  const app = {
    channel: null,
    allVideos: [],
    visible: [],
    filter: "all",
    query: "",
    gallery: [],
    lightboxIndex: 0,
  };

  /* -------------------------------------------------------- category tags */

  /**
   * Category detect karne ke liye title/description words match hote hain.
   * Order matter karta hai — pehla match jeetta hai.
   */
  const CATEGORY_RULES = [
    { key: "shorts", label: "Shorts", words: /\bshorts?\b|#shorts/i },
    { key: "vlog", label: "Vlogs", words: /\bvlog|day in my life|routine|day out|my life\b/i },
    { key: "study", label: "Study & Productivity", words: /\bstudy|studying|productiv|focus|exam|revision\b/i },
    { key: "selfcare", label: "Self Care", words: /\bself ?care|skincare|skincare|glow|wellness|haircare|makeup|beauty\b/i },
    { key: "travel", label: "Travel", words: /\btravel|trip|visit|explor|vlog.*(go|place)|beach|mountain\b/i },
    { key: "food", label: "Food", words: /\bfood|recipe|cooking|kitchen|foodie|cafe\b/i },
    { key: "fashion", label: "Fashion", words: /\bfashion|outfit|haul|grwm|style|lookbook\b/i },
  ];

  function categorize(video) {
    if (video.isShort) return "shorts";
    const haystack = `${video.title} ${video.description || ""}`;
    for (const rule of CATEGORY_RULES) {
      if (rule.key !== "shorts" && rule.words.test(haystack)) return rule.key;
    }
    return "other";
  }

  function buildFilters() {
    const counts = new Map();
    app.allVideos.forEach((v) => counts.set(v.category, (counts.get(v.category) || 0) + 1));
    const filters = [
      { key: "all", label: "All", count: app.allVideos.length },
      ...CATEGORY_RULES.filter((r) => counts.has(r.key)).map((r) => ({ key: r.key, label: r.label, count: counts.get(r.key) })),
      { key: "other", label: "More", count: counts.get("other") || 0 },
    ].filter((f) => f.count > 0);

    const markup = filters
      .map(
        (f) =>
          `<button class="filter-chip${f.key === "all" ? " is-active" : ""}" type="button" data-filter="${f.key}" aria-pressed="${f.key === "all"}">
             <span>${escapeHtml(f.label)}</span><i>${f.count}</i>
           </button>`
      )
      .join("");

    $("#filter-bar").innerHTML = markup;
    $("#search-filters").innerHTML = markup;

    $$("[data-filter]").forEach((btn) =>
      btn.addEventListener("click", () => {
        app.filter = btn.dataset.filter;
        $$("[data-filter]").forEach((b) => {
          const on = b.dataset.filter === app.filter;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", String(on));
        });
        applyFilters();
      })
    );
  }

  function applyFilters() {
    const q = app.query.toLowerCase();
    app.visible = app.allVideos.filter((v) => {
      const matchCat = app.filter === "all" || v.category === app.filter;
      const matchQ = !q || v.title.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    renderVideos();
  }

  /* ------------------------------------------------------------- renderers */

  function videoCard(video) {
    const card = document.createElement("article");
    card.className = `video-card${video.isShort ? " is-short" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Play video: ${video.title}`);
    card.innerHTML = `
      <div class="video-card__visual">
        <img src="${video.thumbnail}" alt="" loading="lazy" decoding="async" />
        <span class="video-card__play">${icon("play")}</span>
        ${video.duration ? `<span class="duration">${video.duration}</span>` : ""}
        ${video.isShort ? `<span class="short-badge">Short</span>` : ""}
        <span class="video-card__shine" aria-hidden="true"></span>
      </div>
      <div class="video-card__body">
        <h3>${escapeHtml(video.title)}</h3>
        <p>
          ${video.viewsLabel ? `<span class="views">${escapeHtml(video.viewsLabel)} views</span><b>•</b>` : ""}
          <span>${escapeHtml(video.publishedLabel || "")}</span>
        </p>
      </div>`;

    const open = () => openVideoModal(video);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    return card;
  }

  function renderVideos() {
    const grid = $("#video-grid");
    if (!grid) return;
    const list = app.visible.slice(0, CFG.maxVideos);
    grid.replaceChildren(...list.map(videoCard));
    grid.hidden = list.length === 0;
    $("#search-empty").hidden = list.length !== 0;
    $$(".reveal", grid).forEach((el) => el.classList.add("is-visible"));
  }

  function renderSkeletons(n = 8) {
    const skel = $("#video-skeleton");
    skel.innerHTML = Array.from({ length: n })
      .map(() => `<div class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-line--short"></div></div>`)
      .join("");
  }

  function renderShorts(shorts) {
    const section = $("#shorts");
    const rail = $("#shorts-rail");
    if (!shorts.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    rail.innerHTML = shorts
      .map(
        (v) => `
      <button class="short-card" type="button" data-video-id="${v.id}" aria-label="Play short: ${escapeHtml(v.title)}">
        <img src="${v.thumbnail}" alt="" loading="lazy" decoding="async" />
        <span class="short-card__play">${icon("play")}</span>
        <span class="short-card__meta">
          <span class="short-card__title">${escapeHtml(v.title)}</span>
          <span class="short-card__views">${v.viewsLabel ? `${escapeHtml(v.viewsLabel)} views` : "Watch"}</span>
        </span>
      </button>`
      )
      .join("");
    $$(".short-card", rail).forEach((btn) =>
      btn.addEventListener("click", () => {
        const video = app.allVideos.find((v) => v.id === btn.dataset.videoId);
        if (video) openVideoModal(video);
      })
    );
  }

  function renderPlaylists(playlists) {
    const grid = $("#playlist-grid");
    const section = $("#playlists");
    if (!playlists.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    grid.innerHTML = playlists
      .map(
        (p) => `
      <a class="playlist-card reveal" href="${p.url}" target="_blank" rel="noopener noreferrer">
        <div class="playlist-card__art">
          ${p.thumbnail ? `<img src="${p.thumbnail}" alt="" loading="lazy" decoding="async" />` : `<span class="playlist-card__glyph">${icon("layers")}</span>`}
          <span class="playlist-card__play">${icon("play")}</span>
        </div>
        <div class="playlist-card__body">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${p.count ? `${p.count} video${p.count === 1 ? "" : "s"}` : "Playlist"}</p>
        </div>
      </a>`
      )
      .join("");
    observeReveals();
  }

  function renderGallery() {
    const grid = $("#gallery-grid");
    grid.innerHTML = app.gallery
      .map(
        (src, i) => `
      <button class="gallery-item" type="button" data-index="${i}" aria-label="Open image ${i + 1}">
        <img src="${src}" alt="Aiman Khan lifestyle photo ${i + 1}" loading="lazy" decoding="async" />
        <span class="gallery-item__overlay">${icon("search")}</span>
      </button>`
      )
      .join("");
    $$(".gallery-item", grid).forEach((btn) =>
      btn.addEventListener("click", () => openLightbox(Number(btn.dataset.index)))
    );
  }

  function renderAbout(channel) {
    const text = CFG.aboutText?.length ? CFG.aboutText : (channel.description || "").split("\n").filter(Boolean);
    $("#about-text").innerHTML = text.map((p) => `<p>${escapeHtml(p)}</p>`).join("");

    $("#about-mantra").innerHTML = (CFG.mantra || []).map((w) => `<span>${escapeHtml(w)}</span>`).join("");

    const joined = channel.joined
      ? new Date(channel.joined).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : null;
    $('[data-fact="joined"]').textContent = joined || "—";
    $('[data-fact="country"]').textContent = channel.country || "Pakistan";
    $('[data-fact="handle"]').textContent = (channel.handle || CFG.social.youtube).replace(/^https?:\/\/(www\.)?youtube\.com\//, "");

    const avatar = channel.avatar || CFG.fallback.avatar;
    $("#about-avatar").src = avatar;
  }

  function renderSocials() {
    const order = ["youtube", "instagram", "tiktok", "facebook", "x"];
    const labels = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", x: "X" };
    const links = order
      .filter((k) => CFG.social[k])
      .map(
        (k) => `<a href="${CFG.social[k]}" target="_blank" rel="noopener noreferrer" aria-label="Aiman Khan on ${labels[k]}">${icon(k)}</a>`
      )
      .join("");
    $("#social-links").innerHTML = links;
    $("#footer-social").innerHTML = links;

    if (CFG.social.email) {
      $("#social-links").insertAdjacentHTML(
        "beforeend",
        `<a href="mailto:${CFG.social.email}" aria-label="Email Aiman Khan">${icon("mail")}</a>`
      );
    }
  }

  /* ------------------------------------------------------------- SOCIAL FEEDS */

  /** Instagram masonry: posts + reels, "View on Instagram" per tile. */
  function renderInstagram(feed) {
    const grid = $("#instagram-grid");
    const posts = feed?.posts || [];
    const section = $("#instagram");
    if (!posts.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    grid.innerHTML = posts
      .map(
        (p) => `
      <a class="ig-tile${p.type === "reel" ? " ig-tile--reel" : ""}" href="${p.url}"
         target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(p.caption || "Instagram post")}">
        <img src="${p.image}" alt="${escapeHtml(p.caption || "Instagram post")}" loading="lazy" decoding="async" />
        <span class="ig-tile__type">${p.type === "reel" ? icon("play") : icon("instagram")}</span>
        <span class="ig-tile__body">
          ${p.caption ? `<span class="ig-tile__caption">${escapeHtml(p.caption)}</span>` : ""}
          <span class="ig-tile__meta">
            ${p.likesLabel ? `<span>${icon("heart")} ${escapeHtml(p.likesLabel)}</span>` : ""}
            ${p.dateLabel ? `<span>${icon("clock")} ${escapeHtml(p.dateLabel)}</span>` : ""}
          </span>
        </span>
        <span class="ig-tile__cta">View on Instagram ${icon("external")}</span>
      </a>`
      )
      .join("");

    const followers = $("#ig-followers");
    if (followers) {
      const label = feed?.profile?.followersLabel;
      followers.textContent = label ? `${label} · ${posts.length} posts` : `${posts.length} posts`;
    }
    $$("[data-bind='instagramUrl']").forEach((a) => {
      a.href = feed?.profile?.url || CFG.social.instagram;
    });
  }

  /** TikTok vertical 9:16 cards with redirect / embed buttons. */
  function renderTikTok(feed) {
    const grid = $("#tiktok-grid");
    const posts = feed?.posts || [];
    const section = $("#tiktok");
    if (!posts.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    grid.innerHTML = posts
      .map(
        (p) => `
      <article class="tt-card">
        <div class="tt-card__frame">
          <img src="${p.image}" alt="${escapeHtml(p.caption || "TikTok video")}" loading="lazy" decoding="async" />
          <span class="tt-card__play">${icon("play")}</span>
          <a class="tt-card__overlay" href="${p.url}" target="_blank" rel="noopener noreferrer"
             aria-label="Watch on TikTok: ${escapeHtml(p.caption || "video")}"></a>
          <span class="tt-card__views">${p.viewsLabel ? icon("eye") + " " + escapeHtml(p.viewsLabel) : "TikTok"}</span>
        </div>
        <div class="tt-card__body">
          <p class="tt-card__caption">${escapeHtml(p.caption || "")}</p>
          <span class="tt-card__date">${escapeHtml(p.dateLabel || "")}</span>
          <div class="tt-card__actions">
            <a class="button button--primary button--small" href="${p.url}" target="_blank" rel="noopener noreferrer">
              ${icon("tiktok")} Watch on TikTok
            </a>
            ${
              p.embedUrl
                ? `<button class="button button--ghost button--small" type="button" data-embed="${p.embedUrl}">
                     ${icon("play")} Embed
                   </button>`
                : ""
            }
          </div>
        </div>
      </article>`
      )
      .join("");

    $$("[data-embed]", grid).forEach((btn) =>
      btn.addEventListener("click", () => {
        const url = btn.dataset.embed;
        openVideoModal({
          title: btn.closest(".tt-card").querySelector(".tt-card__caption").textContent.trim() || "TikTok video",
          embedUrl: url,
          url,
        });
      })
    );

    const followers = $("#tt-followers");
    if (followers) {
      const label = feed?.profile?.followersLabel;
      followers.textContent = label ? `${label} · ${posts.length} videos` : `${posts.length} videos`;
    }
    $$("[data-bind='tiktokUrl']").forEach((a) => {
      a.href = feed?.profile?.url || CFG.social.tiktok;
    });
  }

  /** Sticky-ish follow bar: YouTube / Instagram / TikTok direct links. */
  function renderFollowBar() {
    const order = ["youtube", "instagram", "tiktok", "facebook", "x"];
    const labels = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", x: "X" };
    const tags = order
      .filter((k) => CFG.social[k])
      .map(
        (k) => `
      <a class="follow-chip follow-chip--${k}" href="${CFG.social[k]}" target="_blank" rel="noopener noreferrer">
        <span class="follow-chip__icon">${icon(k)}</span>
        <span class="follow-chip__text">
          <strong>Follow on ${labels[k]}</strong>
          <small>${handleFrom(CFG.social[k], labels[k])}</small>
        </span>
        ${icon("external")}
      </a>`
      )
      .join("");
    $("#follow-bar").innerHTML = tags;
  }

  function handleFrom(url, fallback) {
    try {
      const m = String(url).match(/@([\w.\-]+)/);
      return m ? "@" + m[1] : fallback;
    } catch {
      return fallback;
    }
  }

  function renderChannelBindings(channel) {
    const parts = String(channel.name || CFG.site.name).split(" ");
    $("[data-bind='firstName']").textContent = parts[0] || "Aiman";
    $("[data-bind='lastName']").textContent = parts.slice(1).join(" ") || "Khan";
    $("[data-bind='name']").textContent = channel.name || CFG.site.name;
    $("[data-bind='shortName']").textContent = CFG.site.shortName;
    $("[data-bind='tagline']").textContent = CFG.site.tagline;
    $("[data-bind='signature']").textContent = CFG.signature;
    $$("[data-bind='channelUrl']").forEach((a) => (a.href = channel.url || CFG.social.youtube));

    const desc = channel.description || CFG.site.description;
    $("[data-bind='description']").textContent = desc.split("\n")[0] || CFG.site.description;

    if (channel.avatar) $("#hero-avatar").src = channel.avatar;
    if (channel.banner) $("#hero-banner-bg").src = channel.banner;
  }

  function renderStats(channel, playlistCount) {
    const set = (key, value) => {
      const el = $(`[data-stat="${key}"]`);
      if (el) el.textContent = value == null ? "—" : value;
    };
    set("subscribers", channel.subscribers == null ? "—" : YT.compactNumber(channel.subscribers));
    set("views", channel.views == null ? "—" : YT.compactNumber(channel.views));
    set("videoCount", channel.videoCount == null ? "—" : YT.compactNumber(channel.videoCount));
    set("playlists", playlistCount == null ? "—" : String(playlistCount));

    $("[data-bind='subscriberLabel']").textContent =
      channel.subscribers == null ? "Growing" : `${YT.compactNumber(channel.subscribers)} subs`;
  }

  /** 0 se target tak number count-up animation. */
  function animateCounters() {
    const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $$(".stat__value").forEach((el) => {
      const raw = el.textContent;
      const match = raw.match(/^([\d.]+)([KMB]?)$/);
      if (prefersReduced || !match) return;
      const target = parseFloat(match[1]) * { K: 1e3, M: 1e6, B: 1e9 }[match[2]];
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1100, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = YT.compactNumber(target * eased) + match[2];
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------- video modal */

  let lastFocused = null;

  function openVideoModal(video) {
    const modal = $("#video-modal");
    lastFocused = document.activeElement;
    $("#video-embed").innerHTML = `<iframe src="${video.embedUrl}" title="${escapeHtml(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    $("#video-modal-title").textContent = video.title;
    $("#video-modal-sub").textContent = [video.viewsLabel && `${video.viewsLabel} views`, video.publishedLabel, video.duration]
      .filter(Boolean)
      .join("  •  ");
    $("#video-modal-link").href = video.url;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal__close", modal).focus();
  }

  function closeVideoModal() {
    const modal = $("#video-modal");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    $("#video-embed").innerHTML = ""; // iframe unload → video band hota hai
    document.body.classList.remove("modal-open");
    lastFocused?.focus();
  }

  /* ------------------------------------------------------------- lightbox */

  function openLightbox(index) {
    app.lightboxIndex = index;
    const lb = $("#lightbox");
    updateLightbox();
    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".lightbox__close", lb).focus();
  }

  function updateLightbox() {
    const src = app.gallery[app.lightboxIndex];
    if (!src) return;
    $("#lightbox-img").src = src;
    $("#lightbox-caption").textContent = `${app.lightboxIndex + 1} / ${app.gallery.length}`;
    const many = app.gallery.length > 1;
    $("#lightbox-prev").hidden = !many;
    $("#lightbox-next").hidden = !many;
  }

  function stepLightbox(delta) {
    if (!app.gallery.length) return;
    app.lightboxIndex = (app.lightboxIndex + delta + app.gallery.length) % app.gallery.length;
    updateLightbox();
  }

  function closeLightbox() {
    const lb = $("#lightbox");
    lb.hidden = true;
    lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  /* ---------------------------------------------------------------- header */

  function setupHeader() {
    const header = $("#site-header");
    const menu = $("#mobile-menu");
    const menuToggle = $(".menu-toggle");
    const menuClose = $(".mobile-menu-close");
    const scrim = $(".menu-scrim");
    const searchPanel = $("#site-search");
    const searchTrigger = $(".search-trigger");
    const searchClose = $(".search-close");
    const searchInput = $("#video-search");

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 14);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    const closeMenu = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      menuToggle?.setAttribute("aria-expanded", "false");
      scrim.classList.remove("is-visible");
      document.body.classList.remove("menu-open");
    };
    const openMenu = () => {
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      menuToggle?.setAttribute("aria-expanded", "true");
      scrim.classList.add("is-visible");
      document.body.classList.add("menu-open");
      menuClose.focus();
    };
    menuToggle?.addEventListener("click", () => (menu.classList.contains("is-open") ? closeMenu() : openMenu()));
    menuClose?.addEventListener("click", closeMenu);
    scrim?.addEventListener("click", closeMenu);
    $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));

    const closeSearch = () => {
      if (!searchPanel || searchPanel.hidden) return;
      searchPanel.hidden = true;
      searchTrigger?.setAttribute("aria-expanded", "false");
    };
    searchTrigger?.addEventListener("click", () => {
      const opening = searchPanel.hidden;
      searchPanel.hidden = !opening;
      searchTrigger.setAttribute("aria-expanded", String(opening));
      if (opening) setTimeout(() => searchInput?.focus(), 20);
    });
    searchClose?.addEventListener("click", closeSearch);
    searchInput?.addEventListener("input", (e) => {
      app.query = e.target.value.trim();
      applyFilters();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") {
        if (!$("#lightbox").hidden && e.key === "ArrowRight") stepLightbox(1);
        if (!$("#lightbox").hidden && e.key === "ArrowLeft") stepLightbox(-1);
        return;
      }
      closeMenu();
      closeSearch();
      if (!$("#video-modal").hidden) closeVideoModal();
      if (!$("#lightbox").hidden) closeLightbox();
    });
  }

  /* ------------------------------------------------------------- reveals */

  let revealObserver;
  function observeReveals() {
    const nodes = $$(".reveal, .reveal-scale, .gallery-item").filter((n) => !n.classList.contains("is-visible"));
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    revealObserver ||= new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );
    nodes.forEach((n) => revealObserver.observe(n));
  }

  function setupNavState() {
    const ids = ["top", "stats", "videos", "shorts", "playlists", "gallery", "about", "contact"];
    const targets = ids.map((id) => document.getElementById(id)).filter((el) => el && !el.hidden);
    const links = $$(".desktop-nav a, .mobile-menu nav a");
    const mark = (id) => links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${id}`));
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) mark(visible.target.id);
      },
      { rootMargin: "-30% 0px -55%", threshold: [0, 0.05, 0.2, 0.5] }
    );
    targets.forEach((t) => observer.observe(t));
  }

  /* -------------------------------------------------------- micro-interactions */

  function setupTilt() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
      });
      el.addEventListener("mouseleave", () => {
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  function setupInteractions() {
    $$(".bell-trigger").forEach((b) =>
      b.addEventListener("click", () => showToast("Subscribe on YouTube to never miss a new upload ♡"))
    );
    $$("[data-close-modal]").forEach((b) => b.addEventListener("click", closeVideoModal));
    $$("[data-close-lightbox]").forEach((b) => b.addEventListener("click", closeLightbox));
    $("#lightbox-prev").addEventListener("click", () => stepLightbox(-1));
    $("#lightbox-next").addEventListener("click", () => stepLightbox(1));

    $("#contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const status = $("#form-status");
      if (!form.checkValidity()) {
        status.textContent = "Please fill in your name, a valid email and a message.";
        status.classList.add("is-error");
        form.reportValidity();
        return;
      }
      status.classList.remove("is-error");
      status.classList.add("is-success");
      status.textContent = CFG.social.email
        ? `Thanks! Email me directly at ${CFG.social.email} and I'll get back to you soon.`
        : "Thanks! Your message is ready — this form is wired to be sent once your email service is connected.";
      form.reset();
    });

    $("#year").textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------ data badge */

  function setBadge(source) {
    const label = { api: "Live — YouTube API", seed: "Cached — add API key", fallback: "Offline mode" }[source];
    const badge = $("#data-source-badge");
    $("#data-source-label").textContent = label;
    badge.dataset.source = source;
    badge.hidden = source === "api";
  }

  /* ------------------------------------------------------------------ init */

  async function init() {
    setupHeader();
    setupInteractions();
    setupTilt();
    observeReveals();
    renderSkeletons();
    renderSocials();
    renderFollowBar();

    const [channel, videos, playlists] = await Promise.all([
      YT.getChannel(),
      YT.getVideos(),
      YT.getPlaylists(),
    ]);

    // Social feeds alag se aate hain taake YouTube slow ho to bhi ye chalein
    SOCIAL.getInstagram()
      .then(renderInstagram)
      .catch((e) => console.warn("[SOCIAL] instagram render skip:", e.message));
    SOCIAL.getTikTok()
      .then(renderTikTok)
      .catch((e) => console.warn("[SOCIAL] tiktok render skip:", e.message));

    app.channel = channel;
    app.allVideos = videos.slice(0, Math.max(CFG.maxVideos, 24)).map((v) => ({ ...v, category: categorize(v) }));
    app.gallery = buildGallery(videos);

    renderChannelBindings(channel);
    renderStats(channel, playlists.length || null);
    renderAbout(channel);
    renderShorts(await YT.getShorts());
    renderPlaylists(playlists);
    renderGallery();
    buildFilters();
    applyFilters(); // app.visible ko shuru mein bharta hai, warna grid khaali rehta hai

    $("#video-skeleton").innerHTML = "";
    setBadge(YT.state.source);
    setupNavState();
    animateCounters();

    requestAnimationFrame(() => document.body.classList.add("page-ready"));
  }

  /** Gallery = video thumbnails (high-res) + local lifestyle shots. */
  function buildGallery(videos) {
    const shots = videos
      .filter((v) => !v.isShort)
      .slice(0, CFG.maxGallery)
      .map((v) => v.thumbnail);
    const local = CFG.fallback.gallery || [];
    const merged = [...shots, ...local];
    return [...new Set(merged)].slice(0, CFG.maxGallery + 4);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
