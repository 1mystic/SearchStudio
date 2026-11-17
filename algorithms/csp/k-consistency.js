/* Week 11: strong k-consistency check (k = 1, 2, 3) by enumerating consistent (j-1)-variable assignments. */
Studio.register({
  id: "csp-k-consistency",
  defaultExample: "csp-pc-triangle",
  name: "Strong k-consistency check (k ≤ 3)",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 45,
  summary: "Test i-consistency directly from the definition for i = 1, 2, 3: every consistent assignment to i − 1 variables must extend to any i-th variable. Each failing assignment is shown with what it implies: a value to delete (i = 2, arc consistency) or a forbidden pair, an induced nogood (i = 3, path consistency).",
  pseudocode: `for j = 1 .. k
    for each set S of j − 1 variables and each consistent assignment A to S
        for each variable V not in S
            if no value v in D(V) makes A ∪ {V = v} consistent: report (A, V) as a failure
    if there is no failure: the network is j-consistent
strongly k-consistent  ⇔  j-consistent for every j ≤ k`,
  complexity: "O(n^(j-1) · d^(j-1) · n · d) checks for level j; practical only for small networks",
  learn: {
    intro: "Node, arc and path consistency are the first three members of one family. A network is i-consistent when every consistent assignment to any i − 1 variables can be extended to any i-th variable. It is strongly k-consistent when it is i-consistent for every i ≤ k. This page checks the definition literally and shows each assignment that fails to extend. **Supplementary:** the course introduces 2- and 3-consistency; the general definition and the idea of strong k-consistency (Freuder) go slightly beyond it.",
    definition: "Level i = 1: every variable has a non-empty domain (there are no unary constraints in this problem type). Level i = 2: every value of every variable has a supporting value in every other variable (arc consistency). Level i = 3: every consistent pair (X = a, Y = b) can be extended to every third variable Z (path consistency). A failing assignment A with variable V means that no value of V is compatible with A: for i = 2 it implies deleting the value, for i = 3 it implies the nogood {X = a, Y = b}, i.e. the pair is forbidden, which acts as a new constraint between X and Y.",
    steps: [
      ["choose j − 1 variables and a consistent assignment", "Only assignments that violate no constraint among themselves count."],
      ["choose another variable V", "The assignment must extend to V."],
      ["look for a value of V compatible with the assignment", "If none exists, the assignment is a failure."],
      ["implication of a failure", "i = 2: delete the value. i = 3: record the nogood on the pair."],
    ],
    formulas: [
      { f: "i-consistent ⇔ ∀ S, |S| = i − 1, ∀ consistent A on S, ∀ V ∉ S, ∃ v ∈ D(V): A ∪ {V = v} consistent", read: "every consistent partial solution of size i − 1 can grow by one more variable", why: "A solution restricted to any i − 1 variables is a consistent assignment, and it extends to every other variable; an assignment that cannot extend is therefore in no solution and can be forbidden without losing solutions." },
      { f: "strongly k-consistent ⇔ j-consistent for all j ≤ k", read: "all the lower levels hold too", why: "Strong k-consistency on a network of k variables lets a solution be built without backtracking (Freuder); mere k-consistency without the lower levels guarantees nothing." },
    ],
    why: "The two-colour triangle is 2-consistent (arc consistency finds nothing) but not 3-consistent: the pair (X = a, Y = b) cannot be extended to Z, which is exactly how path consistency proves there is no solution. The ordering chain X < Y < Z is not even 2-consistent until arc consistency has reduced it; afterwards it is strongly 3-consistent.",
    traps: ["Strong k-consistency needs every level up to k; a network can be 3-consistent and not 2-consistent.", "Only consistent assignments count: a pair that already violates a constraint is not a failure.", "k-consistency for small k does not make search backtrack-free unless k reaches the width-related bound; it only removes some dead ends."],
    props: { complete: "no (a test, not a solver)", optimal: "n/a", time: "O(n^k · d^k)", space: "O(n)" },
  },
  params: [
    { key: "k", label: "Check strong k-consistency up to k", type: "int", default: 3, min: 1, max: 3 },
    { key: "ac", label: "First enforce arc consistency", type: "select", default: "no", options: [["no", "no: test the problem as given"], ["yes", "yes: reduce the domains with AC-3 first"]] },
  ],
  run(P, { k, ac }) {
    const C = Studio.cspLib, ids = P.ids, steps = [], capPer = 24;
    k = Math.max(1, Math.min(3, k || 3));
    const D = Object.fromEntries(ids.map(v => [v, P.dom[v].slice()]));
    const supports = (x, a, y) => { const cs = C.between(P, x, y); return !cs.length || D[y].some(b => cs.every(c => C.ok(c, x, a, y, b))); };
    let reduced = [];
    if (ac === "yes") {
      let ch = true;
      while (ch) { ch = false; for (const x of ids) for (const y of ids) if (x !== y) { const keep = D[x].filter(a => supports(x, a, y)); if (keep.length < D[x].length) { D[x].filter(a => !keep.includes(a)).forEach(a => reduced.push(`${x}=${a}`)); D[x] = keep; ch = true; } } }
    }
    const compat = (x, a, y, b) => C.between(P, x, y).every(c => C.ok(c, x, a, y, b));
    const ok = (A, v, a) => Object.keys(A).every(x => compat(x, A[x], v, a));
    const domTxt = () => ids.map(v => `${v}{${D[v].join(",")}}`).join(" ");
    const states = (A, V) => Object.fromEntries(ids.map(v => [v, { state: v in A ? "current" : v === V ? "rejected" : "plain", badge: v in A ? String(A[v]) : undefined, sub: "{" + D[v].join(",") + "}" }]));
    const tests = {}, fails = {}, levels = [], nogoods = [], deletions = [];
    steps.push({ caption: `Check strong ${k}-consistency from the definition: level j asks that every consistent assignment to j − 1 variables extends to any other variable.${ac === "yes" ? ` Arc consistency was enforced first (${reduced.length ? "removed " + reduced.join(", ") : "nothing to remove"}); domains: ${domTxt()}.` : ` Domains as given: ${domTxt()}.`}`,
      nodes: states({}, null), stats: [{ label: "k", value: k }] });
    const combos = (arr, m) => m === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), m - 1).map(r => [x].concat(r)));
    const assigns = S => S.reduce((acc, x) => acc.flatMap(A => D[x].filter(a => ok(A, x, a)).map(a => Object.assign({}, A, { [x]: a }))), [{}]);
    for (let j = 1; j <= k; j++) {
      tests[j] = 0; fails[j] = [];
      let shown = 0;
      steps.push({ caption: j === 1 ? "Level 1 (node consistency): the empty assignment must extend to every variable, i.e. every domain is non-empty (this problem type has no unary constraints)." : j === 2 ? "Level 2 (arc consistency): every value X = a, taken as a one-variable assignment, must extend to every other variable Y." : "Level 3 (path consistency): every consistent pair X = a, Y = b must extend to every third variable Z.",
        nodes: states({}, null), stats: [{ label: "level", value: j }] });
      for (const S of combos(ids, j - 1)) for (const A of assigns(S)) for (const V of ids) {
        if (S.includes(V)) continue;
        tests[j]++;
        if (D[V].some(a => ok(A, V, a))) continue;
        const txt = S.length ? S.map(x => `${x}=${A[x]}`).join(", ") : "∅";
        let implies;
        if (j === 1) implies = `${V} has an empty domain: there is no solution`;
        else if (j === 2) { implies = `delete ${S[0]} = ${A[S[0]]} (arc consistency would remove it)`; deletions.push(`${S[0]}=${A[S[0]]}`); }
        else { implies = `the pair {${txt}} is a nogood: no solution contains it, so it acts as a new constraint between ${S[0]} and ${S[1]}`; nogoods.push(S.map(x => `${x}=${A[x]}`)); }
        fails[j].push({ assignment: Object.assign({}, A), variable: V, implies });
        if (shown++ < capPer) steps.push({ caption: `Level ${j} fails: the consistent assignment ${txt} cannot be extended to ${V}${j > 1 ? `: every value of ${V} (${D[V].join(", ") || "none"}) clashes with it` : ""}. Implication: ${implies}.`,
          nodes: states(A, V), edges: j === 3 ? [{ u: S[0], v: S[1], state: "added", label: "nogood" }] : [],
          table: { title: `level ${j} failures so far`, columns: ["assignment", "cannot extend to", "implies"], rows: fails[j].slice(-8).map(f => [Object.keys(f.assignment).map(x => `${x}=${f.assignment[x]}`).join(", ") || "∅", f.variable, f.implies]) },
          stats: [{ label: "tests", value: tests[j] }, { label: "failures", value: fails[j].length, state: "bad" }] });
      }
      const holds = !fails[j].length; levels.push(holds);
      steps.push({ caption: holds ? `Level ${j} holds: all ${tests[j]} (assignment, variable) tests extended.` : `Level ${j} does not hold: ${fails[j].length} of ${tests[j]} tests failed${fails[j].length > capPer ? ` (the first ${capPer} are shown)` : ""}.${j >= k ? "" : " Strong consistency needs every level up to k, so higher levels do not rescue it."}`,
        nodes: states({}, null), stats: [{ label: `${j}-consistent`, value: holds ? "yes" : "no", state: holds ? "ok" : "bad" }, { label: "tests", value: tests[j] }] });
    }
    const strong = levels.every(Boolean);
    steps.push({ caption: strong ? `Strongly ${k}-consistent: levels ${levels.map((_, i) => i + 1).join(", ")} all hold${ac === "yes" ? " (after arc consistency)" : ""}.` : `Not strongly ${k}-consistent: ${levels.map((h, i) => `${i + 1}-consistent ${h ? "yes" : "no"}`).join(", ")}.${nogoods.length ? ` Enforcing level 3 would forbid ${nogoods.length} pair${nogoods.length > 1 ? "s" : ""} such as {${nogoods[0].join(", ")}}.` : ""}${deletions.length && !nogoods.length ? ` Arc consistency would delete ${[...new Set(deletions)].join(", ")}.` : ""}`,
      nodes: states({}, null), stats: levels.map((h, i) => ({ label: `${i + 1}-consistent`, value: h ? "yes" : "no", state: h ? "ok" : "bad" })) });
    return { steps, result: { k, strong, levels, failures: fails, tests, nogoods, deletions: [...new Set(deletions)], domains: D } };
  },
});
