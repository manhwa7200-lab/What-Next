import sys
from harness import *
R = []
def check(n, c, d=""): R.append(bool(c)); print(("PASS " if c else "FAIL ") + n + ((" :: " + str(d)) if d and not c else ""))
NET["viewererr"] = True   # AniList answers the first request with a 500 error
def main(page, out):
    check("still logged in after an AniList hiccup at startup", page.evaluate("localStorage.getItem('wn_token')") == "tok")
    check("the app is shown, not the login screen", page.locator("#setup").is_hidden() and page.locator("#tabs").is_visible())
    check("your saved name is shown in the header", page.inner_text("#whoName") == "Tester", page.inner_text("#whoName"))
    NET["viewererr"] = False
out = run(main)
check("no page errors", not out["errors"], out["errors"][:2])
print("%d checks, %d failed" % (len(R), R.count(False))); sys.exit(1 if False in R else 0)
