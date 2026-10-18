/* js/features/trending.js: trending carousels */
// ----- Trending on the Pick screen -----
let trendAt = 0;
function trendCard(m){
  const c = el("button", "tcard"), top = el("div", "ttop"), bg = el("div", "tbg");
  bg.style.backgroundImage = "url(" + JSON.stringify(m.bannerImage || m.coverImage.extraLarge) + ")";
  const img = new Image(); img.alt = ""; img.loading = "lazy"; img.className = "tposter"; img.src = m.coverImage.extraLarge;
  const sub = m.type === "ANIME" ? ((m.studios.nodes[0] && m.studios.nodes[0].name) || "") : (m.staff.edges || []).map(x => x.node.name.full).join(", ");
  const stats = el("div", "tstats"); stats.append(el("span", null, "★ " + (m.averageScore || "–")), el("span", null, "♥ " + (m.favourites || 0).toLocaleString()));
  const info = el("div", "tinfo"); info.append(el("b", "tt2", tt(m)), el("span", "tsub", sub), stats);
  top.append(bg, img, info);
  const body = el("div", "tbody"), g = el("div", "gtags"); (m.genres || []).slice(0, 3).forEach(x => g.append(gtag(x)));
  body.append(g, el("p", "tdesc", clean(m.description)));
  c.append(top, body); c.onclick = () => openMedia(m.id); return c;
}
async function loadTrending(){
  if(!auth.token || Date.now() - trendAt < 600000) return;
  $("#trend").hidden = false;
  for(const [t, id] of [["ANIME", "#trendAnime"], ["MANGA", "#trendManga"]]){
    try{
      const { json } = await gql(TREND_Q, { t });
      $(id).replaceChildren(...((json.data && json.data.Page.media) || []).map(trendCard));
    }catch(_){ $(id).replaceChildren(el("div", "msg", "Couldn't load trending. Check your connection.")); return; }
  }
  trendAt = Date.now();
}
