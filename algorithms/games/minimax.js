/* Minimax: back up leaf values, MAX takes the largest, MIN the smallest. */
Studio.register({
  id: "game-minimax",
  name: "Minimax",
  family: "Game playing",
  week: 7,
  problem: "game",
  order: 10,
  summary: "Evaluate the game tree depth-first from left to right: a MAX node takes the largest child value, a MIN node the smallest. The root's value is the outcome with best play from both sides.",
  pseudocode: `Minimax(N):
    if N is a leaf: return e(N)
    if N is MAX: return max over children C of Minimax(C)
    if N is MIN: return min over children C of Minimax(C)`,
  complexity: "Time O(b^d), space O(b·d)",
  learn: {
    "intro": "In a two-player game one player (MAX) wants a high score and the other (MIN) a low one. Minimax looks ahead to the end of the tree and assumes both play perfectly: MAX picks the child with the largest value, MIN the smallest.",
    "definition": "Evaluate leaves with the evaluation function e. Back values up the tree: a MAX node's value is the maximum of its children, a MIN node's value is the minimum. The root's value is the guaranteed outcome.",
    "steps": [
      [
        "leaf: return e(N)",
        "The static evaluation from MAX's point of view."
      ],
      [
        "MAX node: max of children",
        "MAX chooses the move that is best for MAX."
      ],
      [
        "MIN node: min of children",
        "MIN chooses the move that is worst for MAX."
      ]
    ],
    "formulas": [
      {
        "f": "v(N) = max over C of v(C) at MAX,  min over C of v(C) at MIN",
        "read": "back up the best reply at every level",
        "why": "Assuming the opponent replies optimally, this is the best value MAX can guarantee."
      }
    ],
    "why": "Correct but exhaustive: it evaluates every leaf, b^d of them.",
    "traps": [
      "Values are always from MAX's point of view.",
      "Evaluate left to right; the order matters for alpha-beta, not for minimax."
    ],
    "props": {
      "complete": "yes (finite tree)",
      "optimal": "yes against an optimal opponent",
      "time": "O(b^d)",
      "space": "O(b·d)"
    }
  },
  params: [],
  run(P) {
    const steps = [], val = {}, order = [];
    let leaves = 0;
    const snap = (cur, cap) => {
      const nodes = {};
      P.ids.forEach(id => { const n = P.nodes[id]; nodes[id] = { state: id in val ? (n.children.length ? "closed" : "visited") : "plain", badge: n.children.length && id in val ? val[id] : undefined }; });
      if (cur) nodes[cur] = Object.assign({}, nodes[cur], { state: "current" });
      steps.push({ caption: cap, nodes, table: { title: "backed-up values", columns: ["node", "player", "children", "value"], rows: order.map(id => [id, P.nodes[id].player, P.nodes[id].children.map(c => `${c}:${val[c]}`).join(" ") || "leaf", val[id]]), rowStates: order.map((_, i) => (i === order.length - 1 ? "cur" : "")) },
        stats: [{ label: "leaves evaluated", value: leaves }] });
    };
    const mm = id => {
      const n = P.nodes[id];
      if (!n.children.length) { leaves++; val[id] = n.value; return n.value; }
      const vs = n.children.map(mm);
      val[id] = n.player === "MAX" ? Math.max(...vs) : Math.min(...vs);
      order.push(id);
      snap(id, `${n.player} node ${id}: ${n.player === "MAX" ? "max" : "min"}(${vs.join(", ")}) = ${val[id]}`);
      return val[id];
    };
    snap(null, `Root ${P.root} is ${P.nodes[P.root].player}; evaluate depth first, left to right`);
    const v = mm(P.root);
    const best = P.nodes[P.root].children.find(c => val[c] === v);
    const nodes = {}; P.ids.forEach(id => (nodes[id] = { state: "closed", badge: P.nodes[id].children.length ? val[id] : undefined }));
    let x = P.root; while (x) { nodes[x].state = "path"; const n = P.nodes[x]; x = n.children.find(c => val[c] === val[x]); }
    steps.push({ caption: `Minimax value ${v}: ${P.nodes[P.root].player} should move to ${best}. The principal variation is highlighted. ${leaves} leaves evaluated.`, nodes,
      edges: [], table: steps[steps.length - 1].table, stats: [{ label: "value", value: v, state: "ok" }, { label: "leaves evaluated", value: leaves }] });
    return { steps, result: { value: v, leaves, move: best } };
  },
});
