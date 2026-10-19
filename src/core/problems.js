/* Problem generators and layout helpers. */
(function (root) {
  "use strict";
  const Studio = root.Studio;

  Studio.generators = {
    /* n random cities on a 10 × 6 plane, distance = round(scale × Euclidean) */
    tsp({ n = 7, seed = 1, scale = 10 } = {}) {
      n = Math.max(3, Math.min(26, n | 0));
      const r = Studio.rng(seed), ids = Studio.labelsFor(n), cities = [];
      let tries = 0;
      while (cities.length < n && tries++ < 5000) {
        const x = Math.round(r() * 100) / 10, y = Math.round(r() * 60) / 10;
        if (cities.every(c => Math.hypot(c.x - x, c.y - y) > 1.2)) cities.push({ id: ids[cities.length], x, y });
      }
      return { id: `random-tsp-${n}-${seed}`, type: "tsp", name: `Random TSP · ${n} cities · seed ${seed}`, cities, scale, generated: { kind: "tsp", n, seed } };
    },
    /* Connected planar-ish graph: k nearest neighbours + spanning tree; costs ≥ straight-line, h = straight-line to goal (admissible and consistent) */
    graph({ n = 9, seed = 1, k = 3, slack = 0.4, scale = 1 } = {}) {
      n = Math.max(3, Math.min(26, n | 0));
      const r = Studio.rng(seed), ids = n <= 26 ? Studio.labelsFor(n) : [];
      const cols = Math.ceil(Math.sqrt(n * 1.7)), rows = Math.ceil(n / cols), nodes = [];
      const cells = r.shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n).sort((a, b) => (a % cols) - (b % cols) || a - b);
      cells.forEach((cell, i) => {
        const cx = cell % cols, cy = Math.floor(cell / cols);
        nodes.push({ id: "", x: Math.round((cx * 2 + 0.4 + r() * 1.2) * 10) / 10, y: Math.round((cy * 2 + 0.4 + r() * 1.2) * 10) / 10 });
      });
      nodes.sort((a, b) => a.x - b.x || a.y - b.y);
      const start = 0, goal = n - 1;
      nodes.forEach((nd, i) => { nd.id = i === start ? "S" : i === goal ? "G" : null; });
      let li = 0; const letters = Studio.labelsFor(26).filter(c => c !== "S" && c !== "G");
      nodes.forEach(nd => { if (!nd.id) nd.id = letters[li++]; });
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const E = new Map();
      const add = (i, j) => { const key = i < j ? i + "-" + j : j + "-" + i; if (!E.has(key) && i !== j) E.set(key, [Math.min(i, j), Math.max(i, j)]); };
      nodes.forEach((a, i) => nodes.map((b, j) => [dist(a, b), j]).filter(([, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, k).forEach(([, j]) => add(i, j)));
      // spanning tree (Prim) guarantees connectivity
      const inT = new Set([0]);
      while (inT.size < n) {
        let best = null;
        for (const i of inT) for (let j = 0; j < n; j++) if (!inT.has(j)) { const dd = dist(nodes[i], nodes[j]); if (!best || dd < best[0]) best = [dd, i, j]; }
        add(best[1], best[2]); inT.add(best[2]);
      }
      // drop the longest edges that cross others too much: keep it simple, cap degree at 4
      const deg = Array(n).fill(0); const edges = [];
      [...E.values()].sort((a, b) => dist(nodes[a[0]], nodes[a[1]]) - dist(nodes[b[0]], nodes[b[1]])).forEach(([i, j]) => {
        const tree = true; // all edges kept, degree cap only for non-essential ones handled by k
        deg[i]++; deg[j]++;
        const w = Math.max(1, Math.ceil(dist(nodes[i], nodes[j]) * scale * (1 + r() * slack)));
        edges.push([nodes[i].id, nodes[j].id, w]);
      });
      const g = nodes[goal];
      nodes.forEach(nd => { nd.h = Math.floor(dist(nd, g) * scale); });
      return { id: `random-graph-${n}-${seed}`, type: "graph", name: `Random graph · ${n} nodes · seed ${seed}`, nodes, edges, start: "S", goal: "G", directed: false, generated: { kind: "graph", n, seed } };
    },
  };

  /* Screen layout: use given coordinates, else a circle. Returns {id: [x, y]} in a 0..1 box. */
  Studio.layout = function (P) {
    const pts = P.type === "tsp" ? P.cities : P.nodes;
    const has = pts.every(c => typeof c.x === "number" && typeof c.y === "number");
    const out = {};
    if (!has) {
      const n = pts.length;
      pts.forEach((c, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; out[c.id] = [0.5 + 0.45 * Math.cos(a), 0.5 + 0.45 * Math.sin(a)]; });
      return { pos: out, aspect: 1 };
    }
    const xs = pts.map(c => c.x), ys = pts.map(c => c.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(1e-9, x1 - x0), h = Math.max(1e-9, y1 - y0);
    // y axis: data "up" is screen "up" for TSP points (math convention); graphs are given in screen coordinates
    const flip = P.type === "tsp" && P.yUp !== false;
    pts.forEach(c => { out[c.id] = [(c.x - x0) / w, flip ? 1 - (c.y - y0) / h : (c.y - y0) / h]; });
    return { pos: out, aspect: Math.max(0.35, Math.min(1.2, h / w)) };
  };

  /* Problem <-> text helpers for the editor */
  Studio.problemToText = function (p) {
    if (p.type === "tsp") {
      const P = Studio.prepare(p);
      return P.ids.join(" ") + "\n" + P.M.map((r, i) => r.join(" ")).join("\n");
    }
    const lines = [`start ${p.start}`, `goal ${p.goal || ""}`.trim(), p.directed ? "directed" : "undirected"];
    lines.push("# heuristic: node h");
    p.nodes.forEach(nd => lines.push(`h ${nd.id} ${nd.h ?? 0}`));
    lines.push("# edges: u v cost");
    p.edges.forEach(([u, v, w]) => lines.push(`${u} ${v} ${w}`));
    return lines.join("\n");
  };

  Studio.textToProblem = function (text, type, base = {}) {
    const lines = text.split(/\n/).map(s => s.replace(/#.*/, "").trim()).filter(Boolean);
    if (type === "tsp") {
      const ids = lines[0].split(/[\s,;]+/).filter(Boolean);
      const M = lines.slice(1).map(l => l.split(/[\s,;]+/).filter(Boolean).map(v => (v === "-" || v === "·" ? 0 : Number(v))));
      if (M.length !== ids.length) throw new Error(`The first line names ${ids.length} cities but there are ${M.length} matrix rows`);
      const cities = ids.map(id => { const old = (base.cities || []).find(c => c.id === id); return old ? { id, x: old.x, y: old.y } : { id }; });
      const keepXY = cities.every(c => c.x !== undefined);
      return { id: base.id || "custom-tsp", type: "tsp", name: base.name || "My TSP", cities: keepXY ? cities : ids.map(id => ({ id })), matrix: M };
    }
    const p = { id: base.id || "custom-graph", type: "graph", name: base.name || "My graph", nodes: [], edges: [], directed: false };
    const nodeMap = new Map((base.nodes || []).map(nd => [nd.id, { ...nd }]));
    const ensure = id => { if (!nodeMap.has(id)) nodeMap.set(id, { id }); return nodeMap.get(id); };
    const seen = new Set();
    for (const l of lines) {
      const t = l.split(/[\s,;]+/);
      if (t[0] === "start") { p.start = t[1]; ensure(t[1]); seen.add(t[1]); }
      else if (t[0] === "goal") { p.goal = t[1]; if (t[1]) { ensure(t[1]); seen.add(t[1]); } }
      else if (t[0] === "directed") p.directed = true;
      else if (t[0] === "undirected") p.directed = false;
      else if (t[0] === "h") { ensure(t[1]).h = Number(t[2]); seen.add(t[1]); }
      else if (t.length >= 2) { ensure(t[0]); ensure(t[1]); seen.add(t[0]); seen.add(t[1]); p.edges.push([t[0], t[1], t.length > 2 ? Number(t[2]) : 1]); }
    }
    p.nodes = [...nodeMap.values()].filter(nd => seen.has(nd.id));
    if (!p.nodes.every(nd => nd.x !== undefined)) p.nodes = p.nodes.map(({ id, h }) => ({ id, h }));
    return p;
  };
  Studio.registerType({ type: "tsp", label: "TSP", plural: "travelling salesperson problems",
    validate: p => Studio.validateProblem(p), prepare: p => Studio.prepare(p),
    toText: p => Studio.problemToText(p), fromText: (txt, base) => Studio.textToProblem(txt, "tsp", base),
    help: "First line: city names. Then one matrix row per city.",
    generator: { params: [{ key: "n", label: "Cities", default: 7, min: 3, max: 12 }], make: o => Studio.generators.tsp(o) },
    describe: p => `${p.cities.length} cities` });
  Studio.registerType({ type: "graph", label: "graph", plural: "state-space graphs",
    validate: p => Studio.validateProblem(p), prepare: p => Studio.prepare(p),
    toText: p => Studio.problemToText(p), fromText: (txt, base) => Studio.textToProblem(txt, "graph", base),
    help: "start, goal, directed/undirected, h lines, then edges as: from to cost.",
    generator: { params: [{ key: "n", label: "Nodes", default: 10, min: 4, max: 22 }], make: o => Studio.generators.graph(o) },
    describe: p => `${p.nodes.length} nodes, ${p.edges.length} edges, ${p.start} → ${p.goal}` });
})(typeof window !== "undefined" ? window : globalThis);
