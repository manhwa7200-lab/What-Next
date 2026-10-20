import sys, json, time, datetime
from harness import *
import harness
R = []
def check(name, cond, detail=""):
    R.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(detail)) if detail and not cond else ""))
DELAY_JS = "const __f = window.fetch.bind(window); window.__delay = 0; window.fetch = (u, o) => (window.__delay && String(u).includes('graphql')) ? new Promise(r => setTimeout(r, window.__delay)).then(() => __f(u, o)) : __f(u, o);"
TODAY = datetime.date.today(); T = {"year": TODAY.year, "month": TODAY.month, "day": TODAY.day}; BL = {"year": None, "month": None, "day": None}
A = harness.DATA["ANIME"]
def setup(i, **kw):
    A[i].update(kw); return "English Title %d" % i if i % 4 else "Romaji Title %d" % i
def srv(i): return A[i]
# scenarios
t_plain = setup(1, status="CURRENT", progress=5, startedAt=BL, completedAt=BL)
t_done = setup(2, status="CURRENT", progress=11, startedAt={"year": 2025, "month": 1, "day": 1}, completedAt=BL)
t_rewatch = setup(3, status="REPEATING", progress=11, repeat=1, startedAt={"year": 2024, "month": 1, "day": 1}, completedAt={"year": 2024, "month": 2, "day": 1})
t_plan = setup(5, status="PLANNING", progress=0, startedAt=BL, completedAt=BL)
t_ed = setup(7, status="CURRENT", progress=4, startedAt={"year": 2025, "month": 3, "day": 3}, completedAt=BL)
t_rapid = setup(9, status="CURRENT", progress=2, startedAt={"year": 2025, "month": 3, "day": 3}, completedAt=BL)
t_off = setup(10, status="CURRENT", progress=3, startedAt={"year": 2025, "month": 3, "day": 3}, completedAt=BL)
t_err = setup(11, status="CURRENT", progress=6, startedAt={"year": 2025, "month": 3, "day": 3}, completedAt=BL)

def card(page, title): return page.locator('.lcard:has(.lmain[aria-label^="%s,"])' % title)
def find(page, title):
    page.click("#lSearchBtn") if page.eval_on_selector("#listSearch", "e => e.hidden") else None
    page.fill("#listSearch", title); page.wait_for_timeout(250); return card(page, title).first
def prog(page, title): return page.locator('.lcard:has(.lmain[aria-label^="%s,"]) .lp' % title).first.inner_text()
def clear_search(page): page.fill("#listSearch", ""); page.wait_for_timeout(150)
def wait_saved(page, ms=900): page.wait_for_timeout(ms)

