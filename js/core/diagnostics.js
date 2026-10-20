/* js/core/diagnostics.js: records errors and builds a short report for bug reports */
window.__wnErrors = [];
const diagPush = t => { window.__wnErrors.push(t); if(window.__wnErrors.length > 20) window.__wnErrors.shift(); };
window.addEventListener("error", e => diagPush((e.message || "error") + " @ " + String(e.filename || "").split("/").pop() + ":" + (e.lineno || 0)));
window.addEventListener("unhandledrejection", e => diagPush("promise: " + (e.reason && e.reason.message || e.reason)));
async function diagReport(){
  const box = (el, name) => {
    if(!el) return name + ": missing";
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return name + ": " + Math.round(r.width) + "x" + Math.round(r.height) + " display=" + cs.display + " visibility=" + cs.visibility + " opacity=" + cs.opacity;
  };
  let caches_ = "n/a"; try{ caches_ = (await caches.keys()).join(", ") || "none"; }catch(_){}
  const L = typeof lists !== "undefined" ? lists[curType] : null, body = document.querySelector("#listBody");
  return ["What Next? v2.1.1", "Viewport " + innerWidth + "x" + innerHeight + " @" + (devicePixelRatio || 1) + "x | native: " + (typeof isNative !== "undefined" && isNative ? "yes" : "no"),
    "Service worker caches: " + caches_,
    body ? "List body class: \"" + body.className + "\" | cards: " + body.children.length : "List body missing",
    box(body, "List body"), box(body && body.children[0], "First card"),
    L ? "State: type=" + curType + " entries=" + (L.entries ? L.entries.length : "none") + " status=" + L.status + " shown=" + L.shown + " drawn=" + L.drawn + " stale=" + L.stale + " offline=" + L.offline : "",
    "Errors: " + (window.__wnErrors.length ? window.__wnErrors.join(" | ") : "none")].join("\n");
}
