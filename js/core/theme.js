/* js/core/theme.js: theme and colours */
// ---------- Theme ----------
const PAL = {
  light: { "--bg": "#F4F4FA", "--card": "#FFFFFF", "--ink": "#14162B", "--muted": "#6B6F8F", "--line": "#E3E4F0", "--chip": "#ECEDF8", "--shadow": "0 10px 30px rgba(20,22,60,.08)", "--glass": "rgba(255,255,255,.82)" },
  dark: { "--bg": "#0C0E1D", "--card": "#161936", "--ink": "#F3F3FC", "--muted": "#9EA3CB", "--line": "#2A2F5A", "--chip": "#20244A", "--shadow": "0 10px 30px rgba(0,0,0,.35)", "--glass": "rgba(22,25,54,.82)" },
  amoled: { "--bg": "#000000", "--card": "#0E0E14", "--ink": "#F3F3FC", "--muted": "#9A9AB5", "--line": "#22222E", "--chip": "#1A1A24", "--shadow": "none", "--glass": "rgba(8,8,12,.88)" }
};
const themeCfg = () => LS("wn_theme", { mode: "system", a: "", b: "" });
function applyTheme(){
  const t = themeCfg(), r = document.documentElement.style;
  Object.keys(PAL.light).concat(["--sakura", "--grad"]).forEach(k => r.removeProperty(k));
  if(t.mode !== "system") Object.entries(PAL[t.mode]).forEach(([k, v]) => r.setProperty(k, v));
  if(t.a) r.setProperty("--sakura", t.a);
  if(t.a || t.b) r.setProperty("--grad", "linear-gradient(135deg," + (t.a || "#FF4D86") + "," + (t.b || "#FF7A59") + ")");
}
function fillLook(){
  const t = themeCfg(); chipSet("#themeMode", t.mode);
  $("#colorA").value = t.a || "#ff4d86"; $("#colorB").value = t.b || "#ff7a59";
}
$("#themeMode").addEventListener("click", ev => { const b = ev.target.closest(".chip"); if(!b) return; LSset("wn_theme", Object.assign(themeCfg(), { mode: b.dataset.v })); applyTheme(); chipSet("#themeMode", b.dataset.v); });
$("#colorA").oninput = ev => { LSset("wn_theme", Object.assign(themeCfg(), { a: ev.target.value })); applyTheme(); };
$("#colorB").oninput = ev => { LSset("wn_theme", Object.assign(themeCfg(), { b: ev.target.value })); applyTheme(); };
$("#colorReset").onclick = () => { LSset("wn_theme", Object.assign(themeCfg(), { a: "", b: "" })); applyTheme(); fillLook(); };
applyTheme();
