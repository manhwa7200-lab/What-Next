/* js/features/profile.js: Profile screen (banner, avatar, counts, AniList stats, bio) */
// ---------- Profile ----------
let profLoaded = false;
const PROFILE_COLORS = { blue: "#3db4f2", purple: "#c063ff", pink: "#fc9dd6", orange: "#ef881a", red: "#e13333", green: "#4cca51", gray: "#677b94" };
const PROFILE_KEY = "wn_profile";
const fmtN = n => (n == null ? "–" : Number(n).toLocaleString());
const fmtMean = n => (n ? Number(n).toFixed(2) : "–");
const safeUrl = u => (/^https:\/\//.test(u || "") ? u : "");

// AniList bios are markdown with embedded media; keep just the readable text.
function cleanAbout(t){
  return clean(String(t || "")
    .replace(/~!([\s\S]*?)!~/g, "")                              // spoilers
    .replace(/\b(?:img|webm|youtube)\d*%?\s*\([^)]*\)/gi, "")    // embedded images and videos
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")                     // [text](link) -> text
    .replace(/^#{1,6}\s*/gm, "").replace(/__|\*\*|~~/g, ""))
    .replace(/\n{3,}/g, "\n\n").trim();
}

function paintProfile(d){
  const v = d.v, st = v.statistics || {}, a = st.anime || {}, m = st.manga || {};
  $("#profName").textContent = v.name || state.user || "";
  const col = v.options && v.options.profileColor, hex = PROFILE_COLORS[col] || (/^#[0-9a-f]{3,8}$/i.test(col || "") ? col : PROFILE_COLORS.blue);
  $("#profile .pcard").style.setProperty("--pc", hex);
  const banner = safeUrl(v.bannerImage), bn = $("#profBanner");
  bn.style.backgroundImage = banner ? "url(" + JSON.stringify(banner) + ")" : "";
  const av = safeUrl(v.avatar && v.avatar.large);
  if(av){ $("#profAvatar").src = av; $("#profAvatar").hidden = false; }
  $("#profLink").href = safeUrl(v.siteUrl) || "https://anilist.co/user/" + encodeURIComponent(v.name || state.user || "");
  $("#pcAnime").textContent = fmtN(a.count); $("#pcManga").textContent = fmtN(m.count);
  $("#pcFollowing").textContent = fmtN(d.following); $("#pcFollowers").textContent = fmtN(d.followers);
  $("#paEps").textContent = fmtN(a.episodesWatched); $("#paDays").textContent = a.minutesWatched != null ? (a.minutesWatched / 1440).toFixed(1) : "–"; $("#paMean").textContent = fmtMean(a.meanScore);
  $("#pmChaps").textContent = fmtN(m.chaptersRead); $("#pmVols").textContent = fmtN(m.volumesRead); $("#pmMean").textContent = fmtMean(m.meanScore);
  const bio = cleanAbout(v.about), box = $("#profBioBox");
  box.hidden = !bio; $("#profBio").textContent = bio; $("#profBio").classList.remove("open");
  $("#profBioMore").hidden = bio.length < 220; $("#profBioMore").textContent = "More";
}
$("#profBioMore").onclick = () => { const c = $("#profBio"); c.classList.toggle("open"); $("#profBioMore").textContent = c.classList.contains("open") ? "Less" : "More"; };

const PROFILE_Q = "query($id:Int){Viewer{id name siteUrl about(asHtml:false) bannerImage avatar{large} options{profileColor} statistics{anime{count episodesWatched minutesWatched meanScore} manga{count chaptersRead volumesRead meanScore}}} fo:Page(perPage:1){pageInfo{total} following(userId:$id){id}} fe:Page(perPage:1){pageInfo{total} followers(userId:$id){id}}}";

async function renderProfile(){
  $("#profName").textContent = state.user || "";
  if(profLoaded) return;
  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }catch(_){}
  if(cached && cached.v && String(cached.v.name || "").toLowerCase() === String(state.user || "").toLowerCase()) paintProfile(cached);   // show the saved copy right away
  try{
    const id = await myId();
    const { json } = await gql(PROFILE_Q, { id });
    const v = json.data && json.data.Viewer; if(!v) return;
    const d = { v, following: json.data.fo && json.data.fo.pageInfo ? json.data.fo.pageInfo.total : null, followers: json.data.fe && json.data.fe.pageInfo ? json.data.fe.pageInfo.total : null };
    paintProfile(d); profLoaded = true;
    try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(d)); }catch(_){}
  }catch(_){}
}
document.querySelectorAll("[data-go]").forEach(b => { b.onclick = () => showTab(b.dataset.go); });
