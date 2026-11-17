/* Two-player matrix (normal-form) games (Week 7, supplementary: game theory).
 * Problem JSON : { type:"matrixgame", name, rows:["Cooperate","Defect"], cols:["Cooperate","Defect"], payoff:[[[a,b],[c,d]],[[e,f],[g,h]]] }
 * payoff[i][j] = [payoff to the ROW player, payoff to the COLUMN player] when row i meets column j. Higher is better.
 * Reusable API: Studio.gameLib { table(P, opts) } builds the payoff table of a step. */
(function (S) {
  /* opts: rows/cols = lists of surviving indices (others shown dimmed); rowBR/colBR = Set of "i,j" cells where that player's payoff is a best response;
   * ne = Set of "i,j"; bad = Set of "i,j" (Pareto-inefficient equilibria); mark = Set of "i,j" cells to highlight */
  const table = (P, o = {}) => {
    const R = new Set(o.rows || P.rows.map((_, i) => i)), C = new Set(o.cols || P.cols.map((_, j) => j));
    const has = (s, k) => !!(s && s.has(k));
    return { title: o.title || "payoffs (row player, column player)", columns: ["row \\ column"].concat(P.cols.map((c, j) => (C.has(j) ? c : c + " (out)"))),
      rows: P.rows.map((r, i) => [{ t: R.has(i) ? r : r + " (out)", s: R.has(i) ? "" : "dim" }].concat(P.cols.map((_, j) => {
        const k = i + "," + j, [a, b] = P.payoff[i][j];
        const t = `${a}${has(o.rowBR, k) ? "*" : ""}, ${b}${has(o.colBR, k) ? "*" : ""}`;
        const s = !R.has(i) || !C.has(j) ? "dim" : has(o.bad, k) ? "warn" : has(o.ne, k) ? "ok" : has(o.mark, k) ? "warn" : "";
        return { t, s };
      }))), rowStates: P.rows.map((_, i) => (R.has(i) ? "" : "dim")) };
  };
  S.gameLib = { table };
  S.registerType({
    type: "matrixgame", label: "matrix game", plural: "matrix games",
    validate(p) {
      const okNames = a => Array.isArray(a) && a.length >= 2 && a.length <= 5 && a.every(x => typeof x === "string" && x) && new Set(a).size === a.length;
      if (!okNames(p.rows) || !okNames(p.cols)) throw new Error("rows and cols must each list 2 to 5 different strategy names");
      if (!Array.isArray(p.payoff) || p.payoff.length !== p.rows.length) throw new Error("payoff needs one row of cells per row strategy");
      p.payoff.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== p.cols.length) throw new Error(`payoff row ${i + 1} needs one cell per column strategy`);
        r.forEach(c => { if (!Array.isArray(c) || c.length !== 2 || c.some(x => typeof x !== "number" || !isFinite(x))) throw new Error("Each payoff cell is [row player's payoff, column player's payoff], both numbers"); });
      });
    },
    prepare(p) { return Object.assign({}, p, { ids: p.rows.map(r => "row:" + r).concat(p.cols.map(c => "col:" + c)) }); },
    help: 'Edit as JSON: rows [names], cols [names], payoff [[ [row player, column player], ... ], ...] with one cell for every row/column pair.',
    describe: p => `${p.rows.length} × ${p.cols.length} game`,
  });
})(Studio);
