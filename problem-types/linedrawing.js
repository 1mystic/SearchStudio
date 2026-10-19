/* Line drawings of trihedral objects for Waltz labelling.
 * Junction catalogue (Huffman–Clowes) derived from the octant model; edges of a junction listed counter-clockwise.
 * Labels on an edge, seen from a junction: "+" convex, "-" concave, "out"/"in" occluding boundary with the
 * arrow pointing away from / into the junction (object on the right of the arrow). */
(function (S) {
  const CAT = {
    L: [["+", "in"], ["-", "out"], ["in", "-"], ["in", "out"], ["out", "+"], ["out", "in"]],            // e1 → e2 counter-clockwise, gap < 180°
    fork: [["+", "+", "+"], ["-", "-", "-"], ["-", "out", "in"], ["in", "-", "out"], ["out", "in", "-"]],  // all gaps < 180°
    arrow: [["+", "-", "+"], ["-", "+", "-"], ["in", "+", "out"]],                                        // barb, shaft, barb (after the gap > 180°)
    T: [["out", "+", "in"], ["out", "-", "in"], ["out", "in", "in"], ["out", "out", "in"]],              // bar, stem, bar (bar is straight)
  };
  const flip = l => (l === "in" ? "out" : l === "out" ? "in" : l);
  S.waltzLib = { CAT, flip, sym: l => ({ "+": "+", "-": "−", in: "←", out: "→" }[l]) };
  S.registerType({
    type: "linedrawing", label: "line drawing", plural: "line drawings",
    validate(p) {
      const ids = (p.points || []).map(q => q.id);
      (p.edges || []).forEach(([a, b]) => { if (!ids.includes(a) || !ids.includes(b)) throw new Error(`Edge ${a}–${b} uses an unknown point`); });
      p.points.forEach(q => { const d = p.edges.filter(e => e.includes(q.id)).length; if (d < 2 || d > 3) throw new Error(`Point ${q.id} has ${d} lines; Waltz labelling handles junctions of 2 or 3 lines`); });
    },
    prepare(p) {
      const pt = Object.fromEntries(p.points.map(q => [q.id, q]));
      const ids = p.points.map(q => q.id);
      const ang = (a, b) => Math.atan2(-(pt[b].y - pt[a].y), pt[b].x - pt[a].x); // y down on screen → math angle
      const J = {};
      for (const id of ids) {
        const nb = p.edges.filter(e => e.includes(id)).map(e => (e[0] === id ? e[1] : e[0])).map(q => ({ q, a: ang(id, q) })).sort((x, y) => x.a - y.a);
        const n = nb.length, TWO = 2 * Math.PI;
        const gaps = nb.map((e, i) => ((nb[(i + 1) % n].a - e.a) % TWO + TWO) % TWO);
        let type, order;
        if (n === 2) { const i = gaps[0] < Math.PI ? 0 : 1; type = "L"; order = [nb[i].q, nb[(i + 1) % 2].q]; }
        else {
          const straight = gaps.findIndex(g => Math.abs(g - Math.PI) < 0.03);
          const big = gaps.findIndex(g => g > Math.PI + 0.03);
          if (straight >= 0) { const s = (straight + 1) % 3; type = "T"; order = [0, 1, 2].map(k => nb[(s + k) % 3].q); }
          else if (big >= 0) { const s = (big + 1) % 3; type = "arrow"; order = [0, 1, 2].map(k => nb[(s + k) % 3].q); }
          else { type = "fork"; order = nb.map(e => e.q); }
        }
        J[id] = { id, type, order, labels: CAT[type].map(l => Object.fromEntries(order.map((q, k) => [q, l[k]]))) };
      }
      // outer boundary: an edge with every point on one side of it (convex silhouettes); or listed explicitly
      const cx = p.points.reduce((s, q) => s + q.x, 0) / ids.length, cy = p.points.reduce((s, q) => s + q.y, 0) / ids.length;
      const boundary = {};
      const listed = p.boundary ? p.boundary.map(e => e.join("|")) : null;
      p.edges.forEach(([a, b]) => {
        const side = q => Math.sign((pt[b].x - pt[a].x) * (pt[q].y - pt[a].y) - (pt[b].y - pt[a].y) * (pt[q].x - pt[a].x));
        const sides = new Set(ids.filter(q => q !== a && q !== b).map(side).filter(s => s !== 0));
        const isB = listed ? listed.includes(a + "|" + b) || listed.includes(b + "|" + a) : sides.size === 1;
        if (!isB) return;
        // object (centre) on the right of the arrow; on screen (y down) "right of a→b" means cross > 0
        const cr = (pt[b].x - pt[a].x) * (cy - pt[a].y) - (pt[b].y - pt[a].y) * (cx - pt[a].x);
        boundary[a + "|" + b] = cr > 0 ? [a, b] : [b, a];
      });
      const xs = p.points.map(q => q.x), ys = p.points.map(q => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const scene = { nodes: p.points.map(q => ({ id: q.id, x: (q.x - x0) / Math.max(1e-9, x1 - x0), y: (q.y - y0) / Math.max(1e-9, y1 - y0), shape: "point", label: q.id })),
        edges: p.edges.map(([a, b]) => ({ u: a, v: b, state: "tour" })), aspect: (y1 - y0) / Math.max(1e-9, x1 - x0), r: 6, pad: 50 };
      return Object.assign({}, p, { ids, J, boundary, scene, useBoundary: p.useBoundary !== false });
    },
    help: "Edit as JSON: points [{id, x, y}] in screen coordinates (y grows downward), edges [[p, q]], optional useBoundary (default true) and boundary [[p, q]].",
    describe: p => `${p.points.length} junctions, ${p.edges.length} lines`,
  });
})(Studio);
