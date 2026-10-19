/* TSP crossover operators in the course's conventions. Each returns {child, log:[text], extra}. */
(function (root) {
  "use strict";
  const Studio = root.Studio;

  const X = {
    /* Cycle crossover: C1 takes odd-numbered cycles from P1, even-numbered from P2. */
    cx(P, p1, p2) {
      const n = p1.length, cyc = Array(n).fill(0), cycles = []; let id = 0;
      for (let s = 0; s < n; s++) {
        if (cyc[s]) continue; id++; let i = s; const pos = [];
        while (!cyc[i]) { cyc[i] = id; pos.push(i + 1); i = p1.indexOf(p2[i]); }
        cycles.push({ id, positions: pos, cities: pos.map(q => p1[q - 1]) });
      }
      const child = p1.map((c, i) => (cyc[i] % 2 ? c : p2[i]));
      const child2 = p2.map((c, i) => (cyc[i] % 2 ? c : p1[i]));
      return { child, child2, cyc, log: cycles.map(c => `cycle ${c.id}: positions ${c.positions.join(",")} (${c.cities.join(",")}) → from ${c.id % 2 ? "P1" : "P2"}`), cycles };
    },
    /* PMX: copy p1[a..b]; for other positions take p2's city, following the segment mapping while it is taken. */
    pmx(P, p1, p2, a, b) {
      const n = p1.length, child = Array(n).fill(null), map = {};
      for (let i = a - 1; i < b; i++) { child[i] = p1[i]; map[p1[i]] = p2[i]; }
      const log = [`copy positions ${a}..${b} from P1: ${p1.slice(a - 1, b).join(",")}`, `mapping ${Object.entries(map).map(([k, v]) => k + "↔" + v).join(", ")}`];
      for (let i = 0; i < n; i++) {
        if (i >= a - 1 && i < b) continue;
        let x = p2[i]; const chain = [x];
        while (child.includes(x)) { x = map[x]; chain.push(x); }
        child[i] = x;
        log.push(`pos ${i + 1}: P2 gives ${p2[i]}${chain.length > 1 ? `, taken → ${chain.join(" → ")}` : ", free"}`);
      }
      return { child, log, segment: [a, b] };
    },
    /* Order crossover (course form): copy p1[a..b], fill the blanks left to right with p2's order. */
    ox(P, p1, p2, a, b) {
      const n = p1.length, child = Array(n).fill(null), seg = p1.slice(a - 1, b);
      for (let i = a - 1; i < b; i++) child[i] = p1[i];
      const rest = p2.filter(c => !seg.includes(c)); let k = 0;
      for (let i = 0; i < n; i++) if (child[i] === null) child[i] = rest[k++];
      return { child, log: [`copy positions ${a}..${b} from P1: ${seg.join(",")}`, `P2 order without them: ${rest.join(",")}`, "fill the blanks left to right"], segment: [a, b] };
    },
    /* Naive single-point crossover on paths: may repeat / lose cities. */
    onepoint(P, p1, p2, cut) {
      const child = p1.slice(0, cut).concat(p2.slice(cut));
      const dup = [...new Set(child.filter((c, i) => child.indexOf(c) !== i))], miss = p1.filter(c => !child.includes(c));
      return { child, invalid: dup.length > 0, log: [`P1[1..${cut}] + P2[${cut + 1}..n]`, dup.length ? `repeats ${dup.join(",")}, missing ${miss.join(",")}: not a tour` : "valid by luck"] };
    },
    /* Adjacency representation */
    adj(t) { const nx = {}; t.forEach((c, i) => (nx[c] = t[(i + 1) % t.length])); return nx; },
    /* Alternating edges: next city from P1, then P2, ...; on a cycle use the other parent, else first unvisited. */
    aex(P, p1, p2) {
      const A1 = X.adj(p1), A2 = X.adj(p2), t = [P.ids[0]], log = []; let k = 0;
      while (t.length < p1.length) {
        const [src, name, other] = k % 2 === 0 ? [A1, "P1", A2] : [A2, "P2", A1];
        const x = t[t.length - 1], c = src[x];
        if (!t.includes(c)) { t.push(c); log.push(`${x} → ${c} (${name})`); }
        else if (!t.includes(other[x])) { t.push(other[x]); log.push(`${x}: ${name} gives ${c} (cycle) → ${other[x]} from the other parent`); }
        else { const r = P.ids.filter(z => !t.includes(z))[0]; t.push(r); log.push(`${x}: both parents close a cycle → first unvisited ${r}`); }
        k++;
      }
      return { child: t, log, adj1: P.ids.map(c => A1[c]), adj2: P.ids.map(c => A2[c]) };
    },
    /* Heuristic crossover: from each city take the shorter of the two parents' next edges. */
    hx(P, p1, p2) {
      const A1 = X.adj(p1), A2 = X.adj(p2), t = [P.ids[0]], log = [];
      while (t.length < p1.length) {
        const x = t[t.length - 1], c1 = A1[x], c2 = A2[x];
        const opts = [...new Set([c1, c2])].filter(c => !t.includes(c)).sort((a, b) => P.d(x, a) - P.d(x, b) || (a < b ? -1 : 1));
        let pick, why;
        if (opts.length) { pick = opts[0]; why = c1 === c2 ? "both parents agree" : opts.length === 2 ? "shorter parent edge" : "the other parent edge would close a cycle"; }
        else { pick = P.ids.filter(c => !t.includes(c)).sort((a, b) => P.d(x, a) - P.d(x, b) || (a < b ? -1 : 1))[0]; why = "both parent edges close a cycle → nearest unvisited"; }
        log.push(`${x}: P1→${c1} (${P.d(x, c1)}), P2→${c2} (${P.d(x, c2)}) ⇒ ${pick}: ${why}`);
        t.push(pick);
      }
      return { child: t, log, adj1: P.ids.map(c => A1[c]), adj2: P.ids.map(c => A2[c]) };
    },
    toOrdinal(ids, t) { const ref = ids.slice(), out = [], log = []; t.forEach(c => { const k = ref.indexOf(c) + 1; log.push(`${c} in [${ref.join("")}] → ${k}`); out.push(k); ref.splice(k - 1, 1); }); return { code: out, log }; },
    fromOrdinal(ids, o) { const ref = ids.slice(); return o.map(k => ref.splice(k - 1, 1)[0]); },
    /* Ordinal representation + single-point crossover (always valid). */
    ordinal(P, p1, p2, cut) {
      const o1 = X.toOrdinal(P.ids, p1), o2 = X.toOrdinal(P.ids, p2);
      const c1 = o1.code.slice(0, cut).concat(o2.code.slice(cut)), c2 = o2.code.slice(0, cut).concat(o1.code.slice(cut));
      const child = X.fromOrdinal(P.ids, c1), child2 = X.fromOrdinal(P.ids, c2);
      return { child, child2, o1: o1.code, o2: o2.code, co1: c1, co2: c2,
        log: [`P1 → ${o1.code.join(" ")}`, `P2 → ${o2.code.join(" ")}`, `cut after ${cut}: C1 = ${c1.join(" ")} → ${child.join(",")}`, `C2 = ${c2.join(" ")} → ${child2.join(",")}`], enc1: o1.log };
    },
  };
  X.names = { cx: "Cycle crossover", pmx: "Partially mapped (PMX)", ox: "Order crossover", aex: "Alternating edges", hx: "Heuristic crossover", ordinal: "Ordinal + 1-point", onepoint: "Naive 1-point (path)" };
  X.apply = function (P, op, p1, p2, opts = {}) {
    const n = p1.length;
    const a = Math.max(1, Math.min(n, opts.a ?? 2)), b = Math.max(a, Math.min(n, opts.b ?? Math.min(n, a + 2))), cut = Math.max(1, Math.min(n - 1, opts.cut ?? Math.floor(n / 2)));
    if (op === "cx") return X.cx(P, p1, p2);
    if (op === "pmx") return X.pmx(P, p1, p2, a, b);
    if (op === "ox") return X.ox(P, p1, p2, a, b);
    if (op === "aex") return X.aex(P, p1, p2);
    if (op === "hx") return X.hx(P, p1, p2);
    if (op === "ordinal") return X.ordinal(P, p1, p2, cut);
    if (op === "onepoint") return X.onepoint(P, p1, p2, cut);
    throw new Error("Unknown crossover " + op);
  };
  Studio.tsp.crossovers = X;
})(typeof window !== "undefined" ? window : globalThis);
