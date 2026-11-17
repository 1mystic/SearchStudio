// Audit "graph-b": Weeks 5, 6, 12 graph search and sequence alignment. Every behaviour a learner should SEE is pinned here.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const gw = ex("graph-weighted"), gi = ex("graph-inadmissible"), gd = ex("graph-dijkstra"), gt = ex("graph-t"), grid = ex("graph-grid");
  const gr = ex("graph-reopen"), gs = ex("graph-rbfs-switch");
  const captions = (id, p, q = {}) => Studio.run(Studio.get(id), p, q).steps.map(s => s.caption);
  const P = p => Studio.prepare(p);

  // ---- reference: true remaining cost h* and the optimal cost, by a hand-written Bellman-Ford (not the tracer's code)
  const hstar = p => {
    const d = {}; p.nodes.forEach(n => (d[n.id] = Infinity)); d[p.goal] = 0;
    for (let i = 0; i < p.nodes.length; i++) for (const [a, b, w] of p.edges) { if (d[b] + w < d[a]) d[a] = d[b] + w; if (!p.directed && d[a] + w < d[b]) d[b] = d[a] + w; }
    return d;
  };
  const optimum = p => hstar(p)[p.start];
  const admissible = p => { const d = hstar(p); return p.nodes.every(n => n.h <= d[n.id] + 1e-9); };
  const monotoneViolations = p => { const v = []; for (const [a, b, w] of p.edges) { const hh = Object.fromEntries(p.nodes.map(n => [n.id, n.h])); if (hh[a] > w + hh[b]) v.push(a + "→" + b); if (!p.directed && hh[b] > w + hh[a]) v.push(b + "→" + a); } return v; };

  // ---- new examples are what their notes say
  eq([optimum(gr), admissible(gr), monotoneViolations(gr)], [5, true, ["B→C"]], "graph-reopen: C* = 5, h admissible, exactly one non-monotone edge B→C");
  eq([optimum(gs), admissible(gs), monotoneViolations(gs)], [7, true, []], "graph-rbfs-switch: C* = 7, h admissible and monotone");
  for (const g of [gr, gs]) { ok(!!g.note && g.note.length > 40, `${g.id} has a note`); for (const id of ["search-ucs", "search-astar", "search-ida-star", "search-rbfs", "search-dfbnb", "search-bfhs", "search-smgs", "search-weighted-astar"]) checkRun(Studio.get(id), g); }

  // ---- A* optimal with admissible h, not with inadmissible h
  eq([run("search-astar", gw).cost, run("search-ucs", gw).cost], [12, 12], "A* with admissible h on graph-weighted = 12 = UCS");
  eq([run("search-astar", gi).cost, run("search-astar", gi).path.join("")], [13, "SACEG"], "A* with inadmissible h(B) = 12 returns SACEG = 13");
  eq(run("search-ucs", gi).cost, 12, "the optimum on the inadmissible graph is 12 (UCS)");
  eq(optimum(gi), 12, "reference optimum 12 on the inadmissible graph");
  ok(!admissible(gi) && admissible(gw), "h(B) = 12 is inadmissible (h* = 9), the weighted-graph h is admissible");
  ok(run("search-astar", gw).expanded < run("search-ucs", gw).expanded, "A* expands fewer nodes than UCS on graph-weighted");
  for (const id of ["search-ida-star", "search-rbfs", "search-dfbnb", "search-astar-ub", "search-bfhs", "search-smgs"]) ok(run(id, gi).cost >= 12, `${id} on the inadmissible graph does not beat the optimum`);

  // ---- A* reopens a CLOSED node when h is admissible but not monotone; the monotone check flags it
  const ar = run("search-astar", gr), arc = captions("search-astar", gr);
  eq([ar.path.join(""), ar.cost], ["SABCG", 5], "A* on graph-reopen is still optimal (S-A-B-C-G = 5)");
  const reopenIdx = arc.findIndex(c => /C: cheaper path via B \(g 4 → 3\), so CLOSED node C is REOPENED/.test(c));
  ok(reopenIdx > 0, "A* caption announces that CLOSED node C is reopened with g 4 → 3 via B");
  const firstC = arc.findIndex(c => /^Expand C:/.test(c)), secondC = arc.findIndex((c, i) => i > firstC && /^Expand C:/.test(c));
  ok(firstC > 0 && secondC > reopenIdx, "C is expanded twice: once before and once after the reopening");
  eq(arc.filter(c => /^Expand C:/.test(c)).length, 2, "exactly two expansions of C");
  ok(!captions("search-astar", gw).some(c => /REOPENED/.test(c)) && !captions("search-astar", gd).some(c => /REOPENED/.test(c)), "no reopening with a monotone h");
  const mc = run("search-monotone-check", gr);
  eq([mc.admissible, mc.monotone], [true, false], "monotone check on graph-reopen: admissible but NOT monotone");
  const mcSteps = Studio.run(Studio.get("search-monotone-check"), gr, {}).steps;
  ok(/B→C/.test(mcSteps[1].caption) && mcSteps[1].edges.some(e => e.state === "rejected"), "monotone check names B→C and marks the edge");
  eq(mcSteps[1].table.rows.filter(r => r[3] === "NO").map(r => r[0]), ["B→C"], "only the edge B→C violates the condition");
  eq([run("search-monotone-check", gw).monotone, run("search-monotone-check", gw).admissible], [true, true], "weighted graph: admissible and monotone");
  eq([run("search-monotone-check", gi).admissible], [false], "inadmissible example flagged");
  // frontier search assumes a monotone h: it cannot reopen C and returns the worse path
  eq([run("search-frontier", gr).cost, run("search-frontier", gr).path.join("")], [6, "SCG"], "frontier search on a non-monotone h returns S-C-G = 6 (cannot reopen)");
  for (const id of ["search-ida-star", "search-rbfs", "search-dfbnb", "search-bfhs", "search-smgs", "search-astar-ub"]) eq(run(id, gr).cost, 5, `${id} stays optimal on graph-reopen`);
  // random check: whenever A* reopens on random graphs it still equals the optimum when h is admissible
  for (const [n, seed] of [[8, 1], [10, 2], [12, 3], [14, 5], [9, 7]]) { const g = Studio.generators.graph({ n, seed }); if (admissible(g)) eq(run("search-astar", g).cost, optimum(g), `A* optimal on random graph n=${n} seed=${seed}`); }

  // ---- weighted A*: cost vs expansions within w·C*
  const w2 = run("search-weighted-astar", gd, { weight: 2 }), a1 = run("search-astar", gd);
  eq([w2.cost, w2.path.join(""), w2.expanded], [9, "SCG", 3], "weighted A* w=2 on the Dijkstra demo: S-C-G = 9 after 3 expansions");
  eq([a1.cost, a1.expanded], [8, 5], "A* on the Dijkstra demo: 8 after 5 (incl. goal)");
  ok(w2.cost > a1.cost && w2.expanded < a1.expanded && w2.cost <= 2 * a1.cost && w2.withinBound, "weighted A*: worse cost, fewer expansions, within w·C*");
  const wg = run("search-weighted-astar", grid, { weight: 2 });
  ok(wg.expanded === 8 && run("search-astar", grid).expanded === 20 && wg.cost === 7, "grid: w=2 expands 8 nodes against 20 and keeps cost 7");
  ok(/w·C\* = 2 × 8 = 16/.test(captions("search-weighted-astar", gd, { weight: 2 }).at(-1)), "weighted A* final caption states the bound w·C* = 16");
  eq(run("search-weighted-astar", gd, { weight: 1 }).cost, 8, "w = 1 gives back the optimum");

  // ---- IDA*: bound sequence
  const ida = Studio.run(Studio.get("search-ida-star"), gs, {}), rows = ida.steps.at(-1).table.rows;
  eq(rows.map(r => r[0]), ["5", "6", "7"], "IDA* bound sequence on graph-rbfs-switch is 5, 6, 7");
  eq(rows.map(r => r[1]), [2, 3, 3], "IDA* expansions per round 2, 3, 3");
  eq([ida.result.cost, ida.result.expanded], [7, 8], "IDA* total 8 expansions (A* 4)");
  eq(ida.steps.filter(s => /^Round \d over/.test(s.caption)).map(s => /next bound is (\S+);/.exec(s.caption)[1]), ["6", "7"], "IDA* announces the next bound after each failed round (6 then 7)");
  const idd = Studio.run(Studio.get("search-ida-star"), gd, {}).steps.at(-1).table.rows.map(r => r[0]);
  ok(idd.length >= 3 && idd.every((b, i) => i === 0 || +b > +idd[i - 1]), `IDA* bounds strictly increase on the Dijkstra demo (${idd})`);
  eq(Studio.run(Studio.get("search-ida-star"), gd, {}).steps.at(-1).table.rows[0][0], String(gd.nodes.find(n => n.id === "S").h), "first bound is h(S)");

  // ---- RBFS: backed-up values and re-expansion
  const rb = Studio.run(Studio.get("search-rbfs"), gs, {}), rbc = rb.steps.map(s => s.caption);
  eq([rb.result.cost, rb.result.expanded, rb.result.reexpanded], [7, 5, 1], "RBFS on graph-rbfs-switch: cost 7, 5 expansions, 1 repeated");
  ok(rbc.some(c => /back up 7 to A/.test(c)) && rbc.some(c => /back up 8 to B/.test(c)), "RBFS backs up 7 to A and 8 to B");
  ok(rbc.some(c => /Back at S: A now has backed-up F=7/.test(c)) && rbc.some(c => /Back at S: B now has backed-up F=8/.test(c)), "RBFS shows the backed-up F values at S");
  eq(rbc.filter(c => /^Expand A /.test(c)).length, 2, "A is expanded twice");
  ok(/^Expand A AGAIN/.test(rbc.find(c => /AGAIN/.test(c))), "second expansion of A is labelled AGAIN");
  eq(run("search-astar", gs).expanded, 5, "A* picks 5 nodes (S, A, B, C, goal G) on the same graph, each expanded once");
  eq(run("search-rbfs", gd).cost, 8, "RBFS optimal on the Dijkstra demo");

  // ---- DFBnB: bound U shrinks and prunes
  const bb = Studio.run(Studio.get("search-dfbnb"), gw, {}), bbc = bb.steps.map(s => s.caption);
  eq([bb.result.cost, bb.result.improvements, bb.result.pruned, bb.result.expanded], [12, 2, 6, 6], "DFBnB on the weighted graph: U improves twice, 6 prunes");
  ok(bbc.some(c => /U ← 13/.test(c)) && bbc.some(c => /U ← 12/.test(c)), "U goes 13 then 12");
  ok(bbc.filter(c => /^Prune/.test(c)).every(c => /≥ U = 1[23]/.test(c)), "every prune is justified by g + h ≥ U");
  const gOnly = run("search-dfbnb", gw, { useH: "g" });
  eq(gOnly.cost, 12, "DFBnB without h is still optimal"); ok(gOnly.expanded >= bb.result.expanded, "without h the search expands at least as many nodes");

  // ---- Dijkstra relaxation and B&B duplicates
  const dj = run("search-dijkstra", gd);
  ok(dj.relaxations.includes("G: ∞ → 9 via C") && dj.relaxations.includes("G: 9 → 8 via D"), "Dijkstra relaxes G ∞ → 9 → 8");
  ok(captions("search-ucs", gd).some(c => /G: cheaper path via D \(g 9 → 8\)/.test(c)), "UCS shows the same improvement as 'cheaper path'");
  const bt = run("search-branch-and-bound", gt);
  eq(bt.counts, { S: 1, A: 2, B: 2, G: 3 }, "B&B duplicate counts on graph T");
  ok(Studio.run(Studio.get("search-branch-and-bound"), gt, {}).steps.some(s => /already occur/.test(s.caption)), "B&B caption says duplicates are kept");
  const bg = run("search-branch-and-bound", grid);
  ok(bg.treeSize > 20 * 10, `B&B tree on the grid (${bg.treeSize} nodes) dwarfs its 20 states`);
  eq(run("search-british-museum", gd).paths, 3, "British Museum: 3 simple paths on the Dijkstra demo");

  // ---- space saving: memory against A*
  const sg = id => run(id, grid);
  const astarTotal = sg("search-astar-ub").astarPeakTotal, astarClosed = sg("search-astar-ub").astarClosed;
  eq([astarTotal, astarClosed], [20, 19], "A* yardstick on the grid: 20 nodes, 19 CLOSED");
  eq(sg("search-frontier").peakTotal, 5, "frontier search holds at most 5 nodes on the grid (A* 20)");
  eq(sg("search-frontier").peakClosed, 0, "frontier search stores no CLOSED");
  eq([sg("search-bfhs").peakClosed, sg("search-dc-bfhs").peakClosed], [8, 9], "BFHS / DC-BFHS peak CLOSED 8 / 9 against 19");
  eq([sg("search-smgs").peakClosed, sg("search-smgs").pruned], [17, 9], "SMGS: peak CLOSED 17, 9 nodes deleted");
  ok(sg("search-beam-stack").peakTotal < astarTotal && sg("search-beam-stack").expanded > run("search-astar", grid).expanded, "beam stack: less memory than A*, more expansions");
  for (const id of ["search-frontier", "search-bfhs", "search-dc-bfhs", "search-smgs", "search-beam-stack", "search-dcfs"]) eq(sg(id).cost, 7, `${id} still optimal on the grid`);
  const dcg = Studio.run(Studio.get("search-dcfs"), grid, {});
  ok(Math.max(...dcg.steps.filter(s => s.lists).map(s => s.lists[0].items.length)) <= 6, "DCFS OPEN never holds more than 6 nodes on the grid");
  eq(dcg.result.expanded, 66, "DCFS total expansions 66 (A* 20): time is traded for memory");
  const ub = run("search-astar-ub", gd);
  eq([ub.U, ub.peakOpen, ub.astarPeakOpen, ub.peakTotal, ub.astarPeakTotal], [9, 2, 3, 5, 6], "A* with U on the Dijkstra demo: OPEN 2 against 3");

  // ---- default examples are valid, accepted by the algorithm, and say what the learn text says
  const want = { "search-astar": "graph-weighted", "search-ucs": "graph-dijkstra", "search-dijkstra": "graph-dijkstra", "search-branch-and-bound": "graph-t", "search-british-museum": "graph-dijkstra",
    "search-weighted-astar": "graph-dijkstra", "search-heuristic-comparison": "graph-weighted", "search-ida-star": "graph-rbfs-switch", "search-rbfs": "graph-rbfs-switch", "search-dfbnb": "graph-weighted",
    "search-monotone-check": "graph-reopen", "search-astar-ub": "graph-dijkstra", "search-bfhs": "graph-grid", "search-dc-bfhs": "graph-grid", "search-beam-stack": "graph-grid", "search-smgs": "graph-grid",
    "search-frontier": "graph-grid", "search-dcfs": "graph-grid", "align-astar": "align-similar" };
  for (const [id, e] of Object.entries(want)) { const a = Studio.get(id); eq(a.defaultExample, e, `${id} default example`); const p = ex(e); ok(!!p && p.type === a.problem, `${id}: default example exists with the right type`); ok(!!checkRun(a, p), `${id} runs on its default example`); }
  const heur = run("search-heuristic-comparison", gw);
  ok(heur.expandedHstar <= heur.expandedGiven && heur.expandedGiven <= heur.expandedH0, "heuristic comparison: h* ≤ h ≤ 0 expansions");
  eq([heur.expandedH0, heur.expandedGiven, heur.expandedHstar], [8, 5, 4], "heuristic comparison expansions 8 / 5 / 4 on the weighted graph");

  // ---- every learn trap that names an example names a real one
  const exNames = Studio.examples.map(e => e.name);
  for (const id of Object.keys(want)) { const t = JSON.stringify(Studio.get(id).learn); for (const m of t.matchAll(/'([^']{12,90})'/g)) { if (/example|graph|Graph|vs |Weighted|inadmissible|monotone|RBFS|Dijkstra demo/.test(m[1]) && /^[A-Z0-9]/.test(m[1])) { const hit = exNames.some(n => n.startsWith(m[1].split("...")[0]) || m[1].startsWith(n.split(":")[0])); if (!hit && !/Admissibility|Frontier|Same graph|Grid|h = 0|g only/.test(m[1])) ok(false, `${id}: learn quotes '${m[1]}' which is not an example name`); } } }

  // ---- sequence alignment
  const editDist = (a, b, mt, mm, g) => { const D = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j * g : j === 0 ? i * g : 0)));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) D[i][j] = Math.min(D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? mt : mm), D[i - 1][j] + g, D[i][j - 1] + g); return D[a.length][b.length]; };
  const pairs = [["GATTACA", "GCATGCU", 0, 1, 1], ["ACGTC", "AGTC", 0, 3, 2], ["ACGTTGCAAT", "ACGTAGCAAT", 0, 1, 1], ["ACGTAC", "TGCATG", 0, 1, 1], ["ACGT", "AGT", 0, 5, 1], ["ACGTACGTAC", "ACG", 0, 1, 1], ["AAAA", "TT", 1, 2, 3], ["GA", "GATTACA", 0, 2, 1], ["ABAB", "BABA", 0, 1, 2]];
  for (const [a, b, mt, mm, g] of pairs) {
    const p = { id: `al-${a}-${b}`, type: "alignment", a, b, match: mt, mismatch: mm, gap: g }, want = editDist(a, b, mt, mm, g);
    const d = run("align-dp", p), s = run("align-astar", p);
    eq([d.cost, s.cost], [want, want], `alignment ${a}/${b}: DP and A* equal the reference ${want}`);
    for (const r of [d, s]) { const [A, B] = r.alignment; ok(A.replace(/-/g, "") === a && B.replace(/-/g, "") === b && A.length === B.length, `alignment ${a}/${b}: rows spell the sequences`);
      let c = 0; for (let i = 0; i < A.length; i++) c += A[i] === "-" || B[i] === "-" ? g : A[i] === B[i] ? mt : mm; eq(c, want, `alignment ${a}/${b}: printed alignment costs ${want}`); }
    checkRun(Studio.get("align-dp"), p); checkRun(Studio.get("align-astar"), p);
  }
  const sim = run("align-astar", ex("align-similar")), unr = run("align-astar", ex("align-unrelated")), gat = run("align-astar", ex("align-gattaca"));
  eq([sim.cost, sim.expanded, sim.lattice], [1, 11, 121], "align-similar: A* expands 11 of 121 lattice points, cost 1");
  eq([unr.cost, unr.expanded, unr.lattice], [5, 19, 49], "align-unrelated: cost 5, 19 of 49 points");
  ok(sim.expanded / sim.lattice < 0.1 && unr.expanded / unr.lattice > 0.3, "similar sequences need a far smaller fraction of the lattice than unrelated ones");
  eq([gat.cost, gat.expanded], [4, 16], "GATTACA/GCATGCU: cost 4, 16 of 64 points");
  eq(run("align-dp", ex("align-short")).alignment, ["ACGTC", "A-GTC"], "ACGTC vs AGTC with gap 2, mismatch 3: one gap, A-GTC");
  eq(run("align-dp", ex("align-short")).cost, 2, "align-short cost 2");
  ok(/A\* expanded 11 of the 121 lattice points/.test(Studio.run(Studio.get("align-astar"), ex("align-similar"), {}).steps.at(-1).caption), "A* alignment final caption compares with the full table");
  ok(/The table needed all 121 cells/.test(Studio.run(Studio.get("align-dp"), ex("align-similar"), {}).steps.at(-1).caption), "DP final caption states the table size");
  ok(Studio.run(Studio.get("align-astar"), ex("align-similar"), {}).steps[1].caption.includes("least f"), "A* alignment captions say why a point is expanded");
  eq(run("align-dp", ex("align-similar")).alignment, ["ACGTTGCAAT", "ACGTAGCAAT"], "similar: the single mismatch T/A, no gaps");
  // h is admissible on the lattice: never above the true remaining cost (checked with a reverse DP)
  for (const [a, b, mt, mm, g] of pairs) { for (let i = 0; i <= a.length; i++) for (let j = 0; j <= b.length; j++) { const rest = editDist(a.slice(i), b.slice(j), mt, mm, g); if (g * Math.abs((a.length - i) - (b.length - j)) > rest) ok(false, `h(${i},${j}) overestimates on ${a}/${b}`); } }
  ok(true, "alignment h never overestimates the remaining cost");
};
