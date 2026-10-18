/* js/features/lists.js: Anime and Manga lists, filter and customise sheets */
// ---------- AniList collection reader (handles AniList's 500-entry chunks) ----------
const ENTRY_F = "status progress media{id type isAdult siteUrl title{romaji english} coverImage{extraLarge large} episodes chapters duration averageScore genres nextAiringEpisode{episode airingAt}}";
async function collection(user, type, filter, fields){
  const out = []; let chunk = 1, more = true;
  while(more){
    const q = "query($u:String,$t:MediaType,$c:Int){MediaListCollection(userName:$u,type:$t,chunk:$c,perChunk:500" + (filter ? "," + filter : "") + "){hasNextChunk lists{entries{" + fields + "}}}}";
    const { res, json } = await gql(q, { u: user, t: type, c: chunk });
    const col = json.data && json.data.MediaListCollection;
    if(!col) throw new Error(res.status === 404 ? "User not found. Check the spelling of your username." : "AniList said: " + ((json.errors && json.errors[0].message) || "no data"));
    for(const l of col.lists || []) out.push(...l.entries);
    more = col.hasNextChunk; chunk++;
    if(more) await sleep(700);
  }
  return out;
}

// ---------- Anime and manga lists ----------
const STATUS_LABEL = t => ({ CURRENT: t === "anime" ? "Watching" : "Reading", PLANNING: "Planning", COMPLETED: "Completed", PAUSED: "Paused", DROPPED: "Dropped", REPEATING: t === "anime" ? "Rewatching" : "Rereading" });
const STATUS_ORDER = ["CURRENT", "REPEATING", "PLANNING", "PAUSED", "COMPLETED", "DROPPED"];
const LIST_F = "mediaId status progress score(format:POINT_100) updatedAt media{id siteUrl title{romaji english} coverImage{large} format status episodes chapters averageScore popularity genres countryOfOrigin startDate{year}}";
const FORMATS = { anime: ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"], manga: ["MANGA", "NOVEL", "ONE_SHOT"] };
const LS = (k, d) => { try{ return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || "{}")); }catch(_){ return Object.assign({}, d); } };
const LSset = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
const defFilter = () => ({ sort: "UPDATED", format: "", mstatus: "", country: "", yFrom: "", yTo: "", cMin: "", cMax: "", score: "", gi: [], ge: [] });
const ly = LS("wn_ly", { layout: "grid", cols: 3, hideUnscored: false, hideProgress: false });
const fstore = LS("wn_lf", { persist: false, anime: null, manga: null });
const lf = { anime: (fstore.persist && fstore.anime) || defFilter(), manga: (fstore.persist && fstore.manga) || defFilter() };
const lists = { anime: { entries: null, status: "ALL", q: "", shown: 60 }, manga: { entries: null, status: "ALL", q: "", shown: 60 } };
let curType = "anime";
const tt = m => { const t = m.title, p = localStorage.getItem("wn_tlang") || "ENGLISH"; return (p === "ROMAJI" ? t.romaji : p === "NATIVE" ? (t.native || t.romaji) : t.english) || t.english || t.romaji || "Untitled"; };
const yearOf = m => (m.startDate && m.startDate.year) || 0;
const SORTS = {
  UPDATED: (a, b) => b.updatedAt - a.updatedAt, TITLE: (a, b) => tt(a.m).localeCompare(tt(b.m)), SCORE: (a, b) => b.score - a.score,
  PROGRESS: (a, b) => b.progress - a.progress, AVG: (a, b) => (b.m.averageScore || 0) - (a.m.averageScore || 0),
  POP: (a, b) => (b.m.popularity || 0) - (a.m.popularity || 0), YEAR: (a, b) => yearOf(b.m) - yearOf(a.m)
};

