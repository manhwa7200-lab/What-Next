/* js/features/settings.js: Settings pages: AniList options and list tools */
// ---------- Settings pages: AniList account options and list tools ----------
const SUBS = ["#setApp", "#setAnilist", "#setLists", "#setSync", "#setAccount", "#setAbout"];
const TITLE_LANGS = [["ROMAJI", "Romaji"], ["ENGLISH", "English"], ["NATIVE", "Native"]];
const SCORE_FORMATS = [["POINT_100", "100 point (55 / 100)"], ["POINT_10_DECIMAL", "10 point decimal (5.5 / 10)"], ["POINT_10", "10 point (5 / 10)"], ["POINT_5", "5 star (3 / 5)"], ["POINT_3", "3 point smiley"]];
const fillSel = (id, pairs) => $(id).replaceChildren(...pairs.map(([v, t]) => Object.assign(document.createElement("option"), { value: v, textContent: t })));
fillSel("#aniTitle", TITLE_LANGS); fillSel("#aniScore", SCORE_FORMATS);

async function loadAniSettings(){
  $("#aniStatus").textContent = "Loading your AniList settings…";
  try{
    const { json } = await gql("query{Viewer{options{titleLanguage displayAdultContent airingNotifications} mediaListOptions{scoreFormat}}}", {});
    const v = json.data && json.data.Viewer; if(!v) throw new Error("No data");
    const base = String(v.options.titleLanguage || "ROMAJI").replace("_STYLISED", "");
    $("#aniTitle").value = base; $("#aniAdult").checked = !!v.options.displayAdultContent;
    $("#aniAiring").checked = !!v.options.airingNotifications; $("#aniScore").value = v.mediaListOptions.scoreFormat; try{ localStorage.setItem("wn_scorefmt", v.mediaListOptions.scoreFormat); }catch(_){}
    try{ localStorage.setItem("wn_tlang", base); }catch(_){}
    $("#aniStatus").textContent = "These settings are saved on your AniList account.";
  }catch(err){ $("#aniStatus").textContent = "Couldn't load: " + (err.message.includes("Failed to fetch") ? "no connection." : err.message); }
}
async function saveAni(vars, label){
  $("#aniStatus").textContent = "Saving…";
  try{
    const { json } = await gql("mutation($tl:UserTitleLanguage,$ad:Boolean,$an:Boolean,$sf:ScoreFormat){UpdateUser(titleLanguage:$tl,displayAdultContent:$ad,airingNotifications:$an,scoreFormat:$sf){id}}", vars);
    if(json.errors) throw new Error(json.errors[0].message);
    $("#aniStatus").textContent = label + " saved on AniList.";
    return true;
  }catch(err){ $("#aniStatus").textContent = "Couldn't save: " + err.message; return false; }
}
async function syncAniOptions(){
  try{
    const { json } = await gql("query{Viewer{options{titleLanguage} mediaListOptions{scoreFormat}}}", {});
    const v = json.data.Viewer;
    localStorage.setItem("wn_tlang", String(v.options.titleLanguage).replace("_STYLISED", ""));
    localStorage.setItem("wn_scorefmt", v.mediaListOptions.scoreFormat);
  }catch(_){}
}
$("#aniTitle").onchange = async () => {
  const v = $("#aniTitle").value;
  if(await saveAni({ tl: v }, "Title language")){ try{ localStorage.setItem("wn_tlang", v); }catch(_){} mcache.clear(); trendAt = 0; if(lists[curType].entries) renderList(); }
};
$("#aniAdult").onchange = () => saveAni({ ad: $("#aniAdult").checked }, "Adult content");
$("#aniAiring").onchange = () => saveAni({ an: $("#aniAiring").checked }, "Airing notifications");
$("#aniScore").onchange = async () => { const f = $("#aniScore").value; if(await saveAni({ sf: f }, "Score format")){ try{ localStorage.setItem("wn_scorefmt", f); }catch(_){} if(lists[curType].entries) renderList(); } };
$("#resetFilters").onclick = () => {
  lf.anime = defFilter(); lf.manga = defFilter(); fstore.anime = fstore.manga = null; LSset("wn_lf", fstore);
  $("#setListsMsg").textContent = "List filters were reset.";
};
