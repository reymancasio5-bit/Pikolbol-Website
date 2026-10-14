/* ==========================================================
   Layout, GSAP animations, page logic
   ========================================================== */
(function () {
  const C = window.APC, API = window.APCApi;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page || "home";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.esc = esc;

  /* ---------- shared header / footer ---------- */
  const LOGO = C.logo
    ? `<img src="${esc(C.logo)}" alt="" />`
    : `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="27" y="40" width="10" height="20" rx="4" fill="#10151f" stroke="#d9ff3f" stroke-width="2"/><rect x="10" y="4" width="44" height="40" rx="19" fill="#ff7a4d"/><circle cx="32" cy="24" r="9" fill="#d9ff3f"/><circle cx="29" cy="21" r="1.5" fill="#33420a"/><circle cx="35" cy="21" r="1.5" fill="#33420a"/><circle cx="32" cy="27" r="1.5" fill="#33420a"/></svg>`;
  const NAV = [["index.html", "Home", "home"], ["about.html", "About", "about"], ["schedule.html", "Schedule", "schedule"], ["announcements.html", "News", "announcements"], ["contact.html", "Contact", "contact"]];

  function socialLinks() {
    const s = C.social, m = [["facebook", "fa-facebook-f"], ["instagram", "fa-instagram"], ["tiktok", "fa-tiktok"], ["youtube", "fa-youtube"], ["messenger", "fa-facebook-messenger"]];
    let out = m.filter(([k]) => s[k]).map(([k, i]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${k}"><i class="fa-brands ${i}"></i></a>`).join("");
    if (C.contact.whatsapp) out += `<a href="https://wa.me/${esc(C.contact.whatsapp)}" target="_blank" rel="noopener" aria-label="whatsapp"><i class="fa-brands fa-whatsapp"></i></a>`;
    return out;
  }

  function buildChrome() {
    const brand = C.clubName.replace(/(\S+)$/, "<b>$1</b>");
    document.body.insertAdjacentHTML("afterbegin",
      `<div class="loader" id="loader"><div><div class="ball" style="margin:auto"></div><p>Warming up…</p></div></div>
       <div id="progress"></div>
       <canvas id="scene" aria-hidden="true"></canvas><div class="veil"></div>
       <header class="header" id="header"><nav class="nav" aria-label="Main">
         <a class="brand" href="index.html" aria-label="${esc(C.clubName)} home">${LOGO}<span>${brand}</span></a>
         <div class="menu" id="menu">${NAV.map(([h, t, k]) => `<a href="${h}" class="${k === page ? "active" : ""}">${t}</a>`).join("")}
           <a class="btn sm" href="schedule.html" style="color:#050805;margin-left:6px"><i class="fa-solid fa-table-tennis-paddle-ball"></i> Play Now</a></div>
         <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><i class="fa-solid fa-bars"></i></button>
       </nav></header>`);

    const ct = C.contact;
    document.body.insertAdjacentHTML("beforeend",
      `<footer><div class="foot">
        <div><a class="brand" href="index.html">${LOGO}<span>${brand}</span></a>
          <p style="color:var(--muted);margin-top:14px;max-width:320px">${esc(C.tagline)} A friendly pickleball club for everyone — first-timers, weekend warriors and tournament grinders.</p>
          <div class="socials">${socialLinks()}</div></div>
        <div><h4>Explore</h4><ul>${NAV.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
        <div><h4>Play</h4><ul><li><a href="schedule.html">Open play schedule</a></li><li><a href="announcements.html">Latest news</a></li><li><a href="about.html#rules">Pickleball 101</a></li><li><a href="about.html#faq">FAQ</a></li></ul></div>
        <div><h4>Find us</h4><ul>
          <li><i class="fa-solid fa-location-dot"></i>${esc(ct.address)}</li>
          <li><i class="fa-solid fa-phone"></i><a href="tel:${esc(ct.phone.replace(/\s/g, ""))}">${esc(ct.phone)}</a></li>
          <li><i class="fa-solid fa-envelope"></i><a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a></li></ul></div>
      </div><div class="copy"><span>© ${new Date().getFullYear()} ${esc(C.clubName)}. All rights reserved.</span><a href="admin.html"><i class="fa-solid fa-lock"></i> Owner login</a></div></footer>`);

    if (API.demo) document.body.insertAdjacentHTML("beforeend", `<button class="demo-bar" id="demoBar" title="Demo mode: sample data. Connect Google Sheets in assets/js/config.js. Click to hide."><i class="fa-solid fa-flask"></i> Demo mode</button>`);

    const db = $("#demoBar"); if (db) db.addEventListener("click", () => db.remove());
    const burger = $("#burger"), menu = $("#menu");
    burger.addEventListener("click", () => {
      const o = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", o);
      burger.innerHTML = `<i class="fa-solid ${o ? "fa-xmark" : "fa-bars"}"></i>`;
      document.body.style.overflow = o ? "hidden" : "";
    });
    $$("#menu a").forEach((a) => a.addEventListener("click", () => { menu.classList.remove("open"); document.body.style.overflow = ""; }));
  }

  /* ---------- text split ---------- */
  function split(el) {
    const text = el.textContent; el.setAttribute("aria-label", text); el.textContent = "";
    text.split(" ").forEach((w, wi, arr) => {
      const word = document.createElement("span"); word.className = "w"; word.setAttribute("aria-hidden", "true");
      [...w].forEach((ch) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; word.appendChild(s); });
      el.appendChild(word); if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return $$(".ch", el);
  }

  /* ---------- GSAP ---------- */
  let scene = null, lenis = null;
  function motion() {
    if (!window.gsap || !window.ScrollTrigger) { $$("[data-r]").forEach((e) => (e.style.opacity = 1)); return; }
    gsap.registerPlugin(ScrollTrigger);

    // smooth scroll (desktop / trackpad); native on touch
    if (window.Lenis && !reduce) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href")); if (!t) return; e.preventDefault();
      lenis ? lenis.scrollTo(t, { offset: -70 }) : t.scrollIntoView({ behavior: "smooth" });
    }));

    // 3D / video scene
    scene = window.APCScene && APCScene.init($("#scene"));
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => { if (scene) scene.state.p = self.progress; $("#progress").style.transform = `scaleX(${self.progress})`; } });
    $$("[data-tint]").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 60%", end: "bottom 40%", onToggle: (s) => s.isActive && scene && scene.setTint(el.dataset.tint) }));
    if (scene) scene.setTint(($("[data-tint]") || {}).dataset ? $("[data-tint]").dataset.tint : "none");

    // header hide on scroll down
    const header = $("#header"); let lastY = 0;
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => {
      const y = s.scroll(); header.classList.toggle("scrolled", y > 30);
      header.classList.toggle("hide", y > lastY && y > 400 && !$("#menu").classList.contains("open")); lastY = y;
    } });

    if (reduce) { $$("[data-r]").forEach((e) => (e.style.opacity = 1)); return; }

    // hero text
    $$("[data-split]").forEach((el) => {
      const chars = split(el);
      gsap.from(chars, { yPercent: 120, rotate: 8, opacity: 0, duration: 1, ease: "back.out(1.7)", stagger: 0.025, delay: 0.5 });
    });
    const intro = (sel, vars) => { const t = $$(sel); if (t.length) gsap.from(t, vars); };
    intro(".hero .eyebrow,.page-hero .eyebrow", { y: 20, opacity: 0, duration: 0.8, delay: 0.3 });
    intro(".hero .lead,.page-hero .lead", { y: 30, opacity: 0, duration: 0.9, delay: 1.0 });
    intro(".hero .cta .btn", { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, delay: 1.2, ease: "back.out(1.6)" });
    intro(".next-card", { x: 60, opacity: 0, duration: 1, delay: 1.3, ease: "power3.out" });

    // hero parallax out
    $$(".hero .wrap, .page-hero .wrap").forEach((w) => gsap.to(w, { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: { trigger: w.closest("section"), start: "top top", end: "bottom top", scrub: true } }));

    // generic reveals
    $$("[data-r]").forEach((el) => {
      const kind = el.dataset.r, from = { opacity: 0, duration: 0.9, ease: "power3.out" };
      if (kind === "left") from.x = -70; else if (kind === "right") from.x = 70; else if (kind === "zoom") { from.scale = 0.88; } else from.y = 56;
      gsap.from(el, Object.assign(from, { scrollTrigger: { trigger: el, start: "top 88%", once: true } }));
    });
    // staggered groups
    $$("[data-stagger]").forEach((g) => {
      const kids = Array.from(g.children);
      gsap.from(kids, { y: 60, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: g, start: "top 85%", once: true } });
    });
    // section titles
    $$("[data-title]").forEach((h) => {
      const chars = split(h);
      gsap.from(chars, { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.02, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
    // counters
    $$("[data-count]").forEach((el) => {
      const end = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: end, duration: 2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString() + (el.dataset.suffix || "")) });
    });
    // marquee
    $$(".marquee .track").forEach((t) => {
      t.innerHTML += t.innerHTML;
      const tw = gsap.to(t, { xPercent: -50, repeat: -1, duration: 28, ease: "none" });
      ScrollTrigger.create({ onUpdate: (s) => gsap.to(tw, { timeScale: 1 + Math.abs(s.getVelocity()) / 400, duration: 0.2, overwrite: true, onComplete: () => gsap.to(tw, { timeScale: 1, duration: 1 }) }) });
    });
    // floating court ball
    $$(".court .pb").forEach((b) => {
      gsap.to(b, { keyframes: [{ left: "62%", top: "70%" }, { left: "34%", top: "42%" }, { left: "64%", top: "22%" }, { left: "30%", top: "20%" }], duration: 6, repeat: -1, ease: "sine.inOut" });
    });
    // magnetic buttons (pointer devices only)
    if (matchMedia("(pointer:fine)").matches) $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.3 }); });
      b.addEventListener("pointerleave", () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,.4)" }));
      });
    // card tilt
    if (matchMedia("(pointer:fine)").matches) $$(".card").forEach((c) => {
      c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; gsap.to(c, { rotationY: px * 8, rotationX: -py * 8, transformPerspective: 800, duration: 0.4 }); });
      c.addEventListener("pointerleave", () => gsap.to(c, { rotationX: 0, rotationY: 0, duration: 0.6 }));
    });
  }

  /* re-run reveal for content added after fetch */
  window.refreshMotion = function (root) {
    if (!window.gsap || reduce) { $$("[data-r]", root).forEach((e) => (e.style.opacity = 1)); return; }
    const kids = Array.from(root.children);
    gsap.fromTo(kids, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.07, ease: "power3.out", clearProps: "transform", scrollTrigger: { trigger: root, start: "top 90%", once: true } });
    if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 100);
  };

  /* ---------- date / time helpers (shared) ---------- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmtTime = (t) => { if (!t) return ""; const [h, m] = String(t).split(":"); const H = +h; return ((H + 11) % 12 + 1) + (m && +m ? ":" + m : "") + (H >= 12 ? " PM" : " AM"); };
  const fmtDate = (d) => { const x = new Date(d + "T00:00:00"); return isNaN(x) ? d : x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
  function nextOccurrence(s) {
    const now = new Date();
    if (s.type === "One-time" && s.date) { const d = new Date(s.date + "T" + (s.start || "00:00")); return d >= new Date(now.getTime() - 3600e3 * 3) ? d : null; }
    const idx = DAYS.indexOf(s.day); if (idx < 0) return null;
    const d = new Date(now); d.setHours(...(s.start || "00:00").split(":").map(Number), 0, 0);
    d.setDate(now.getDate() + ((idx - now.getDay() + 7) % 7)); if (d < now) d.setDate(d.getDate() + 7); return d;
  }
  window.APCUtil = { DAYS, fmtTime, fmtDate, nextOccurrence, $, $$ };

  /* ---------- boot ---------- */
  buildChrome();
  const start = () => {
    motion();
    const L = $("#loader"); setTimeout(() => L && L.classList.add("done"), 350);
    document.dispatchEvent(new Event("apc:ready"));
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
  setTimeout(() => { const L = $("#loader"); L && L.classList.add("done"); }, 4500);    // never block the page
})();
