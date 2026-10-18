/* js/features/schedule-stats.js: Schedule tab, Stats, daily goal */
// ---------- Round 2: schedule, stats, goal ----------
const el = (t, c, x) => { const n = document.createElement(t); if(c) n.className = c; if(x != null) n.textContent = x; return n; };
const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function days(){ try{ return JSON.parse(localStorage.getItem("wn_days") || "{}"); }catch(_){ return {}; } }
function goal(){ return Number(localStorage.getItem("wn_goal")) || 1; }
function bumpDay(n){ const d = days(), k = dayKey(); d[k] = (d[k] || 0) + n; try{ localStorage.setItem("wn_days", JSON.stringify(d)); }catch(_){} }
function streak(){
  const d = days(), g = goal(), c = new Date(); let n = 0;
  if((d[dayKey(c)] || 0) < g) c.setDate(c.getDate() - 1);
  while((d[dayKey(c)] || 0) >= g){ n++; c.setDate(c.getDate() - 1); }
  return n;
}
function fmtIn(secs){
  if(secs <= 0) return "now";
  const d = Math.floor(secs / 86400), h = Math.floor(secs % 86400 / 3600), m = Math.floor(secs % 3600 / 60);
  return d ? d + "d " + h + "h" : h ? h + "h " + m + "m" : m + "m";
}

function renderSchedule(){
  const box = $("#schedList"); box.replaceChildren();
  const rows = state.items.filter(e => e.media.nextAiringEpisode && e.media.nextAiringEpisode.airingAt && !hide.has(e.media.id))
    .sort((a, b) => a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt);
  if(!rows.length){
    box.append(el("div", "msg", "No airing anime on your list right now. If you just updated the app, log out and back in to fetch air times. AniList doesn't give manga chapter dates."));
    return;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let last = "";
  for(const e of rows){
    const x = e.media, n = x.nextAiringEpisode, at = new Date(n.airingAt * 1000);
    const dd = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()) - today) / 86400000);
    const label = dd <= 0 ? "Today" : dd === 1 ? "Tomorrow" : at.toLocaleDateString([], { weekday: "long" });
    if(label !== last){ box.append(el("div", "q", label)); last = label; }
    const card = el("div", "item");
    const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = x.coverImage.large;
    const info = el("div"); info.style.flex = "1"; info.style.minWidth = "0";
    const h = el("h3"), a = el("a", null, x.title.english || x.title.romaji); a.href = x.siteUrl; a.target = "_blank"; a.rel = "noopener"; h.append(a);
    info.append(h, el("p", null, "Episode " + n.episode + " · " + at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })));
    const waiting = n.episode - 1 - e.progress;
    if(e.status !== "PLANNING" && waiting > 0) info.append(el("p", null, waiting + " waiting for you"));
    card.onclick = ev => { if(!ev.target.closest("a")) openMedia(x.id); };
    card.append(img, info, el("div", "cd", fmtIn(n.airingAt - Date.now() / 1000)));
    box.append(card);
  }
}

async function renderStats(){
  const box = $("#statsBody"); box.replaceChildren();
  let mins = 0, titles = 0;
  for(const e of state.items){
    const x = e.media, anime = x.type === "ANIME";
    const total = anime ? (x.episodes || (x.nextAiringEpisode ? x.nextAiringEpisode.episode - 1 : 0)) : (x.chapters || 0);
    const left = total - e.progress;
    if(left > 0){ mins += left * (anime ? (x.duration || 24) : MIN_PER_CHAPTER); titles++; }
  }
  const tiles = el("div", "tiles");
  const mk = (big, small) => { const t = el("div", "tile"), b = el("b", null, big); t.append(b, el("span", null, small)); tiles.append(t); return b; };
  mk(Math.round(mins / 60).toLocaleString() + " h", "backlog"); mk(String(titles), "titles queued");
  const monthB = mk("…", "finished this month");
  box.append(tiles);

  const done = days()[dayKey()] || 0, goalN = goal();
  const gc = el("div", "card"), gq = el("div", "q", "Daily goal"); gq.style.marginTop = "0"; gc.append(gq);
  const gr = el("div", "goalrow"), ring = el("div", "ring");
  ring.style.setProperty("--p", Math.min(100, Math.round(done / goalN * 100))); ring.append(el("span", null, done + "/" + goalN));
  const txt = el("div"); txt.append(el("b", null, streak() + " day streak"), el("p", "sub", "Episodes or chapters you mark as done count here."));
  gr.append(ring, txt); gc.append(gr);
  const chips = el("div", "row"); chips.style.marginTop = "14px";
  for(const opt of [1, 2, 3, 5]){
    const b = el("button", "chip", opt + "/day"); b.setAttribute("aria-pressed", String(goalN === opt));
    b.onclick = () => { try{ localStorage.setItem("wn_goal", opt); }catch(_){} renderStats(); };
    chips.append(b);
  }
  gc.append(chips); box.append(gc);

  const c = new Map();
  for(const e of state.items) for(const gn of e.media.genres || []) c.set(gn, (c.get(gn) || 0) + 1);
  const topG = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5), total = state.items.length || 1;
  const gen = el("div", "card"), tq = el("div", "q", "Top genres"); tq.style.marginTop = "0"; gen.append(tq);
  for(const [name, n] of topG){
    const row = el("div", "bar"), tr = el("div", "tr"), fill = el("i"), pct = Math.round(n / total * 100);
    fill.style.width = pct + "%"; tr.append(fill);
    row.append(el("span", null, name), tr, el("em", null, pct + "%")); gen.append(row);
  }
  box.append(gen);

  try{
    const part = "{lists{entries{mediaId completedAt{year month}}}}";
    const { json } = await gql("query($u:String){a:MediaListCollection(userName:$u,type:ANIME,status:COMPLETED)" + part + " m:MediaListCollection(userName:$u,type:MANGA,status:COMPLETED)" + part + "}", { u: state.user });
    const now = new Date(), ids = new Set();
    for(const k of ["a", "m"]) for(const l of (json.data && json.data[k] && json.data[k].lists) || []) for(const en of l.entries){
      if(en.completedAt && en.completedAt.year === now.getFullYear() && en.completedAt.month === now.getMonth() + 1) ids.add(en.mediaId);
    }
    monthB.textContent = String(ids.size);
  }catch(_){ monthB.textContent = "–"; }
}
