/* Step builders shared by the perturbative / local-search TSP algorithms. */
(function (root) {
  "use strict";
  const Studio = root.Studio;
  const T = () => Studio.tsp;

  Studio.tspSteps = {
    nodes(P, state = "plain", over = {}) { const n = {}; P.ids.forEach(c => (n[c] = { state })); return Object.assign(n, over); },

    /* edges of tour t, with removed / added edge names ("AC") highlighted */
    edges(P, t, { removed = [], added = [], state = "tour" } = {}) {
      const out = Studio.draw.tour(t, state, P);
      out.forEach(e => { const k = [e.u, e.v].sort().join(""); if (added.includes(k)) e.state = "added"; });
      removed.forEach(k => out.push({ u: k[0], v: k[1], state: "removed", label: P.d(k[0], k[1]) }));
      return out;
    },

    neighbourTable(P, nbrs, chosen, limit = 12) {
      const sorted = nbrs.slice().sort((a, b) => a.cost - b.cost || (a.tour.join() < b.tour.join() ? -1 : 1));
      const rows = sorted.slice(0, limit).map(r => [r.move, T().canon(r.tour, P.ids[0]).join(","), r.cost]);
      const states = sorted.slice(0, limit).map(r => (chosen && r === chosen ? "cur" : ""));
      if (sorted.length > limit) { rows.push([`… ${sorted.length - limit} more`, "", `≤ ${sorted[sorted.length - 1].cost}`]); states.push("dim"); }
      return { title: `${nbrs.length} neighbours, best first`, columns: ["move", "tour", "cost"], rows, rowStates: states };
    },

    /* Steepest-descent hill climbing with full neighbour tables at every step */
    hillClimb(P, start, mg, label) {
      const steps = [];
      let cur = start.slice();
      const fn = T().moveGens[mg].fn;
      for (let it = 0; it < 500; it++) {
        const nb = fn(P, cur), b = T().best(nb);
        const better = b && b.cost < P.cost(cur);
        steps.push({
          caption: it === 0 ? `Start tour ${cur.join(",")} = ${P.cost(cur)}. ${nb.length} ${label} neighbours` : `Current ${cur.join(",")} = ${P.cost(cur)}: best neighbour ${b ? b.cost : "–"}`,
          nodes: this.nodes(P), edges: this.edges(P, cur, b && better ? { removed: b.removed || [] } : {}),
          table: this.neighbourTable(P, nb, better ? b : null),
          stats: [{ label: "current", value: P.cost(cur) }, { label: "best neighbour", value: b ? b.cost : "–", state: better ? "ok" : "bad" }],
        });
        if (!better) {
          steps.push({ caption: `No neighbour is better than ${P.cost(cur)}: local optimum for ${label}`, nodes: this.nodes(P, "path"),
            edges: this.edges(P, cur, { state: "path" }), table: this.neighbourTable(P, nb, null), stats: [{ label: "local optimum", value: P.cost(cur), state: "ok" }] });
          return { steps, tour: cur, cost: P.cost(cur) };
        }
        const prev = cur; cur = b.tour;
        steps.push({ caption: `Move ${b.move}: ${P.cost(prev)} → ${b.cost}`, nodes: this.nodes(P), edges: this.edges(P, cur, { added: b.added || [] }),
          table: this.neighbourTable(P, nb, b), stats: [{ label: "current", value: b.cost, state: "ok" }] });
      }
      return { steps, tour: cur, cost: P.cost(cur) };
    },

    /* tiny line chart payload */
    chart(series, opts = {}) { return Object.assign({ kind: "line", series }, opts); },
  };

  Studio.tsp.mgParam = (def = "2-city") => ({ key: "movegen", label: "Neighbourhood (MoveGen)", type: "select", default: def,
    options: Object.entries(Studio.tsp.moveGens).map(([k, v]) => [k, v.label]) });
  Studio.seedParam = (def = 1) => ({ key: "seed", label: "Random seed", type: "int", default: def, help: "Same seed, same run" });
})(typeof window !== "undefined" ? window : globalThis);
