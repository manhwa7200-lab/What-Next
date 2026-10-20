/* js/features/discover.js: Discover tab */
// ---------- Discover ----------
const GENRES = ["Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Hentai","Horror","Mahou Shoujo","Mecha","Music","Mystery","Psychological","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller"];
$("#dgenre").replaceChildren(...[["", "Any genre"], ...GENRES.map(g => [g, g])].map(([v, t]) => {
  const o = document.createElement("option"); o.value = v; o.textContent = t; return o;
}));

const dState = { type: "ANIME", adult: "ONLY", page: 1, mode: "browse" };
const DQ = `
query($page:Int,$type:MediaType,$sort:[MediaSort],$adult:Boolean,$genre:String,$genreIn:[String],$search:String,$statusNot:MediaStatus){
  Page(page:$page,perPage:20){
    pageInfo{hasNextPage}
    media(type:$type,sort:$sort,isAdult:$adult,genre:$genre,genre_in:$genreIn,search:$search,status_not:$statusNot){
      id siteUrl title{romaji english} coverImage{large} averageScore format episodes chapters genres seasonYear
    }
  }
}`;

function wireD(id, key){
  $(id).addEventListener("click", ev => {
    const b = ev.target.closest(".chip"); if(!b) return;
    $(id).querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === b)));
    dState[key] = b.dataset.v;
  });
}
wireD("#dtype", "type"); wireD("#dadult", "adult");

function itemCard(m, onList){
  const card = document.createElement("div"); card.className = "item"; card.onclick = ev => { if(!ev.target.closest("button,a")) openMedia(m.id); };
  const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = m.coverImage.large;
  const info = document.createElement("div");
  const h = document.createElement("h3"); h.textContent = m.title.english || m.title.romaji;
  const size = m.episodes ? m.episodes + " eps" : (m.chapters ? m.chapters + " ch" : "");
  const meta = document.createElement("p");
  meta.textContent = [(m.format || "").replace(/_/g, " "), m.seasonYear, size, m.averageScore ? "★ " + m.averageScore + "%" : ""].filter(Boolean).join(" · ");
  const gen = document.createElement("p"); gen.textContent = (m.genres || []).slice(0, 4).join(", ");
  const a = document.createElement("a"); a.href = m.siteUrl; a.target = "_blank"; a.rel = "noopener";
  a.textContent = onList ? "On your list. Open on AniList" : "Open on AniList";
  info.append(h, meta, gen, a);
  const acts = document.createElement("div");
  if(!onList){ const b = document.createElement("button"); b.className = "mini"; b.textContent = "+ Planning"; b.onclick = () => addPlanning(m.id, b, dState.type.toLowerCase()); acts.append(b); }
  const x = document.createElement("button"); x.className = "mini"; x.textContent = "Not interested";
  x.onclick = () => { hide.add(m.id); saveHide(); card.remove(); }; acts.append(x);
  info.append(acts);
  card.append(img, info);
  return card;
}

async function discover(append){
  if(dState.mode === "redis") return rediscover();
  const list = $("#dlist"), more = $("#dmore"), btn = $("#dgo");
  if(!append){
    dState.page = 1; more.hidden = true;
    const d = document.createElement("div"); d.className = "msg"; d.textContent = "Searching…";
    list.replaceChildren(d);
  }
  btn.disabled = true; more.disabled = true;
  try{
    const vars = { page: dState.page, type: dState.type, sort: [$("#dsort").value], statusNot: "NOT_YET_RELEASED" };
    if(dState.adult === "ONLY") vars.adult = true;
    if(dState.adult === "HIDE") vars.adult = false;
    const g = $("#dgenre").value; if(g) vars.genre = g;
    if(dState.mode === "foryou"){ const t = topGenres(); if(t.length) vars.genreIn = t; }
    const q = $("#dq").value.trim(); if(q) vars.search = q;
    const { json } = await gql(DQ, vars);
    if(json.errors && !json.data?.Page) throw new Error("AniList said: " + json.errors[0].message);
    const page = json.data.Page;
    if(!append) list.replaceChildren();
    const onList = new Set(state.items.map(e => e.media.id));
    page.media.filter(m => !hide.has(m.id) && !(dState.mode === "foryou" && onList.has(m.id))).forEach(m => list.append(itemCard(m, onList.has(m.id))));
    if(!list.children.length){
      const d = document.createElement("div"); d.className = "msg"; d.textContent = "No results. Try another genre or sort.";
      list.append(d);
    }
    more.hidden = !page.pageInfo.hasNextPage;
  }catch(err){
    const d = document.createElement("div"); d.className = "msg";
    d.textContent = err.message.includes("Failed to fetch") ? "Couldn't reach AniList. Check your connection and try again." : err.message;
    list.replaceChildren(d); more.hidden = true;
  }finally{ btn.disabled = false; more.disabled = false; }
}
$("#dgo").onclick = () => discover(false);
$("#dmore").onclick = () => { dState.page++; discover(true); };
$("#dq").addEventListener("keydown", e => { if(e.key === "Enter") discover(false); });
