"""Browser smoke test (Playwright): every page, every algorithm, three widths, both themes.
Usage: python3 tools/browser-check.py [path-to-html] [shots-dir]"""
import sys, json, os
from playwright.sync_api import sync_playwright

html = sys.argv[1] if len(sys.argv) > 1 else "dist/search-studio.html"
shots = sys.argv[2] if len(sys.argv) > 2 else "/tmp/studio-shots"
os.makedirs(shots, exist_ok=True)
url = "file://" + os.path.abspath(html)
problems = []

with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h, tag) in [(1440, 900, "desk"), (1024, 768, "tab"), (390, 844, "phone")]:
        pg = b.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "TUNNEL" not in m.text else None)
        pg.goto(url + "#home"); pg.wait_for_timeout(600)
        ids = pg.evaluate("Studio.algorithms.map(a => a.id)")
        for hsh in ["home", "library", "course", "guide", "about", "contribute", "algo-tsp-savings", "algo-search-astar", "algo-game-sss-star", "week-7", "studio"]:
            pg.evaluate(f"location.hash = '{hsh}'"); pg.wait_for_timeout(250)
            ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if ov > 1: problems.append(f"{tag} #{hsh}: horizontal overflow {ov}px")
            if tag != "tab" or hsh in ("home", "studio"):
                pg.screenshot(path=f"{shots}/{tag}-{hsh}.png", full_page=(hsh != "studio"))
        if tag == "desk" or tag == "phone":
            for aid in ids:
                pg.evaluate(f"location.hash = 'try-{aid}'"); pg.wait_for_timeout(120)
                info = pg.evaluate("""() => ({err: document.querySelector('#stage .err-box')?.textContent || null,
                    svg: !!document.querySelector('#stage svg.g, #stage .nodraw'), steps: document.querySelector('#p-count').textContent,
                    ov: document.documentElement.scrollWidth - document.documentElement.clientWidth})""")
                if info["err"] or not info["svg"]: problems.append(f"{tag} {aid}: {info}")
                if info["ov"] > 1: problems.append(f"{tag} {aid}: overflow {info['ov']}px")
                pg.click("#p-last"); pg.wait_for_timeout(60)
                if tag == "desk" and aid in ("tsp-savings", "tsp-sa", "tsp-ga", "tsp-aco", "search-astar", "tsp-crossover-lab", "search-dfid", "tsp-tabu"):
                    pg.screenshot(path=f"{shots}/{tag}-run-{aid}.png")
            # random problem + editor round trip
            pg.evaluate("location.hash = 'try-search-bfs'"); pg.wait_for_timeout(100)
            pg.click("#btn-random"); pg.select_option("#rnd-kind", "graph"); pg.fill("#rnd-n", "12"); pg.click("#rnd-go"); pg.wait_for_timeout(150)
            if pg.evaluate("!!document.querySelector('#stage .err-box')"): problems.append(f"{tag}: random graph run failed")
            pg.click("#btn-edit"); pg.wait_for_timeout(50); pg.click("#edit-save"); pg.wait_for_timeout(150)
            m = pg.text_content("#problem-msg")
            if "Saved" not in m: problems.append(f"{tag}: edit/save message: {m}")
            pg.screenshot(path=f"{shots}/{tag}-studio-random.png")
            # random game tree
            pg.click("#btn-random"); pg.select_option("#rnd-kind", "game"); pg.click("#rnd-go"); pg.wait_for_timeout(150)
            if pg.evaluate("!!document.querySelector('#stage .err-box')"): problems.append(f"{tag}: random game run failed")
            # picker modal: type, Enter
            pg.click("#pick-algo"); pg.wait_for_timeout(80); pg.keyboard.type("alpha"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
            if not pg.text_content("#pick-algo-name").startswith("Alpha-Beta"): problems.append(f"{tag}: picker chose {pg.text_content('#pick-algo-name')}")
            pg.click("#pick-problem"); pg.wait_for_timeout(80); pg.screenshot(path=f"{shots}/{tag}-modal-problem.png"); pg.keyboard.press("Escape")
            if pg.evaluate("!document.querySelector('#modal').hidden"): problems.append(f"{tag}: modal did not close")
            # light theme
            pg.click("#theme-btn"); pg.evaluate("location.hash = 'try-search-astar'"); pg.wait_for_timeout(200)
            pg.screenshot(path=f"{shots}/{tag}-light-studio.png")
            pg.evaluate("location.hash = 'home'"); pg.wait_for_timeout(300)
            pg.screenshot(path=f"{shots}/{tag}-light-home.png")
            pg.click("#theme-btn")
        if errs: problems.append(f"{tag}: console/page errors: {errs[:5]}")
        pg.close()
    b.close()
print("\n".join(problems) if problems else "browser check: no problems")
