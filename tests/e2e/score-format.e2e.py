import sys
from harness import *
import harness
R = []
def check(n, c, d=""): R.append(bool(c)); print(("PASS " if c else "FAIL ") + n + ((" :: " + str(d)) if d and not c else ""))
NET["scorefmt"] = "POINT_5"
def main(page, out):
    page.click('#tabs [data-v="anime"]'); page.wait_for_selector("#listBody .lcard:not(.skel)")
    page.click("#listBody .lcard .lmain"); page.wait_for_selector("#media .mstatus"); page.click("#media .mstatus"); page.wait_for_selector("#editor .sheetbar")
    rng = page.evaluate("(() => { const r = document.querySelector('#editor input[type=range]'); return [r.min, r.max, r.step]; })()")
    check("score control matches the 5-star format", rng == ["0", "5", "1"], rng)
    title = page.inner_text("#editor h2")
    sp = page.locator("#editor .stepper:has(.mini) .chip:text-is('+')")
    for _ in range(4): sp.click()
    check("score shows 4/5", "4/5" in page.inner_text("#editor .bigscore"), page.inner_text("#editor .bigscore"))
    SAVED.clear(); page.click("#editor .sheetbar .go:not(.alt)"); page.wait_for_timeout(800)
    check("saved as 80 out of 100 for AniList", SAVED and SAVED[-1].get("score") == 80, SAVED[-1:] )
    page.click("#media .mbtn"); page.wait_for_timeout(300)
    txt = page.eval_on_selector_all("#listBody .lcard .sc", "els => els.map(e => e.textContent)")
    check("list card shows the score in 5-star style", any("4/5" in t for t in txt), txt[:4])
out = run(main, viewport=(390, 844))
real = [c for c in out["console"] if "ERR_INTERNET" not in c[1]]
check("no console errors", not real and not out["errors"], (real[:2], out["errors"][:2]))
print("%d checks, %d failed" % (len(R), R.count(False))); sys.exit(1 if False in R else 0)
