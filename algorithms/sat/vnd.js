/* Variable Neighbourhood Descent on SAT: N1, then N1-2, ..., up to N1-n. */
Studio.register({
  id: "sat-vnd",
  name: "Variable Neighbourhood Descent (N1 → N1–n)",
  family: "SAT · local search",
  week: 3,
  problem: "sat",
  order: 40,
  summary: "Hill climb in N1. When no one-flip neighbour is better, enlarge the neighbourhood to N1–2 (one or two flips), then N1–3, and so on up to N1–n; after every improvement go back to N1.",
  pseudocode: `N ← start;  k ← 1
while k ≤ n and h(N) < m
    nbrs ← all strings that differ from N in at most k bits     # N1–k
    B ← the neighbour with the largest h (ties: fewest flips, then lowest bit)
    if h(B) > h(N): N ← B;  k ← 1
    else: k ← k + 1
return N`,
  complexity: "Σⱼ≤k C(n,j) evaluations per step: n, n + C(n,2), …, 2ⁿ − 1",
  learn: {
    intro: "A local maximum depends on the neighbourhood: a state can have no better one-flip neighbour and still have a better string two flips away. VND uses that. It searches the small, cheap neighbourhood first and only widens it when it is stuck.",
    definition: "Let Nk be the strings that differ from the current one in exactly k bits, so |Nk| = C(n,k), and let N1–k = N1 ∪ … ∪ Nk. Start with k = 1. Move to the best member of N1–k if it is strictly better, and reset k to 1. Otherwise increase k. When k passes n, the state is a local maximum of every neighbourhood, hence a global maximum of h (N1–n is the whole space).",
    steps: [
      ["N ← start;  k ← 1", "Begin with the smallest neighbourhood."],
      ["nbrs ← N1–k of N", "Sizes are C(n,1), C(n,1)+C(n,2), …; the last one covers all 2ⁿ − 1 other strings."],
      ["B ← best neighbour", "Ties: fewer flips first, then lowest bit."],
      ["if h(B) > h(N): N ← B, k ← 1", "Success: return to the cheap neighbourhood."],
      ["else k ← k + 1", "Failure: pay for a bigger neighbourhood."],
    ],
    formulas: [
      { f: "|Nk| = C(n,k)", read: "choose which k of the n bits to flip", why: "This is why the neighbourhoods grow so fast: for n = 4 the sizes are 4, 6, 4, 1." },
      { f: "|N1–k| = C(n,1) + … + C(n,k)", read: "cumulative size", why: "|N1–n| = 2ⁿ − 1, so the last phase is brute force: VND ends exactly at a global maximum, at brute-force cost in the worst case." },
    ],
    why: "On the course example, hill climbing stops at 1000 (h 5), but flipping the pair b, d reaches 1101 (h 6), a solution. VND finds it by widening to N1–2 at 1000. Most of the time the cheap neighbourhood does the work and the expensive ones are only paid for when needed.",
    traps: [
      "After an improvement return to N1, not to the neighbourhood that found it.",
      "N1–2 contains the one-flip neighbours as well as the pairs.",
      "If the whole sequence fails the result is a true global maximum of h, but a global maximum with h < m means the formula is unsatisfiable.",
    ],
    props: { complete: "yes if run up to N1–n (it then covers the space)", optimal: "yes with N1–n", time: "up to O(2ⁿ · m)", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "kmax", label: "Largest neighbourhood N1–k (0 = n)", type: "int", default: 0, min: 0, max: 20 }],
  run(P, { start, kmax }) {
    const L = Studio.satLib, steps = [], K = kmax >= 1 ? Math.min(kmax, P.n) : P.n;
    let cur = L.startBits(P, start), k = 1; const path = [cur], log = [];
    const sizes = Array.from({ length: K }, (_, j) => Array.from({ length: j + 1 }, (_, i) => L.choose(P.n, i + 1)).reduce((a, b) => a + b, 0));
    const lists = kk => [{ label: "NEIGHBOURHOODS", items: sizes.map((s, j) => ({ text: `${j === 0 ? "N1" : "N1–" + (j + 1)} (${s})`, state: j + 1 < kk ? "closed" : j + 1 === kk ? "open" : "plain" })) }];
    steps.push(Object.assign({ caption: `Start at ${cur} with h = ${P.h(cur)} of ${P.m}. Neighbourhood sizes for n = ${P.n}: ${Array.from({ length: K }, (_, j) => `C(${P.n},${j + 1}) = ${L.choose(P.n, j + 1)}`).join(", ")}. Begin in N1.`,
      table: L.clauseTable(P, cur), lists: lists(1), stats: L.stats(P, cur, [{ label: "k", value: 1 }]) }, L.drawBits(P, cur)));
    for (let guard = 0; guard < 500 && k <= K && !P.solved(cur); guard++) {
      const nb = P.nbrsUpTo(cur, k), b = L.best(nb), h0 = P.h(cur), name = k === 1 ? "N1" : "N1–" + k;
      const ties = nb.filter(x => x.h === b.h).length;
      if (b.h > h0) {
        steps.push(Object.assign({ caption: `${name} of ${cur}: ${nb.length} neighbours, best h = ${b.h} at ${b.bits} (flip ${b.move})${ties > 1 ? `, first of ${ties} ties` : ""}. ${b.h} > ${h0}, so move there${k > 1 ? ` and return to N1 (the cheap neighbourhood)` : ""}.`,
          table: L.nbrTable(P, nb, cur, b.bits), lists: lists(k), stats: L.stats(P, cur, [{ label: "k", value: k }, { label: "|nbrs|", value: nb.length }]) }, L.drawNeighbourhood(P, cur, nb, { chosen: b.bits })));
        log.push({ from: cur, to: b.bits, k, flips: b.move }); cur = b.bits; path.push(cur); k = 1;
      } else {
        steps.push(Object.assign({ caption: `${name} of ${cur}: ${nb.length} neighbours, best h = ${b.h} (${b.bits}) is not better than ${h0}. ${k < K ? `No improvement here, so widen to N1–${k + 1} (${sizes[k]} neighbours).` : `That was the largest neighbourhood: nothing in reach is better.`}`,
          table: L.nbrTable(P, nb, cur, null), lists: lists(k), stats: L.stats(P, cur, [{ label: "k", value: k }, { label: "|nbrs|", value: nb.length }]) }, L.drawNeighbourhood(P, cur, nb, {})));
        log.push({ from: cur, k, stuck: true }); k++;
      }
    }
    const solved = P.solved(cur);
    steps.push(Object.assign({ caption: solved ? `${cur} satisfies all ${P.m} clauses. VND path: ${path.join(" → ")}; it needed N1–${Math.max(1, ...log.map(l => l.k))} at most.` : `VND ends at ${cur} with h = ${P.h(cur)} of ${P.m}: no string within ${K} flip${K === 1 ? "" : "s"} is better${K === P.n ? ", so this is a global maximum of h (the formula is unsatisfiable)" : ""}.`,
      table: L.clauseTable(P, cur), lists: lists(K + 1), stats: L.stats(P, cur, [{ label: "result", value: solved ? "solved" : "stuck", state: solved ? "ok" : "bad" }]) }, L.drawBits(P, cur, { state: solved ? "goal" : "path" })));
    return { steps, result: { bits: cur, h: P.h(cur), solved, path, moves: path.length - 1, maxK: Math.max(1, ...log.map(l => l.k)) } };
  },
});
