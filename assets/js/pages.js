/* ==========================================================
   Page logic: home, schedule, announcements, contact
   ========================================================== */
(function () {
  const API = window.APCApi, C = window.APC;
  const U = window.APCUtil, $ = U.$, $$ = U.$$, esc = window.esc;
  const page = document.body.dataset.page;

  const lvlClass = (l) => ({ Beginner: "", Intermediate: "b", Advanced: "o", "All Levels": "" }[l] || "");
  const statusTag = (s) => s === "Open" ? "" : `<span class="tag red">${esc(s)}</span>`;

  function whenBlock(s) {
    if (s.type === "One-time" && s.date) {
      const d = new Date(s.date + "T00:00:00");
      return `<b>${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b><span>${U.DAYS[d.getDay()].slice(0, 3)} · ${U.fmtTime(s.start)}</span>`;
    }
    return `<b>${esc((s.day || "").slice(0, 3))}</b><span>${U.fmtTime(s.start)} – ${U.fmtTime(s.end)}</span>`;
  }
  function sessionCard(s) {
    const open = s.status === "Open";
    return `<article class="card sess" data-id="${esc(s.id)}">
      <div class="when">${whenBlock(s)}</div>
      <div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span class="tag ${lvlClass(s.level)}">${esc(s.level)}</span>${s.type === "One-time" ? '<span class="tag o">Special event</span>' : ""}${statusTag(s.status)}</div>
        <h3>${esc(s.title)}</h3>
        <div class="meta"><span><i class="fa-solid fa-location-dot"></i>${esc(s.location)}</span><span><i class="fa-solid fa-users"></i>${esc(s.slots)} slots</span><span><i class="fa-solid fa-tag"></i>${esc(s.fee)}</span></div>
        ${s.notes ? `<p style="color:var(--muted);margin-top:10px;font-size:.92rem">${esc(s.notes)}</p>` : ""}</div>
      <div class="act"><button class="btn sm" data-reserve="${esc(s.id)}" ${open ? "" : "disabled"}><i class="fa-solid fa-hand-point-up"></i> Reserve</button>
        <button class="btn sm ghost" data-ics="${esc(s.id)}"><i class="fa-regular fa-calendar-plus"></i> Add to calendar</button></div>
    </article>`;
  }
  function newsCard(a) {
    return `<article class="card news" data-news="${esc(a.id)}" tabindex="0" role="button">
      <div class="top"><span class="tag ${a.category === "Event" ? "o" : a.category === "Reminder" ? "b" : ""}">${esc(a.category || "News")}</span><time>${a.pinned ? '<i class="fa-solid fa-thumbtack pin"></i> ' : ""}${esc(U.fmtDate(a.date))}</time></div>
      <h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><span class="more">Read more <i class="fa-solid fa-arrow-right"></i></span></article>`;
  }
  const published = (rows) => rows.filter((a) => (a.status || "Published") === "Published")
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date).localeCompare(String(a.date)));

  /* ---------- modal helper ---------- */
  function modal(id) {
    const m = $("#" + id); if (!m) return null;
    const close = () => { m.classList.remove("open"); document.body.style.overflow = ""; };
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest(".x")) close(); });
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return { open() { m.classList.add("open"); document.body.style.overflow = "hidden"; }, close, el: m };
  }
  function note(el, kind, msg) { el.className = "note show " + kind; el.textContent = msg; }

  /* ---------- ICS ---------- */
  function downloadICS(s) {
    const d = U.nextOccurrence(s) || new Date(); const p = (n) => String(n).padStart(2, "0");
    const f = (dt, t) => `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${(t || "00:00").replace(":", "")}00`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Asay Pikol Club//EN", "BEGIN:VEVENT", "UID:" + s.id + "@asaypikol",
      "DTSTAMP:" + f(new Date(), p(new Date().getHours()) + ":" + p(new Date().getMinutes())),
      "DTSTART:" + f(d, s.start), "DTEND:" + f(d, s.end || s.start), s.type === "Weekly" ? "RRULE:FREQ=WEEKLY" : "",
      "SUMMARY:" + s.title + " — " + C.clubName, "LOCATION:" + (s.location || "") + " " + C.contact.address, "DESCRIPTION:" + (s.notes || ""), "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = s.title.replace(/\W+/g, "-") + ".ics"; a.click();
  }

  /* ======================= HOME ======================= */
  async function home() {
    const [sched, news] = await Promise.all([API.schedule(), API.announcements()]);
    const open = sched.filter((s) => s.status === "Open").map((s) => ({ s, d: U.nextOccurrence(s) })).filter((x) => x.d).sort((a, b) => a.d - b.d);
    const nc = $("#nextCard");
    if (nc) {
      if (open[0]) {
        const { s, d } = open[0]; const today = new Date().toDateString() === d.toDateString();
        nc.innerHTML = `<small><i class="fa-solid fa-bolt"></i> Next game</small><h3>${esc(s.title)}</h3>
          <p>${today ? "Today" : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · ${U.fmtTime(s.start)}</p>
          <div class="meta"><span><i class="fa-solid fa-location-dot"></i> ${esc(s.location)}</span><span><i class="fa-solid fa-tag"></i> ${esc(s.fee)}</span></div>
          <a class="btn sm" style="margin-top:18px" href="schedule.html?reserve=${esc(s.id)}">Save my spot <i class="fa-solid fa-arrow-right"></i></a>`;
      } else nc.innerHTML = `<small>Next game</small><h3>Check back soon</h3><p>New sessions are on the way.</p>`;
    }
    const hs = $("#homeSessions");
    if (hs) { hs.innerHTML = open.slice(0, 3).map((x) => sessionCard(x.s)).join("") || `<div class="empty">No upcoming sessions yet.</div>`; refreshMotion(hs); bindSessions(sched); }
    const hn = $("#homeNews");
    if (hn) { hn.innerHTML = published(news).slice(0, 3).map(newsCard).join("") || `<div class="empty">No announcements yet.</div>`; refreshMotion(hn); bindNews(news); }
  }

  /* ======================= SCHEDULE ======================= */
  let SCHED = [], resModal;
  function bindSessions(rows) {
    SCHED = rows; if (!resModal) resModal = modal("resModal");
    $$("[data-reserve]").forEach((b) => b.onclick = () => {
      if (!resModal) { location.href = "schedule.html?reserve=" + b.dataset.reserve; return; } openReserve(b.dataset.reserve);
    });
    $$("[data-ics]").forEach((b) => b.onclick = () => downloadICS(rows.find((r) => r.id === b.dataset.ics)));
  }
  function openReserve(id) {
    const s = SCHED.find((r) => r.id === id); if (!s || !resModal) return;
    $("#resTitle").textContent = s.title;
    $("#resInfo").textContent = (s.type === "One-time" ? U.fmtDate(s.date) : s.day + "s") + " · " + U.fmtTime(s.start) + " – " + U.fmtTime(s.end) + " · " + s.location + " · " + s.fee;
    const f = $("#resForm"); f.sid.value = s.id; f.stitle.value = s.title;
    const d = U.nextOccurrence(s); f.date.value = d ? [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-") : "";
    $("#resNote").className = "note"; resModal.open();
  }
  async function schedule() {
    const rows = await API.schedule(); SCHED = rows; resModal = modal("resModal");
    let day = "All", lvl = "All";
    const wk = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayBar = $("#dayFilters"), lvlBar = $("#lvlFilters");
    const chip = (v, g, on) => `<button class="chip ${on ? "on" : ""}" data-${g}="${v}">${v === "One-time" ? "Special events" : v}</button>`;
    dayBar.innerHTML = ["All", ...wk, "One-time"].map((d) => chip(d, "day", d === "All")).join("");
    lvlBar.innerHTML = ["All", "Beginner", "Intermediate", "Advanced", "All Levels"].map((l) => chip(l, "lvl", l === "All")).join("");
    function draw() {
      const list = rows.filter((s) => s.status !== "Hidden").filter((s) => lvl === "All" || s.level === lvl)
        .filter((s) => day === "All" || (day === "One-time" ? s.type === "One-time" : s.day === day && s.type !== "One-time"))
        .filter((s) => s.type !== "One-time" || U.nextOccurrence(s));
      const box = $("#sessList"); let html = "";
      wk.forEach((d) => { const g = list.filter((s) => s.type !== "One-time" && s.day === d).sort((a, b) => a.start.localeCompare(b.start)); if (g.length) html += `<div class="daygroup"><h4>${d}</h4><div class="list" style="margin-top:12px">${g.map(sessionCard).join("")}</div></div>`; });
      const ev = list.filter((s) => s.type === "One-time").sort((a, b) => a.date.localeCompare(b.date));
      if (ev.length) html += `<div class="daygroup"><h4>Special events</h4><div class="list" style="margin-top:12px">${ev.map(sessionCard).join("")}</div></div>`;
      box.innerHTML = html || `<div class="empty"><i class="fa-regular fa-calendar-xmark" style="font-size:2rem;margin-bottom:10px"></i><br>No sessions match. Try another filter.</div>`;
      refreshMotion(box); bindSessions(rows);
    }
    document.addEventListener("click", (e) => {
      const c = e.target.closest(".chip"); if (!c) return;
      if (c.dataset.day) { day = c.dataset.day; $$("[data-day]").forEach((x) => x.classList.toggle("on", x === c)); }
      if (c.dataset.lvl) { lvl = c.dataset.lvl; $$("[data-lvl]").forEach((x) => x.classList.toggle("on", x === c)); }
      draw();
    });
    draw();
    const q = new URLSearchParams(location.search).get("reserve"); if (q) setTimeout(() => openReserve(q), 600);

    $("#resForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target, n = $("#resNote");
      if (f.website.value) return;                                  // honeypot
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      try {
        await API.submit("reserve", { sessionId: f.sid.value, session: f.stitle.value, date: f.date.value, name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), players: f.players.value, level: f.level.value, notes: f.notes.value.trim() });
        note(n, "ok", "You're in! We got your reservation and will confirm shortly."); f.reset();
        setTimeout(() => resModal.close(), 2200);
      } catch (err) { note(n, "err", "Oops, something went wrong. Please try again or message us."); }
      btn.disabled = false;
    });
  }

  /* ======================= NEWS ======================= */
  let NEWS = [], newsModal;
  function bindNews(rows) {
    NEWS = rows; if (!newsModal) newsModal = modal("newsModal");
    $$("[data-news]").forEach((c) => {
      const open = () => {
        const a = NEWS.find((x) => x.id === c.dataset.news); if (!a) return;
        if (!newsModal) { location.href = "announcements.html?open=" + a.id; return; }
        $("#nmTag").textContent = a.category || "News"; $("#nmDate").textContent = U.fmtDate(a.date);
        $("#nmTitle").textContent = a.title; $("#nmBody").textContent = a.body; newsModal.open();
      };
      c.onclick = open; c.onkeydown = (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open());
    });
  }
  async function news() {
    const all = published(await API.announcements()); newsModal = modal("newsModal"); NEWS = all;
    const cats = ["All", ...new Set(all.map((a) => a.category).filter(Boolean))];
    let cat = "All", term = "";
    $("#catFilters").innerHTML = cats.map((c, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    function draw() {
      const l = all.filter((a) => (cat === "All" || a.category === cat) && (a.title + " " + a.body).toLowerCase().includes(term));
      const box = $("#newsGrid"); box.innerHTML = l.map(newsCard).join("") || `<div class="empty" style="grid-column:1/-1">No announcements found.</div>`;
      refreshMotion(box); bindNews(all);
    }
    $("#catFilters").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; cat = c.dataset.cat; $$("#catFilters .chip").forEach((x) => x.classList.toggle("on", x === c)); draw(); });
    $("#newsSearch").addEventListener("input", (e) => { term = e.target.value.toLowerCase(); draw(); });
    draw();
    const o = new URLSearchParams(location.search).get("open"); if (o) setTimeout(() => $(`[data-news="${o}"]`) && $(`[data-news="${o}"]`).click(), 600);
  }

  /* ======================= CONTACT ======================= */
  function contact() {
    const ct = C.contact;
    $("#cInfo").innerHTML = `
      <div class="card"><div class="ico"><i class="fa-solid fa-location-dot"></i></div><h3>Find the courts</h3><p>${esc(ct.address)}</p></div>
      <div class="card"><div class="ico o"><i class="fa-solid fa-phone"></i></div><h3>Call or text</h3><p><a href="tel:${esc(ct.phone.replace(/\s/g, ""))}">${esc(ct.phone)}</a></p></div>
      <div class="card"><div class="ico b"><i class="fa-solid fa-envelope"></i></div><h3>Email us</h3><p><a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a></p></div>
      <div class="card"><div class="ico"><i class="fa-regular fa-clock"></i></div><h3>Play hours</h3><p>${esc(ct.hours)}</p></div>`;
    if (ct.mapEmbedUrl) $("#map").innerHTML = `<iframe src="${esc(ct.mapEmbedUrl)}" title="Map to ${esc(C.clubName)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:100%;border:0"></iframe>`;
    else $("#map").innerHTML = `<div class="empty" style="height:100%;display:grid;place-items:center;border:0"><div><i class="fa-solid fa-map-location-dot" style="font-size:2.4rem;color:var(--ball)"></i><p style="margin-top:10px">Add your Google Maps embed link in <code>config.js</code></p></div></div>`;
    const sb = $("#cSocial"); if (sb) sb.innerHTML = ($("footer .socials") || {}).innerHTML || "";
    $("#cForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target, n = $("#cNote"); if (f.website.value) return;
      const b = f.querySelector("button[type=submit]"); b.disabled = true;
      try { await API.submit("contact", { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), topic: f.topic.value, message: f.message.value.trim() }); note(n, "ok", "Message sent! We'll get back to you soon."); f.reset(); }
      catch (err) { note(n, "err", "Could not send. Please try again or reach us on social media."); }
      b.disabled = false;
    });
  }

  const run = { home, schedule, announcements: news, contact }[page];
  if (run) run();
})();
