/* js/features/profile.js: Profile screen */
// ---------- Profile ----------
let profLoaded = false;
async function renderProfile(){
  $("#profName").textContent = state.user || "";
  if(profLoaded) return;
  try{
    const { json } = await gql("query{Viewer{name avatar{large} statistics{anime{count minutesWatched} manga{count chaptersRead}}}}", {});
    const v = json.data && json.data.Viewer; if(!v) return;
    $("#profName").textContent = v.name;
    if(v.avatar && v.avatar.large){ $("#profAvatar").src = v.avatar.large; $("#profAvatar").hidden = false; }
    const a = v.statistics.anime, m = v.statistics.manga;
    $("#profStats").textContent = a.count + " anime · " + (a.minutesWatched / 1440).toFixed(1) + " days watched · " + m.count + " manga · " + m.chaptersRead + " chapters read";
    profLoaded = true;
  }catch(_){}
}
document.querySelectorAll("[data-go]").forEach(b => { b.onclick = () => showTab(b.dataset.go); });
