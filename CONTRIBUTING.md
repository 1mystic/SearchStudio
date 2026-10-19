# Contributing to Search Studio

Thank you for helping. Everything here is public domain ([Unlicense](LICENSE)), so by contributing you agree your work is released the same way.

## Ways to help

- **Add an algorithm** — one file in `algorithms/<folder>/`.
- **Add a worked example** — one JSON file in `examples/`.
- **Add a problem type** — one file in `problem-types/` (how a new kind of problem is drawn, typed and generated).
- **Fix or improve an explanation** — the `learn` block inside each algorithm file.
- **Report a bug** — open an issue with the algorithm, the problem (export it as JSON from the studio) and the step number.

## Set up

```bash
git clone https://github.com/1mystic/search-studio && cd search-studio
npm run watch      # rebuilds on every save; Node 18+, nothing to install
npm run serve      # in another terminal, then open the printed address
```

## Add an algorithm in four steps

1. Copy `algorithms/_template.js` to `algorithms/<folder>/<name>.js`.
2. Fill in the header:

   ```js
   Studio.register({
     id: "search-my-algo",           // unique, kebab-case
     name: "My algorithm",
     family: "Graph search · informed",
     week: 5,                        // course week, 1–11
     problem: "graph",               // tsp | graph | game | andor | planning | rules | csp | linedrawing | circuit | alignment
     order: 40,                      // position inside its family
     summary: "One sentence.",
     pseudocode: `…`,
     learn: { intro, definition, steps: [[line, meaning]], formulas: [{ f, read, why }], why, traps: [], props: { complete, optimal, time, space } },
     params: [{ key: "start", label: "Start", type: "node" }],
     run(P, params) { const steps = []; /* … */ return { steps, result: {} }; },
   });
   ```

3. In `run`, push one step per decision. A step can carry:

   | key | what it draws |
   |---|---|
   | `caption` | the yellow sentence under the stage |
   | `nodes` | `{ id: { state, badge, label, sub } }` — states: `current`, `open`, `closed`, `path`, `goal`, `visited`, `rejected`, `pruned`, `dim` |
   | `edges` | `[{ u, v, state, label, directed }]` — states: `faint`, `tree`, `tour`, `candidate`, `path`, `added`, `rejected`, `removed`, `alt` |
   | `table` | `{ title, columns, rows, rowStates }` — a cell may be `{ t, s }` with `s` = `ok` / `warn` / `bad` |
   | `lists` | `[{ label: "OPEN", items: [{ text, state }] }]` |
   | `stats` | `[{ label, value, state }]` |
   | `chart` | `{ kind: "walk" | "drops" | "bars" | "pie", … }` |

   Helpers: `Studio.search.run` (BFS/DFS/UCS/best-first/A* engine), `Studio.gs` (graph nodes, edges, path cost, h*), `Studio.tsp` (tours, exchanges, start tours), `Studio.rng(seed)` (repeatable randomness).

4. `npm run build`. The build checks that the file registers, runs it on every matching example and on random problems, and adds it to the library, the course map, the studio, the static `learn/` pages and the sitemap.

## House rules

- **Follow the course notation**: node pairs `(N, parent, depth or g)`, alphabetical tie-breaks unless the user picks otherwise, goal test on picking from OPEN.
- **Deterministic**: anything random takes a `seed` parameter and uses `Studio.rng(seed)`.
- **Explain, don't just show**: every caption should say *why* the step happened.
- **Add a known answer** to `tools/test.mjs` when the course gives one (a cost, an order, a value).
- **Keep files independent**: no imports, no build step of your own, no external libraries.
- Edit `src/index.template.html`, never the generated `index.html`.

## Pull requests

Keep one change per pull request, run `npm run build` (it must print ✓), and describe what a reviewer should click to see the change. Screenshots of a light and a dark step help.