async function openList(type){
  curType = type; const L = lists[type];
  $("#listTitle").textContent = type === "anime" ? "Anime List" : "Manga List";
  $("#listSearch").value = L.q;
  if(!L.entries){
    $("#listBody").className = ""; $("#listBody").replaceChildren(el("div", "msg", "Loading your " + type + " list…"));
    $("#listStatus").replaceChildren(); $("#listMore").hidden = true;
    try{
      const raw = await collection(state.user, type.toUpperCase(), "", LIST_F), seen = new Map();
      for(const e of raw){ if(!seen.has(e.mediaId)) seen.set(e.mediaId, { id: e.mediaId, status: e.status, progress: e.progress || 0, score: e.score || 0, updatedAt: e.updatedAt || 0, m: e.media }); }
      L.entries = [...seen.values()];
    }catch(err){ $("#listBody").replaceChildren(el("div", "msg", err.message.includes("Failed to fetch") ? "Couldn't reach AniList. Check your connection." : err.message)); return; }
  }
  if(curType === type) renderList();
}
function passes(e, f, type){
  const m = e.m;
  if(f.format && m.format !== f.format) return false;
  if(f.mstatus && m.status !== f.mstatus) return false;
  if(f.country && m.countryOfOrigin !== f.country) return false;
  const y = yearOf(m), n = type === "anime" ? m.episodes : m.chapters, g = m.genres || [];
  if(f.yFrom && !(y >= +f.yFrom)) return false;
  if(f.yTo && !(y && y <= +f.yTo)) return false;
  if(f.cMin && !(n >= +f.cMin)) return false;
  if(f.cMax && !(n && n <= +f.cMax)) return false;
  if(f.score && !(m.averageScore >= +f.score)) return false;
  if(f.gi.some(x => !g.includes(x))) return false;
  if(f.ge.some(x => g.includes(x))) return false;
  return true;
}
function renderList(){
  const type = curType, L = lists[type], f = lf[type], lab = STATUS_LABEL(type);
  if(!L.entries) return;
  const q = L.q.trim().toLowerCase();
  const rows = L.entries.filter(e => passes(e, f, type) && (!q || (tt(e.m) + " " + (e.m.title.romaji || "")).toLowerCase().includes(q)));
  const counts = {}; rows.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
  if(L.status !== "ALL" && !counts[L.status]) L.status = "ALL";
  const chips = $("#listStatus"); chips.replaceChildren();
  for(const s of ["ALL", ...STATUS_ORDER.filter(x => counts[x])]){
    const b = el("button", "chip", (s === "ALL" ? "All" : lab[s]) + " " + (s === "ALL" ? rows.length : counts[s]));
    b.setAttribute("aria-pressed", String(L.status === s)); b.onclick = () => { L.status = s; L.shown = 60; renderList(); }; chips.append(b);
  }
  const view = (L.status === "ALL" ? rows : rows.filter(e => e.status === L.status)).slice();
  view.sort(L.status === "ALL" && f.sort === "UPDATED" ? (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.updatedAt - a.updatedAt : (SORTS[f.sort] || SORTS.UPDATED));
  $("#listCount").textContent = (L.status === "ALL" ? "All" : lab[L.status]) + " (" + view.length + ")";
  const body = $("#listBody");
  body.className = ly.layout === "rows" ? "lrows" : "lgrid c" + ly.cols;
  body.replaceChildren(...(view.length ? view.slice(0, L.shown).map(e => lcard(e, type)) : [el("div", "msg", "Nothing matches. Try changing the filter.")]));
  $("#listMore").hidden = view.length <= L.shown;
}
function lcard(e, type){
  const m = e.m, card = el("button", "lcard"), total = type === "anime" ? m.episodes : m.chapters;
  const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = m.coverImage.large;
  const info = el("div", "li"), meta = el("div", "lm");
  info.append(el("div", "lt", tt(m)));
  if(!(ly.hideUnscored && !e.score)) meta.append(el("span", "sc", "★ " + e.score));
  if(!ly.hideProgress) meta.append(el("span", null, e.progress + " / " + (total || "?")));
  info.append(meta); card.append(img, info); card.onclick = () => openMedia(m.id);
  return card;
}
function quickView(e, type){
  const m = e.m, box = $("#qvBox"), total = type === "anime" ? m.episodes : m.chapters, lab = STATUS_LABEL(type);
  box.replaceChildren();
  const top = el("div", "qvtop"), img = new Image(); img.alt = ""; img.src = m.coverImage.large;
  const info = el("div");
  info.append(el("h3", null, tt(m)), el("p", "sub", (lab[e.status] || e.status) + " · " + (m.format || "").replace(/_/g, " ")), el("p", "sub", "★ " + (e.score || "–") + "  ·  Average " + (m.averageScore || "–")));
  top.append(img, info); box.append(top);
  const prog = el("div", "qvprog"), minus = el("button", "chip", "−1"), plus = el("button", "chip", "+1"), label = el("b", null, e.progress + " / " + (total || "?"));
  const setP = async p => {
    if(p < 0 || (total && p > total)) return;
    minus.disabled = plus.disabled = true;
    try{
      const vars = { id: m.id, p };
      if(total && p >= total) vars.s = "COMPLETED"; else if(e.status === "PLANNING") vars.s = "CURRENT";
      const { json } = await gql("mutation($id:Int,$p:Int,$s:MediaListStatus){SaveMediaListEntry(mediaId:$id,progress:$p,status:$s){progress status}}", vars);
      if(json.errors) throw new Error(json.errors[0].message);
      const r = json.data.SaveMediaListEntry; e.progress = r.progress; e.status = r.status;
      label.textContent = e.progress + " / " + (total || "?"); renderList();
    }catch(err){ label.textContent = "Couldn't save: " + err.message; }
    minus.disabled = plus.disabled = false;
  };
  minus.onclick = () => setP(e.progress - 1); plus.onclick = () => setP(e.progress + 1);
  prog.append(minus, label, plus);
  const a = el("a", "link", "Open on AniList"); a.href = m.siteUrl; a.target = "_blank"; a.rel = "noopener";
  const close = el("button", "go alt", "Close"); close.onclick = () => { $("#qv").hidden = true; };
  box.append(prog, a, close); $("#qv").hidden = false;
}
$("#qv").addEventListener("click", ev => { if(ev.target.id === "qv") $("#qv").hidden = true; });
$("#listMore").onclick = () => { lists[curType].shown += 60; renderList(); };
$("#lSearchBtn").onclick = () => {
  const i = $("#listSearch"); i.hidden = !i.hidden;
  if(i.hidden){ i.value = ""; lists[curType].q = ""; renderList(); } else i.focus();
};
$("#listSearch").oninput = ev => { lists[curType].q = ev.target.value; lists[curType].shown = 60; renderList(); };

// Filter sheet
function setTri(b, s){ b.dataset.s = s; b.setAttribute("aria-pressed", String(s === 1)); b.classList.toggle("ex", s === 2); b.textContent = (s === 1 ? "+ " : s === 2 ? "− " : "") + b.dataset.n; }
function openFilter(){
  const f = lf[curType];
  $("#fsPersist").checked = !!fstore.persist; $("#fsSort").value = f.sort;
  const opts = [["", "Any"], ...FORMATS[curType].map(x => [x, x.replace(/_/g, " ")])];
  $("#fsFormat").replaceChildren(...opts.map(([v, t]) => Object.assign(document.createElement("option"), { value: v, textContent: t })));
  $("#fsFormat").value = f.format; $("#fsStatus").value = f.mstatus; $("#fsCountry").value = f.country;
  $("#fsYFrom").value = f.yFrom; $("#fsYTo").value = f.yTo; $("#fsCMin").value = f.cMin; $("#fsCMax").value = f.cMax; $("#fsScore").value = f.score;
  $("#fsCountLabel").textContent = curType === "anime" ? "Episodes" : "Chapters";
  $("#fsGenres").replaceChildren(...GENRES.map(n => {
    const b = el("button", "chip"); b.dataset.n = n; b.style.flex = "0 0 auto"; b.style.minWidth = "0";
    setTri(b, f.gi.includes(n) ? 1 : f.ge.includes(n) ? 2 : 0); b.onclick = () => setTri(b, (+b.dataset.s + 1) % 3); return b;
  }));
  $("#fsheet").hidden = false; $("#fsheet").scrollTop = 0;
}
$("#lFilterBtn").onclick = openFilter;
$("#fsBack").onclick = () => { $("#fsheet").hidden = true; };
$("#fsReset").onclick = () => { lf[curType] = defFilter(); openFilter(); };
$("#fsApply").onclick = () => {
  const f = { sort: $("#fsSort").value, format: $("#fsFormat").value, mstatus: $("#fsStatus").value, country: $("#fsCountry").value,
    yFrom: $("#fsYFrom").value.trim(), yTo: $("#fsYTo").value.trim(), cMin: $("#fsCMin").value.trim(), cMax: $("#fsCMax").value.trim(), score: $("#fsScore").value.trim(), gi: [], ge: [] };
  document.querySelectorAll("#fsGenres .chip").forEach(b => { if(b.dataset.s === "1") f.gi.push(b.dataset.n); if(b.dataset.s === "2") f.ge.push(b.dataset.n); });
  lf[curType] = f; fstore.persist = $("#fsPersist").checked; fstore.anime = lf.anime; fstore.manga = lf.manga; LSset("wn_lf", fstore);
  lists[curType].shown = 60; $("#fsheet").hidden = true; renderList();
};

// Customise sheet
const chipSet = (id, v) => document.querySelectorAll(id + " .chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.v === v)));
function saveLy(){ LSset("wn_ly", ly); renderList(); }
function openCust(){ chipSet("#csLayout", ly.layout); chipSet("#csCols", String(ly.cols)); $("#csHideUnscored").checked = ly.hideUnscored; $("#csHideProgress").checked = ly.hideProgress; $("#csheet").hidden = false; }
$("#lCustBtn").onclick = openCust; $("#custOpen").onclick = openCust;
$("#csBack").onclick = () => { $("#csheet").hidden = true; };
$("#csLayout").addEventListener("click", ev => { const b = ev.target.closest(".chip"); if(b){ ly.layout = b.dataset.v; chipSet("#csLayout", ly.layout); saveLy(); } });
$("#csCols").addEventListener("click", ev => { const b = ev.target.closest(".chip"); if(b){ ly.cols = +b.dataset.v; chipSet("#csCols", String(ly.cols)); saveLy(); } });
$("#csHideUnscored").onchange = ev => { ly.hideUnscored = ev.target.checked; saveLy(); };
$("#csHideProgress").onchange = ev => { ly.hideProgress = ev.target.checked; saveLy(); };
