/* Sequence alignment by dynamic programming over the alignment lattice (Needleman–Wunsch with costs). */
Studio.register({
  id: "align-dp",
  name: "Sequence alignment (dynamic programming)",
  family: "Sequence alignment",
  week: 6,
  problem: "alignment",
  order: 10,
  summary: "Fill a table D(i,j) = cheapest alignment of the first i letters of a with the first j letters of b, one row at a time, then trace back the optimal path through the lattice.",
  pseudocode: `D(0,0) ← 0;  D(i,0) ← i·gap;  D(0,j) ← j·gap
for i ← 1..m, for j ← 1..n
    D(i,j) ← min( D(i−1,j−1) + cost(aᵢ, bⱼ),     # diagonal: match or mismatch
                  D(i−1,j)   + gap,               # down: aᵢ against a gap
                  D(i,j−1)   + gap )              # right: bⱼ against a gap
trace back from (m,n) choosing a move that produced each value`,
  complexity: "O(m·n) time and space (Hirschberg / frontier ideas cut space to O(n))",
  learn: {
    "intro": "Comparing two DNA strings means lining them up with as few mismatches and gaps as possible. Every alignment is a path through a grid, so the best alignment is a shortest path, and dynamic programming finds it by filling a table.",
    "definition": "D(i,j) is the cheapest alignment of the first i letters of a with the first j letters of b. Fill the table from D(0,0) = 0 using three moves: diagonal (pair two letters), down (a letter of a against a gap), right (a letter of b against a gap). Trace back from D(m,n).",
    "steps": [
      [
        "D(i,0) = i·gap, D(0,j) = j·gap",
        "Aligning a prefix against nothing costs only gaps."
      ],
      [
        "D(i,j) = min of three moves",
        "Diagonal, down or right, each adding its cost."
      ],
      [
        "trace back from (m,n)",
        "Follow the move that produced each value to read the alignment."
      ]
    ],
    "formulas": [
      {
        "f": "D(i,j) = min{ D(i−1,j−1) + c(aᵢ,bⱼ), D(i−1,j) + gap, D(i,j−1) + gap }",
        "read": "best of: pair the letters, gap in b, gap in a",
        "why": "Every alignment of the prefixes ends in exactly one of these three ways, so the minimum over them is optimal (optimal substructure)."
      }
    ],
    "why": "Exact and O(m·n). The same lattice can be searched by A* with an admissible heuristic, or with frontier ideas to cut memory, which is how the course connects alignment to search.",
    "traps": [
      "Costs are minimised here; scoring versions maximise similarity instead.",
      "Off-by-one: row i refers to letter aᵢ, i.e. a[i−1] in code."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes",
      "time": "O(m·n)",
      "space": "O(m·n)"
    }
  },
  params: [],
  run(P) {
    const { a, b, m, n, cost, gapC: g, nid } = P, D = [], back = [], steps = [];
    for (let i = 0; i <= m; i++) { D.push([]); back.push([]); for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) { D[i][j] = 0; back[i][j] = null; continue; }
      const opts = [];
      if (i > 0 && j > 0) opts.push([D[i - 1][j - 1] + cost(i - 1, j - 1), "diag"]);
      if (i > 0) opts.push([D[i - 1][j] + g, "up"]);
      if (j > 0) opts.push([D[i][j - 1] + g, "left"]);
      opts.sort((x, y) => x[0] - y[0]);
      D[i][j] = opts[0][0]; back[i][j] = opts[0][1];
    } }
    const tableAt = (upto, pathSet) => ({ title: "D(i, j)", columns: ["", "–", ...b.split("")],
      rows: D.map((r, i) => [i === 0 ? "–" : a[i - 1], ...r.map((v, j) => (i > upto ? "" : pathSet && pathSet.has(nid(i, j)) ? { t: v, s: "ok" } : i === upto ? { t: v, s: "warn" } : v))]) });
    const latticeNodes = (upto) => Object.fromEntries(P.ids.map(id => { const [i, j] = id.split(",").map(Number); return [id, { state: i < upto ? "closed" : i === upto ? "open" : "plain", label: i <= upto ? String(D[i][j]) : "" }]; }));
    for (let i = 0; i <= m; i++) steps.push({ caption: i === 0 ? `Row 0: aligning nothing of a with the first j letters of b costs j × gap` : `Row ${i} (${a[i - 1]}): each cell takes the cheapest of diagonal (${a[i - 1]} vs bⱼ), down and right (gap ${g})`,
      nodes: latticeNodes(i), table: tableAt(i), stats: [{ label: "rows filled", value: `${i + 1} / ${m + 1}` }] });
    // traceback
    const path = []; let i = m, j = n; const A = [], B = [];
    while (i > 0 || j > 0) { path.push(nid(i, j)); const k = back[i][j]; if (k === "diag") { A.unshift(a[i - 1]); B.unshift(b[j - 1]); i--; j--; } else if (k === "up") { A.unshift(a[i - 1]); B.unshift("-"); i--; } else { A.unshift("-"); B.unshift(b[j - 1]); j--; } }
    path.push(nid(0, 0)); path.reverse();
    const pathSet = new Set(path), edges = [];
    for (let k = 0; k + 1 < path.length; k++) edges.push({ u: path[k], v: path[k + 1], state: "path" });
    const nodes = Object.fromEntries(P.ids.map(id => { const [ii, jj] = id.split(",").map(Number); return [id, { state: pathSet.has(id) ? "path" : "closed", label: String(D[ii][jj]) }]; }));
    steps.push({ caption: `Optimal cost ${D[m][n]}: ${A.join("")} / ${B.join("")}`, nodes, edges, table: tableAt(m, pathSet),
      lists: [{ label: "a", items: A.map(x => ({ text: x, state: "open" })), boxes: true }, { label: "b", items: B.map((x, k) => ({ text: x, state: x === A[k] ? "open" : x === "-" || A[k] === "-" ? "alt" : "bad" })), boxes: true }],
      stats: [{ label: "cost", value: D[m][n], state: "ok" }] });
    return { steps, result: { cost: D[m][n], alignment: [A.join(""), B.join("")] } };
  },
});
