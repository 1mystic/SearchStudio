/* Recursive Best-First Search (Korf): best-first behaviour in linear space using backed-up f values. */
Studio.register({
  id: "search-rbfs",
  name: "Recursive Best-First Search",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 75,
  summary: "Explore the best child while its f stays below the best alternative elsewhere; when it exceeds that limit, back up its f value and switch. Keeps only the current path and its siblings.",
  pseudocode: `RBFS(N, F(N), limit):
    if GoalTest(N): return SUCCESS
    children ← MoveGen(N) not on the current path
    for each child C: F(C) ← max(g(C) + h(C), F(N))     # inherit a backed-up value
    loop
        best ← child with least F;  if F(best) > limit: return FAIL, F(best)
        alt ← second least F (∞ if none)
        result, F(best) ← RBFS(best, F(best), min(limit, alt))
        if result = SUCCESS: return SUCCESS
call RBFS(S, h(S), ∞)`,
  complexity: "Space O(b·d); time can exceed A* because subtrees are re-expanded",
  learn: {
    "intro": "Recursive Best-First Search behaves like A* but stores only the current path. When the path it is exploring becomes worse than the best alternative elsewhere, it remembers how good that path turned out to be and switches.",
    "definition": "At each node, expand the child with the lowest backed-up value F while it stays below a limit (the best alternative higher up). When it exceeds the limit, return and replace the child's F by the best value found below it.",
    "steps": [
      [
        "F(child) ← max(g + h, F(parent))",
        "A child inherits its parent's backed-up value if that is larger."
      ],
      [
        "best ← child with least F",
        ""
      ],
      [
        "if F(best) > limit: return F(best)",
        "Report how good this subtree really is, so the parent can compare it with alternatives."
      ],
      [
        "recurse with limit = min(limit, second-best F)",
        "Explore best until it looks worse than the runner-up."
      ]
    ],
    "formulas": [
      {
        "f": "F(N) = backed-up minimum of f over N's explored subtree",
        "read": "the best f value seen below N",
        "why": "Lets RBFS return to a forgotten subtree knowing exactly how promising it was."
      }
    ],
    "why": "Linear space and optimal with admissible h. It may re-expand the same nodes many times when the best path keeps switching.",
    "traps": [
      "The limit passed down is the second-best F, not the parent's f.",
      "Keep backed-up values; recomputing g + h throws the information away."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes with admissible h",
      "time": "can exceed A*",
      "space": "O(b·d)"
    }
  },
  params: [],
  run(P) {
    const steps = [], path = [P.start];
    let expansions = 0;
    const rows = [];
    const snap = (cur, cap, kids = []) => {
      const states = {}; path.forEach(p => (states[p] = "visited")); kids.forEach(k => (states[k.id] = "open")); states[cur] = "current";
      steps.push({ caption: cap, nodes: Studio.gs.nodes(P, states, Object.fromEntries(kids.map(k => [k.id, k.F]))), edges: Studio.gs.edges(P, path),
        lists: [{ label: "PATH", items: path.map(p => ({ text: p, state: "open" })) }, { label: "CHILDREN", items: kids.map(k => ({ text: `${k.id} F=${k.F}`, state: "plain" })) }],
        table: { title: "expansions", columns: ["#", "node", "limit", "children F"], rows: rows.slice(-14), rowStates: rows.slice(-14).map((_, i, a) => (i === a.length - 1 ? "cur" : "")) },
        stats: [{ label: "expansions", value: expansions }] });
    };
    const rbfs = (N, g, FN, limit) => {
      if (N === P.goal) return [true, FN];
      const kids = P.adj[N].filter(([c]) => !path.includes(c)).map(([c, w]) => ({ id: c, g: g + w, F: Math.max(g + w + P.h[c], FN) }));
      expansions++;
      rows.push([expansions, N, limit === Infinity ? "∞" : limit, kids.map(k => `${k.id}:${k.F}`).join(" ") || "–"]);
      snap(N, `Expand ${N} (limit ${limit === Infinity ? "∞" : limit}): children ${kids.map(k => `${k.id} F=${k.F}`).join(", ") || "none"}`, kids);
      if (!kids.length) return [false, Infinity];
      for (let guard = 0; guard < 500; guard++) {
        kids.sort((a, b) => a.F - b.F || (a.id < b.id ? -1 : 1));
        const best = kids[0];
        if (best.F > limit) { snap(N, `Best child ${best.id} has F=${best.F} > limit ${limit}: back up ${best.F} to ${N} and return`, kids); return [false, best.F]; }
        const alt = kids.length > 1 ? kids[1].F : Infinity;
        path.push(best.id);
        const [ok, F] = rbfs(best.id, best.g, best.F, Math.min(limit, alt));
        if (ok) return [true, F];
        path.pop();
        best.F = F;
        snap(N, `Back at ${N}: ${best.id} now has backed-up F=${F === Infinity ? "∞" : F}`, kids);
      }
      return [false, Infinity];
    };
    const [ok] = rbfs(P.start, 0, P.h[P.start], Infinity);
    if (!ok) { steps.push({ caption: "No path to the goal", nodes: Studio.gs.nodes(P), edges: Studio.gs.edges(P) }); return { steps, result: { found: false, expanded: expansions } }; }
    const found = path.slice(), cost = Studio.gs.pathCost(P, found);
    steps.push({ caption: `Goal ${P.goal} reached: path ${found.join(" – ")}, cost ${cost}, ${expansions} expansions`,
      nodes: Studio.gs.nodes(P, Object.fromEntries(found.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, found),
      table: { title: "expansions", columns: ["#", "node", "limit", "children F"], rows: rows.slice(-14) }, stats: [{ label: "path cost", value: cost, state: "ok" }, { label: "expansions", value: expansions }] });
    return { steps, result: { found: true, path: found, cost, expanded: expansions } };
  },
});
