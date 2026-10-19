/* Search Studio core: registry, seeded RNG, problem helpers.
 * Plain script (no modules) so the same files run in the browser, in a single-file build,
 * and in Node tests (tools/test.mjs loads them into a vm context).
 */
(function (root) {
  "use strict";
  const Studio = root.Studio || {};
  root.Studio = Studio;

  /* ------------------------------------------------------------------ registry */
  Studio.algorithms = Studio.algorithms || [];
  Studio.examples = Studio.examples || [];
  Studio.types = Studio.types || {};
  /* Problem types: { type, label, validate(p), prepare(p) -> P (must set P.ids), toText?, fromText?, generator?, describe? } */
  Studio.registerType = function (def) {
    for (const k of ["type", "label", "validate", "prepare"]) if (!def[k]) throw new Error(`Problem type is missing "${k}"`);
    Studio.types[def.type] = def;
    return def;
  };

  const REQUIRED = ["id", "name", "family", "problem", "run"];
  Studio.register = function (algo) {
    for (const k of REQUIRED) {
      if (algo[k] === undefined) throw new Error(`Algorithm is missing "${k}": ${algo.id || algo.name || "?"}`);
    }
    if (!Studio.types[algo.problem]) throw new Error(`${algo.id}: unknown problem type "${algo.problem}" (known: ${Object.keys(Studio.types).join(", ")})`);
    algo.params = algo.params || [];
    algo.order = algo.order ?? 100;
    const i = Studio.algorithms.findIndex(a => a.id === algo.id);
    if (i >= 0) Studio.algorithms[i] = algo; else Studio.algorithms.push(algo);
    Studio.algorithms.sort((a, b) => (a.family > b.family ? 1 : a.family < b.family ? -1 : a.order - b.order));
    if (Studio.onRegister) Studio.onRegister(algo);
    return algo;
  };
  Studio.registerExample = function (ex) {
    Studio.validateProblem(ex);
    const i = Studio.examples.findIndex(e => e.id === ex.id);
    if (i >= 0) Studio.examples[i] = ex; else Studio.examples.push(ex);
    return ex;
  };
  Studio.get = id => Studio.algorithms.find(a => a.id === id);

  /* ------------------------------------------------------------------ seeded RNG (mulberry32) */
  Studio.rng = function (seed) {
    let a = (Number(seed) >>> 0) || 1;
    const next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);
    next.pick = arr => arr[Math.floor(next() * arr.length)];
    next.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    next.r3 = () => Math.round(next() * 1000) / 1000; // the 3-decimal numbers students see in traces
    return next;
  };

  /* ------------------------------------------------------------------ problems */
  const labelsFor = n => Array.from({ length: n }, (_, i) => i < 26 ? String.fromCharCode(65 + i) : "N" + (i + 1));
  Studio.labelsFor = labelsFor;

  Studio.validateProblem = function (p) {
    if (!p || typeof p !== "object") throw new Error("Problem must be an object");
    if (!p.id) throw new Error("Problem needs an id");
    if (p.type !== "tsp" && p.type !== "graph") {
      const T = Studio.types[p.type];
      if (!T) throw new Error(`Unknown problem type "${p.type}"`);
      T.validate(p); return true;
    }
    if (p.type === "tsp") {
      const ids = p.cities.map(c => c.id);
      if (new Set(ids).size !== ids.length) throw new Error("City names must be unique");
      if (ids.length < 3) throw new Error("A TSP needs at least 3 cities");
      if (p.matrix) {
        if (p.matrix.length !== ids.length || p.matrix.some(r => r.length !== ids.length)) throw new Error("Matrix must be n × n");
        p.matrix.forEach((r, i) => r.forEach((v, j) => { if (i !== j && !(v >= 0)) throw new Error(`Distance ${ids[i]}–${ids[j]} must be a number ≥ 0`); }));
      }
    } else if (p.type === "graph") {
      const ids = p.nodes.map(c => c.id);
      if (new Set(ids).size !== ids.length) throw new Error("Node names must be unique");
      for (const [u, v, w] of p.edges) {
        if (!ids.includes(u) || !ids.includes(v)) throw new Error(`Edge ${u}–${v} uses an unknown node`);
        if (!(w >= 0)) throw new Error(`Edge ${u}–${v} needs a cost ≥ 0`);
      }
      if (!ids.includes(p.start)) throw new Error("Start node is not in the graph");
      if (p.goal && !ids.includes(p.goal)) throw new Error("Goal node is not in the graph");
    } else throw new Error('Problem type must be "tsp" or "graph"');
    return true;
  };

  /* Prepare a problem for algorithms: index maps, distance lookup, adjacency. */
  Studio.prepare = function (p) {
    Studio.validateProblem(p);
    if (p.type !== "tsp" && p.type !== "graph") {
      const P = Studio.types[p.type].prepare(JSON.parse(JSON.stringify(p)));
      if (!Array.isArray(P.ids)) throw new Error(`Problem type ${p.type}: prepare() must set ids`);
      return P;
    }
    if (p.type === "tsp") {
      const ids = p.cities.map(c => c.id);
      const n = ids.length;
      const scale = p.scale ?? 10;
      const M = p.matrix ? p.matrix.map(r => r.slice()) :
        ids.map((_, i) => ids.map((_, j) => i === j ? 0 : Math.round(scale * Math.hypot(p.cities[i].x - p.cities[j].x, p.cities[i].y - p.cities[j].y))));
      const idx = Object.fromEntries(ids.map((c, i) => [c, i]));
      const d = (a, b) => M[idx[a]][idx[b]];
      const cost = t => { let s = 0; for (let i = 0; i < t.length; i++) s += d(t[i], t[(i + 1) % t.length]); return s; };
      const symmetric = M.every((r, i) => r.every((v, j) => v === M[j][i]));
      return Object.assign({}, p, { ids, n, M, idx, d, cost, symmetric });
    }
    const ids = p.nodes.map(c => c.id);
    const adj = Object.fromEntries(ids.map(c => [c, []]));
    for (const [u, v, w] of p.edges) {
      adj[u].push([v, w]);
      if (!p.directed) adj[v].push([u, w]);
    }
    // MoveGen order: alphabetical unless the problem fixes another order
    for (const k of ids) adj[k].sort((a, b) => (p.moveOrder === "listed" ? 0 : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const h = Object.fromEntries(p.nodes.map(c => [c.id, c.h ?? 0]));
    const w = (u, v) => { const e = adj[u].find(x => x[0] === v); return e ? e[1] : Infinity; };
    return Object.assign({}, p, { ids, adj, h, w });
  };

  /* ------------------------------------------------------------------ TSP helpers */
  Studio.tsp = {
    ename: (a, b) => (a < b ? a + b : b + a).replace(/^(.)(.)$/, "$1$2"),
    edgeKey: (a, b) => (a < b ? a + "|" + b : b + "|" + a),
    tourEdges(t) { return t.map((c, i) => [c, t[(i + 1) % t.length]]); },
    canon(t, start) {
      const s = start ?? [...t].sort()[0];
      const i = t.indexOf(s);
      const r = t.slice(i).concat(t.slice(0, i));
      const rev = [r[0]].concat(r.slice(1).reverse());
      return rev.join(",") < r.join(",") ? rev : r;
    },
    str: t => t.join(","),
    twoCity(P, t) {
      const out = [];
      for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
        const u = t.slice(); [u[i], u[j]] = [u[j], u[i]];
        out.push({ tour: u, cost: P.cost(u), move: `swap ${t[i]}↔${t[j]}`, key: [t[i], t[j]].sort().join("") });
      }
      return out;
    },
    twoEdge(P, t) {
      const n = t.length, out = [];
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const u = t.slice(0, i + 1).concat(t.slice(i + 1, j + 1).reverse(), t.slice(j + 1));
        const r1 = [t[i], t[i + 1]].sort().join(""), r2 = [t[j], t[(j + 1) % n]].sort().join("");
        const a1 = [t[i], t[j]].sort().join(""), a2 = [t[i + 1], t[(j + 1) % n]].sort().join("");
        out.push({ tour: u, cost: P.cost(u), move: `−${r1},−${r2} +${a1},+${a2}`, removed: [r1, r2], added: [a1, a2], key: r1 + r2 });
      }
      return out;
    },
    orOpt(P, t) {
      const seen = new Set([Studio.tsp.canon(t).join(",")]), out = [];
      for (let i = 0; i < t.length; i++) {
        const c = t[i], rest = t.slice(0, i).concat(t.slice(i + 1));
        for (let k = 0; k < rest.length; k++) {
          const u = rest.slice(0, k + 1).concat([c], rest.slice(k + 1));
          const key = Studio.tsp.canon(u).join(",");
          if (seen.has(key)) continue; seen.add(key);
          out.push({ tour: u, cost: P.cost(u), move: `move ${c} after ${rest[k]}`, key: c });
        }
      }
      return out;
    },
    threeEdge(P, t) {
      const n = t.length, seen = new Set(), out = [];
      const E = new Set(Studio.tsp.tourEdges(t).map(([a, b]) => [a, b].sort().join("")));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
        const A = t.slice(0, i + 1), B = t.slice(i + 1, j + 1), C = t.slice(j + 1, k + 1), D = t.slice(k + 1);
        if (!B.length || !C.length) continue;
        for (const u of [A.concat(C, B, D), A.concat(B.slice().reverse(), C.slice().reverse(), D), A.concat(C.slice().reverse(), B, D), A.concat(C, B.slice().reverse(), D)]) {
          const F = new Set(Studio.tsp.tourEdges(u).map(([a, b]) => [a, b].sort().join("")));
          const removed = [...E].filter(e => !F.has(e));
          if (removed.length !== 3) continue;
          const key = Studio.tsp.canon(u).join(",");
          if (seen.has(key)) continue; seen.add(key);
          out.push({ tour: u, cost: P.cost(u), move: "−" + removed.sort().join(",−"), removed: removed.sort(), added: [...F].filter(e => !E.has(e)).sort(), key });
        }
      }
      return out;
    },
    best(nbrs) { return nbrs.slice().sort((a, b) => a.cost - b.cost || (a.tour.join() < b.tour.join() ? -1 : 1))[0]; },
  };
  Studio.tsp.moveGens = {
    "2-city": { label: "2-city exchange", fn: Studio.tsp.twoCity },
    "2-edge": { label: "2-edge exchange (2-opt)", fn: Studio.tsp.twoEdge },
    "or-opt": { label: "Or-opt (move one city)", fn: Studio.tsp.orOpt },
    "3-edge": { label: "3-edge exchange", fn: Studio.tsp.threeEdge },
  };

  /* Steepest-descent hill climbing used by several algorithms. Returns the list of states. */
  Studio.tsp.hillClimb = function (P, start, mg) {
    let cur = start.slice();
    const states = [{ tour: cur, cost: P.cost(cur), move: "start" }];
    for (let guard = 0; guard < 1000; guard++) {
      const nb = Studio.tsp.moveGens[mg].fn(P, cur);
      const b = Studio.tsp.best(nb);
      if (b && b.cost < P.cost(cur)) { cur = b.tour; states.push({ tour: cur, cost: b.cost, move: b.move, removed: b.removed, added: b.added, n: nb.length }); }
      else { states.push({ tour: cur, cost: P.cost(cur), move: "local optimum", n: nb.length, bestNeighbour: b ? b.cost : null, done: true }); break; }
    }
    return states;
  };

  /* Tidy tree layout: returns {id: [x, y]} in 0..1, leaves evenly spaced, parents centred over children. */
  Studio.treeLayout = function (root, kids) {
    const pos = {}, depth = {}; let leaf = 0, maxD = 0;
    const walk = (id, d) => {
      depth[id] = d; maxD = Math.max(maxD, d);
      const ch = kids(id) || [];
      if (!ch.length) { pos[id] = [leaf++, d]; return pos[id][0]; }
      const xs = ch.map(c => walk(c, d + 1));
      pos[id] = [(xs[0] + xs[xs.length - 1]) / 2, d];
      return pos[id][0];
    };
    walk(root, 0);
    const W = Math.max(1, leaf - 1), H = Math.max(1, maxD);
    for (const k in pos) pos[k] = [leaf === 1 ? 0.5 : pos[k][0] / W, maxD === 0 ? 0.5 : pos[k][1] / H];
    return pos;
  };

  /* Draw helpers for steps */
  Studio.draw = {
    tour(t, state = "tour", P = null, labels = true) {
      return Studio.tsp.tourEdges(t).map(([u, v]) => ({ u, v, state, label: labels && P ? P.d(u, v) : undefined }));
    },
    path(p, state = "path") { const e = []; for (let i = 0; i + 1 < p.length; i++) e.push({ u: p[i], v: p[i + 1], state }); return e; },
  };

  /* Algorithm parameter defaults merged with user input */
  Studio.paramsFor = function (algo, P, given = {}) {
    const out = {};
    for (const p of algo.params) {
      let v = given[p.key];
      if (v === undefined || v === "") v = typeof p.default === "function" ? p.default(P) : p.default;
      if (p.type === "number" || p.type === "int") v = Number(v);
      if (p.type === "city" || p.type === "node") { const ids = P.ids; if (!ids.includes(v)) v = ids[0]; }
      out[p.key] = v;
    }
    return out;
  };

  /* Run an algorithm and normalise its output */
  Studio.run = function (algo, problem, given) {
    if (algo.problem !== problem.type) throw new Error(`${algo.name} needs a ${Studio.types[algo.problem].label} problem`);
    const P = Studio.prepare(problem);
    if (algo.maxSize && P.ids.length > algo.maxSize) throw new Error(`${algo.name} is limited to ${algo.maxSize} cities in the studio (the trace would be too long)`);
    if (algo.check) { const why = algo.check(P); if (why) throw new Error(why); }
    const params = Studio.paramsFor(algo, P, given);
    const res = algo.run(P, params) || {};
    if (!Array.isArray(res.steps) || !res.steps.length) throw new Error(`${algo.name} produced no steps`);
    return { P, params, steps: res.steps, result: res.result || {} };
  };

  if (typeof module !== "undefined") module.exports = Studio;
})(typeof window !== "undefined" ? window : globalThis);
