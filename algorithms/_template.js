/* TEMPLATE — copy this file to algorithms/<family>/<your-algorithm>.js, edit it, then run
 *     node tools/build.mjs
 * The build finds every .js file under algorithms/ (files starting with "_" are skipped),
 * checks that it registers correctly, and adds it to the library.
 *
 * A run returns { steps, result }. Each step is a snapshot the player draws:
 *   caption  : one line shown in yellow under the stage
 *   nodes    : { A: { state, badge } }      states: plain current open closed visited path goal start
 *   edges    : [ { u, v, state, label } ]    states: faint tour path candidate added removed rejected alt tree pheromone
 *   table    : { title, columns: [...], rows: [[...]], rowStates: ["", "ok", "bad", "warn", "cur", "dim"] }
 *   lists    : [ { label: "OPEN", items: [ { text, state } ] } ]
 *   stats    : [ { label, value, state } ]
 *   chart    : { kind: "walk" | "bars" | "drops" | "pie", ... } (optional)
 * Helpers: Studio.prepare gives P.ids, P.d(a,b), P.cost(tour) for TSP; P.adj, P.h, P.start, P.goal for graphs.
 */
Studio.register({
  id: "tsp-my-algorithm",              // unique
  name: "My algorithm",
  family: "TSP · experimental",        // groups the library
  problem: "tsp",                      // "tsp" or "graph"
  summary: "One sentence on what it does.",
  pseudocode: "…",
  complexity: "…",
  params: [{ key: "start", label: "Start city", type: "city", default: P => P.ids[0] }],
  run(P, { start }) {
    const tour = [start].concat(P.ids.filter(c => c !== start));
    return {
      steps: [{ caption: `Tour ${tour.join(",")} = ${P.cost(tour)}`, edges: Studio.draw.tour(tour, "tour", P) }],
      result: { tour, cost: P.cost(tour) },
    };
  },
});
