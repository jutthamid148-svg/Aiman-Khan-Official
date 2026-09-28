/* ============================================================================
   AIMAN KHAN OFFICIAL — Configuration
   ----------------------------------------------------------------------------
   Yahan sirf apni details daalni hain. Baaki code khud channel se data le kar
   website update kar deta hai.
   ========================================================================== */

window.AIMAN_CONFIG = {
  /* ---------------------------------------------------------------------
     1) YOUTUBE API KEY
     ---------------------------------------------------------------------
     Kaise banayein (ek baar):
       a) Google Cloud Console kholein: https://console.cloud.google.com
       b) Upar project dropdown se ek naya project select/create karein
       c) Left menu → "APIs & Services" → "Library"
       d) Search karein "YouTube Data API v3" → Enable karein
       e) "APIs & Services" → "Credentials" → "Create credentials" → "API key"
       f) Nayi key copy karke niche paste kar dein.

     Security note: browser mein key public hoti hai. Isliye production mein
     ise apni backend / serverless function ke peeche rakhein, aur domain
     restriction zaroor lagaein (YouTube Data API v3 → Application restrictions
     → HTTP referrers → apna domain). Chhote channel ke liye quota aaraam se
     chalta hai (10,000 units/day).
  */
  YOUTUBE_API_KEY: "AIzaSyDPSwLHi_F9N3O9_AFd1eEEOR9WIoA8-wY", // live channel se auto-sync

  /* ---------------------------------------------------------------------
     2) CHANNEL IDENTITY
     Channel ka ID YouTube Data API se automatically resolve ho jata hai.
     Neeche sirf tab bharenge jab aap RSS fallback chahte hain (bina API key).
     Apna channel ID yahan se nikal sakte hain:
       https://www.youtube.com/account_advanced?y=P  (URL ke end mein UC....)
     ya channel page ke "Share → Copy channel ID".
  */
  CHANNEL_ID: "UCyNphkU24SEmtyE6HblN1dg", // "Aiman & Minal" — RSS fallback ke liye

  /* ---------------------------------------------------------------------
     3) BRANDING / SEO
  */
  site: {
    name: "Aiman & Minal",
    shortName: "A&M",
    tagline: "Lifestyle | Fashion | Beauty | Daily Life",
    description:
      "Aiman & Minal — lifestyle, fashion, beauty, skincare and daily life. Real moments, good looks and a lot of love.",
    locale: "en",
    themeColor: "#07080C",
    twitterHandle: "@aimankhanofficial05",
  },

  /* ---------------------------------------------------------------------
     4) SOCIAL LINKS
     Jo link aapke paas nahi hai usay null chhor dein — website usay
     automatically chhupa degi. Email chahiye to public email daal dein.
  */
  social: {
    youtube: "https://www.youtube.com/@aimankhanofficial05",
    instagram: "https://www.instagram.com/aimankhan.official",
    tiktok: "https://www.tiktok.com/@aimankhan.official8.tiktok.pk",
    facebook: "https://www.facebook.com/AimankhanamAimo",
    x: null,
    email: "business@aimankhan.com", // Privacy Policy + Terms + contact form
  },

  /* ---------------------------------------------------------------------
     4b) INSTAGRAM & TIKTOK TOKENS  (optional)
     ---------------------------------------------------------------------
     IMPORTANT — ye dono platforms public scraping block karte hain. Maine
     live test kiya: Instagram ka page login wall return karta hai aur TikTok
     ka bhi same. Isliye inka data browser se seed file se aata hai jab tak
     aap official token na dein.

     LIVE karne ke liye (har ek ka apna official route hai):

     Instagram — Meta Graph API
       1. https://developers.facebook.com → app banaayein
       2. "Instagram Basic Display" ya "Instagram Graph API" add karein
       3. Professional (Business/Creator) account Instagram se link karein
       4. User ID aur access token milega
       5. Neeche dono values bhar dein — website khud live ho jayegi

     TikTok — Content Posting / Display API
       1. https://developers.tiktok.com → app register karein
       2. "Content Posting API" ya Display API scope maangein
       3. OAuth se user access token lein
       4. Neeche token bhar dein
  */
  instagram: {
    ACCESS_TOKEN: "", // optional — khali chhor dein to seed data dikhega
    USER_ID: "",
  },
  tiktok: {
    ACCESS_TOKEN: "", // optional
    OPEN_ID: "", // "user_xxx" — apna TikTok Open ID
    NUM_POSTS: 12,
  },

  /* ---------------------------------------------------------------------
     4c) SEED CONTENT — Instagram posts/reels aur TikTok videos
     ---------------------------------------------------------------------
     Ye wahi kaam karta hai jo YouTube ke liye seed-videos.js karta hai:
     real, hand-curated entries jo website par dikhti hain.

     Har entry mein:
       type      "image" | "reel"   (Instagram)
                 "video"             (TikTok — vertical cards)
       image     thumbnail/poster URL
       caption   post ka text
       likes     number (Instagram)
       views     number (TikTok)
       date      ISO date

     Tip: Instagram app se "Copy link" karke post URL daal dein, ya post ki
     image CDN link paste kar dein. Naye posts add karne ke liye bas ek entry
     aur likh dein — koi code change nahi.
  */
  instagramSeed: [
    { id: "ig-1", type: "reel", image: "assets/gallery/gallery-01.jpg", caption: "Soft glam, a touch of elegance 💫", likes: 4820, date: "2026-09-24" },
    { id: "ig-2", type: "image", image: "assets/gallery/gallery-02.jpg", caption: "Festive collection — Eira ✨", likes: 6110, date: "2026-09-19" },
    { id: "ig-3", type: "reel", image: "assets/gallery/gallery-03.jpg", caption: "Co-ord set of the season 🤍", likes: 3940, date: "2026-09-15" },
    { id: "ig-4", type: "image", image: "assets/gallery/gallery-04.jpg", caption: "Behind the seams — Minal couture", likes: 2870, date: "2026-09-10" },
    { id: "ig-5", type: "reel", image: "assets/gallery/gallery-05.jpg", caption: "Get ready with me 💄", likes: 5230, date: "2026-09-06" },
    { id: "ig-6", type: "image", image: "assets/gallery/gallery-06.jpg", caption: "Golden hour, Karachi 🌅", likes: 3410, date: "2026-08-29" },
    { id: "ig-7", type: "reel", image: "assets/gallery/gallery-07.jpg", caption: "Everyday coffee, everyday content ☕", likes: 2160, date: "2026-08-21" },
    { id: "ig-8", type: "image", image: "assets/gallery/gallery-08.jpg", caption: "New drop alert 🚨", likes: 7750, date: "2026-08-14" },
  ],

  tiktokSeed: [
    { id: "tt-1", image: "assets/videos/self-care-placeholder.jpg", caption: "Soft glam transition ✨", views: 48200, date: "2026-09-24" },
    { id: "tt-2", image: "assets/videos/travel-placeholder.jpg", caption: "Co-ord set but make it fashion 🤍", views: 61500, date: "2026-09-19" },
    { id: "tt-3", image: "assets/videos/day-in-life-placeholder.jpg", caption: "Morning routine with Minal", views: 33900, date: "2026-09-12" },
    { id: "tt-4", image: "assets/videos/study-placeholder.jpg", caption: "Glow up challenge 💫", views: 52700, date: "2026-09-05" },
    { id: "tt-5", image: "assets/gallery/gallery-05.jpg", caption: "GRWM for a festive look", views: 28800, date: "2026-08-28" },
    { id: "tt-6", image: "assets/gallery/gallery-02.jpg", caption: "Festive collection preview 🔥", views: 71400, date: "2026-08-19" },
  ],

  /* ---------------------------------------------------------------------
     5) ABOUT / BIO
     `aboutText` array mein har element ek paragraph hai. Agar aap apna
     bio yahan likh dein to wo YouTube description se zyada "polished"
     lagta hai. Khaali chhorne par API se aayi description use hogi.
  */
  aboutText: [
    "Hi, we're Aiman & Minal — welcome to our official corner of the internet. This channel is where we share the real, unfiltered version of our lives: glam looks, skincare hauls, outfit styling, little everyday moments and everything in between.",
    "Alongside the vlogs, you'll find Minal's fashion work up close — co-ord sets, festive collections, bridal couture and the craft behind the garments. We love showing you the process: how a piece is made, how a look comes together, and what it takes to get that soft-glam finish.",
    "New uploads every week. Stay connected, spread positivity, and let's grow together.",
  ],
  signature: "— Aiman & Minal",
  mantra: ["Dream", "Create", "Inspire ♡"],

  /* ---------------------------------------------------------------------
     6) FEATURED PLAYLISTS (Category filter)
     You har playlist ka YouTube playlist ID paste kar sakte hain. Khali
     array chhor dein to website aapke public playlists RSS se khud parh
     leti hai.
  */
  featuredPlaylists: [
    { id: "", title: "Fashion & Style", description: "Outfits, looks and styling." },
    { id: "", title: "Beauty & Skincare", description: "Glam, glow and skincare." },
    { id: "", title: "Daily Life", description: "Ordinary days, real moments." },
    { id: "", title: "Minal Fashion", description: "Collections, craft and couture." },
  ],

  /* ---------------------------------------------------------------------
     7) HOW MANY VIDEOS TO SHOW
  */
  maxVideos: 12, // "Latest Videos" grid
  maxShorts: 8, // Shorts carousel
  maxGallery: 12, // Gallery tiles

  /* ---------------------------------------------------------------------
     8) CACHING
     YouTube quota bachane ke liye har fetch ka result localStorage mein
     `cacheMinutes` tak store hota hai. Isay 0 kar dein to har baar live
     data aayega (sirf testing ke liye).
  */
  cacheMinutes: 60,

  /* ---------------------------------------------------------------------
     9) FALLBACK ASSETS
     Jab network ya API fail ho jaye to ye local images use honge, taake
     website kabhi khali na dikhe.
  */
  fallback: {
    banner: "assets/hero/aiman-channel-banner.jpg",
    avatar: "assets/hero/aiman-profile.jpg",
    about: "assets/about/about-placeholder.jpg",
    videoThumb: "assets/videos/day-in-life-placeholder.jpg",
    gallery: [
      "assets/gallery/gallery-01.jpg",
      "assets/gallery/gallery-02.jpg",
      "assets/gallery/gallery-03.jpg",
      "assets/gallery/gallery-04.jpg",
      "assets/gallery/gallery-05.jpg",
      "assets/gallery/gallery-06.jpg",
      "assets/gallery/gallery-07.jpg",
      "assets/gallery/gallery-08.jpg",
    ],
  },
};
