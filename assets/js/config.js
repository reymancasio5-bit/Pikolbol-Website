/* ==========================================================
   ASAY PIKOL CLUB — Site settings
   Edit this file only. Everything else reads from here.
   ========================================================== */
window.APC = {
  clubName: "ASAY PIKOL CLUB",
  tagline: "Dink. Smash. Repeat.",

  /* 1) Paste your Google Apps Script Web App URL here (see README.md).
        While this is empty the site runs in DEMO MODE:
        sample data + admin changes saved only in this browser. */
  apiUrl: "",

  /* 2) Contact details — replace with the club's real info. */
  contact: {
    email: "hello@asaypikol.club",
    phone: "+63 900 000 0000",
    whatsapp: "639000000000",            // digits only, with country code
    address: "Your court address, City, Philippines",
    hours: "Open play daily — see Schedule",
    mapEmbedUrl: ""                      // Google Maps > Share > Embed a map > copy the src="..." link
  },

  /* 3) Social links. Leave "" to hide an icon. */
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    tiktok: "",
    youtube: "",
    messenger: ""
  },

  /* 4) Background videos used by the 3D scene (tried in order).
        Put your own .mp4/.webm files in assets/videos/ and list them here.
        If none load, the site automatically uses a built-in animated
        pickleball court so it never looks empty. */
  videos: [
    "assets/videos/hero.mp4",
    "assets/videos/play.webm"
  ],

  /* 5) Logo image (optional). Leave "" to use the built-in paddle logo. */
  logo: ""
};
