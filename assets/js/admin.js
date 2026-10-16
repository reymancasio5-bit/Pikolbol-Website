/* ==========================================================
   Owner admin — create / edit / delete schedule + announcements
   ========================================================== */
(function () {
  const API = window.APCApi, U = window.APCUtil, $ = U.$, $$ = U.$$, esc = window.esc;
  let pass = sessionStorage.getItem("apc_pass") || "", tab = "schedule", rows = [];

  const SEL = {
    type: ["Weekly", "One-time"], day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    level: ["All Levels", "Beginner", "Intermediate", "Advanced"], status: ["Open", "Full", "Cancelled", "Hidden"],
    category: ["News", "Event", "Reminder", "Beginners", "Update", "Other"], astatus: ["Published", "Draft"]
  };
  const F = {
    schedule: [
      ["title", "Session title", "text", true], ["type", "Type", "select:type"], ["day", "Day (weekly)", "select:day"], ["date", "Date (one-time)", "date"],
      ["start", "Start time", "time", true], ["end", "End time", "time"], ["level", "Level", "select:level"], ["location", "Location / courts", "text"],
      ["slots", "Slots", "number"], ["fee", "Fee", "text"], ["status", "Status", "select:status"], ["notes", "Notes", "textarea"]
    ],
    announcements: [
      ["title", "Title", "text", true], ["category", "Category", "select:category"], ["date", "Date", "date", true], ["status", "Status", "select:astatus"],
      ["pinned", "Pin to top", "check"], ["body", "Message", "textarea", true]
    ]
  };
  const COLS = {
    schedule: [["When", (r) => r.type === "One-time" ? esc(U.fmtDate(r.date)) : esc(r.day)], ["Time", (r) => esc(U.fmtTime(r.start) + (r.end ? " – " + U.fmtTime(r.end) : ""))], ["Title", (r) => `<b>${esc(r.title)}</b>`], ["Level", (r) => esc(r.level)], ["Slots", (r) => esc(r.slots)], ["Status", (r) => `<span class="tag ${r.status === "Open" ? "" : "red"}">${esc(r.status)}</span>`]],
    announcements: [["Date", (r) => esc(U.fmtDate(r.date))], ["Title", (r) => `<b>${r.pinned ? '<i class="fa-solid fa-thumbtack pin"></i> ' : ""}${esc(r.title)}</b>`], ["Category", (r) => esc(r.category)], ["Status", (r) => `<span class="tag ${r.status === "Published" ? "" : "o"}">${esc(r.status)}</span>`]],
    reservations: [["Received", (r) => esc((r.createdAt || "").slice(0, 10))], ["Session", (r) => `<b>${esc(r.session)}</b>`], ["Date", (r) => esc(r.date)], ["Name", (r) => esc(r.name)], ["Phone", (r) => `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`], ["Players", (r) => esc(r.players)], ["Level", (r) => esc(r.level)], ["Notes", (r) => esc(r.notes)]],
    messages: [["Received", (r) => esc((r.createdAt || "").slice(0, 10))], ["Name", (r) => `<b>${esc(r.name)}</b>`], ["Contact", (r) => esc(r.email) + (r.phone ? "<br>" + esc(r.phone) : "")], ["Topic", (r) => esc(r.topic)], ["Message", (r) => `<div style="max-width:380px;white-space:pre-line">${esc(r.message)}</div>`]]
  };

  function toast(msg, err) { const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = "toast"), 2600); }
  const editable = () => tab === "schedule" || tab === "announcements";

  async function load() {
    $("#tbody").innerHTML = `<tr><td colspan="9" style="color:var(--muted)">Loading…</td></tr>`;
    try { rows = await API.adminList(tab, pass); } catch (e) { toast(e.message || "Could not load", true); rows = []; }
    draw();
  }
  function draw() {
    const cols = COLS[tab];
    $("#thead").innerHTML = `<tr>${cols.map((c) => `<th>${c[0]}</th>`).join("")}<th></th></tr>`;
    $("#newBtn").style.display = editable() ? "" : "none";
    $("#adminEmpty").hidden = rows.length > 0;
    $("#tbody").innerHTML = rows.map((r) => `<tr>${cols.map((c) => `<td>${c[1](r)}</td>`).join("")}<td><div class="acts">
      ${editable() ? `<button class="icon-btn" data-edit="${esc(r.id)}" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>` : ""}
      <button class="icon-btn del" data-del="${esc(r.id)}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("");
  }

  /* ----- modal form ----- */
  const editDialog = window.APCUI.modal("editModal");
  const openM = editDialog.open, closeM = editDialog.close;

  function openEdit(row) {
    const isNew = !row; row = row || (tab === "schedule" ? { type: "Weekly", day: "Monday", level: "All Levels", status: "Open", slots: 16, start: "18:00", end: "20:00" } : { category: "News", status: "Published", date: new Date().toISOString().slice(0, 10) });
    $("#editTitle").textContent = (isNew ? "New " : "Edit ") + (tab === "schedule" ? "session" : "announcement");
    const f = $("#editForm");
    f.innerHTML = F[tab].map(([k, label, kind, req]) => {
      const v = row[k] == null ? "" : row[k];
      if (kind.startsWith("select:")) return `<label data-f="${k}">${label}<select name="${k}">${SEL[kind.slice(7)].map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
      if (kind === "textarea") return `<label data-f="${k}">${label}<textarea name="${k}" ${req ? "required" : ""}>${esc(v)}</textarea></label>`;
      if (kind === "check") return `<label data-f="${k}" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="${k}" style="width:auto" ${v ? "checked" : ""}> ${label}</label>`;
      return `<label data-f="${k}">${label}<input type="${kind}" name="${k}" value="${esc(v)}" ${req ? "required" : ""}></label>`;
    }).join("") + `<div class="note" id="eNote"></div><button class="btn" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>`;
    f.dataset.id = row.id || "";
    const sync = () => { if (tab !== "schedule") return; const one = f.type.value === "One-time"; f.querySelector('[data-f="day"]').style.display = one ? "none" : ""; f.querySelector('[data-f="date"]').style.display = one ? "" : "none"; };
    if (tab === "schedule") { f.type.addEventListener("change", sync); sync(); }
    openM();
  }
  $("#editForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target, row = {}; if (!f.reportValidity()) return; if (f.dataset.id) row.id = f.dataset.id;
    F[tab].forEach(([k, , kind]) => { const el = f.elements[k]; row[k] = kind === "check" ? (el.checked ? "yes" : "") : el.value.trim(); });
    if (tab === "schedule") { if (row.type === "One-time") { row.day = ""; if (!row.date) return alert("Please pick a date."); } else row.date = ""; }
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    try { await API.save(tab, row, pass); toast("Saved!"); closeM(); await load(); } catch (err) { $("#eNote").className = "note show err"; $("#eNote").textContent = err.message || "Could not save"; }
    btn.disabled = false;
  });

  /* ----- events ----- */
  $("#tbody").addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (ed) openEdit(rows.find((r) => r.id === ed.dataset.edit));
    if (del && confirm("Delete this item? This cannot be undone.")) { try { await API.remove(tab, del.dataset.del, pass); toast("Deleted"); load(); } catch (err) { toast(err.message, true); } }
  });
  $("#newBtn").addEventListener("click", () => openEdit(null));
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab; $$("#tabs .chip").forEach((x) => x.classList.toggle("on", x === b)); load(); });
  $("#logout").addEventListener("click", () => { sessionStorage.removeItem("apc_pass"); pass = ""; $("#panel").hidden = true; $("#login").hidden = false; });

  async function enter(p) {
    await API.login(p); pass = p; sessionStorage.setItem("apc_pass", p);
    $("#login").hidden = true; $("#panel").hidden = false; load();
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const n = $("#loginNote"), b = e.target.querySelector("button"); b.disabled = true;
    try { await enter(e.target.pass.value); } catch (err) { n.className = "note show err"; n.textContent = "Wrong passcode or connection problem."; }
    b.disabled = false;
  });
  if (pass) enter(pass).catch(() => { sessionStorage.removeItem("apc_pass"); });
})();
