/* Week 11: matching-diagram view of a binary CSP, then arc consistency (REVISE) read off the diagram. */
Studio.register({
  id: "csp-matching-diagram",
  defaultExample: "csp-chain",
  name: "Matching diagram and arc consistency",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 32,
  summary: "Draw each variable's domain as a column of dots and join two dots by a line when the pair is allowed by a binary constraint. Then run arc consistency on the picture: a dot with no line towards a neighbouring column has no support and is deleted, which may orphan dots in other columns.",
  pseudocode: `for each variable X: draw a column with one dot per value in D(X)
for each constraint C(X, Y): join (X = a) and (Y = b) by a line when (a, b) is allowed
AC-3 on the diagram:
    Q ← every arc (X, Y)
    while Q not empty
        (X, Y) ← pop(Q)
        for each dot (X = a) with no line to any live dot of column Y: delete it
        if something was deleted: add every arc (Z, X), Z ≠ Y, to Q`,
  complexity: "Same as AC-3: O(e·d³); the picture has up to d² lines per constraint",
  learn: {
    intro: "A constraint is a relation: the set of value pairs it allows. The matching diagram draws that relation as lines between two columns of dots, so that 'this value has a supporting value in the neighbour' becomes 'this dot has at least one line going to the neighbouring column'. Arc consistency is then just: remove dots with no line, and keep going while that orphans more dots. **Supplementary:** the matching-diagram drawing is a teaching picture of the course's arc consistency, not a separate algorithm.",
    definition: "For a binary CSP, a matching diagram has one column per variable, one dot per value in its domain, and a line between (X = a) and (Y = b) exactly when the constraint between X and Y allows the pair (a, b). Revise(X, Y) deletes every dot of column X that has no line to a live dot of column Y. Repeating Revise over all arcs (AC-3) until nothing changes gives arc consistency.",
    steps: [
      ["draw columns", "One dot per value of each domain."],
      ["draw lines of each constraint", "A line means the pair is allowed; no line means forbidden."],
      ["Revise(X, Y)", "Look for dots in column X that have no line into column Y."],
      ["delete an unsupported dot", "Its lines disappear too, which can leave dots in other columns with no support."],
      ["requeue arcs (Z, X)", "Only neighbours of a changed column can lose support."],
    ],
    formulas: [
      { f: "a ∈ D(X) survives Revise(X, Y)  ⇔  ∃ b ∈ D(Y): (a, b) ∈ R(X, Y)", read: "a dot survives if it has a line to some live dot in the neighbouring column", why: "In any solution with X = a the variable Y takes some value b of its domain, and the pair must be allowed; with no such b the value a can never be part of a solution." },
      { f: "lines(X, Y) = { (a, b) : (a, b) allowed by C(X, Y) }", read: "the relation drawn as lines", why: "Lines make the relation visible: a constraint like X < Y over {1,2,3} has 3 lines, and the dots 3 (in X) and 1 (in Y) have none." },
    ],
    why: "The picture explains why arc consistency solves the ordering chain (dots peel away like dominoes) and does nothing on map colouring (every dot keeps a line to every neighbouring column).",
    traps: ["A dot needs a line to at least one live dot of the neighbouring column, not to all of them.", "Lines to a deleted dot no longer count; that is why deletions cascade.", "Arc consistency can leave several dots in every column and still have no solution (compare Path consistency on the two-colour triangle)."],
    props: { complete: "no (filtering only)", optimal: "n/a", time: "O(e·d³)", space: "O(n·d + lines)" },
  },
  params: [],
  run(P) {
    const C = Studio.cspLib, ids = P.ids, steps = [], cap = 160;
    const D = Object.fromEntries(ids.map(v => [v, P.dom[v].slice()]));
    const maxD = Math.max(...ids.map(v => D[v].length));
    const nid = (x, a) => `${x}=${a}`, hid = x => "var:" + x;
    const sc = [];
    ids.forEach((x, i) => {
      const cx = ids.length === 1 ? 0.5 : i / (ids.length - 1);
      sc.push({ id: hid(x), x: cx, y: 0, shape: "box", label: x, w: 1.6 });
      P.dom[x].forEach((a, j) => sc.push({ id: nid(x, a), x: cx, y: maxD === 1 ? 0.55 : 0.2 + 0.8 * j / (maxD - 1), label: String(a) }));
    });
    const scene = { nodes: sc, edges: [], aspect: Math.max(0.5, 0.18 * maxD + 0.2), r: 13, pad: 44 };
    const linesOf = c => { const [x, y] = c.scope, out = []; for (const a of P.dom[x]) for (const b of P.dom[y]) if (C.ok(c, x, a, y, b)) out.push({ u: nid(x, a), v: nid(y, b) }); return out; };
    const alive = new Set();
    ids.forEach(x => D[x].forEach(a => alive.add(nid(x, a))));
    const allLines = P.cons.flatMap(linesOf);
    const liveLines = () => allLines.filter(l => alive.has(l.u) && alive.has(l.v));
    const nodeStates = (hot = {}) => { const m = {}; ids.forEach(x => { m[hid(x)] = { state: "plain" }; P.dom[x].forEach(a => { const k = nid(x, a); m[k] = { state: hot[k] || (alive.has(k) ? (D[x].length === 1 && P.dom[x].length > 1 ? "path" : "plain") : "pruned") }; }); }); return m; };
    const push = s => { if (steps.length < cap) steps.push(Object.assign({ scene }, s)); };
    const lists = () => [{ label: "DOMAINS", items: ids.map(x => ({ text: `${x} {${D[x].join(",")}}`, state: D[x].length < P.dom[x].length ? "closed" : "plain" })) }];
    const between = (l, x, y) => (l.u.startsWith(x + "=") && l.v.startsWith(y + "=")) || (l.v.startsWith(x + "=") && l.u.startsWith(y + "="));
    push({ caption: `${ids.length} columns, one per variable, with a dot per value of its domain. Constraints will be drawn as lines between dots: a line means 'this pair of values is allowed'.`, nodes: nodeStates(), lists: lists(), stats: [{ label: "dots", value: alive.size }] });
    // 1. draw the relations, one constraint at a time
    const drawn = [];
    P.cons.forEach(c => {
      const ls = linesOf(c), total = P.dom[c.scope[0]].length * P.dom[c.scope[1]].length;
      const cur = ls.map(l => ({ u: l.u, v: l.v, state: "candidate" })), old = drawn.map(l => ({ u: l.u, v: l.v, state: "faint" }));
      push({ caption: `Constraint ${c.scope[0]} ${C.relText(c)} ${c.scope[1]}: ${ls.length} of ${total} pairs are allowed, so ${ls.length} line${ls.length === 1 ? "" : "s"}${ls.length === total ? " (every pair is allowed: this constraint rules nothing out)" : ls.length === 0 ? " (no pair is allowed: the constraint cannot be satisfied)" : `; the ${total - ls.length} missing pair${total - ls.length === 1 ? " is" : "s are"} forbidden`}.`,
        nodes: nodeStates(), edges: old.concat(cur), lists: lists(), stats: [{ label: "lines so far", value: drawn.length + ls.length }] });
      ls.forEach(l => drawn.push(l));
    });
    // 2. AC-3 on the diagram
    const Q = []; P.cons.forEach(c => { Q.push([c.scope[0], c.scope[1]]); Q.push([c.scope[1], c.scope[0]]); });
    const inQ = new Set(Q.map(a => a.join("|"))), removed = [];
    let revisions = 0, deletions = 0;
    const supports = (x, a, y) => { const cs = C.between(P, x, y); return !cs.length || D[y].some(b => cs.every(c => C.ok(c, x, a, y, b))); };
    while (Q.length) {
      const [x, y] = Q.shift(); inQ.delete(x + "|" + y); revisions++;
      const bad = D[x].filter(a => !supports(x, a, y));
      const gone = {}; bad.forEach(a => { gone[nid(x, a)] = "rejected"; });
      const view = liveLines().map(l => ({ u: l.u, v: l.v, state: between(l, x, y) ? "candidate" : "faint" }));
      if (!bad.length) {
        push({ caption: `REVISE(${x}, ${y}): every live dot of ${x} has a line to a live dot of ${y}, so nothing is deleted.`, nodes: nodeStates(), edges: view, lists: lists(), stats: [{ label: "revisions", value: revisions }, { label: "deleted", value: deletions }] });
        continue;
      }
      const lost = new Set(bad.map(a => nid(x, a)));
      const edges = view.map(e => (lost.has(e.u) || lost.has(e.v) ? { u: e.u, v: e.v, state: "removed" } : e));
      push({ caption: `REVISE(${x}, ${y}): ${bad.map(a => `${x} = ${a}`).join(", ")} ${bad.length === 1 ? "has" : "have"} no line to any live dot of ${y}, so ${bad.length === 1 ? "it is" : "they are"} unsupported and deleted${D[x].length === bad.length ? `: ${x} has no values left, so there is no solution` : ""}.`,
        nodes: nodeStates(gone), edges, lists: lists(), stats: [{ label: "revisions", value: revisions }, { label: "deleted", value: deletions + bad.length, state: "warn" }] });
      bad.forEach(a => { alive.delete(nid(x, a)); removed.push({ variable: x, value: a, arc: [x, y] }); });
      D[x] = D[x].filter(a => !bad.includes(a)); deletions += bad.length;
      if (!D[x].length) break;
      const requeued = [];
      for (const z of C.neighbours(P, x)) if (z !== y && !inQ.has(z + "|" + x)) { Q.push([z, x]); inQ.add(z + "|" + x); requeued.push(`(${z},${x})`); }
      push({ caption: `The deleted dots took their lines with them. ${requeued.length ? `Columns next to ${x} may have lost their only support, so re-examine ${requeued.join(", ")}.` : `No other arc into ${x} needs re-examining.`}`,
        nodes: nodeStates(), edges: liveLines().map(l => ({ u: l.u, v: l.v, state: "faint" })), lists: lists(), stats: [{ label: "queue", value: Q.length }] });
    }
    const empty = ids.some(x => !D[x].length), single = ids.every(x => D[x].length === 1);
    steps.push({ scene, caption: empty ? `A column is empty: arc consistency proves there is no solution (${deletions} dots deleted).` : single ? `Arc consistent after ${revisions} revisions, ${deletions} dots deleted: every column has exactly one dot left, ${ids.map(x => `${x} = ${D[x][0]}`).join(", ")}, so the problem is solved without search.` : deletions ? `Arc consistent after ${revisions} revisions, ${deletions} dots deleted. Domains: ${ids.map(x => `${x} {${D[x].join(",")}}`).join(", ")}; search is still needed to choose among the survivors.` : `Arc consistent after ${revisions} revisions and nothing was deleted: every dot has a line to every neighbouring column, so the picture is unchanged and search is needed.`,
      nodes: nodeStates(), edges: liveLines().map(l => ({ u: l.u, v: l.v, state: "path" })), lists: lists(), stats: [{ label: "revisions", value: revisions }, { label: "deleted", value: deletions, state: deletions ? "warn" : undefined }] });
    return { steps, result: { domains: D, removed, revisions, deletions, inconsistent: empty, solved: !empty && single } };
  },
});
