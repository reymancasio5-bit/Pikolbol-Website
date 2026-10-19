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
  apiUrl: "https://script.google.com/macros/s/AKfycbxKXTor-MV5mfU-ZSylhEAiE2nB8NiIhxYodi6Hnl58viSDdEnXMAnaaX6DYeAHq2ie/exec",

  /* 2) Contact details — replace with the club's real info. */
  contact: {
    email: "asaypikol2026@gmail.com",
    phone: "+63 910 090 9991",
    whatsapp: "",            // digits only, with country code
    address: "Tandag City, Philippines",
    hours: "Open play daily — see Schedule",
    mapEmbedUrl: "<iframe src=\"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126078.3655252582!2d126.05469045857926!3d9.068418027504372!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3302373d1fdee1bf%3A0x9f84ea6460e30dd3!2sCity%20of%20Tandag%2C%20Surigao%20del%20Sur%2C%20Philippines!5e0!3m2!1sen!2sth!4v1792380088852!5m2!1sen!2sth\" width=\"600\" height=\"450\" style=\"border:0;\" allowfullscreen=\"\" loading=\"lazy\" referrerpolicy=\"strict-origin-when-cross-origin\"></iframe>"                      // Google Maps > Share > Embed a map > copy the src="..." link
  },

  /* 3) Social links. Leave "" to hide an icon. */
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61595213673952",
    instagram: "",
    tiktok: "",
    youtube: "",
    messenger: "https://www.facebook.com/messages/t/933293642918205"
  },

  /* 4) Background videos used by the 3D scene (tried in order).
        Put your own .mp4/.webm files in assets/videos/ and list them here.
        If none load, the site automatically uses a built-in animated
        pickleball court so it never looks empty. */
  videos: [],

  /* 5) Logo image (optional). Leave "" to use the built-in club monogram. */
  logo: "assets/images/asay-pikol-logo.jpg"
};
