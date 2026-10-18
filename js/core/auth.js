/* js/core/auth.js: AniList login, deep link, back button, log out */
// ---------- AniList login (implicit grant: token comes back in the URL hash) ----------
const auth = { token: null };
try{ auth.token = localStorage.getItem("wn_token"); }catch(_){}

async function gql(query, variables){
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  if(auth.token) headers.Authorization = "Bearer " + auth.token;
  const res = await fetch("https://graphql.anilist.co", { method: "POST", headers, body: JSON.stringify({ query, variables }) });
  const json = await res.json();
  const bad = (json.errors || []).some(x => /invalid token|unauthenticated|unauthorized/i.test(x.message || "") || x.status === 400 && /token/i.test(x.message || ""));
  if(auth.token && (res.status === 401 || bad)){ clearAuth(); throw new Error("AniList didn't accept your login. Log in again."); }
  return { res, json };
}

// Logged out: only the login screen. Logged in: tabs and app.
function syncAuthUI(){
  const on = !!auth.token;
  $("#whoBar").hidden = !on;
  $("#tabs").hidden = !on;
  $("#setup").hidden = on;
  if(!on){ showTab("pick"); $("#app").hidden = true; }
}
function clearAuth(){
  auth.token = null;
  try{ localStorage.removeItem("wn_token"); }catch(_){}
  syncAuthUI();
}
function handleAuthRedirect(){
  const t = new URLSearchParams(location.hash.replace(/^#/, "")).get("access_token");
  if(!t) return;
  auth.token = t;
  try{ localStorage.setItem("wn_token", t); }catch(_){}
  history.replaceState(null, "", location.pathname + location.search);
}

async function markDone(e, p, btn){
  btn.disabled = true; btn.textContent = "Saving…";
  try{
    const vars = { id: e.media.id, p: p.to };
    if(p.total && p.to >= p.total) vars.s = "COMPLETED";
    else if(e.status === "PLANNING") vars.s = "CURRENT";
    const { json } = await gql(
      "mutation($id:Int,$p:Int,$s:MediaListStatus){SaveMediaListEntry(mediaId:$id,progress:$p,status:$s){id progress status}}", vars);
    if(json.errors) throw new Error(json.errors[0].message);
    const saved = json.data.SaveMediaListEntry;
    e.progress = saved.progress; e.status = saved.status;
    bumpDay(p.n);
    state.skipped.clear();
    if(saved.status === "COMPLETED") return afterFinish(e);
    pick();
    const t = document.createElement("div"); t.className = "msg";
    t.textContent = "Saved to AniList: " + (e.media.title.english || e.media.title.romaji) + " is now at " + saved.progress + ". Here's the next pick.";
    $("#result").prepend(t);
  }catch(err){
    btn.disabled = false; btn.textContent = "Couldn't save: " + err.message;
  }
}

// ---------- Login: the client ID is built in, like other AniList apps ----------
const APP = { version: "2.1.1", company: "Tokyo Brotherhood", creator: "Hariharasuthan Karunakaran", contributor: "Claude (AI)" };
const CFG0 = window.WN_CONFIG || {};   // set in config.js
const CLIENT_WEB = String(CFG0.clientWeb || "");
const CLIENT_APP = String(CFG0.clientApp || "54060");   // built-in default, so login works even without config.js
const APP_REDIRECT = "whatnext://auth";
const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const nativePlugin = n => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n];
function clientId(){
  let own = ""; try{ own = localStorage.getItem("wn_client") || ""; }catch(_){}
  return (isNative ? CLIENT_APP : CLIENT_WEB) || own;
}
function loginErr(t){ $("#loginErr").textContent = t; }
function openExternal(url){
  const B = isNative && nativePlugin("Browser");
  if(B && B.open){ try{ return B.open({ url }); }catch(_){} }
  window.open(url, "_blank", "noopener");
}
async function startLogin(){
  const id = clientId();
  if(!id) return loginErr(isNative ? "Login isn't set up in this build yet. The developer needs to add the AniList Client ID." : "Login here needs a website client ID. Use the Android app to log in, or add a website client in config.js.");
  let url = "https://anilist.co/api/v2/oauth/authorize?client_id=" + encodeURIComponent(id) + "&response_type=token";
  // No redirect_uri here: AniList uses the Redirect URL saved on the client, and sending one switches it to a different login type.
  const B = isNative && nativePlugin("Browser");
  if(B && B.open){ try{ return await B.open({ url }); }catch(_){} }
  location.href = url;
}
$("#loginBtn").onclick = startLogin;
$("#registerBtn").onclick = () => openExternal("https://anilist.co/signup");
function handleAuthUrl(url){
  if(!url || url.indexOf(APP_REDIRECT.split("://")[0] + "://") !== 0) return;
  const t = new URLSearchParams(url.split("#")[1] || url.split("?")[1] || "").get("access_token");
  if(!t) return;
  try{ localStorage.setItem("wn_token", t); }catch(_){}
  try{ const B = nativePlugin("Browser"); if(B && B.close) B.close(); }catch(_){}
  location.reload();
}
if(isNative){
  const A = nativePlugin("App");
  if(A && A.addListener){
    A.addListener("appUrlOpen", ev => handleAuthUrl(ev.url));
    A.addListener("backButton", () => {
      if(!$("#editor").hidden) $("#editor").hidden = true;
      else if(!$("#qv").hidden) $("#qv").hidden = true;
      else if(!$("#fsheet").hidden) $("#fsheet").hidden = true;
      else if(!$("#csheet").hidden) $("#csheet").hidden = true;
      else if(!$("#media").hidden) closeMedia();
      else if(SUBS.some(id => !$(id).hidden)) showTab("settings");
      else if(!$("#settings").hidden || !$("#stats").hidden || !$("#chat").hidden) showTab("profile");
      else if($("#pickWrap").hidden) showTab("pick");
      else if(A.exitApp) A.exitApp();
    });
    if(A.getLaunchUrl) A.getLaunchUrl().then(r => r && handleAuthUrl(r.url)).catch(() => {});
  }
}
$("#logout2").onclick = () => $("#logout").click();
$("#appsLink").onclick = () => openExternal("https://anilist.co/settings/apps");
$("#logout").onclick = () => {
  clearAuth();
  state.items = []; state.user = ""; state.uid = 0; state.skipped.clear(); lists.anime.entries = lists.manga.entries = null; profLoaded = false;
  try{ localStorage.removeItem("wn_cache"); localStorage.removeItem("wn_name"); }catch(_){}
  $("#result").replaceChildren(); $("#dlist").replaceChildren();
};
