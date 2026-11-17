/* Dominant strategies and pure Nash equilibria of a two-player matrix game. Week 7, SUPPLEMENTARY (game theory is not in the course notes). */
Studio.register({
  id: "game-nash",
  name: "Dominant strategies and Nash equilibria (supplementary)",
  family: "Game playing",
  week: 7,
  problem: "matrixgame",
  order: 40,
  defaultExample: "gametheory-prisoners",
  summary: "Supplementary. Remove strictly dominated strategies one at a time, then mark each player's best responses: a cell where both are best responses is a pure Nash equilibrium. Flags equilibria that both players would swap for something better.",
  pseudocode: `repeat: remove a strictly dominated strategy of either player
        (s is dominated by t if t pays more than s against EVERY remaining opponent strategy)
until nothing can be removed
for each column: mark the row player's best payoff;  for each row: mark the column player's best payoff
pure Nash equilibrium = a cell with both payoffs marked
equilibrium is Pareto-inefficient if another cell pays both players at least as much and one strictly more`,
  complexity: "O(r·c·(r + c)) for an r × c game",
  learn: {
    "intro": "Supplementary material: this topic is not in the course notes but is the natural next step from minimax. In minimax one player's gain is the other's loss. In a general two-player game both players choose at the same time and the payoffs need not add up to zero. A Nash equilibrium is a pair of choices from which neither player gains by changing alone. The Prisoner's Dilemma shows the surprise: the only equilibrium can be worse for both than another outcome.",
    "definition": "A strategy s is strictly dominated by t if t gives a strictly higher payoff than s against every strategy of the opponent; a rational player never plays a dominated strategy, so it can be removed (and the removal can make more strategies dominated: iterated elimination). A pair (r, c) is a pure Nash equilibrium if r is a best response to c and c is a best response to r. An outcome is Pareto-dominated if some other outcome is at least as good for both players and strictly better for one.",
    "steps": [
      ["remove a strictly dominated strategy", "Compare two strategies of the same player against every opponent strategy still in the game."],
      ["repeat on the smaller game", "Removing a strategy can make others dominated that were not before."],
      ["mark each player's best responses", "For each column the row player's best payoff, for each row the column player's best payoff."],
      ["cells with both payoffs marked are pure Nash equilibria", "Nobody gains by switching alone."],
      ["check each equilibrium for a Pareto improvement", "Is there a cell that is at least as good for both and better for one?"]
    ],
    "formulas": [
      { "f": "s is strictly dominated by t  ⇔  u(t, o) > u(s, o) for every opponent strategy o", "read": "t beats s whatever the other player does", "why": "If this holds, s can never be the right choice, so it can be ignored without changing the outcome." },
      { "f": "(r*, c*) is a pure Nash equilibrium  ⇔  u₁(r*, c*) ≥ u₁(r, c*) for all r  and  u₂(r*, c*) ≥ u₂(r*, c) for all c", "read": "each choice is a best response to the other", "why": "No player can improve by deviating alone, so the pair is stable." }
    ],
    "why": "It shows what rational play looks like when both sides move at once, and that individually rational choices can be collectively bad (the Prisoner's Dilemma), which is why rules, contracts and repetition matter.",
    "traps": [
      "Dominance must be strict and against every opponent strategy; being better against most of them is not enough.",
      "Equilibrium does not mean best: the equilibrium of the Prisoner's Dilemma is worse for both players than mutual cooperation.",
      "A game can have several pure equilibria (Battle of the Sexes) or none (Matching Pennies). Without a pure equilibrium, players must randomise: a mixed equilibrium always exists (Nash's theorem), but this tool finds only pure ones.",
      "Payoffs are written (row player, column player). Read the first number for the row player."
    ],
    "props": { "complete": "finds every pure equilibrium", "optimal": "no (equilibrium is not optimal)", "time": "O(r·c·(r + c))", "space": "O(r·c)" }
  },
  params: [],
  run(P) {
    const G = Studio.gameLib, steps = [];
    const nr = P.rows.length, nc = P.cols.length, U = (i, j, p) => P.payoff[i][j][p];
    let R = P.rows.map((_, i) => i), C = P.cols.map((_, j) => j);
    steps.push({ caption: `A game with ${nr} strategies for the row player and ${nc} for the column player. Each cell shows (row player's payoff, column player's payoff). Both choose at the same time, each wants a higher number for themselves.`, table: G.table(P) });
    // iterated elimination of strictly dominated strategies
    const eliminated = [];
    const findDominated = () => {
      const rowsByName = R.slice().sort((a, b) => (P.rows[a] < P.rows[b] ? -1 : P.rows[a] > P.rows[b] ? 1 : 0));
      for (const s of rowsByName) for (const t of R) if (t !== s && C.every(j => U(t, j, 0) > U(s, j, 0))) return { player: 0, s, t };
      const colsByName = C.slice().sort((a, b) => (P.cols[a] < P.cols[b] ? -1 : P.cols[a] > P.cols[b] ? 1 : 0));
      for (const s of colsByName) for (const t of C) if (t !== s && R.every(i => U(i, t, 1) > U(i, s, 1))) return { player: 1, s, t };
      return null;
    };
    // first: strategies that dominate everything else in the full game (dominant strategies)
    const dominant = [0, 1].map(pl => {
      const idx = pl === 0 ? R : C, other = pl === 0 ? C : R;
      return idx.find(t => idx.every(s => s === t || other.every(o => (pl === 0 ? U(t, o, 0) > U(s, o, 0) : U(o, t, 1) > U(o, s, 1))))) ?? null;
    });
    const nameOf = (pl, i) => (pl === 0 ? P.rows[i] : P.cols[i]);
    steps.push({ caption: dominant[0] === null && dominant[1] === null ? "Looking for dominant strategies (one that beats every other strategy of the same player whatever the opponent does): neither player has one. Next, look for strategies that are dominated by another."
        : `Dominant strategies (better than every alternative against every opponent choice): ${dominant[0] !== null ? `the row player has ${nameOf(0, dominant[0])}` : "the row player has none"}; ${dominant[1] !== null ? `the column player has ${nameOf(1, dominant[1])}` : "the column player has none"}. A rational player simply plays it.`,
      table: G.table(P, { title: "payoffs (row player, column player)" }), stats: [{ label: "row dominant", value: dominant[0] !== null ? nameOf(0, dominant[0]) : "none", state: dominant[0] !== null ? "ok" : "" }, { label: "column dominant", value: dominant[1] !== null ? nameOf(1, dominant[1]) : "none", state: dominant[1] !== null ? "ok" : "" }] });
    for (let d = findDominated(); d; d = findDominated()) {
      const { player, s, t } = d, who = player === 0 ? "row" : "column", rs = player === 0 ? P.rows : P.cols;
      const against = (player === 0 ? C : R).map(o => { const [a, b] = player === 0 ? [U(t, o, 0), U(s, o, 0)] : [U(o, t, 1), U(o, s, 1)]; return `against ${(player === 0 ? P.cols : P.rows)[o]}: ${a} > ${b}`; }).join("; ");
      eliminated.push({ player: who, strategy: rs[s], by: rs[t] });
      if (player === 0) R = R.filter(x => x !== s); else C = C.filter(x => x !== s);
      steps.push({ caption: `The ${who} player's ${rs[s]} is strictly dominated by ${rs[t]}: ${rs[t]} pays more whatever the other player does (${against}). A rational player never plays ${rs[s]}, so remove it.`,
        table: G.table(P, { rows: R, cols: C, title: `after removing ${rs[s]} (${who} player)` }), stats: [{ label: "removed", value: eliminated.length }, { label: "left", value: `${R.length} × ${C.length}` }] });
    }
    steps.push({ caption: eliminated.length === 0 ? "No strategy is strictly dominated by another, so iterated elimination removes nothing. Use best responses to find equilibria."
        : R.length === 1 && C.length === 1 ? `Nothing more can be removed. Exactly one cell is left: (${P.rows[R[0]]}, ${P.cols[C[0]]}). Iterated elimination of strictly dominated strategies solves this game.`
        : `Nothing more can be removed. ${R.length} × ${C.length} strategies are left.`,
      table: G.table(P, { rows: R, cols: C, title: "game after elimination" }), stats: [{ label: "row strategies left", value: R.length }, { label: "column strategies left", value: C.length }] });
    // best responses on the full game
    const rowBR = new Set(), colBR = new Set();
    for (let j = 0; j < nc; j++) { const m = Math.max(...P.rows.map((_, i) => U(i, j, 0))); P.rows.forEach((_, i) => { if (U(i, j, 0) === m) rowBR.add(i + "," + j); }); }
    for (let i = 0; i < nr; i++) { const m = Math.max(...P.cols.map((_, j) => U(i, j, 1))); P.cols.forEach((_, j) => { if (U(i, j, 1) === m) colBR.add(i + "," + j); }); }
    steps.push({ caption: "Best responses of the row player: for each column, the row player's highest payoff in that column is marked with *. That is the best reply to each possible column choice.", table: G.table(P, { rowBR, title: "row player's best responses (*)" }) });
    steps.push({ caption: "Best responses of the column player: for each row, the column player's highest payoff in that row is marked with *. Now a cell with both numbers marked is a pair of mutual best responses.", table: G.table(P, { rowBR, colBR, title: "both players' best responses (*)" }) });
    const ne = [];
    for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (rowBR.has(i + "," + j) && colBR.has(i + "," + j)) ne.push([i, j]);
    const key = ([i, j]) => i + "," + j, neSet = new Set(ne.map(key));
    steps.push({ caption: ne.length === 0 ? "No cell has both payoffs marked: there is no pure Nash equilibrium. Whatever pair of choices is made, one player gains by switching, so the play circles forever. Players must randomise (a mixed equilibrium exists by Nash's theorem, supplementary, but is not computed here)."
        : `${ne.length} pure Nash equilibri${ne.length === 1 ? "um" : "a"}: ${ne.map(([i, j]) => `(${P.rows[i]}, ${P.cols[j]}) with payoffs (${U(i, j, 0)}, ${U(i, j, 1)})`).join("; ")}. In each, neither player can do better by changing their own choice alone.`,
      table: G.table(P, { rowBR, colBR, ne: neSet, title: "pure Nash equilibria (green)" }), stats: [{ label: "pure equilibria", value: ne.length, state: ne.length ? "ok" : "bad" }] });
    // Pareto check
    const dominators = ([i, j]) => { const out = []; for (let a = 0; a < nr; a++) for (let b = 0; b < nc; b++) if ((a !== i || b !== j) && U(a, b, 0) >= U(i, j, 0) && U(a, b, 1) >= U(i, j, 1) && (U(a, b, 0) > U(i, j, 0) || U(a, b, 1) > U(i, j, 1))) out.push([a, b]); return out; };
    const inefficient = [], efficient = [];
    ne.forEach(c => (dominators(c).length ? inefficient : efficient).push(c));
    if (ne.length) {
      const bad = new Set(inefficient.map(key)), improve = new Set([].concat(...inefficient.map(dominators)).map(key));
      steps.push({ caption: inefficient.length
          ? `Pareto check: ${inefficient.map(c => `(${P.rows[c[0]]}, ${P.cols[c[1]]}) is Pareto-inefficient: ${dominators(c).map(([a, b]) => `(${P.rows[a]}, ${P.cols[b]}) pays (${U(a, b, 0)}, ${U(a, b, 1)}) instead of (${U(c[0], c[1], 0)}, ${U(c[0], c[1], 1)})`).join(" and ")}, at least as good for both and better for one`).join("; ")}. Both players would prefer that outcome, yet neither can reach it by deviating alone, which is the dilemma.`
          : `Pareto check: no other cell is at least as good for both players and better for one, so ${ne.length === 1 ? "this equilibrium is" : "these equilibria are"} Pareto-efficient. Equilibrium and efficiency agree here${ne.length > 1 ? ", but the players must still agree on which equilibrium to play (coordination)" : ""}.`,
        table: G.table(P, { ne: neSet, bad, mark: improve, title: "Pareto-inefficient equilibria and the outcomes that beat them (orange)" }),
        stats: [{ label: "Pareto-inefficient", value: inefficient.length, state: inefficient.length ? "bad" : "ok" }, { label: "Pareto-efficient", value: efficient.length, state: efficient.length ? "ok" : "" }] });
    }
    const nm = c => [P.rows[c[0]], P.cols[c[1]]];
    return { steps, result: { ne: ne.map(nm), eliminated, survivors: { rows: R.map(i => P.rows[i]), cols: C.map(j => P.cols[j]) }, dominantRow: dominant[0] === null ? null : P.rows[dominant[0]], dominantCol: dominant[1] === null ? null : P.cols[dominant[1]], paretoInefficient: inefficient.map(nm), paretoEfficient: efficient.map(nm) } };
  },
});
