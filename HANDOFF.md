# Search Studio: session handoff (2026-11-17)

Goal: finish the course catalogue (the original brief AGENT-TASK.md was completed and deleted; SYLLABUS-COVERAGE.md now lists what is covered and what is optional), then audit every algorithm's examples, default example and learn block, then upgrade the UI.

## Rules the user set
- NO `Co-Authored-By` or any attribution trailer in commits (also not in agent commits).
- Keep CPU light: prefix node/python with `nice -n 19`; one process at a time; no full builds while agents work; run the light tests only at merge time.
- Never edit generated files (`index.html`, `dist/`, `learn/`, `sitemap.xml`, `llms*.txt`, `src/generated/`, `algorithms/manifest.json`). Never `git add -A`.
- Do not push to GitHub until the user says so (remote: https://github.com/1mystic/SearchStudio.git). Local `main` is ~40 commits ahead of `origin/main`. History was rewritten locally to strip trailers, so a push needs no force: `origin/main` is an ancestor.

## State of local `main`
Merged: SAT type and all 12 SAT algorithms, Week 12 CSP (lookahead, CBJ, nogood, path consistency), graph Weeks 2/5/6/12, statespace type, Graphplan / MEA / blocks hill climbing, TSP extras, backward chaining, expectiminimax, About page (Week 12 plus registry-generated "In the studio" links), README catalogue, and the audits for CSP, graph-b (Weeks 5/6/12 and alignment), planning/games/rules/AO*, TSP and SAT.
All six audits are merged. Full build ✓ with 6454 checks (91 algorithms, 66 examples). The Learn page has an Examples tab (all examples, with Open in studio links), each learn page lists its examples, and deep links `#try-<algo>/<example>` work; this edits `src/ui/app.js`, so merging `ui-upgrade` may conflict there (take both).

## To do, in order
1. (done) graph-a audit merged.
2. (done) verification build ✓. Build takes about 20 s; plan-pop declines more than 4 blocks.
3. **Browser check once**: `nice -n 19 python3 tools/browser-check.py dist/search-studio.html <shots-dir>` needs Playwright. A venv was made at `/tmp/claude-1000/-home-mystic1-projects-search-studio/3ff99048-bd6c-4fb0-ad97-64b9d921a963/scratchpad/pwenv`. If it is gone: `python3 -m venv v && v/bin/pip install playwright && v/bin/playwright install chromium-headless-shell`.
4. **Regenerate README** catalogue and badge (the count changed): the throwaway script that did it lived in the scratchpad (`readme.mjs`): it loops `Studio.algorithms` by week and family and rewrites the table between `| Week | Algorithms |` and the next blank line. The badge and `alt` use the algorithm count. About page links are generated at build time, nothing to do.
5. (merged into main via `ui-merged`; polish continues) UI upgrade, originally on branch `ui-upgrade` (worktree `.claude/worktrees/agent-af0a1b3fbfdae23e9`), PARTIAL and NOT merged: typography (system sans stack, no CDN), three-pane shell at 1600px+, two-pane 1100-1600, tablet bar, phone accordion, learn page `.js` names removed (display names plus family tag, new breadcrumb, "View source"). Not done: focus rings, hover states, contrast audit, regenerated after-screenshots, home and learn page review, full browser check. Known issue: below 1600px the sticky player can cover the caption. Resume note: `RESUME-ui.md` in that worktree. Screenshots: scratchpad `ui-shots/` (before-* complete). Decide with the user before merging into `main`.
6. Open items from the syllabus not built (P2/P3): Divide and Conquer beam search (DC-BFHS is done, plain DC beam is not), Game of Life, k-ply tic-tac-toe horizon demo, game theory explainer, matching-diagram view for CSP, course synthesis page, multi-arm planning, diversity demo, Week 1 explainers.
7. Cleanup: delete branch `backup/pre-coauthor-strip` (old history with trailers) and merged `worktree-agent-*` branches/worktrees (`git worktree remove`, `git branch -d`) once nothing is needed. Resume notes (`RESUME-*.md`) are untracked inside the worktrees; copy anything useful before removing.

## Course answers that did not match the notes (tell the user)
- Water jug (8,5,3): "some jug has 4" takes 6 moves; the 7-move answer is for the 4+4 split goal. Example uses 4+4.
- Graph G1 (repo) is unit-cost, so Dijkstra S-B-D-G cost 8 / G 9→8 is in the new `graph-dijkstra` example instead.
- Graph T, the lecturer's G=W map, the 13-city tour and the SAT GA/IHC starts were reconstructed to reproduce the stated answers (course notes are not on disk).
- Could not test: CX/PMX/OX parent tours, ant colony P(B,C,D) = 0.308/0.615/0.077.

## Bugs found and fixed during audits (for the changelog)
Graphplan gave up on solvable problems; AO* ignored dead ends; Rete had no `not`/`remove` support; model-based diagnosis listed all components when nothing was faulty; best-neighbour cycle length grew on revisits; SAT beam learn text wrongly claimed it crosses plateaus; Minimax/Alpha-Beta/SSS* opened on chance-tree examples (studio now picks an accepted default example).

## UI status
Merged into main: sans typography, three-pane studio, 110% zoom (`--zoom` var), slim scrollbars and selects, header/footer back at 1320px (full width only on the studio at 1600px+), Examples tab on Learn, Find searches examples, deep links `#try-<algo>/<example>`.
Next: the user wants every UI state polished to a professional standard (focus rings, hover states, empty/error states, light/dark contrast, phone sticky-player covering the caption below 1600px, learn/home/guide/course pages). Do it with one agent, screenshots of a few key pages only, all under `nice -n 19`.

## Update (session 2)
Pushed to origin/main. Fixed: blocks-world hill climbing drew correctly placed blocks with the dashed goal style, so they looked like they vanished (now solid green "ok"). Added consistent hover, pressed, disabled and focus states, input focus rings, a calmer error box, and a wider graph column at 1600px+. All agent worktrees, agent branches, ui-upgrade, ui-merged and the backup branch were removed (all content verified in main by patch id).
Remaining (optional): P2/P3 syllabus items listed in SYLLABUS-COVERAGE.md; the sticky player can still overlap the caption at 1100-1599px on short screens.
