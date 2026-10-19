/* Hill climbing on a state-space graph, guided by h. */
Studio.register({
  id: "search-hill-climbing",
  name: "Hill Climbing",
  family: "Graph search · informed",
  week: 3,
  problem: "graph",
  order: 55,
  summary: "Move to the best-looking neighbour (lowest h) as long as it improves on the current node. Constant memory, but it stops at the first local optimum, which need not be the goal.",
  pseudocode: `node ← start
newNode ← head(sort_h(MoveGen(node)))
while h(newNode) < h(node)
    node ← newNode
    newNode ← head(sort_h(MoveGen(node)))
return node`,
  complexity: "Each step scans b neighbours; memory O(1)",
  learn: {
    "intro": "Hill climbing is the simplest way to use a heuristic: always step to the neighbour that looks closest to the goal, and stop when no neighbour looks better than where you are. It needs almost no memory, but it can stop on a hilltop that is not the summit.",
    "definition": "From the current node move to the child with the smallest h, provided it is strictly smaller than h(current). Otherwise stop and return the current node.",
    "steps": [
      [
        "node ← start",
        ""
      ],
      [
        "newNode ← best child by h",
        "Only the children of the current node are compared."
      ],
      [
        "while h(newNode) < h(node)",
        "Strict improvement is required; equal h means a plateau and the search stops."
      ],
      [
        "return node",
        "This is a local optimum of h; it is the goal only if h(goal) is the only minimum reached."
      ]
    ],
    "formulas": [
      {
        "f": "next = argmin over children C of h(C), accepted only if h(next) < h(current)",
        "read": "go to the best-looking child only if it is better than here",
        "why": "Greedy local improvement; there is no memory to back up from a dead end."
      }
    ],
    "why": "Constant memory and very fast, but incomplete: local optima, plateaus and ridges stop it. The fixes are exactly the Week 3 ideas: beam search, random restarts, tabu memory, simulated annealing.",
    "traps": [
      "Hill climbing never backtracks.",
      "A plateau (equal h) stops the course version.",
      "Reaching a node with h = 0 that is not the goal means h is misleading there."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "O(b) per step",
      "space": "O(1)"
    }
  },
  params: [],
  run(P) {
    const steps = [], path = [P.start];
    let node = P.start;
    const rows = [];
    for (let guard = 0; guard < 200; guard++) {
      const kids = P.adj[node].map(([c]) => c).sort((a, b) => P.h[a] - P.h[b] || (a < b ? -1 : 1));
      const best = kids[0];
      const better = best !== undefined && P.h[best] < P.h[node];
      rows.push([node, P.h[node], kids.map(k => `${k}:${P.h[k]}`).join(" ") || "–", best ?? "–", better ? "move" : "stop"]);
      const states = {}; path.forEach(p => (states[p] = "visited")); kids.forEach(k => (states[k] = "open")); states[node] = "current"; if (P.goal) states[P.goal] = states[P.goal] === "plain" || !states[P.goal] ? "goalcand" : states[P.goal];
      steps.push({ caption: better ? `At ${node} (h=${P.h[node]}): best neighbour ${best} has h=${P.h[best]} < ${P.h[node]} → move` : `At ${node} (h=${P.h[node]}): no neighbour has smaller h → stop${node === P.goal ? " at the goal" : ", a local optimum"}`,
        nodes: Studio.gs.nodes(P, states, Object.fromEntries(P.ids.map(i => [i, P.h[i]]))), edges: Studio.gs.edges(P, path, kids.map(k => ({ u: node, v: k, state: k === best && better ? "candidate" : "faint" }))),
        table: { columns: ["node", "h", "neighbours h", "best", ""], rows: rows.slice(), rowStates: rows.map((r, i) => (i === rows.length - 1 ? (better ? "cur" : node === P.goal ? "ok" : "bad") : "")) },
        stats: [{ label: "h(node)", value: P.h[node] }, { label: "path", value: path.join("–") }] });
      if (!better) break;
      node = best; path.push(node);
    }
    const ok = node === P.goal;
    steps.push({ caption: ok ? `Reached the goal ${node} along ${path.join(" – ")}` : `Stuck at ${node}: a local optimum of h (goal ${P.goal} not reached)`,
      nodes: Studio.gs.nodes(P, Object.fromEntries(path.map(p => [p, p === node ? (ok ? "goal" : "current") : "path"]))), edges: Studio.gs.edges(P, path),
      table: { columns: ["node", "h", "neighbours h", "best", ""], rows, rowStates: rows.map((r, i) => (i === rows.length - 1 ? (ok ? "ok" : "bad") : "")) },
      stats: [{ label: "result", value: ok ? "goal" : "stuck", state: ok ? "ok" : "bad" }] });
    return { steps, result: { found: ok, path, cost: ok ? Studio.gs.pathCost(P, path) : null, expanded: path.length } };
  },
});
