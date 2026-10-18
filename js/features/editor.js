/* js/features/editor.js: list editor */
// ----- List editor -----
let LOPT = null;
async function listOptions(){
  if(LOPT) return LOPT;
  try{
    const { json } = await gql("query{Viewer{mediaListOptions{animeList{customLists} mangaList{customLists}}}}", {});
    const o = json.data.Viewer.mediaListOptions; LOPT = { anime: o.animeList.customLists || [], manga: o.mangaList.customLists || [] };
  }catch(_){ LOPT = { anime: [], manga: [] }; }
  return LOPT;
}
async function openEditor(m){
  const type = m.type === "ANIME" ? "anime" : "manga", total = type === "anime" ? m.episodes : m.chapters, lab = STATUS_LABEL(type);
  const opts = (await listOptions())[type], e = m.mediaListEntry;
  const d = { status: e ? e.status : "PLANNING", progress: e ? e.progress : 0, score: e ? (e.score || 0) / 10 : 0, repeat: e ? e.repeat || 0 : 0, notes: (e && e.notes) || "", priority: e ? e.priority || 0 : 0,
    priv: !!(e && e.private), start: dIn(e && e.startedAt), end: dIn(e && e.completedAt), lists: Object.keys((e && e.customLists) || {}).filter(k => e.customLists[k]) };
  let fav = !!m.isFavourite, armed = false;
  const box = $("#editor"); box.replaceChildren(); box.hidden = false; box.scrollTop = 0;
  const head = el("div", "sheethead"), back = el("button", "mini", "← Back"), heart = el("button", "mini", fav ? "♥ Favourite" : "♡ Favourite");
  back.onclick = () => { box.hidden = true; };
  heart.onclick = async () => {
    heart.disabled = true;
    try{
      const v = type === "anime" ? { a: m.id } : { m: m.id };
      const { json } = await gql("mutation($a:Int,$m:Int){ToggleFavourite(animeId:$a,mangaId:$m){anime{pageInfo{total}}}}", v);
      if(json.errors) throw new Error(json.errors[0].message);
      fav = !fav; heart.textContent = fav ? "♥ Favourite" : "♡ Favourite"; mcache.delete(m.id);
    }catch(_){}
    heart.disabled = false;
  };
  head.append(back, el("b", null, "List editor"), heart);
  const title = el("h2", "ph", tt(m)); title.style.margin = "16px 0 0";
  box.append(head, title);
  const sec = t => { const q = el("div", "q", t); box.append(q); };
  // status
  sec("Status");
  const seg = el("div", "seg"), segBtns = {};
  ["CURRENT", "PLANNING", "COMPLETED", "REPEATING", "PAUSED", "DROPPED"].forEach(s => { const b = el("button", "chip", lab[s]); b.onclick = () => setStatus(s); segBtns[s] = b; seg.append(b); });
  box.append(seg);
  // progress
  sec(type === "anime" ? "Episodes" : "Chapters");
  const stp = el("div", "stepper"), minus = el("button", "chip", "−"), plus = el("button", "chip", "+"), pin = el("input"), of = el("span", "sub", total ? "of " + total : "");
  pin.type = "number"; pin.min = "0"; pin.inputMode = "numeric";
  const ptrack = el("div", "ptrack"), pfill = el("i"); ptrack.append(pfill);
  stp.append(minus, pin, plus, of); box.append(stp, ptrack);
  // score
  sec("Score");
  const sv = el("div", "bigscore"), sl = el("input"); sl.type = "range"; sl.min = "0"; sl.max = "10"; sl.step = "0.5";
  box.append(sv, sl);
  // dates
  sec("Dates");
  const dates = el("div", "two"), mkDate = (label, key) => {
    const c = el("div", "datecell"), i = el("input"), l = el("span", "sub", label), t = el("button", "mini", "Today"), x = el("button", "mini", "Clear");
    i.type = "date"; i.oninput = () => { d[key] = i.value; }; t.onclick = () => { d[key] = dayKey(); sync(); }; x.onclick = () => { d[key] = ""; sync(); };
    c.append(l, i, t, x); dates.append(c); return i;
  };
  const startIn = mkDate("Started", "start"), endIn = mkDate("Finished", "end");
  box.append(dates);
  // rewatches, priority, private
  sec(type === "anime" ? "Total rewatches" : "Total rereads");
  const rs = el("div", "stepper"), rm = el("button", "chip", "−"), rp = el("button", "chip", "+"), rv = el("b", null, "0");
  rm.onclick = () => { d.repeat = Math.max(0, d.repeat - 1); sync(); }; rp.onclick = () => { d.repeat++; sync(); };
  rs.append(rm, rv, rp); box.append(rs);
  sec("Priority");
  const pr = el("div", "seg"), prBtns = [];
  [["None", 0], ["Low", 1], ["Medium", 3], ["High", 5]].forEach(([n, v]) => { const b = el("button", "chip", n); b.onclick = () => { d.priority = v; sync(); }; prBtns.push([b, v]); pr.append(b); });
  box.append(pr);
  const pv = el("label", "chk"), pvi = el("input"); pvi.type = "checkbox"; pvi.onchange = () => { d.priv = pvi.checked; };
  pv.style.marginTop = "18px"; pv.append(pvi, " Private (hide from my public profile)"); box.append(pv);
  // custom lists
  if(opts.length){
    sec("Custom lists");
    const cl = el("div", "seg");
    opts.forEach(n => { const b = el("button", "chip", n); b.dataset.n = n; b.onclick = () => { const i = d.lists.indexOf(n); if(i >= 0) d.lists.splice(i, 1); else d.lists.push(n); sync(); }; cl.append(b); });
    box.append(cl);
  }
  // notes
  sec("Notes");
  const notes = el("textarea"); notes.rows = 3; notes.placeholder = "Write a note"; notes.oninput = () => { d.notes = notes.value; };
  box.append(notes);
  // bar
  const bar = el("div", "sheetbar"), save = el("button", "go", e ? "Save" : "Add to list");
  if(e){ var rmv = el("button", "go alt", "Remove"); bar.append(rmv); }
  bar.append(save); box.append(bar);

  function sync(){
    for(const s in segBtns) segBtns[s].setAttribute("aria-pressed", String(d.status === s));
    pin.value = d.progress; pfill.style.width = total ? Math.min(100, Math.round(d.progress / total * 100)) + "%" : "0%";
    sv.textContent = d.score ? "★ " + d.score : "No score"; sl.value = d.score;
    startIn.value = d.start; endIn.value = d.end; rv.textContent = d.repeat;
    prBtns.forEach(([b, v]) => b.setAttribute("aria-pressed", String(d.priority === v)));
    pvi.checked = d.priv; notes.value = d.notes;
    box.querySelectorAll("[data-n]").forEach(b => b.setAttribute("aria-pressed", String(d.lists.includes(b.dataset.n))));
  }
  function setStatus(s){
    d.status = s;
    if(s === "COMPLETED"){ if(total) d.progress = total; if(!d.end) d.end = dayKey(); }
    if((s === "CURRENT" || s === "REPEATING") && !d.start) d.start = dayKey();
    sync();
  }
  function setProg(n){
    d.progress = Math.max(0, Math.min(total || 99999, Math.round(n) || 0));
    if(d.progress > 0 && d.status === "PLANNING"){ d.status = "CURRENT"; if(!d.start) d.start = dayKey(); }
    if(total && d.progress >= total && d.status !== "COMPLETED" && d.status !== "REPEATING"){ d.status = "COMPLETED"; if(!d.end) d.end = dayKey(); }
    sync();
  }
  minus.onclick = () => setProg(d.progress - 1); plus.onclick = () => setProg(d.progress + 1);
  pin.onchange = () => setProg(+pin.value);
  sl.oninput = () => { d.score = +sl.value; sv.textContent = d.score ? "★ " + d.score : "No score"; };
  sync();
  const done = () => { box.hidden = true; mcache.delete(m.id); lists.anime.entries = lists.manga.entries = null; if(mstack.length) showMedia(mstack[mstack.length - 1]); };
  save.onclick = async () => {
    save.disabled = true; save.textContent = "Saving…";
    try{
      const vars = { mediaId: m.id, status: d.status, scoreRaw: Math.round(d.score * 10), progress: d.progress, repeat: d.repeat, notes: d.notes, priority: d.priority, private: d.priv, startedAt: dOut(d.start), completedAt: dOut(d.end), customLists: d.lists };
      const { json } = await gql(SAVE_FULL, vars);
      if(json.errors) throw new Error(json.errors[0].message);
      done();
    }catch(err){ save.disabled = false; save.textContent = "Couldn't save: " + err.message; }
  };
  if(rmv) rmv.onclick = async () => {
    if(!armed){ armed = true; rmv.textContent = "Tap again to remove"; return; }
    rmv.disabled = true;
    try{
      const { json } = await gql("mutation($id:Int){DeleteMediaListEntry(id:$id){deleted}}", { id: e.id });
      if(json.errors) throw new Error(json.errors[0].message);
      done();
    }catch(err){ rmv.disabled = false; rmv.textContent = "Couldn't remove: " + err.message; }
  };
}
