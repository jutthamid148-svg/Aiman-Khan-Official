/* ============================================================================
   AIMAN KHAN OFFICIAL — YouTube Data Layer
   ----------------------------------------------------------------------------
   Automatic failover between three sources:

     1. YouTube Data API v3  (best — stats, description, playlists, views)
     2. Seed bundle           (real titles/thumbnails; `npm run seed` refreshes)
     3. Configured fallbacks  (local images, page never renders empty)

   NOTE: YouTube ka RSS feed browser se CORS-blocked hota hai (no
   Access-Control-Allow-Origin header), isliye live RSS front-end se fetch
   nahi ho sakta. Usi feed ka local bundle (js/seed-videos.js) use hota hai.

   Public API:
     AIMAN.getChannel()      -> { id, name, handle, description, avatar, banner,
                                  subscribers, views, videoCount, url }
     AIMAN.getVideos()       -> [{ id, title, thumbnail, publishedAt, views,
                                  duration, url, isShort, kind }]
     AIMAN.getShorts()       -> subset of getVideos() flagged as shorts
     AIMAN.getPlaylists()    -> [{ id, title, description, count, thumbnail, url }]
     AIMAN.refresh()         -> cache clear + full refetch
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.AIMAN_CONFIG;
  const SEED = window.AIMAN_SEED || null;
  const API = "https://www.googleapis.com/youtube/v3";

  /* ---------------------------------------------------------------- utils */

  const state = {
    channel: null,
    videos: [],
    shorts: [],
    playlists: [],
    source: "fallback", // "api" | "rss" | "fallback"
  };

  function cacheKey(name) {
    return `aiman:${name}:${CFG.CHANNEL_ID || "@aimankhanofficial05"}`;
  }

  function readCache(name) {
    try {
      const raw = localStorage.getItem(cacheKey(name));
      if (!raw) return null;
      const { at, value } = JSON.parse(raw);
      if (Date.now() - at > CFG.cacheMinutes * 60_000) return null;
      return value;
    } catch {
      return null;
    }
  }

  function writeCache(name, value) {
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* private mode / quota — cache optional hai, ignore */
    }
  }

  function compactNumber(value) {
    if (value == null || Number.isNaN(value)) return "—";
    const units = [
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    const n = Number(value);
    for (const [div, suffix] of units) {
      if (n >= div) {
        const scaled = n / div;
        const text = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "");
        return `${text}${suffix}`;
      }
    }
    return String(n);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "";
    const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (days < 30) {
      const w = Math.floor(days / 7);
      return w === 1 ? "1 week ago" : `${w} weeks ago`;
    }
    if (days < 365) {
      const m = Math.floor(days / 30);
      return m === 1 ? "1 month ago" : `${m} months ago`;
    }
    const y = Math.floor(days / 365);
    return y === 1 ? "1 year ago" : `${y} years ago`;
  }

  /** ISO 8601 duration (PT1H2M10S) → "1:02:10" / "4:31" */
  function parseDuration(iso) {
    if (!iso) return "";
    const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!m) return "";
    const [, , h, min, sec] = m;
    const pad = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(min || 0)}:${pad(sec || 0)}` : `${min || 0}:${pad(sec || 0)}`;
  }

  function bestThumb(thumbnails = {}) {
    return (
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      ""
    );
  }

  async function getJSON(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return res.json();
  }

  const hasApiKey = () => Boolean(CFG.YOUTUBE_API_KEY && CFG.YOUTUBE_API_KEY.trim());
  const apiUrl = (path, params) => {
    const qs = new URLSearchParams({ ...params, key: CFG.YOUTUBE_API_KEY.trim() });
    return `${API}/${path}?${qs}`;
  };

  /* ------------------------------------------------------- channel resolve */

  /** Handle (@aimankhanofficial05) → UC... channel ID. */
  async function resolveChannelId() {
    if (CFG.CHANNEL_ID) return CFG.CHANNEL_ID;
    const cached = readCache("channelId");
    if (cached) return cached;
    // `forHandle` returns the *first* channel owned by that handle.
    const data = await getJSON(apiUrl("channels", { part: "id", forHandle: "@aimankhanofficial05" }));
    const id = data.items?.[0]?.id;
    if (!id) throw new Error("Handle se channel ID nahi mil saka.");
    writeCache("channelId", id);
    return id;
  }

  async function fetchChannelViaApi() {
    const cached = readCache("channel");
    if (cached) return cached;

    const id = await resolveChannelId();
    const data = await getJSON(
      apiUrl("channels", {
        part: "snippet,statistics,brandingSettings,contentDetails",
        id,
      })
    );
    const item = data.items?.[0];
    if (!item) throw new Error("Channel metadata nahi mili.");

    const channel = {
      id,
      name: item.snippet.title,
      handle: item.snippet.customUrl || CFG.social.youtube,
      description: item.snippet.description || "",
      avatar: bestThumb(item.snippet.thumbnails),
      banner: item.brandingSettings?.image?.bannerTvHighUrl
        || item.brandingSettings?.image?.bannerHighUrl
        || item.brandingSettings?.image?.bannerMediumUrl
        || "",
      subscribers: item.statistics.hiddenSubscriberCount ? null : Number(item.statistics.subscriberCount),
      views: Number(item.statistics.viewCount),
      videoCount: Number(item.statistics.videoCount),
      joined: item.snippet.publishedAt,
      country: item.snippet.country || "",
      uploadsId: item.contentDetails.relatedPlaylists.uploads,
      url: `https://www.youtube.com/channel/${id}`,
    };
    writeCache("channel", channel);
    return channel;
  }

  /* --------------------------------------------------------------- videos */

  function normalizeVideo(item, kind = "video") {
    const id = item.snippet?.resourceId?.videoId || item.id?.videoId || item.videoId;
    const durationSec = Number(item.contentDetails?.duration
      ? parseDuration(item.contentDetails.duration)
      : NaN);
    return {
      id,
      kind,
      title: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      thumbnail: bestThumb(item.snippet?.thumbnails) || CFG.fallback.videoThumb,
      publishedAt: item.snippet?.publishedAt || "",
      publishedLabel: formatDate(item.snippet?.publishedAt),
      views: item.statistics ? Number(item.statistics.viewCount) : null,
      viewsLabel: item.statistics ? compactNumber(item.statistics.viewCount) : "",
      duration: parseDuration(item.contentDetails?.duration) || "",
      isShort: kind === "short" || (!Number.isNaN(durationSec) && durationSec > 0 && durationSec <= 61),
      url: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`,
    };
  }

  async function fetchVideosViaApi() {
    const cached = readCache("videos");
    if (cached) return cached;

    const channel = state.channel || (await fetchChannelViaApi());
    const uploads = channel.uploadsId;

    // Uploads playlist = har public video, naye se purane.
    const listUrl = apiUrl("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploads,
      maxResults: 50,
    });
    const list = await getJSON(listUrl);
    const ids = (list.items || []).map((i) => i.snippet.resourceId.videoId).filter(Boolean);
    if (!ids.length) throw new Error("Uploads playlist khali hai.");

    // Video details: title/date (snippet) + views (statistics) + length.
    const detailsUrl = apiUrl("videos", {
      part: "snippet,statistics,contentDetails",
      id: ids.slice(0, 50).join(","),
    });
    const details = await getJSON(detailsUrl);
    const byId = new Map((details.items || []).map((v) => [v.id, v]));

    const videos = (list.items || [])
      .map((entry) => byId.get(entry.snippet.resourceId.videoId))
      .filter(Boolean)
      .map((v) => normalizeVideo(v, "video"));

    writeCache("videos", videos);
    return videos;
  }

  /**
   * Seed fallback — API key ke bina. `js/seed-videos.js` mein bundled real
   * channel data (titles, ids, dates, thumbnails) se videos banata hai.
   *
   * Views aur duration SIRF Data API deta hai, isliye ye null rehte hain —
   * UI unhe "—" dikhati hai kuch jhootha na dikhaye.
   */
  function fetchVideosViaSeed() {
    const cached = readCache("seedVideos");
    if (cached) return cached;
    if (!SEED?.videos?.length) throw new Error("Seed data khaali hai (js/seed-videos.js check karein).");

    const entries = SEED.videos.map((v) => ({
      id: v.id,
      kind: v.isShort ? "short" : "video",
      title: v.title,
      description: "",
      // maxres sab videos ke liye exist nahi karta; hqdefault guaranteed hai
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      publishedAt: v.publishedAt,
      publishedLabel: formatDate(v.publishedAt),
      views: null,
      viewsLabel: "",
      duration: "",
      isShort: Boolean(v.isShort),
      url: `https://www.youtube.com/watch?v=${v.id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`,
    }));

    writeCache("seedVideos", entries);
    return entries;
  }

  function seedChannel() {
    if (!SEED?.channel) return null;
    return {
      id: SEED.channel.id,
      name: SEED.channel.name,
      handle: SEED.channel.handle || CFG.social.youtube,
      description: CFG.aboutText.join("\n\n"),
      avatar: "",
      banner: "",
      subscribers: SEED.channel.subscribers ?? null,
      views: SEED.channel.views ?? null,
      videoCount: SEED.channel.videoCount ?? SEED.videos?.length ?? null,
      joined: SEED.channel.joined || "",
      country: SEED.channel.country || "",
      url: SEED.channel.url || CFG.social.youtube,
    };
  }

  /* ------------------------------------------------------------ playlists */

  async function fetchPlaylistsViaApi() {
    const cached = readCache("playlists");
    if (cached) return cached;
    const id = await resolveChannelId();
    const data = await getJSON(
      apiUrl("playlists", { part: "snippet,contentDetails", channelId: id, maxResults: 50 })
    );
    const lists = (data.items || [])
      .filter((p) => p.snippet?.thumbnails)
      .map((p) => ({
        id: p.id,
        title: p.snippet.title,
        description: p.snippet.description || "",
        count: Number(p.contentDetails?.itemCount || 0),
        thumbnail: bestThumb(p.snippet.thumbnails),
        url: `https://www.youtube.com/playlist?list=${p.id}`,
        curated: CFG.featuredPlaylists.some((f) => f.id === p.id),
      }));
    writeCache("playlists", lists);
    return lists;
  }

  /* ------------------------------------------------------------- fallback */

  function fallbackChannel() {
    return {
      id: CFG.CHANNEL_ID || "",
      name: CFG.site.name,
      handle: CFG.social.youtube,
      description: CFG.aboutText.join("\n\n"),
      avatar: CFG.fallback.avatar,
      banner: CFG.fallback.banner,
      subscribers: null,
      views: null,
      videoCount: null,
      url: CFG.social.youtube,
    };
  }

  /* ----------------------------------------------------------------- API */

  window.AIMAN = {
    compactNumber,
    formatDate,
    get state() {
      return { ...state };
    },

    async getChannel() {
      if (state.channel) return state.channel;
      if (hasApiKey()) {
        try {
          state.channel = await fetchChannelViaApi();
          state.source = "api";
          return state.channel;
        } catch (err) {
          console.warn("[AIMAN] Channel API fail:", err.message);
        }
      }
      state.channel = seedChannel() || fallbackChannel();
      state.source = SEED ? "seed" : "fallback";
      return state.channel;
    },

    async getVideos() {
      if (state.videos.length) return state.videos;
      if (hasApiKey()) {
        try {
          state.videos = await fetchVideosViaApi();
          state.source = "api";
        } catch (err) {
          console.warn("[AIMAN] Video API fail:", err.message);
        }
      }
      if (!state.videos.length) {
        try {
          state.videos = fetchVideosViaSeed();
          state.source = "seed";
        } catch (err) {
          console.warn("[AIMAN] Seed fail:", err.message);
          state.videos = [];
          state.source = "fallback";
        }
      }
      state.shorts = state.videos.filter((v) => v.isShort).slice(0, CFG.maxShorts);
      return state.videos;
    },

    async getShorts() {
      await this.getVideos();
      return state.shorts;
    },

    async getPlaylists() {
      if (state.playlists.length) return state.playlists;
      if (!hasApiKey()) {
        // Bina API key: config se curated category cards (YouTube search deep-link)
        state.playlists = CFG.featuredPlaylists
          .filter((p) => p.title)
          .map((p) => ({
            ...p,
            count: 0,
            thumbnail: "",
            url: p.id
              ? `https://www.youtube.com/playlist?list=${p.id}`
              : `${CFG.social.youtube}/search?query=${encodeURIComponent(p.title)}`,
            curated: true,
          }));
        return state.playlists;
      }
      try {
        state.playlists = await fetchPlaylistsViaApi();
      } catch (err) {
        console.warn("[AIMAN] Playlist fetch fail:", err.message);
        state.playlists = [];
      }
      return state.playlists;
    },

    refresh() {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("aiman:"))
        .forEach((k) => localStorage.removeItem(k));
      state.channel = null;
      state.videos = [];
      state.shorts = [];
      state.playlists = [];
      return window.location.reload();
    },
  };
})();
