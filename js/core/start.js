/* js/core/start.js: service worker and app start */
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

window.addEventListener("online", () => { if(typeof flushPending === "function") flushPending(); });

(async function start(){
  handleAuthRedirect();
  syncAuthUI();
  if(!auth.token) return;
  try{
    const { json } = await gql("query{Viewer{id name}}", {});
    const name = json.data && json.data.Viewer && json.data.Viewer.name;
    if(!name){ clearAuth(); throw new Error("AniList didn't accept your login. Log in again."); }
    state.user = name; state.uid = json.data.Viewer.id;
    try{ localStorage.setItem("wn_name", name); }catch(_){}
    loadList(name);
    loadTrending();
    syncAniOptions();
    flushPending();
    setTimeout(maybeAutoSync, 3000);
  }catch(err){
    const cn = localStorage.getItem("wn_name");
    if(cn && auth.token){ state.user = cn; return loadList(cn); }
    loginErr(err.message); syncAuthUI();
  }
})();
