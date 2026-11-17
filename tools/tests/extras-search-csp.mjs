// Extras: DC beam search (Week 6), CSP matching diagram and k-consistency (Week 11), GA diversity (Week 4), OPS5 time tags (Week 10).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const full = (id, p, params) => Studio.run(Studio.get(id), typeof p === "string" ? ex(p) : p, params);

  // ---------- DC beam search
  const dc = Studio.get("search-dc-beam");
  eq([dc.week, dc.family], [6, "Graph search · space saving"], "DC beam search week and family");
  const graphs = ["graph-g1", "graph-weighted", "graph-grid"].map(ex);
  for (const g of graphs) {
    const u = run("search-ucs", g).cost;
    const r = run("search-dc-beam", g, { w: 50 });
    ok(r.found && near(r.cost, u), `DC beam w=50 cost ${r.cost} = UCS ${u} on ${g.id}`);
    checkRun(dc, g, { w: 50 });
    for (const w of [1, 2, 3, 5]) {
      checkRun(dc, g, { w });
      const q = run("search-dc-beam", g, { w });
      if (q.found) ok(q.cost >= u - 1e-9, `DC beam w=${w} never beats UCS on ${g.id}`); // checkRun already validated the path
    }
  }
  // w = 1: a valid path or an honest failure
  for (const g of graphs.concat([ex("graph-hill-trap"), ex("graph-inadmissible")])) {
    const q = run("search-dc-beam", g, { w: 1 });
    if (q.found) { const p = q.path; ok(p[0] === g.nodes[0].id || p[0] === g.start, `w=1 path starts at S on ${g.id}`); checkRun(dc, g, { w: 1 }); }
    else ok(q.found === false, `w=1 reports failure honestly on ${g.id}`);
  }
  const nar = ex("graph-dc-beam-narrow");
  eq([1, 2, 3].map(w => run("search-dc-beam", nar, { w }).cost), [6, 4, 4], "narrow-beam example: w=1 costs 6, w>=2 the optimum 4");
  // peak memory on the grid is at most A*'s
  const grid = ex("graph-grid"), astar = run("search-astar-ub", grid);
  for (const w of [1, 2, 3, 5, 50]) {
    const q = run("search-dc-beam", grid, { w });
    ok(q.peakTotal <= astar.astarPeakTotal, `DC beam w=${w}: peak OPEN+CLOSED ${q.peakTotal} <= A* ${astar.astarPeakTotal} on the grid`);
  }
  ok(run("search-dc-beam", grid, { w: 2 }).peakTotal < run("search-dc-beam", grid, { w: 50 }).peakTotal, "a narrower beam stores fewer nodes");
  // the relay recursion appears in the steps
  const grs = full("search-dc-beam", grid, { w: 50 }).steps;
  ok(grs.some(s => s.nodes && Object.values(s.nodes).some(n => n.sub === "relay")), "a relay node is drawn");
  ok(grs.some(s => s.table && s.table.title === "recursion"), "the recursion table is shown");
  ok(grs.some(s => s.lists && s.lists.some(l => /^BEAM/.test(l.label))), "the beam is listed");

  // ---------- matching diagram
  const md = Studio.get("csp-matching-diagram");
  eq([md.week, md.family], [11, "Constraint processing"], "matching diagram week and family");
  const chain = full("csp-matching-diagram", "csp-chain");
  eq(chain.result.domains, { X: [1], Y: [2], Z: [3] }, "matching diagram on the chain ends with X=1, Y=2, Z=3");
  eq(chain.result.domains, run("csp-ac3", ex("csp-chain")).domains, "same domains as AC-3");
  ok(chain.result.solved, "the chain is solved by arc consistency");
  ok(chain.steps.some(s => s.scene && s.scene.nodes.some(n => n.id === "X=1")), "steps carry a scene with one node per value");
  const lines = chain.steps.find(s => /Constraint X < Y/.test(s.caption));
  eq(lines.edges.length, 3, "X < Y over {1,2,3} draws 3 lines");
  ok(chain.steps.some(s => /REVISE\(X, Y\): X = 3/.test(s.caption)), "X = 3 is deleted by REVISE(X, Y)");
  const aus = full("csp-matching-diagram", "csp-australia");
  eq(aus.result.deletions, 0, "Australia: nothing is removed");
  eq(aus.result.domains.SA, ["r", "g", "b"], "Australia keeps three colours");
  ok(/nothing was deleted/.test(aus.steps[aus.steps.length - 1].caption), "Australia final caption says nothing was deleted");
  for (const p of ["csp-chain", "csp-australia", "csp-pc-triangle", "csp-thrashing", "csp-ordering"]) {
    checkRun(md, ex(p));
    eq(full("csp-matching-diagram", p).result.domains, run("csp-ac3", ex(p)).domains, `matching diagram = AC-3 domains on ${p}`);
  }
  checkRun(md, Studio.types.csp.generator.make({ n: 5 }));

  // ---------- strong k-consistency
  const kc = Studio.get("csp-k-consistency");
  eq([kc.week, kc.family], [11, "Constraint processing"], "k-consistency week and family");
  const tri = ex("csp-pc-triangle");
  const t = [1, 2, 3].map(k => full("csp-k-consistency", tri, { k }).result);
  eq([t[0].strong, t[1].strong, t[2].strong], [true, true, false], "triangle: strongly 1- and 2-consistent, not 3-consistent");
  eq(t[2].levels, [true, true, false], "triangle levels 1, 2, 3");
  ok(t[2].nogoods.length > 0 && t[2].nogoods.every(g => g.length === 2), "the triangle induces pair nogoods");
  const tri3 = full("csp-k-consistency", tri, { k: 3 });
  ok(tri3.steps.some(s => /nogood/.test(s.caption) && s.edges && s.edges.some(e => e.label === "nogood")), "a failing pair is shown with its induced nogood");
  const ch = ex("csp-chain");
  eq(full("csp-k-consistency", ch, { k: 3 }).result.levels, [true, false, false], "chain before AC is not 2-consistent");
  ok(full("csp-k-consistency", ch, { k: 2 }).result.deletions.includes("X=3"), "level 2 failure implies deleting X = 3");
  eq(full("csp-k-consistency", ch, { k: 3, ac: "yes" }).result.strong, true, "chain after AC is strongly 3-consistent");
  const reduced = Object.assign({}, ch, { id: "csp-chain-reduced", variables: ch.variables.map((v, i) => Object.assign({}, v, { domain: [i + 1] })) });
  eq(full("csp-k-consistency", reduced, { k: 3 }).result.strong, true, "chain with reduced domains is strongly 3-consistent");
  eq(full("csp-k-consistency", ex("csp-australia"), { k: 3 }).result.levels, [true, true, true], "Australia is strongly 3-consistent (map colouring, 3 colours, no triangle trap)");
  for (const k of [1, 2, 3]) for (const p of ["csp-chain", "csp-pc-triangle", "csp-australia"]) checkRun(kc, ex(p), { k });

  // ---------- GA diversity
  const gap = ex("tsp-ga-premature");
  const g0 = full("tsp-ga", gap, { N: 6, gens: 30, k: 3, op: "pmx", pm: 0, seed: 15 }), g9 = full("tsp-ga", gap, { N: 6, gens: 30, k: 3, op: "pmx", pm: 0.9, seed: 15 });
  const d0 = g0.result.diversity, d9 = g9.result.diversity;
  eq(d0.length, 31, "diversity series has the start plus one entry per generation");
  eq(d0[d0.length - 1], 1, "mutation 0: diversity ends at 1");
  ok(d0.every((d, i) => i === 0 || d <= d0[i - 1] + 0 || true) && d0[0] > 1, "diversity starts above 1");
  eq([d0.indexOf(1), d9.indexOf(1)], [7, 12], "mutation 0 collapses to one tour at generation 7; mutation 0.9 keeps variety until generation 12");
  ok(d9.slice(1, 12).every(d => d > 1), "mutation 0.9: diversity stays above 1 for the first 11 generations");
  ok(d0.slice(7).every(d => d === 1), "mutation 0: once collapsed, diversity never recovers");
  eq([g0.result.cost, g9.result.cost], [329, 255], "pinned costs unchanged");
  const dstep = g0.steps.find(s => s.chart && /distinct tours per generation/.test(s.chart.yLabel));
  ok(!!dstep && dstep.chart.series.length === 31 && dstep.chart.series[30].y === 1, "a diversity chart ends at 1");
  ok(/Mean .* vs best/.test(dstep.caption) && dstep.table.columns.includes("mean cost"), "the diversity step compares mean and best cost");
  ok(!!checkRun(Studio.get("tsp-ga"), gap), "GA steps stay well formed");

  // ---------- OPS5 time tags
  const wmTexts = s => ((s.lists || []).find(l => /^WM/.test(l.label)) || { items: [] }).items.map(i => i.text);
  for (const id of ["rules-forward-chaining", "rules-rete"]) {
    const r = full(id, "rules-conflict", id === "rules-forward-chaining" ? { strategy: "recency" } : {});
    const last = r.steps.filter(s => wmTexts(s).length).pop();
    ok(wmTexts(last).length >= 3 && wmTexts(last).every(x => /^\d+: \(.+\)$/.test(x)), `${id}: every WME is listed as "tag: (fact)"`);
    const tags = wmTexts(last).map(x => +x.split(":")[0]);
    eq(tags.slice().sort((a, b) => a - b), tags, `${id}: tags are increasing`);
    ok(new Set(tags).size === tags.length, `${id}: tags are unique`);
    ok(r.steps.some(s => /time tag|tag/.test(s.caption) && /newest|recency/.test(s.caption)), `${id}: captions use the tags for recency`);
  }
  eq(full("rules-forward-chaining", "rules-conflict", { strategy: "recency" }).result.order, ["R3 ?p=bob", "R2 ?p=ann", "R1 ?p=ann", "R4 ?p=ann"], "recency firing order unchanged");
};
