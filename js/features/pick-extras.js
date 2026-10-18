/* js/features/pick-extras.js: hide list, rate and sequels, for-you, lineup, surprise */
// ---------- Round 1 helpers ----------
const hide = new Set();
try{ JSON.parse(localStorage.getItem("wn_hide") || "[]").forEach(x => hide.add(x)); }catch(_){}
const saveHide = () => { try{ localStorage.setItem("wn_hide", JSON.stringify([...hide])); }catch(_){} };
const SAVE = "mutation($id:Int,$s:MediaListStatus,$r:Int){SaveMediaListEntry(mediaId:$id,status:$s,scoreRaw:$r){id}}";

async function addPlanning(id, btn){
  btn.disabled = true; btn.textContent = "Adding…";
  try{
    const { json } = await gql(SAVE, { id, s: "PLANNING" });
    if(json.errors) throw new Error(json.errors[0].message);
    btn.textContent = "Added to Planning";
  }catch(err){ btn.disabled = false; btn.textContent = "Couldn't add: " + err.message; }
}

async function afterFinish(e){
  const title = e.media.title.english || e.media.title.romaji;
  const box = $("#result"); box.replaceChildren();
  const note = document.createElement("div"); note.className = "msg"; note.textContent = "Finished " + title + "! How would you rate it?";
  const row = document.createElement("div"); row.className = "row"; row.style.marginTop = "10px";
  for(let n = 1; n <= 10; n++){
    const b = document.createElement("button"); b.className = "chip"; b.style.minWidth = "52px"; b.textContent = n;
    b.onclick = async () => {
      row.querySelectorAll("button").forEach(x => x.disabled = true);
      try{
        const { json } = await gql(SAVE, { id: e.media.id, r: n * 10 });
        if(json.errors) throw new Error(json.errors[0].message);
        note.textContent = "Saved: " + title + " rated " + n + "/10."; row.remove();
      }catch(err){ note.textContent = "Couldn't save rating: " + err.message; row.querySelectorAll("button").forEach(x => x.disabled = false); }
    };
    row.append(b);
  }
  const next = document.createElement("button"); next.className = "go alt"; next.textContent = "Next pick"; next.onclick = () => pick();
  box.append(note, row, next);
  try{
    const { json } = await gql("query($id:Int){Media(id:$id){relations{edges{relationType node{id siteUrl title{romaji english}}}}}}", { id: e.media.id });
    const seq = ((json.data && json.data.Media && json.data.Media.relations.edges) || []).filter(x => x.relationType === "SEQUEL");
    const onList = new Set(state.items.map(i => i.media.id));
    if(seq.length){
      const h = document.createElement("p"); h.className = "q"; h.textContent = "Next up"; box.insertBefore(h, next);
      seq.forEach(x => {
        const n = x.node, d = document.createElement("div"); d.className = "msg"; d.style.marginTop = "8px";
        const a = document.createElement("a"); a.href = n.siteUrl; a.target = "_blank"; a.rel = "noopener"; a.textContent = n.title.english || n.title.romaji; d.append(a);
        if(!onList.has(n.id)){ const b = document.createElement("button"); b.className = "mini"; b.textContent = "+ Planning"; b.onclick = () => addPlanning(n.id, b); d.append(document.createElement("br"), b); }
        box.insertBefore(d, next);
      });
    }
  }catch(_){}
}

function topGenres(){
  const c = new Map();
  for(const e of state.items) for(const g of e.media.genres || []) c.set(g, (c.get(g) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
}

async function rediscover(){
  const list = $("#dlist"); $("#dmore").hidden = true;
  const d = document.createElement("div"); d.className = "msg"; d.textContent = "Checking your paused and dropped titles…"; list.replaceChildren(d);
  try{
    const part = "{lists{entries{score(format:POINT_100) media{...M}}}}";
    const { json } = await gql("query($u:String){a:MediaListCollection(userName:$u,type:ANIME,status_in:[PAUSED,DROPPED])" + part + " m:MediaListCollection(userName:$u,type:MANGA,status_in:[PAUSED,DROPPED])" + part + "} fragment M on Media{id siteUrl title{romaji english} coverImage{large} averageScore format episodes chapters genres seasonYear}", { u: state.user });
    if(json.errors && !json.data) throw new Error("AniList said: " + json.errors[0].message);
    const seen = new Map();
    for(const k of ["a", "m"]) for(const l of (json.data[k] && json.data[k].lists) || []) for(const en of l.entries){
      if(!hide.has(en.media.id) && !seen.has(en.media.id)) seen.set(en.media.id, { m: en.media, s: en.score || en.media.averageScore || 0 });
    }
    const rows = [...seen.values()].sort((a, b) => b.s - a.s).slice(0, 20);
    list.replaceChildren(...(rows.length ? rows.map(r => itemCard(r.m, true)) : [Object.assign(document.createElement("div"), { className: "msg", textContent: "Nothing paused or dropped on your list." })]));
  }catch(err){
    const e2 = document.createElement("div"); e2.className = "msg"; e2.textContent = err.message; list.replaceChildren(e2);
  }
}

$("#dmode").addEventListener("click", ev => {
  const b = ev.target.closest(".chip"); if(!b) return;
  $("#dmode").querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === b)));
  dState.mode = b.dataset.v; discover(false);
});
$("#spinBtn").onclick = () => { state.skipped.clear(); pick(true); };
$("#lineupBtn").onclick = lineup;
$("#hideClear").onclick = () => { hide.clear(); saveHide(); $("#hideCount").textContent = "No hidden titles."; };

function filtSum(){
  const t = { 15: "15 min", 30: "30 min", 60: "1 hour", 120: "2 hours" }[state.time];
  $("#filtSum").textContent = "Filters · " + t + " · " + ({ ANIME: "Watch", MANGA: "Read", BOTH: "Either" })[state.kind] +
    (state.genre !== "ALL" ? " · " + state.genre : "") + (state.adult !== "ALL" ? " · " + (state.adult === "ONLY" ? "18+ only" : "No 18+") : "");
}
["#kinds", "#times", "#genres", "#adult"].forEach(id => $(id).addEventListener("click", filtSum));
filtSum();
