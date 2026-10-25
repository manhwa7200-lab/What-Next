# Test harness: serves the app and fakes AniList (it keeps its own state, like the real one).
# Run any *.e2e.py file here, or all of them with run_all.py. Needs: pip install playwright && playwright install chromium
import json, re, sys, threading, http.server, socketserver, functools, os, time
from playwright.sync_api import sync_playwright

SITE = os.environ.get("SITE") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8099

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=SITE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

STAT_A = ["CURRENT"] * 6 + ["REPEATING"] + ["PLANNING"] * 8 + ["COMPLETED"] * 10 + ["PAUSED"] * 3 + ["DROPPED"] * 3
def entry(i, typ):
    st = STAT_A[i % len(STAT_A)]
    total = 12 if typ == "ANIME" else 40
    return {"entryId": 5000 + i, "repeat": 0, "startedAt": {"year": None, "month": None, "day": None}, "completedAt": {"year": None, "month": None, "day": None}, "notes": None, "priority": 0, "private": False, "customLists": {},
            "mediaId": 1000 + i, "status": st, "progress": (i * 3) % (total + 1) if st != "PLANNING" else 0, "score": (i * 7) % 101 if i % 3 else 0, "updatedAt": 1700000000 + i,
            "media": {"id": 1000 + i, "type": typ, "isAdult": False, "siteUrl": "https://anilist.co/%s/%d" % (typ.lower(), 1000 + i),
                      "title": {"romaji": "Romaji Title %d" % i, "english": ("English Title %d" % i) if i % 4 else None, "native": "x"},
                      "coverImage": {"large": "https://img.test/c%d.jpg" % i, "extraLarge": "https://img.test/c%d.jpg" % i},
                      "format": "TV" if typ == "ANIME" else "MANGA", "status": "FINISHED", "episodes": total if typ == "ANIME" else None, "chapters": total if typ == "MANGA" else None,
                      "duration": 24, "averageScore": 60 + i % 30, "popularity": 1000 - i, "genres": ["Action", "Comedy"] if i % 2 else ["Drama"], "countryOfOrigin": "JP", "startDate": {"year": 2000 + i % 25},
                      "nextAiringEpisode": None}}

