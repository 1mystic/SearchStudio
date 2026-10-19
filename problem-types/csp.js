/* Binary constraint satisfaction problems. Relations: neq, eq, lt, gt, noattack (queens), table (allowed pairs). */
(function (S) {
  const rel = {
    neq: (a, b) => a !== b, eq: (a, b) => a === b, lt: (a, b) => a < b, gt: (a, b) => a > b,
  };
  S.cspLib = {
    ok(c, x, a, y, b) {
      // is the pair (x=a, y=b) allowed by constraint c (which may be listed as (y,x))?
      const [p, q] = c.scope; let u = a, v = b;
      if (p === y && q === x) { u = b; v = a; }
      if (c.rel === "table") return c.allowed.some(([s, t]) => s === u && t === v);
      if (c.rel === "noattack") return u !== v && Math.abs(u - v) !== Math.abs(c.dist);
      return rel[c.rel](u, v);
    },
    between(P, x, y) { return P.cons.filter(c => (c.scope[0] === x && c.scope[1] === y) || (c.scope[0] === y && c.scope[1] === x)); },
    neighbours(P, x) { return [...new Set(P.cons.filter(c => c.scope.includes(x)).map(c => (c.scope[0] === x ? c.scope[1] : c.scope[0])))]; },
    relText(c) { return c.rel === "table" ? "allowed pairs" : c.rel === "noattack" ? `no attack (|col gap| = ${c.dist})` : { neq: "≠", eq: "=", lt: "<", gt: ">" }[c.rel]; },
  };
  S.registerType({
    type: "csp", label: "constraint problem", plural: "constraint satisfaction problems",
    validate(p) {
      const ids = (p.variables || []).map(v => v.id);
      if (!ids.length) throw new Error("A CSP needs variables");
      (p.variables || []).forEach(v => { if (!Array.isArray(v.domain) || !v.domain.length) throw new Error(`${v.id} needs a domain`); });
      (p.constraints || []).forEach(c => { if (c.scope.length !== 2 || c.scope.some(x => !ids.includes(x))) throw new Error(`Constraint ${c.scope} must name two variables`); if (!["neq", "eq", "lt", "gt", "noattack", "table"].includes(c.rel)) throw new Error(`Unknown relation ${c.rel}`); });
    },
    prepare(p) {
      const ids = p.variables.map(v => v.id), dom = Object.fromEntries(p.variables.map(v => [v.id, v.domain.slice()]));
      let pos;
      if (p.variables.every(v => v.x !== undefined)) { const xs = p.variables.map(v => v.x), ys = p.variables.map(v => v.y); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); pos = Object.fromEntries(p.variables.map(v => [v.id, [(v.x - x0) / Math.max(1e-9, x1 - x0), (v.y - y0) / Math.max(1e-9, y1 - y0)]])); }
      else pos = Object.fromEntries(ids.map((id, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / ids.length; return [id, [0.5 + 0.45 * Math.cos(a), 0.5 + 0.45 * Math.sin(a)]]; }));
      const scene = { nodes: ids.map(id => ({ id, x: pos[id][0], y: pos[id][1], sub: "{" + dom[id].join(",") + "}" })),
        edges: p.constraints.map(c => ({ u: c.scope[0], v: c.scope[1], label: c.rel === "neq" ? "" : S.cspLib.relText(c) })), aspect: 0.62, r: 20, pad: 44 };
      return Object.assign({}, p, { ids, dom, cons: p.constraints, scene });
    },
    help: "Edit as JSON: variables [{id, domain, x, y}], constraints [{scope: [X, Y], rel: neq | eq | lt | gt | noattack | table, allowed, dist}].",
    generator: { params: [{ key: "n", label: "Queens (n)", default: 5, min: 4, max: 8 }],
      make({ n = 5 }) {
        const vars = Array.from({ length: n }, (_, i) => ({ id: "Q" + (i + 1), domain: Array.from({ length: n }, (_, r) => r + 1), x: i, y: 0 }));
        const cons = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) cons.push({ scope: ["Q" + (i + 1), "Q" + (j + 1)], rel: "noattack", dist: j - i });
        return { id: `queens-${n}`, type: "csp", name: `${n}-queens (column i holds queen Qi, value = row)`, variables: vars.map((v, i) => ({ ...v, x: Math.cos(2 * Math.PI * i / n), y: Math.sin(2 * Math.PI * i / n) })), constraints: cons };
      } },
    describe: p => `${p.variables.length} variables, ${p.constraints.length} constraints`,
  });
})(Studio);
