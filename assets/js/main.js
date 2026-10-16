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

  // Animate ordinary local page links without replacing the site's navigation.
  let departure = null;
  const resetNavigation = () => {
    clearTimeout(departure); departure = null;
    document.documentElement.classList.remove("page-leaving");
  };
  addEventListener("pageshow", resetNavigation);
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/\.html$/i.test(url.pathname) || (url.pathname === location.pathname && url.search === location.search) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (departure !== null) return;
    document.documentElement.classList.add("page-leaving");
    departure = setTimeout(() => { location.assign(url.href); }, 180);
  });

  /* ---------- shared header / footer ---------- */
  const LOGO = C.logo
    ? `<img src="${esc(C.logo)}" alt="" />`
    : `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="1" y="1" width="46" height="46" rx="12" fill="#d9ff3f"/><path d="M14 33V15h11a7 7 0 0 1 0 14h-6m0-9v13" fill="none" stroke="#151914" stroke-width="3" stroke-linecap="square"/></svg>`;
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
       <a class="skip-link" href="#main">Skip to content</a><div id="progress" aria-hidden="true"></div>
       <canvas id="scene" aria-hidden="true"></canvas><div class="veil"></div>
       <header class="header" id="header"><nav class="nav" aria-label="Main">
         <a class="brand" href="index.html" aria-label="${esc(C.clubName)} home">${LOGO}<span>${brand}</span></a>
         <div class="menu" id="menu">${NAV.map(([h, t, k]) => `<a href="${h}" class="${k === page ? "active" : ""}" ${k === page ? 'aria-current="page"' : ''}>${t}</a>`).join("")}
           <a class="btn sm" href="schedule.html" style="color:#050805;margin-left:6px"><i class="fa-solid fa-table-tennis-paddle-ball"></i> Register Now</a></div>
         <button class="burger" id="burger" aria-label="Open menu" aria-controls="menu" aria-expanded="false"><span class="burger-lines" aria-hidden="true"><span></span><span></span><span></span></span></button>
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

    const db = $("#demoBar"); if (db) { $("footer .copy").append(db); db.addEventListener("click", () => db.remove()); }
    const burger = $("#burger"), menu = $("#menu");
    const desktopMenu = matchMedia("(min-width:901px)");
    menu.inert = !desktopMenu.matches;
    $$("a", menu).forEach((link, index) => link.style.setProperty("--menu-index", index));
    new ResizeObserver(() => {
      document.documentElement.style.setProperty("--nav-height", $("#header").getBoundingClientRect().height + "px");
    }).observe($("#header"));
    const setMenu = (o) => {
      menu.classList.toggle("open", o);
      menu.inert = !o && !desktopMenu.matches;
      burger.setAttribute("aria-expanded", o);
      burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
      if (!o && menu.contains(document.activeElement)) burger.focus({ preventScroll: true });
      document.body.style.overflow = o ? "hidden" : "";
      $("#main").inert = o; $("footer").inert = o;
      if (lenis) o ? lenis.stop() : lenis.start();
    };
    burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    document.addEventListener("keydown", (e) => {
      if (!menu.classList.contains("open")) return;
      if (e.key === "Escape") { setMenu(false); burger.focus(); }
      if (e.key === "Tab") {
        const links = $$("a", menu), first = links[0];
        if (!e.shiftKey && document.activeElement === burger) { e.preventDefault(); first.focus(); }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); burger.focus(); }
      }
    });
    $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    desktopMenu.addEventListener("change", () => setMenu(false));
    addEventListener("pageshow", () => { if (menu.classList.contains("open")) setMenu(false); });
    const stage = $(".hero-visual");
    if (stage) stage.prepend($("#scene"));
    else $("#scene").remove();
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
    const counters = () => $$('[data-count]').forEach(el => { el.textContent = Number(el.dataset.count).toLocaleString() + (el.dataset.suffix || ''); });
    const canvas = $('#scene');
    if (canvas && window.APCScene) scene = APCScene.init(canvas);
    if (!window.gsap || !window.ScrollTrigger || reduce) {
      $$('[data-r]').forEach(el => { el.style.opacity = 1; });
      counters(); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      lenis = new Lenis({ duration: 0.85, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
    }
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => {
      $('#progress').style.transform = 'scaleX(' + self.progress + ')';
      $('#header').classList.toggle('scrolled', self.scroll() > 24);
    }});
    gsap.from('.hero-copy > *, .page-hero .wrap > *', { y: 22, autoAlpha: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out', clearProps: 'all' });
    if ($('.hero-aside')) gsap.from('.hero-aside', { y: 24, autoAlpha: 0, duration: 0.9, delay: 0.15, ease: 'power3.out', clearProps: 'all' });
    const reveal = (el, stagger = 0) => gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.65, stagger, ease: 'power2.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: Array.isArray(el) ? el[0]?.parentElement : el, start: 'top 94%', toggleActions: 'play none none reverse' } });
    $$('[data-r], [data-title]').forEach(el => reveal(el));
    $$('[data-stagger]').forEach(el => { if (el.children.length) reveal(Array.from(el.children), 0.06); });
    $$('[data-count]').forEach(el => {
      const o = { value: 0 };
      gsap.to(o, { value: Number(el.dataset.count), duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 95%', once: true }, onUpdate: () => { el.textContent = Math.round(o.value).toLocaleString() + (el.dataset.suffix || ''); } });
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  window.refreshMotion = function (root) {
    if (!window.gsap || !window.ScrollTrigger || reduce) return;
    const kids = Array.from(root.children);
    if (!kids.length) return;
    gsap.fromTo(kids, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: root, start: 'top 96%', once: true } });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  // One accessible dialog behavior for booking, news and owner forms.
  const dialogs = new WeakMap();
  function modal(id) {
    const el = $('#' + id); if (!el) return null;
    if (dialogs.has(el)) return dialogs.get(el);
    let previous, blocked = [];
    el.setAttribute('aria-hidden', 'true');
    el.querySelector('.box').setAttribute('data-lenis-prevent', '');
    const focusable = () => $$('button, a[href], input:not([type=hidden]), select, textarea, [tabindex="0"]', el).filter(e => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length);
    const close = () => {
      if (!el.classList.contains('open')) return;
      el.classList.remove('open'); el.setAttribute('aria-hidden', 'true');
      blocked.forEach(e => { e.inert = false; }); blocked = [];
      document.body.style.overflow = ''; lenis?.start();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    const open = () => {
      previous = document.activeElement;
      blocked = [...$$('main > *'), $('#header'), $('footer')].filter(e => e && e !== el && !e.contains(el) && !e.inert);
      blocked.forEach(e => { e.inert = true; });
      el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; lenis?.stop();
      focusable()[0]?.focus({ preventScroll: true });
    };
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.x')) close(); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    const api = { open, close, el }; dialogs.set(el, api); return api;
  }
  window.APCUI = { modal };

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
    try { motion(); } catch (error) { console.warn("Motion unavailable", error); $$("[data-r]").forEach(el => { el.style.opacity = 1; }); }
    const L = $("#loader"); L && L.classList.add("done");
    document.dispatchEvent(new Event("apc:ready"));
  };
  if (document.readyState !== "loading") start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
  setTimeout(() => { const L = $("#loader"); L && L.classList.add("done"); }, 4500);    // never block the page
})();
