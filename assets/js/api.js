/* ==========================================================
   Data layer — Google Sheets via Apps Script (or demo mode)
   ========================================================== */
(function () {
  const C = window.APC;
  const LS = "apc_demo_";
  const demo = !C.apiUrl;

  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

  const SEED = {
    schedule: [
      { id: "s1", type: "Weekly", day: "Monday", date: "", start: "18:00", end: "20:00", title: "Beginner Bounce", level: "Beginner", location: "Court 1–2", slots: 16, fee: "₱150", notes: "Paddles & balls provided. First time? Come 15 min early.", status: "Open" },
      { id: "s2", type: "Weekly", day: "Wednesday", date: "", start: "18:30", end: "21:00", title: "Midweek Mix-Up", level: "All Levels", location: "Court 1–4", slots: 24, fee: "₱150", notes: "We rotate partners every game.", status: "Open" },
      { id: "s3", type: "Weekly", day: "Friday", date: "", start: "19:00", end: "22:00", title: "Friday Night Smash", level: "Intermediate", location: "Court 1–4", slots: 20, fee: "₱180", notes: "Fast games, friendly vibes.", status: "Open" },
      { id: "s4", type: "Weekly", day: "Saturday", date: "", start: "07:00", end: "10:00", title: "Sunrise Social", level: "All Levels", location: "Court 1–4", slots: 24, fee: "₱150", notes: "Coffee after the last game.", status: "Open" },
      { id: "s5", type: "Weekly", day: "Sunday", date: "", start: "16:00", end: "19:00", title: "Advanced Ladder", level: "Advanced", location: "Court 3–4", slots: 12, fee: "₱200", notes: "Ranked ladder play. 3.5+ recommended.", status: "Open" },
      { id: "s6", type: "One-time", day: "", date: addDays(9), start: "15:00", end: "19:00", title: "Asay Pikol Mini Tournament", level: "All Levels", location: "All Courts", slots: 32, fee: "₱300", notes: "Doubles. Prizes for top 3 teams!", status: "Open" }
    ],
    announcements: [
      { id: "a1", title: "Welcome to the new Asay Pikol website!", category: "News", date: addDays(-1), pinned: "yes", body: "We just got a glow-up. Check the schedule, reserve your spot, and never miss an update again. See you on the court!", status: "Published" },
      { id: "a2", title: "Mini Tournament is coming", category: "Event", date: addDays(-3), pinned: "", body: "Grab your partner and sign up for our Mini Tournament. Doubles format, all levels welcome. Slots are limited to 32 players.", status: "Published" },
      { id: "a3", title: "New to pickleball? Beginner Bounce is for you", category: "Beginners", date: addDays(-6), pinned: "", body: "Every Monday evening we teach the basics: serve, dink, rules and scoring. No experience needed. We lend paddles.", status: "Published" },
      { id: "a4", title: "Court rules reminder", category: "Reminder", date: addDays(-10), pinned: "", body: "Please wear non-marking court shoes, respect the paddle-stack queue, and call your own lines honestly. Good vibes only.", status: "Published" }
    ],
    messages: [],
    reservations: []
  };

  function ls(key, fallback) {
    try { const v = localStorage.getItem(LS + key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function lsSet(key, val) { try { localStorage.setItem(LS + key, JSON.stringify(val)); } catch (e) {} }

  async function post(payload) {
    const res = await fetch(C.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function list(sheet, opts) {
    opts = opts || {};
    const cacheKey = "cache_" + sheet;
    if (demo) return ls(sheet, SEED[sheet] || []);
    try {
      const res = await fetch(C.apiUrl + "?action=list&sheet=" + encodeURIComponent(sheet), { redirect: "follow" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      lsSet(cacheKey, json.rows);
      return json.rows;
    } catch (e) {
      console.warn("Using cached " + sheet, e);
      return ls(cacheKey, []);
    }
  }

  const uid = () => "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const API = {
    demo,
    list,
    schedule: () => list("schedule"),
    announcements: () => list("announcements"),

    async submit(kind, data) {          // "contact" | "reserve"
      const bucket = kind === "contact" ? "messages" : "reservations";
      if (demo) {
        const rows = ls(bucket, []);
        rows.unshift(Object.assign({ id: uid(), createdAt: new Date().toISOString() }, data));
        lsSet(bucket, rows);
        return { ok: true };
      }
      return post({ action: kind, data });
    },

    /* ---------- admin (passcode required) ---------- */
    async login(passcode) {
      if (demo) { if (!passcode) throw new Error("Enter a passcode"); return true; }
      await post({ action: "auth", passcode });
      return true;
    },
    async adminList(sheet, passcode) {
      if (demo) return ls(sheet, SEED[sheet] || []);
      const r = await post({ action: "adminList", sheet, passcode });
      return r.rows;
    },
    async save(sheet, row, passcode) {
      if (demo) {
        const rows = ls(sheet, SEED[sheet] || []);
        if (!row.id) row.id = uid();
        const i = rows.findIndex((r) => r.id === row.id);
        if (i >= 0) rows[i] = row; else rows.unshift(row);
        lsSet(sheet, rows);
        return row;
      }
      const r = await post({ action: "save", sheet, row, passcode });
      return r.row;
    },
    async remove(sheet, id, passcode) {
      if (demo) { lsSet(sheet, ls(sheet, SEED[sheet] || []).filter((r) => r.id !== id)); return true; }
      await post({ action: "delete", sheet, id, passcode });
      return true;
    }
  };

  window.APCApi = API;
})();
