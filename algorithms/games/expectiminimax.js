/* Expectiminimax (supplementary): Minimax extended with chance nodes that take the probability-weighted average. */
Studio.register({
  id: "game-expectiminimax",
  name: "Expectiminimax (supplementary)",
  family: "Game playing",
  week: 7,
  problem: "game",
  order: 40,
  summary: "Supplementary (Russell & Norvig, games of chance). Minimax for games with dice or cards: MAX takes the largest child, MIN the smallest, and a chance node takes the expected value, the sum of probability × child value. With no chance nodes it is exactly Minimax.",
  pseudocode: `Expectiminimax(N):
    if N is a leaf: return e(N)
    if N is MAX:    return max over children C of Expectiminimax(C)
    if N is MIN:    return min over children C of Expectiminimax(C)
    if N is CHANCE: return Σ over children C of P(C) · Expectiminimax(C)`,
  complexity: "Time O(b^d · n^d) for n chance outcomes per roll; no alpha-beta style pruning without bounds on the leaf values",
  learn: {
    "intro": "**Supplementary (Russell & Norvig): not in the course lectures.** In backgammon-like games a die roll lies between your move and the opponent's reply. Expectiminimax adds a third kind of node, the chance node, whose value is the average of its outcomes weighted by their probabilities.",
    "definition": "Leaves hold e(N) for MAX. A MAX node backs up the maximum of its children, a MIN node the minimum, and a chance node the expected value Σ P(C)·v(C), where the probabilities on its outgoing edges sum to 1. The chance nodes do not change whose turn it is: in this studio a chance node sits between a player's move and the next player's node.",
    "steps": [
      [
        "leaf: return e(N)",
        "The static value from MAX's point of view."
      ],
      [
        "MAX node: max of children; MIN node: min of children",
        "As in Minimax."
      ],
      [
        "chance node: Σ probability × child value",
        "The outcome is not chosen by anyone, so we average over it."
      ]
    ],
    "formulas": [
      {
        "f": "v(chance) = Σ over outcomes C of P(C) · v(C)",
        "read": "the expected value of the roll",
        "why": "Neither player controls the dice, so the best estimate of a position before the roll is its average over the outcomes."
      }
    ],
    "why": "Showing that values matter, not just their order: with chance nodes only the numbers (not merely which leaf is bigger) decide the move, so the evaluation function must be a proper scale. Alpha-beta and SSS* in this studio decline trees with chance nodes because their pruning rules assume pure MAX/MIN.",
    "traps": [
      "A chance node's value can be a fraction that is not any leaf's value.",
      "Probabilities on the edges of one chance node must sum to 1.",
      "Minimax would be wrong here: it treats the roll as a choice. Pruning is also harder, because an average is only bounded if the leaf values are."
    ],
    "props": {
      "complete": "yes (finite tree)",
      "optimal": "maximises expected value against an optimal opponent",
      "time": "O(b^d · n^d)",
      "space": "O(b·d)"
    }
  },
  params: [],
  run(P) {
    const steps = [], val = {}, order = [], N = P.nodes;
    let leaves = 0;
    const r = v => Math.round(v * 1e9) / 1e9;
    const rowOf = id => { const n = N[id]; return [id, n.player, n.children.map(c => (n.player === "CHANCE" ? `${N[c].prob}×${val[c]}` : `${c}:${val[c]}`)).join(" "), val[id]]; };
    const snap = (cur, cap) => {
      const nodes = {};
      P.ids.forEach(id => { const n = N[id]; nodes[id] = { state: id in val ? (n.children.length ? "closed" : "visited") : "plain", badge: n.children.length && id in val ? val[id] : undefined }; });
      if (cur) nodes[cur] = Object.assign({}, nodes[cur], { state: "current" });
      steps.push({ caption: cap, nodes, table: { title: "backed-up values", columns: ["node", "kind", "children", "value"], rows: order.map(rowOf), rowStates: order.map((_, i) => (i === order.length - 1 ? "cur" : "")) },
        stats: [{ label: "leaves evaluated", value: leaves }] });
    };
    const em = id => {
      const n = N[id];
      if (!n.children.length) { leaves++; val[id] = n.value; return n.value; }
      const vs = n.children.map(em);
      let cap;
      if (n.player === "CHANCE") { val[id] = r(n.children.reduce((s, c, i) => s + N[c].prob * vs[i], 0)); cap = `CHANCE node ${id}: expected value ${n.children.map((c, i) => `${N[c].prob}×${vs[i]}`).join(" + ")} = ${val[id]}`; }
      else { val[id] = n.player === "MAX" ? Math.max(...vs) : Math.min(...vs); cap = `${n.player} node ${id}: ${n.player === "MAX" ? "max" : "min"}(${vs.join(", ")}) = ${val[id]}`; }
      order.push(id);
      snap(id, cap);
      return val[id];
    };
    snap(null, `Root ${P.root} is ${N[P.root].player}; evaluate depth first, left to right. Chance nodes (circles) average their outcomes by probability`);
    const v = em(P.root);
    const kids = N[P.root].children;
    let best = kids[0];
    kids.forEach(c => { if (N[P.root].player === "MAX" ? val[c] > val[best] : val[c] < val[best]) best = c; });
    const nodes = {}; P.ids.forEach(id => (nodes[id] = { state: "closed", badge: N[id].children.length ? val[id] : undefined }));
    let x = P.root; while (x) { nodes[x].state = "path"; const n = N[x]; if (n.player === "CHANCE") break; let b = n.children[0]; n.children.forEach(c => { if (n.player === "MAX" ? val[c] > val[b] : val[c] < val[b]) b = c; }); x = b; }
    steps.push({ caption: `Expectiminimax value ${v}: ${N[P.root].player} should move to ${best}. ${leaves} leaves evaluated${P.hasChance ? "" : " (no chance nodes, so this equals Minimax)"}.`, nodes, edges: [], table: steps[steps.length - 1].table, stats: [{ label: "value", value: v, state: "ok" }, { label: "leaves evaluated", value: leaves }] });
    return { steps, result: { value: v, leaves, move: best } };
  },
});
