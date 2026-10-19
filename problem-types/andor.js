/* AND–OR graphs for AO*. Each connector (hyper-arc) from a node: one child = OR option, several children = AND. */
(function (S) {
  S.registerType({
    type: "andor", label: "AND–OR graph", plural: "AND–OR graphs",
    validate(p) {
      const ids = (p.nodes || []).map(n => n.id);
      if (!ids.includes(p.start)) throw new Error("start must be one of the nodes");
      for (const c of p.connectors || []) {
        if (!ids.includes(c.from) || !c.to.length || c.to.some(t => !ids.includes(t))) throw new Error(`Connector ${c.from} → ${c.to} uses an unknown node`);
      }
    },
    prepare(p) {
      const ids = p.nodes.map(n => n.id);
      const node = Object.fromEntries(p.nodes.map(n => [n.id, { ...n, h: n.h ?? 0, solved: !!n.solved }]));
      const out = Object.fromEntries(ids.map(i => [i, []]));
      (p.connectors || []).forEach((c, k) => out[c.from].push({ k, from: c.from, to: c.to.slice(), cost: c.cost ?? (p.edgeCost ?? 1) * c.to.length, and: c.to.length > 1 }));
      let pos;
      if (p.nodes.every(n => n.x !== undefined)) { const xs = p.nodes.map(n => n.x), ys = p.nodes.map(n => n.y); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); pos = Object.fromEntries(p.nodes.map(n => [n.id, [(n.x - x0) / Math.max(1e-9, x1 - x0), (n.y - y0) / Math.max(1e-9, y1 - y0)]])); }
      else { const seen = new Set(); pos = S.treeLayout(p.start, id => { const ch = []; out[id].forEach(c => c.to.forEach(t => { if (!seen.has(t)) { seen.add(t); ch.push(t); } })); return ch; }); ids.forEach((i, k) => { if (!pos[i]) pos[i] = [(k + 0.5) / ids.length, 1]; }); }
      const edges = [];
      ids.forEach(i => out[i].forEach(c => c.to.forEach(t => edges.push({ u: i, v: t, group: c.and ? "c" + c.k : undefined, directed: true }))));
      const scene = { nodes: ids.map(i => ({ id: i, x: pos[i][0], y: pos[i][1], sub: node[i].solved ? "solved" : "h=" + node[i].h })), edges, aspect: 0.62, r: 17, pad: 36 };
      return Object.assign({}, p, { ids, node, out, scene });
    },
    help: "Edit as JSON: nodes [{id, h, solved}], connectors [{from, to: [children], cost}] — a connector with two or more children is an AND arc.",
    describe: p => `${p.nodes.length} nodes, ${p.connectors.length} connectors, start ${p.start}`,
  });
})(Studio);
