/* ============================================================================
   AIMAN KHAN OFFICIAL — Instagram & TikTok Data Layer
   ----------------------------------------------------------------------------
   DONO PLATFORMS KA NOTE (zaroori):
   Instagram aur TikTok public scraping block karte hain. Maine live test kiya —
   Instagram ka page sirf login wall deta hai, aur TikTok ka bhi same. Isliye
   inka data do raaste se aata hai:

     1. OFFICIAL API   — config mein token bharne par live ho jata hai
                          (Instagram Graph API / TikTok Display API)
     2. SEED ENTRIES   — config mein curated posts, jo abhi se dikhti hain

   Dono raaste ka output ek hi shape me hai, isliye UI ko pata hi nahi chalta
   kaunsa chal raha hai.

   Public API:
     SOCIAL.getInstagram()  → { profile, posts: [...] }
     SOCIAL.getTikTok()     → { profile, posts: [...] }
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.AIMAN_CONFIG;

  const state = {
    instagram: { profile: null, posts: [], source: "seed" },
    tiktok: { profile: null, posts: [], source: "seed" },
  };

  /* ---------------------------------------------------------------- utils */

  const compact = (n) => {
    if (n == null || Number.isNaN(n)) return "";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };

  const timeAgo = (iso) => {
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
    return `${Math.floor(days / 365)} years ago`;
  };

  const cacheKey = (name) => `aiman:${name}:${CFG.CHANNEL_ID}`;
  const readCache = (name) => {
    try {
      const raw = localStorage.getItem(cacheKey(name));
      if (!raw) return null;
      const { at, value } = JSON.parse(raw);
      return Date.now() - at > CFG.cacheMinutes * 60_000 ? null : value;
    } catch {
      return null;
    }
  };
  const writeCache = (name, value) => {
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* optional */
    }
  };

  /* ----------------------------------------------------------- INSTAGRAM */

  /**
   * Instagram Basic Display (legacy) ya Graph API.
   * Graph API ka endpoint: /{user-id}/media?fields=id,caption,media_type,
   * media_url,thumbnail_url,permalink,timestamp,like_count
   */
  async function fetchInstagramViaApi() {
    const { ACCESS_TOKEN, USER_ID } = CFG.instagram || {};
    if (!ACCESS_TOKEN || !USER_ID) throw new Error("Instagram token config mein nahi hai.");

    const fields = [
      "id", "username", "name", "biography", "followers_count",
      "follows_count", "media_count", "profile_picture_url", "website",
    ].join(",");

    const base = `https://graph.instagram.com/v21.0`;
    const qs = new URLSearchParams({ fields, access_token: ACCESS_TOKEN });

    const profileRes = await fetch(`${base}/${USER_ID}?${qs}`);
    if (!profileRes.ok) throw new Error(`IG profile HTTP ${profileRes.status}`);
    const profile = await profileRes.json();

    const mediaQs = new URLSearchParams({
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count",
      limit: "24",
      access_token: ACCESS_TOKEN,
    });
    const mediaRes = await fetch(`${base}/${USER_ID}/media?${mediaQs}`);
    if (!mediaRes.ok) throw new Error(`IG media HTTP ${mediaRes.status}`);
    const media = await mediaRes.json();

    const posts = (media.data || []).map((m) => {
      const isVideo = m.media_type === "VIDEO" || m.media_type === "REELS";
      return {
        id: m.id,
        type: isVideo ? "reel" : "image",
        image: m.thumbnail_url || m.media_url,
        caption: (m.caption || "").slice(0, 140),
        likes: m.like_count ?? null,
        likesLabel: m.like_count != null ? `${compact(m.like_count)} likes` : "",
        date: m.timestamp,
        dateLabel: timeAgo(m.timestamp),
        url: m.permalink,
      };
    });

    return {
      profile: {
        username: profile.username,
        name: profile.name,
        bio: profile.biography || "",
        followers: profile.followers_count ?? null,
        followersLabel: profile.followers_count != null ? `${compact(profile.followers_count)} followers` : "",
        posts: profile.media_count ?? posts.length,
        avatar: profile.profile_picture_url || "",
        website: profile.website || "",
        url: CFG.social.instagram,
      },
      posts,
    };
  }

  function instagramFromSeed() {
    const posts = (CFG.instagramSeed || []).map((p) => ({
      id: p.id,
      type: p.type || "image",
      image: p.image,
      caption: p.caption || "",
      likes: p.likes ?? null,
      likesLabel: p.likes != null ? `${compact(p.likes)} likes` : "",
      date: p.date,
      dateLabel: timeAgo(p.date),
      // Seed entries ka real post link nahi hota, isliye profile pe link karein
      url: p.url || CFG.social.instagram,
    }));

    return {
      profile: {
        username: "aimankhan.official",
        name: "Aiman Khan Official",
        bio: "Lifestyle, fashion & beauty ♡ | Collaborations: DM",
        followers: null,
        followersLabel: "",
        posts: posts.length,
        avatar: "",
        website: "",
        url: CFG.social.instagram,
      },
      posts,
    };
  }

  /* -------------------------------------------------------------- TIKTOK */

  /**
   * TikTok Display API. Note: standard Display API sirf video list + public
   * stats deta hai; embed ke liye oEmbed ya direct link use hota hai.
   * Endpoint: /v2/video/query/?fields=id,video_description,cover_image_url,
   *           share_url,create_time,view_count
   */
  async function fetchTikTokViaApi() {
    const { ACCESS_TOKEN, NUM_POSTS } = CFG.tiktok || {};
    if (!ACCESS_TOKEN) throw new Error("TikTok token config mein nahi hai.");

    const qs = new URLSearchParams({
      fields: "id,video_description,cover_image_url,share_url,create_time,view_count,duration",
      max_count: String(NUM_POSTS || 12),
    });
    const res = await fetch(`https://open.tiktokapis.com/v2/video/query/?${qs}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`TT HTTP ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(`TT: ${data.error.message || "unknown"}`);

    const posts = (data.data?.videos || []).map((v) => ({
      id: v.id,
      image: v.cover_image_url,
      caption: (v.video_description || "").slice(0, 140),
      views: v.view_count ?? null,
      viewsLabel: v.view_count != null ? `${compact(v.view_count)} views` : "",
      date: v.create_time ? new Date(v.create_time * 1000).toISOString() : "",
      dateLabel: v.create_time ? timeAgo(new Date(v.create_time * 1000).toISOString()) : "",
      // TikTok ka official embed player
      url: v.share_url,
      embedUrl: `https://www.tiktok.com/player/v1/${v.id}`,
    }));

    return {
      profile: {
        username: "aimankhan.official8.tiktok.pk",
        name: "Aiman Khan Official",
        bio: "Shorts, glam & everyday moments",
        followers: null,
        followersLabel: "",
        posts: posts.length,
        avatar: "",
        url: CFG.social.tiktok,
      },
      posts,
    };
  }

  function tiktokFromSeed() {
    const posts = (CFG.tiktokSeed || []).map((p) => ({
      id: p.id,
      image: p.image,
      caption: p.caption || "",
      views: p.views ?? null,
      viewsLabel: p.views != null ? `${compact(p.views)} views` : "",
      date: p.date,
      dateLabel: timeAgo(p.date),
      url: p.url || CFG.social.tiktok,
      embedUrl: p.embedUrl || "",
    }));

    return {
      profile: {
        username: "aimankhan.official8.tiktok.pk",
        name: "Aiman Khan Official",
        bio: "Shorts, glam & everyday moments",
        followers: null,
        followersLabel: "",
        posts: posts.length,
        avatar: "",
        url: CFG.social.tiktok,
      },
      posts,
    };
  }

  /* ------------------------------------------------------------------ API */

  window.SOCIAL = {
    compact,

    async getInstagram() {
      if (state.instagram.posts.length) return state.instagram;
      const cached = readCache("instagram");
      if (cached) {
        state.instagram = cached;
        return cached;
      }
      try {
        if (CFG.instagram?.ACCESS_TOKEN && CFG.instagram?.USER_ID) {
          state.instagram = { ...(await fetchInstagramViaApi()), source: "api" };
        } else {
          state.instagram = { ...instagramFromSeed(), source: "seed" };
        }
      } catch (err) {
        console.warn("[SOCIAL] Instagram fall back to seed:", err.message);
        state.instagram = { ...instagramFromSeed(), source: "seed" };
      }
      writeCache("instagram", state.instagram);
      return state.instagram;
    },

    async getTikTok() {
      if (state.tiktok.posts.length) return state.tiktok;
      const cached = readCache("tiktok");
      if (cached) {
        state.tiktok = cached;
        return cached;
      }
      try {
        if (CFG.tiktok?.ACCESS_TOKEN) {
          state.tiktok = { ...(await fetchTikTokViaApi()), source: "api" };
        } else {
          state.tiktok = { ...tiktokFromSeed(), source: "seed" };
        }
      } catch (err) {
        console.warn("[SOCIAL] TikTok fall back to seed:", err.message);
        state.tiktok = { ...tiktokFromSeed(), source: "seed" };
      }
      writeCache("tiktok", state.tiktok);
      return state.tiktok;
    },
  };
})();