N = int(os.environ.get("N", "130"))
DATA = {"ANIME": [entry(i, "ANIME") for i in range(N)], "MANGA": [entry(i, "MANGA") for i in range(N // 2)]}
SAVED = []
FAVS = []; FAVSTATE = {}
NET = {"off": False, "fail": 0, "delay": 0}

def svg(n):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="hsl(%d,60%%,45%%)"/></svg>' % (n * 37 % 360)).encode()

def handle(route, request):
    url = request.url
    if "graphql.anilist.co" in url:
        if NET["off"]: return route.abort("internetdisconnected")
        body = json.loads(request.post_data or "{}"); q = body.get("query", ""); v = body.get("variables", {}) or {}
        if "MediaListCollection" in q:
            if NET["fail"] > 0: NET["fail"] -= 1; return route.abort("failed")
            if NET["delay"]: time.sleep(NET["delay"] / 1000)
        def ok(d): route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": d}))
        if "MediaListCollection" in q:
            t = v.get("t", "ANIME"); es = DATA[t]
            if "status_in" in q: es = [e for e in es if e["status"] in ("CURRENT", "REPEATING", "PLANNING")]
            full = [{**e, "media": {**e["media"]}} for e in es]
            return ok({"MediaListCollection": {"hasNextChunk": False, "lists": [{"entries": full}]}})
        if "bannerImage" in q and "followers(userId" in q:
            return ok({"Viewer": {"id": 1, "name": "Tester", "siteUrl": "https://anilist.co/user/Tester", "about": "Just a normal hardcore otaku ~!hidden twist!~ img200(https://img.test/c7.jpg) [my list](https://anilist.co) " + "long bio text " * 30, "bannerImage": "https://img.test/c8.jpg", "avatar": {"large": "https://img.test/c9.jpg"}, "options": {"profileColor": "pink"},
                "statistics": {"anime": {"count": 464, "episodesWatched": 5100, "minutesWatched": 196000, "meanScore": 80.5}, "manga": {"count": 311, "chaptersRead": 11148, "volumesRead": 473, "meanScore": 94.9612}}},
                "fo": {"pageInfo": {"total": 7}}, "fe": {"pageInfo": {"total": 3}}})
        if "mediaListOptions" in q: return ok({"Viewer": {"mediaListOptions": {"scoreFormat": NET.get("scorefmt", "POINT_10_DECIMAL"), "animeList": {"customLists": []}, "mangaList": {"customLists": []}}, "options": {"titleLanguage": "ENGLISH"}}})
        if "Viewer{id name}" in q: return ok({"Viewer": {"id": 1, "name": "Tester"}})
        if "TRENDING_DESC" in q: return ok({"Page": {"media": []}})
        if "SaveMediaListEntry" in q:
            SAVED.append(v)
            if NET.get("saveerr"): return route.fulfill(status=200, content_type="application/json", body=json.dumps({"errors": [{"message": "Boom"}], "data": None}))
            ent = next((x for t in DATA.values() for x in t if x["mediaId"] == v["mediaId"]), None)
            if ent is None: return ok({"SaveMediaListEntry": {"id": 9999, "status": v.get("status"), "progress": v.get("progress", 0)}})
            for k in ("status", "progress", "repeat", "notes", "priority", "startedAt", "completedAt"):
                if k in v: ent[k] = v[k]
            if "score" in v: ent["score"] = v["score"]
            if "private" in v: ent["private"] = v["private"]
            if "customLists" in v: ent["customLists"] = {n: True for n in v["customLists"]}
            ent["updatedAt"] = int(time.time())
            return ok({"SaveMediaListEntry": {"id": ent["entryId"], "status": ent["status"], "progress": ent["progress"]}})
        if "DeleteMediaListEntry" in q:
            for t in DATA:
                DATA[t] = [x for x in DATA[t] if x["entryId"] != v["id"]]
            return ok({"DeleteMediaListEntry": {"deleted": True}})
        if "Media(id:$id)" in q and "page:$p" in q:
            fld = "characters" if "characters(" in q else "staff"
            nid = 700 if fld == "characters" else 800
            return ok({"Media": {fld: {"pageInfo": {"hasNextPage": False}, "edges": [{"role": "SUPPORTING", "node": {"id": nid + k, "siteUrl": "u", "name": {"full": "More %s %d" % (fld, k)}, "image": {"medium": "https://img.test/c5.jpg"}}} for k in range(2)]}}})
        if "Character(id:$id)" in q:
            ms = lambda k: {"id": 1000 + k, "type": "ANIME", "format": "TV", "title": {"romaji": "Series %d" % k, "english": None}, "coverImage": {"large": "https://img.test/c%d.jpg" % k}}
            return ok({"Character": {"id": v["id"], "siteUrl": "https://anilist.co/character/%d" % v["id"], "name": {"full": "Hero One", "native": "ヒーロー"}, "image": {"large": "https://img.test/c3.jpg"}, "description": "A brave hero. ~!Secret twist!~ __Loves__ tea.", "gender": "Female", "age": "17", "bloodType": "A", "dateOfBirth": {"year": None, "month": 4, "day": 9}, "favourites": 15, "isFavourite": FAVSTATE.get(("c", v["id"]), False),
                "media": {"pageInfo": {"total": 2}, "edges": [{"characterRole": "MAIN", "node": ms(1), "voiceActors": [{"id": 901, "name": {"full": "Actor Jp"}, "image": {"medium": "https://img.test/c6.jpg"}, "languageV2": "Japanese"}, {"id": 902, "name": {"full": "Actor En"}, "image": {"medium": "https://img.test/c7.jpg"}, "languageV2": "English"}]}, {"characterRole": "SUPPORTING", "node": ms(2), "voiceActors": [{"id": 901, "name": {"full": "Actor Jp"}, "image": {"medium": "https://img.test/c6.jpg"}, "languageV2": "Japanese"}]}]}}})
        if "Staff(id:$id)" in q:
            ms = lambda k: {"id": 1000 + k, "type": "ANIME", "format": "TV", "title": {"romaji": "Credit %d" % k, "english": None}, "coverImage": {"large": "https://img.test/c%d.jpg" % k}}
            return ok({"Staff": {"id": v["id"], "siteUrl": "https://anilist.co/staff/%d" % v["id"], "name": {"full": "Actor Jp", "native": "声優"}, "image": {"large": "https://img.test/c6.jpg"}, "description": "A voice actor.", "primaryOccupations": ["Voice Actor"], "languageV2": "Japanese", "homeTown": "Tokyo", "gender": "Female", "age": 30, "yearsActive": [2010], "dateOfBirth": {"year": 1995, "month": 3, "day": 2}, "favourites": 40, "isFavourite": FAVSTATE.get(("s", v["id"]), False),
                "staffMedia": {"pageInfo": {"total": 2}, "edges": [{"staffRole": "Hero One (Ep 1)", "node": ms(3)}, {"staffRole": "Sidekick", "node": ms(4)}]}, "characters": {"edges": [{"role": "MAIN", "node": {"id": 501, "name": {"full": "Hero One"}, "image": {"medium": "https://img.test/c3.jpg"}}, "media": [{"id": 1001, "title": {"romaji": "Series 1", "english": None}}]}]}}})
        if "Studio(id:$id" in q:
            pg = v.get("p", 1); n = 24 if pg == 1 else 6
            return ok({"Studio": {"id": v["id"], "siteUrl": "https://anilist.co/studio/%d" % v["id"], "name": "Studio One", "favourites": 62, "isFavourite": FAVSTATE.get(("t", v["id"]), False),
                "media": {"pageInfo": {"hasNextPage": pg == 1}, "edges": [{"node": {"id": 2000 + (pg - 1) * 24 + k, "type": "ANIME", "format": "TV", "title": {"romaji": "Studio Show %d" % ((pg - 1) * 24 + k), "english": None}, "coverImage": {"large": "https://img.test/c%d.jpg" % k}, "seasonYear": 2020 + k % 5}} for k in range(n)]}}})
        if "ToggleFavourite" in q:
            key = ("c", v["c"]) if v.get("c") else ("s", v["s"]) if v.get("s") else ("t", v["t"]); FAVS.append(key); FAVSTATE[key] = not FAVSTATE.get(key, False)
            return ok({"ToggleFavourite": {"studios": {"pageInfo": {"total": 1}}}})
        if "Media(id:$id)" in q:
            e = next((x for t in DATA.values() for x in t if x["mediaId"] == v["id"]), None)
            if e is None: base = DATA["ANIME"][0]; e = {**base, "mediaId": v["id"], "media": {**base["media"], "id": v["id"], "title": {"romaji": "Other title %d" % v["id"], "english": None}}}
            m = e["media"]
            return ok({"Media": {**m, "idMal": 1, "synonyms": [], "bannerImage": None, "coverImage": {**m["coverImage"], "color": "#fff"}, "description": "A test show.", "volumes": None, "season": "FALL", "seasonYear": 2026, "endDate": {"year": None, "month": None, "day": None}, "source": "MANGA", "favourites": 5, "isFavourite": False, "rankings": [], "tags": [], "studios": {"edges": [{"isMain": True, "node": {"id": 77, "name": "Studio One", "isAnimationStudio": True}}, {"isMain": False, "node": {"id": 88, "name": "Producer One", "isAnimationStudio": False}}]}, "meanScore": 61, "nextAiringEpisode": None, "trailer": None, "externalLinks": [], "characters": {"edges": [{"role": "MAIN", "node": {"id": 501, "siteUrl": "https://anilist.co/character/501", "name": {"full": "Hero One"}, "image": {"medium": "https://img.test/c3.jpg"}}}]}, "staff": {"edges": [{"role": "Director", "node": {"id": 601, "siteUrl": "https://anilist.co/staff/601", "name": {"full": "Director One"}, "image": {"medium": "https://img.test/c4.jpg"}}}]}, "relations": {"edges": []}, "recommendations": {"nodes": []}, "mediaListEntry": {"id": e["entryId"], "status": e["status"], "progress": e["progress"], "score": e["score"], "repeat": e["repeat"], "notes": e["notes"], "private": e["private"], "priority": e["priority"], "startedAt": e["startedAt"], "completedAt": e["completedAt"], "customLists": e["customLists"]}}})
        return ok({})
    if "img.test" in url:
        if NET["off"]: return route.abort("internetdisconnected")
        n = int(re.findall(r"c(\d+)", url)[0]) if re.findall(r"c(\d+)", url) else 0
        return route.fulfill(status=200, content_type="image/svg+xml", body=svg(n))
    if "localhost" in url or "127.0.0.1" in url: return route.continue_()
    return route.fulfill(status=204, body="")

def run(fn, viewport=(390, 844), mobile=True, init="", anon=False):
    srv = serve()
    out = {"console": [], "errors": [], "failed": []}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": viewport[0], "height": viewport[1]}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2,
                            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36")
        ctx.route("**/*", handle)
        page = ctx.new_page()
        page.on("console", lambda m: out["console"].append((m.type, m.text)) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: out["errors"].append(str(e)))
        page.on("requestfailed", lambda r: out["failed"].append(r.url))
        page.add_init_script(("" if anon else "if(!localStorage.getItem('wn_token')){localStorage.setItem('wn_token','tok'); localStorage.setItem('wn_name','Tester');}") + init)
        out["ctx"] = ctx
        page.goto("http://127.0.0.1:%d/index.html" % PORT)
        page.wait_for_selector("#boot", state="detached", timeout=15000)   # the loading screen goes away when the app is ready
        page.wait_for_selector("#setup" if anon else "#tabs:not([hidden])", timeout=15000)
        try:
            fn(page, out)
        finally:
            b.close()
    srv.shutdown(); srv.server_close()
    return out