def main(page, out):
    page.click('#tabs [data-v="anime"]'); page.wait_for_selector("#listBody .lcard:not(.skel)")
    # 1. instant update, then saved with a start date
    page.evaluate("window.__delay = 1500"); SAVED.clear()
    find(page, t_plain); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_plain); page.wait_for_timeout(250)
    check("+1: card updates instantly (before AniList answers)", prog(page, t_plain).startswith("6"), prog(page, t_plain))
    page.evaluate("window.__delay = 0"); wait_saved(page, 2200)
    check("+1: saved to AniList with the right progress", srv(1)["progress"] == 6, srv(1)["progress"])
    check("+1: start date filled in automatically", srv(1)["startedAt"] == T, srv(1)["startedAt"])
    days = page.evaluate("JSON.parse(localStorage.getItem('wn_days') || '{}')"); check("+1: counts toward the daily goal", sum(days.values()) >= 1, days)
    # 2. finishing
    SAVED.clear(); find(page, t_done); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_done); wait_saved(page)
    check("finish: AniList gets Completed + progress + finish date", srv(2)["status"] == "COMPLETED" and srv(2)["progress"] == 12 and srv(2)["completedAt"] == T, (srv(2)["status"], srv(2)["progress"], srv(2)["completedAt"]))
    check("finish: existing start date untouched", srv(2)["startedAt"] == {"year": 2025, "month": 1, "day": 1}, srv(2)["startedAt"])
    inpool = page.evaluate("state.items.some(x => x.media.id === %d)" % A[2]["mediaId"]); check("finish: Pick no longer suggests it", not inpool)
    stat = [c.strip() for c in page.eval_on_selector_all("#listStatus .chip", "els => els.map(e => e.textContent)")]
    # 3. rewatch
    find(page, t_rewatch); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_rewatch); wait_saved(page)
    check("rewatch: finishing it completes and adds one rewatch", srv(3)["status"] == "COMPLETED" and srv(3)["repeat"] == 2 and srv(3)["completedAt"] == {"year": 2024, "month": 2, "day": 1}, (srv(3)["status"], srv(3)["repeat"], srv(3)["completedAt"]))
    # 4. planning +1
    find(page, t_plan); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_plan); wait_saved(page)
    check("planning: +1 starts it and sets the start date", srv(5)["status"] == "CURRENT" and srv(5)["progress"] == 1 and srv(5)["startedAt"] == T, (srv(5)["status"], srv(5)["startedAt"]))
    # 5. rapid taps
    SAVED.clear(); find(page, t_rapid)
    for _ in range(3): page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_rapid); page.wait_for_timeout(40)
    wait_saved(page, 1500)
    check("rapid taps: three taps give exactly +3", srv(9)["progress"] == 5, srv(9)["progress"])
    check("rapid taps: no more than 3 requests, never out of order", len(SAVED) <= 3 and [s["progress"] for s in SAVED] == sorted(s["progress"] for s in SAVED), [s.get("progress") for s in SAVED])
    # 6. media page agrees with the list (no stale copy)
    find(page, t_ed); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_ed); wait_saved(page)
    page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lmain' % t_ed); page.wait_for_selector("#media .mstats")
    now = page.inner_text("#media .go.alt:has-text('now')")
    check("media page shows the progress you just set in the list", "now 5" in now, now)
    page.click("#media .go.alt:has-text('−1')"); page.wait_for_timeout(700)
    check("media page: −1 steps back and the page refreshes in place", "now 4" in page.inner_text("#media .go.alt:has-text('now')") and srv(7)["progress"] == 4, srv(7)["progress"])
    # 7. editor rules + save
    page.click("#media .mstatus"); page.wait_for_selector("#editor .sheetbar")
    page.click("#editor .seg .chip:has-text('Completed')"); page.wait_for_timeout(150)
    pv = page.input_value("#editor .stepper input"); check("editor: choosing Completed fills progress to the total", pv == "12", pv)
    page.click("#editor .stepper .chip:text-is('−')"); page.wait_for_timeout(100)
    sel = page.inner_text("#editor .seg .chip[aria-pressed='true']"); check("editor: lowering a finished title reopens it as Watching", sel == "Watching", sel)
    page.click("#editor .seg .chip:has-text('Completed')"); page.click("#editor .seg .chip:has-text('Rewatching')"); page.wait_for_timeout(100)
    pv = page.input_value("#editor .stepper input"); check("editor: starting a rewatch resets progress to 0", pv == "0", pv)
    # dirty guard
    page.click("#editor .sheethead .mini"); txt = page.inner_text("#editor .sheethead .mini")
    check("editor: Back asks before discarding changes", "Discard" in txt, txt)
    SAVED.clear(); page.click("#editor .sheethead .mini"); page.wait_for_timeout(200)
    check("editor: discarding closes without saving", page.eval_on_selector("#editor", "e => e.hidden") and not SAVED, SAVED)
    # real save through the editor
    page.click("#media .mstatus"); page.wait_for_selector("#editor .sheetbar"); page.click("#editor .seg .chip:has-text('Completed')"); page.click("#editor .sheetbar .go:not(.alt)"); wait_saved(page)
    check("editor: save sends status, progress, and dates", srv(7)["status"] == "COMPLETED" and srv(7)["progress"] == 12 and srv(7)["completedAt"] == T, (srv(7)["status"], srv(7)["progress"], srv(7)["completedAt"]))
    page.click("#media .mbtn"); page.wait_for_timeout(300)
    # 8. offline queue
    NET["off"] = True; page.evaluate("window.__delay = 0"); SAVED.clear()
    find(page, t_off); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_off); page.wait_for_timeout(800)
    check("offline: card still updates", prog(page, t_off).startswith("4"), prog(page, t_off))
    pend = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('wn_pending') || '{}')).length"); check("offline: change is kept for later", pend == 1, pend)
    check("offline: a message explains it", page.is_visible("#toast") and "device" in page.inner_text("#toast"), page.inner_text("#toast"))
    NET["off"] = False; page.evaluate("window.dispatchEvent(new Event('online'))"); wait_saved(page, 1500)
    check("back online: the queued change reaches AniList", srv(10)["progress"] == 4, srv(10)["progress"])
    pend = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('wn_pending') || '{}')).length"); check("back online: queue is empty again", pend == 0, pend)
    # 9. server error rolls back
    NET["saveerr"] = True; find(page, t_err); page.click('.lcard:has(.lmain[aria-label^="%s,"]) .lplus' % t_err); wait_saved(page, 1200); NET["saveerr"] = False
    check("error: card goes back to the real value", prog(page, t_err).startswith("6"), prog(page, t_err))
    check("error: a message says it failed", "Couldn't save" in page.inner_text("#toast"), page.inner_text("#toast"))
    clear_search(page)

out = run(main, viewport=(390, 844), init=DELAY_JS)
real = [c for c in out["console"] if "ERR_INTERNET_DISCONNECTED" not in c[1]]   # those are expected: this test goes offline on purpose
check("no console errors (apart from the deliberate offline test)", not real and not out["errors"], (real[:3], out["errors"][:3]))
print("\n%d checks, %d failed" % (len(R), R.count(False))); sys.exit(1 if False in R else 0)
