/* SSS* (Stockman): best-first search over solution trees using the OPEN list of (node, status, merit) triples. */
Studio.register({
  id: "game-sss-star",
  name: "SSS*",
  family: "Game playing",
  week: 7,
  problem: "game",
  order: 30,
  summary: "A best-first algorithm for game trees. OPEN holds triples (node, LIVE or SOLVED, merit h). It refines the most promising strategy first and never evaluates a leaf that Alpha-Beta would prune; it can skip leaves Alpha-Beta evaluates.",
  pseudocode: `OPEN ← [(root, LIVE, +∞)]
loop
    (J, s, h) ← triple with the highest merit (ties: leftmost)
    if J = root and s = SOLVED: return h
    if s = LIVE:
        leaf      → insert (J, SOLVED, min(h, e(J)))
        MAX node  → insert (C, LIVE, h) for every child C
        MIN node  → insert (first child, LIVE, h)
    if s = SOLVED:
        J's parent is MAX → insert (parent, SOLVED, h); purge every other descendant of the parent
        J's parent is MIN → next sibling exists: insert (sibling, LIVE, h)
                            else insert (parent, SOLVED, h)`,
  complexity: "Never evaluates more leaves than Alpha-Beta; OPEN can grow to b^(d/2)",
  learn: {
    "intro": "SSS* treats game-tree search as best-first search over strategies. It keeps an OPEN list of node triples and always refines the most promising one, so it never looks at a leaf that alpha-beta would skip, and sometimes skips leaves alpha-beta looks at.",
    "definition": "OPEN holds triples (node, status, merit) where status is LIVE (not yet examined) or SOLVED. Starting from (root, LIVE, +∞), repeatedly take the triple with the highest merit and apply one of the six cases until the root is SOLVED; its merit is the minimax value.",
    "steps": [
      [
        "LIVE leaf",
        "Solve it with merit min(h, e(leaf))."
      ],
      [
        "LIVE MAX node",
        "Add all children as LIVE with the same merit."
      ],
      [
        "LIVE MIN node",
        "Add only the first child: a MIN node is refined one child at a time."
      ],
      [
        "SOLVED node with MAX parent",
        "It is the MAX parent's best alternative (highest merit first), so the parent is solved; purge the parent's other descendants."
      ],
      [
        "SOLVED node with MIN parent",
        "MIN's replies must all be examined: add the next sibling as LIVE, or solve the parent if this was the last child."
      ]
    ],
    "formulas": [
      {
        "f": "merit h = upper bound on the value of the best strategy through the node",
        "read": "how good this line could still be for MAX",
        "why": "Taking the highest merit first is best-first search; the first solved root has the true value."
      }
    ],
    "why": "Dominates alpha-beta in leaves evaluated, at the cost of an OPEN list that can grow large.",
    "traps": [
      "Ties in merit are broken by leftmost position.",
      "When a MAX parent is solved, remove all its other descendants from OPEN."
    ],
    "props": {
      "complete": "yes",
      "optimal": "minimax value",
      "time": "≤ alpha-beta leaves",
      "space": "O(b^(d/2))"
    }
  },
  params: [],
  run(P) {
    const steps = [], N = P.nodes, evaluated = new Set();
    let OPEN = [{ id: P.root, s: "LIVE", h: Infinity }];
    const fmt = v => (v === Infinity ? "+∞" : v);
    const desc = id => { const out = []; const w = x => N[x].children.forEach(c => { out.push(c); w(c); }); w(id); return out; };
    const leafIndex = Object.fromEntries(P.leaves.map((l, i) => [l, i]));
    const firstLeaf = id => { let x = id; while (N[x].children.length) x = N[x].children[0]; return leafIndex[x]; };
    const rows = [];
    const snap = (cur, cap) => {
      const nodes = {}; P.ids.forEach(id => (nodes[id] = { state: evaluated.has(id) ? "visited" : "plain" }));
      OPEN.forEach(t => (nodes[t.id] = { state: t.s === "LIVE" ? "open" : "closed", badge: fmt(t.h) }));
      if (cur) nodes[cur] = Object.assign({}, nodes[cur], { state: "current" });
      steps.push({ caption: cap, nodes, lists: [{ label: "OPEN", items: OPEN.slice().sort((a, b) => b.h - a.h || firstLeaf(a.id) - firstLeaf(b.id)).map(t => ({ text: `(${t.id},${t.s === "LIVE" ? "L" : "S"},${fmt(t.h)})`, state: t.s === "LIVE" ? "open" : "closed" })) }],
        table: { title: "cases applied", columns: ["#", "triple", "case"], rows: rows.slice(-14), rowStates: rows.slice(-14).map((_, i, a) => (i === a.length - 1 ? "cur" : "")) },
        stats: [{ label: "leaves evaluated", value: evaluated.size }] });
    };
    snap(null, `OPEN ← [(${P.root}, LIVE, +∞)]`);
    for (let guard = 0; guard < 2000; guard++) {
      OPEN.sort((a, b) => b.h - a.h || firstLeaf(a.id) - firstLeaf(b.id));
      const t = OPEN.shift(), n = N[t.id];
      const tri = `(${t.id},${t.s === "LIVE" ? "L" : "S"},${fmt(t.h)})`;
      if (t.id === P.root && t.s === "SOLVED") {
        rows.push([rows.length + 1, tri, "root solved: stop"]);
        snap(P.root, `Root solved with value ${t.h}. ${evaluated.size} of ${P.leaves.length} leaves evaluated.`);
        steps[steps.length - 1].stats.unshift({ label: "value", value: t.h, state: "ok" });
        return { steps, result: { value: t.h, leaves: evaluated.size } };
      }
      let note;
      if (t.s === "LIVE") {
        if (!n.children.length) { evaluated.add(t.id); const v = Math.min(t.h, n.value); OPEN.push({ id: t.id, s: "SOLVED", h: v }); note = `leaf, e=${n.value}: solve with min(${fmt(t.h)}, ${n.value}) = ${v}`; }
        else if (n.player === "MAX") { n.children.forEach(c => OPEN.push({ id: c, s: "LIVE", h: t.h })); note = `MAX: add all children ${n.children.join(",")} as LIVE`; }
        else { OPEN.push({ id: n.children[0], s: "LIVE", h: t.h }); note = `MIN: add first child ${n.children[0]} as LIVE`; }
      } else {
        const par = n.parent;
        if (N[par].player === "MAX") { const d = new Set(desc(par)); OPEN = OPEN.filter(x => !d.has(x.id)); OPEN.push({ id: par, s: "SOLVED", h: t.h }); note = `parent ${par} is MAX: this is its best alternative, so solve ${par} with ${t.h} and purge its other descendants`; }
        else {
          const sib = N[par].children, k = sib.indexOf(t.id);
          if (k < sib.length - 1) { OPEN.push({ id: sib[k + 1], s: "LIVE", h: t.h }); note = `parent ${par} is MIN: every reply must be examined, so the next sibling ${sib[k + 1]} becomes LIVE with ${t.h}`; }
          else { OPEN.push({ id: par, s: "SOLVED", h: t.h }); note = `last child of MIN ${par}: solve it with ${t.h}`; }
        }
      }
      rows.push([rows.length + 1, tri, note]);
      snap(t.id, `Pick ${tri}: ${note}`);
    }
    return { steps, result: {} };
  },
});
