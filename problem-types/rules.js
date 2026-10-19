/* Rule bases for forward chaining and Rete: facts are tuples like (parent tom bob); patterns may use ?variables. */
(function (S) {
  const parse = s => { const m = String(s).trim().match(/^\((.*)\)$/); if (!m) throw new Error(`"${s}" must be written in brackets, e.g. (parent tom bob)`); return m[1].trim().split(/\s+/); };
  S.rulesLib = {
    parse, show: t => "(" + t.join(" ") + ")",
    match(pat, fact, b) {
      if (pat.length !== fact.length) return null;
      const nb = Object.assign({}, b);
      for (let i = 0; i < pat.length; i++) {
        const p = pat[i];
        if (p.startsWith("?")) { if (p in nb) { if (nb[p] !== fact[i]) return null; } else nb[p] = fact[i]; }
        else if (p !== fact[i]) return null;
      }
      return nb;
    },
    subst: (pat, b) => pat.map(t => (t.startsWith("?") ? b[t] ?? t : t)),
  };
  S.registerType({
    type: "rules", label: "rule base", plural: "rule bases",
    validate(p) {
      if (!Array.isArray(p.facts) || !Array.isArray(p.rules)) throw new Error("A rule base needs facts and rules");
      p.facts.forEach(parse);
      p.rules.forEach(r => { if (!r.name || !r.if || !r.then) throw new Error("Each rule needs name, if and then"); r.if.forEach(x => parse(x.replace(/^not\s+/, ""))); r.then.forEach(x => parse(x.replace(/^(add|remove)\s+/, ""))); });
    },
    prepare(p) {
      const rules = p.rules.map((r, i) => ({ name: r.name, order: i, conds: r.if.map(c => ({ neg: /^not\s+/.test(c), pat: parse(c.replace(/^not\s+/, "")) })),
        acts: r.then.map(a => ({ op: /^remove\s+/.test(a) ? "remove" : "add", pat: parse(a.replace(/^(add|remove)\s+/, "")) })) }));
      return Object.assign({}, p, { ids: rules.map(r => r.name), facts0: p.facts.map(parse), rulesP: rules });
    },
    toText: p => p.facts.map(f => "fact " + f).join("\n") + "\n" + p.rules.map(r => `rule ${r.name}: if ${r.if.join(" & ")} then ${r.then.join(" & ")}`).join("\n"),
    fromText(txt, base) {
      const p = { id: base.id, type: "rules", name: base.name, facts: [], rules: [] };
      txt.split(/\n/).map(l => l.replace(/#.*/, "").trim()).filter(Boolean).forEach(l => {
        if (/^fact\s+/.test(l)) p.facts.push(l.replace(/^fact\s+/, ""));
        else { const m = l.match(/^rule\s+(\w+)\s*:\s*if\s+(.*)\s+then\s+(.*)$/); if (!m) throw new Error(`Cannot read: ${l}`); p.rules.push({ name: m[1], if: m[2].split(/\s*&\s*/), then: m[3].split(/\s*&\s*/) }); }
      });
      return p;
    },
    help: "fact (parent tom bob) · rule R1: if (parent ?x ?y) & (parent ?y ?z) then (grandparent ?x ?z). Prefix with not / remove where needed.",
    describe: p => `${p.facts.length} facts, ${p.rules.length} rules`,
  });
})(Studio);
