/* Waltz algorithm: constraint propagation over Huffman–Clowes junction labellings. */
Studio.register({
  id: "csp-waltz",
  name: "Waltz algorithm",
  family: "Constraint processing",
  week: 11,
  problem: "linedrawing",
  order: 40,
  summary: "Interpret a line drawing of a polyhedral scene. Each junction starts with every labelling its type allows (L, fork, arrow, T); a labelling survives only if each of its lines can get the same label from the junction at the other end. Propagate with an AC-3 style queue.",
  pseudocode: `for each junction J: D(J) ← catalogue labellings for J's type (L 6, fork 5, arrow 3, T 4)
if the background is known: keep only labellings with outer lines as arrows (object on the right)
Q ← every pair of junctions sharing a line
while Q not empty
    (J, K) ← pop(Q)
    delete from D(J) every labelling whose label on line J–K no labelling in D(K) agrees with
    if D(J) shrank: push (I, J) for every other neighbour I of J
labels agree: + with +, − with −, an arrow leaving J with the same arrow entering K`,
  complexity: "Linear in the number of junctions for planar drawings",
  learn: {
    "intro": "How do we see 3D shapes in a line drawing? Waltz showed that each junction of lines allows only a few physical interpretations, and that neighbouring junctions must agree. Propagating that agreement usually leaves a single interpretation.",
    "definition": "Lines get labels: + (convex edge), − (concave edge) or an arrow (occluding boundary, object on the right). Each junction type (L, fork, arrow, T) has a catalogue of allowed labellings (6, 5, 3, 4: the Huffman–Clowes catalogue). Waltz filtering is arc consistency between junctions that share a line.",
    "steps": [
      [
        "classify junctions by geometry",
        "Two lines: L. Three: fork (all angles < 180°), arrow (one angle > 180°), T (two lines collinear)."
      ],
      [
        "start with full catalogues",
        ""
      ],
      [
        "background constraint",
        "Outer boundary lines are arrows going clockwise around the object."
      ],
      [
        "propagate",
        "Delete labellings that no labelling at the other end of a line agrees with."
      ]
    ],
    "formulas": [
      {
        "f": "18 junction labellings: L 6, fork 5, arrow 3, T 4",
        "read": "the Huffman–Clowes catalogue for trihedral scenes",
        "why": "Only these arise from corners where three planes meet, viewed generically."
      },
      {
        "f": "agree(+,+), agree(−,−), agree(→ leaving J, → entering K)",
        "read": "a line has one label seen from both ends",
        "why": "This is the binary constraint propagated between junctions."
      }
    ],
    "why": "Constraint propagation instead of search: the cube drawing becomes unambiguous once the background is fixed. Without that, several interpretations survive.",
    "traps": [
      "Arrow labels are relative to direction: 'out' at one end is 'in' at the other.",
      "Arc consistency can leave several labellings; a search step picks among them."
    ],
    "props": {
      "complete": "filtering only",
      "optimal": "n/a",
      "time": "linear for planar drawings",
      "space": "O(junctions)"
    }
  },
  params: [],
  run(P) {
    const W = Studio.waltzLib, steps = [];
    const D = Object.fromEntries(P.ids.map(id => [id, P.J[id].labels.slice()]));
    const agree = (lj, lk) => (lj === "+" || lj === "-" ? lj === lk : lk === W.flip(lj));
    const lineLabel = (a, b) => { const s = new Set(D[a].map(l => l[b])); return s; };
    const sym = (a, b) => { const s = [...lineLabel(a, b)]; if (s.length !== 1) return { label: s.length ? s.map(W.sym).join("") : "∅", state: "faint" };
      const l = s[0]; if (l === "+" || l === "-") return { label: W.sym(l), state: l === "+" ? "path" : "candidate" };
      return { label: "", state: "boundary", arrowMid: true, dir: l === "out" ? [a, b] : [b, a] }; };
    const drawEdges = () => P.edges.map(([a, b]) => { const s = sym(a, b); const [u, v] = s.dir || [a, b]; return { u, v, state: s.state, label: s.label, arrowMid: s.arrowMid }; });
    const rows = [];
    const snap = (cur, cap, Q) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(id => [id, { state: id === cur ? "current" : D[id].length === 1 ? "path" : D[id].length === 0 ? "goal" : "plain", badge: D[id].length }])),
      edges: drawEdges(),
      table: { title: "junctions (labels listed counter-clockwise)", columns: ["junction", "type", "remaining labellings"], rows: P.ids.map(id => [id, P.J[id].type, D[id].map(l => P.J[id].order.map(q => W.sym(l[q])).join("")).join("  ") || "none"]), rowStates: P.ids.map(id => (D[id].length === 1 ? "ok" : D[id].length === 0 ? "bad" : id === cur ? "cur" : "")) },
      lists: Q ? [{ label: "QUEUE", items: Q.slice(0, 12).map(([j, k]) => ({ text: `${j}←${k}`, state: "open" })).concat(Q.length > 12 ? [{ text: `+${Q.length - 12}`, state: "dim" }] : []) }] : [],
      stats: [{ label: "labellings left", value: P.ids.reduce((s, id) => s + D[id].length, 0) }] });
    snap(null, `Junction types from the geometry: ${P.ids.map(id => id + " " + P.J[id].type).join(", ")}. Each starts with its full catalogue.`);
    if (P.useBoundary && Object.keys(P.boundary).length) {
      for (const [k, [u, v]] of Object.entries(P.boundary)) { D[u] = D[u].filter(l => l[v] === "out"); D[v] = D[v].filter(l => l[u] === "in"); }
      snap(null, "Background constraint: every outer line is an occluding boundary with the object on its right (arrows run clockwise around the outline)");
    }
    const Q = []; P.edges.forEach(([a, b]) => { Q.push([a, b]); Q.push([b, a]); });
    snap(null, `Queue all ${Q.length} junction pairs`, Q);
    while (Q.length) {
      const [j, k] = Q.shift();
      const before = D[j].length;
      D[j] = D[j].filter(l => D[k].some(m => agree(l[k], m[j])));
      if (D[j].length < before) { P.ids.filter(i => i !== k && P.edges.some(e => e.includes(i) && e.includes(j))).forEach(i => { if (!Q.some(([x, y]) => x === i && y === j)) Q.push([i, j]); }); }
      snap(j, `Check ${j} against ${k}: ${before - D[j].length ? `delete ${before - D[j].length} labelling${before - D[j].length > 1 ? "s" : ""}, ${D[j].length} left` : "nothing to delete"}`, Q);
    }
    const unique = P.ids.every(id => D[id].length === 1);
    snap(null, unique ? "Every junction has a single labelling: one consistent interpretation of the drawing" : `Filtering is done but ${P.ids.filter(id => D[id].length > 1).join(", ")} still have several labellings: more than one interpretation fits`);
    return { steps, result: { labellings: Object.fromEntries(P.ids.map(id => [id, D[id].length])), unique } };
  },
});
