/* Conway's Game of Life, one generation per step. Week 4 (emergent systems). The course's rule for this lesson is
 * "simple local rules, global behaviour"; the B3/S23 rule itself is Conway's. */
Studio.register({
  id: "life-stepper",
  name: "Game of Life: generation stepper",
  family: "Emergent systems",
  week: 4,
  problem: "life",
  order: 10,
  defaultExample: "life-glider",
  summary: "Every cell looks only at its eight neighbours: a dead cell with exactly 3 live neighbours is born, a live cell with 2 or 3 survives, every other live cell dies. Watch order and motion emerge from that one local rule.",
  pseudocode: `repeat for each generation:
    for each cell, n ← number of live neighbours (of 8)
        if the cell is alive:  survives if n = 2 or n = 3, else dies   (S23)
        if the cell is dead:   is born if n = 3                         (B3)
    all cells change together: the new grid is computed from the old one
    population ← number of live cells`,
  complexity: "O(cells) per generation",
  learn: {
    "intro": "The Game of Life is a grid of cells, each alive or dead. There is no player and no goal. Every cell applies the same tiny rule to its eight neighbours, all at the same moment, and patterns appear that nobody wrote down: blocks that never change, blinkers that flash, gliders that walk across the grid. It is the standard picture of an emergent system: global behaviour from simple local rules.",
    "definition": "State = the set of live cells. Next state: a live cell survives with 2 or 3 live neighbours (S23); a dead cell with exactly 3 live neighbours becomes alive (B3); everything else is dead in the next generation. The rule reads the old generation only, so the update is simultaneous.",
    "steps": [
      ["count the live neighbours of every cell", "Only the eight surrounding cells matter. There is no other information."],
      ["live cell with 2 or 3 neighbours survives", "S23: enough company to live, not enough crowding to die."],
      ["live cell with fewer than 2 or more than 3 neighbours dies", "Loneliness (underpopulation) or overcrowding."],
      ["dead cell with exactly 3 neighbours is born", "B3: three parents make a new cell."],
      ["apply all changes at once", "Births and deaths in one generation never influence each other."]
    ],
    "formulas": [
      { "f": "next(c) = 1 if (alive(c) and n(c) ∈ {2, 3}) or (dead(c) and n(c) = 3), else 0", "read": "alive next time if it has the right number of neighbours", "why": "This is the whole rule, written as B3/S23: Birth on 3, Survival on 2 or 3." },
      { "f": "population(t) = number of live cells in generation t", "read": "how many cells are alive", "why": "Plotted over time it shows growth, decay or a steady state (still lifes and oscillators) at a glance." }
    ],
    "why": "It shows that you can get rich behaviour without a plan or a controller, which is the core idea of emergent and self-organising systems. Gliders can even carry information, and the rule is rich enough to compute anything a computer can.",
    "traps": [
      "The update is simultaneous: do not use a cell's new state while counting another cell's neighbours.",
      "A cell is not a neighbour of itself: a live cell counts only the other eight.",
      "On a bounded grid cells beyond the edge count as dead (unless the grid wraps around), so patterns can behave differently near the border."
    ],
    "props": { "complete": "n/a (a simulation, not a search)", "optimal": "n/a", "time": "O(cells) per generation", "space": "O(cells)" }
  },
  params: [{ key: "generations", label: "Generations", type: "int", default: 4, min: 1, max: 40 }],
  run(P, { generations }) {
    const L = Studio.lifeLib, steps = [];
    const G = Math.max(1, Math.min(40, Math.round(generations) || 1));
    let A = P.start;
    const hist = [L.list(A)], pops = [hist[0].length];
    const cellText = ([r, c]) => `(${r},${c})`;
    const draw = (A2, births, deaths) => {
      const nodes = {};
      L.list(A2).forEach(([r, c]) => (nodes[L.id(r, c)] = { state: "path" }));
      births.forEach(([r, c]) => (nodes[L.id(r, c)] = { state: "current" }));
      deaths.forEach(([r, c]) => (nodes[L.id(r, c)] = { state: "rejected" }));
      return nodes;
    };
    const chart = () => ({ kind: "walk", yLabel: "population", series: pops.map((y, x) => ({ x, y })) });
    steps.push({ caption: `Generation 0: ${pops[0]} live cell${pops[0] === 1 ? "" : "s"} on a ${P.height} × ${P.width} grid${P.wrap ? " that wraps around" : ""}. Rule B3/S23: a dead cell with exactly 3 live neighbours is born; a live cell with 2 or 3 survives; every other live cell dies.`,
      nodes: draw(A, [], []), stats: [{ label: "generation", value: 0 }, { label: "population", value: pops[0] }], chart: chart() });
    for (let g = 1; g <= G; g++) {
      const { next, births, deaths, survivors } = L.step(P, A);
      const reasons = [];
      births.forEach(([r, c, n]) => reasons.push(`${cellText([r, c])} is born: dead with exactly ${n} live neighbours (B3)`));
      deaths.forEach(([r, c, n]) => reasons.push(`${cellText([r, c])} dies: ${n < 2 ? `only ${n} live neighbour${n === 1 ? "" : "s"}, fewer than 2 (loneliness)` : `${n} live neighbours, more than 3 (overcrowding)`}`));
      const shown = reasons.slice(0, 4).join("; "), more = reasons.length > 4 ? `; and ${reasons.length - 4} more (see the table)` : "";
      const caption = reasons.length ? `Generation ${g - 1} → ${g}: ${births.length} birth${births.length === 1 ? "" : "s"}, ${deaths.length} death${deaths.length === 1 ? "" : "s"}. ${shown}${more}. The ${survivors.length} other live cell${survivors.length === 1 ? " has" : "s have"} 2 or 3 neighbours and survive (S23).`
        : `Generation ${g - 1} → ${g}: nothing changes. Every live cell has 2 or 3 live neighbours (S23) and no dead cell has exactly 3 (B3), so this pattern is stable.`;
      A = next; const cur = L.list(A); hist.push(cur); pops.push(cur.length);
      const rows = births.map(([r, c, n]) => [cellText([r, c]), "dead", n, "B3: exactly 3", { t: "born", s: "ok" }])
        .concat(deaths.map(([r, c, n]) => [cellText([r, c]), "alive", n, n < 2 ? "fewer than 2" : "more than 3", { t: "dies", s: "bad" }]));
      steps.push({ caption, nodes: draw(A, births, deaths),
        table: rows.length ? { title: `changes in generation ${g}`, columns: ["cell (row,col)", "was", "live neighbours", "rule", "becomes"], rows } : undefined,
        stats: [{ label: "generation", value: g }, { label: "population", value: pops[g] }, { label: "births", value: births.length, state: births.length ? "ok" : "" }, { label: "deaths", value: deaths.length, state: deaths.length ? "bad" : "" }], chart: chart() });
      if (!rows.length) delete steps[steps.length - 1].table;
    }
    // does the pattern repeat, possibly shifted?
    const norm = cells => { if (!cells.length) return ""; const r0 = Math.min(...cells.map(c => c[0])), c0 = Math.min(...cells.map(c => c[1])); return cells.map(([r, c]) => `${r - r0},${c - c0}`).join(";"); };
    const origin = cells => (cells.length ? [Math.min(...cells.map(c => c[0])), Math.min(...cells.map(c => c[1]))] : [0, 0]);
    const last = hist[hist.length - 1];
    let period = null, shift = null;
    for (let p = 1; p < hist.length && last.length; p++) {
      const prev = hist[hist.length - 1 - p];
      if (norm(prev) === norm(last)) { const a = origin(prev), b = origin(last); period = p; shift = [b[0] - a[0], b[1] - a[1]]; break; }
    }
    let end;
    if (!last.length) end = `After ${G} generations every cell is dead: this pattern dies out.`;
    else if (period && !shift[0] && !shift[1]) end = period === 1 ? `After ${G} generations the pattern is a still life: generation ${G} equals generation ${G - 1}, so it will never change again.` : `Generation ${G} is the same as generation ${G - period}: the pattern is an oscillator of period ${period}. It flashes through ${period} shapes forever.`;
    else if (period) end = `Generation ${G} is generation ${G - period} translated by (${shift[0]},${shift[1]}) (rows, columns): a spaceship that moves ${Math.abs(shift[0])} row${Math.abs(shift[0]) === 1 ? "" : "s"} and ${Math.abs(shift[1])} column${Math.abs(shift[1]) === 1 ? "" : "s"} every ${period} generations.`;
    else end = `After ${G} generations the population is ${pops[G]} and the pattern has not repeated yet. Try more generations.`;
    steps.push({ caption: end, nodes: draw(A, [], []), stats: [{ label: "generation", value: G }, { label: "population", value: pops[G] }].concat(period ? [{ label: "period", value: period, state: "ok" }] : []), chart: chart() });
    return { steps, result: { generations: hist, populations: pops, period, shift, extinct: !last.length } };
  },
});
