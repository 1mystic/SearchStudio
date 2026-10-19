/* Stage renderer: draws one step (graph SVG, table, OPEN/CLOSED lists, chart, caption).
 * Produces DOM for the live player and plain HTML strings for the printable export. */
(function (root) {
  "use strict";
  const Studio = root.Studio;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const R = {
    esc,
    /* ---------------------------------------------------------- graph */
    /* scene: { nodes:[{id,x,y,label,sub,shape}], edges:[{u,v,label,directed,group}], r, aspect, faintAll } with x,y in 0..1 */
    defaultScene(P) {
      if (P.scene) return P.scene;
      const { pos, aspect } = Studio.layout(P);
      const nodes = P.ids.map(id => ({ id, x: pos[id][0], y: pos[id][1] }));
      let edges = [];
      if (P.type === "tsp") { if (P.ids.length <= 14) P.ids.forEach((a, i) => P.ids.slice(i + 1).forEach(b => edges.push({ u: a, v: b, quiet: true }))); }
      else if (P.edges) edges = P.edges.map(([u, v, w]) => ({ u, v, label: w, directed: P.directed }));
      return { nodes, edges, aspect };
    },
    graphSVG(P, step, opts = {}) {
      const sc = step.scene || R.defaultScene(P);
      const W = 640, PAD = sc.pad ?? 46;
      const aspect = sc.aspect ?? 0.6;
      const H = Math.round(Math.max(260, Math.min(560, W * Math.max(0.42, aspect))));
      const pos = {}; sc.nodes.forEach(n => (pos[n.id] = n));
      const X = id => PAD + pos[id].x * (W - 2 * PAD), Y = id => PAD * 0.8 + pos[id].y * (H - 1.6 * PAD);
      const rN = sc.r || (sc.nodes.length > 30 ? 11 : sc.nodes.length > 14 ? 14 : 19);
      const nodes = step.nodes || {};
      const key = (u, v) => (u < v ? u + "|" + v : v + "|" + u);
      const stepEdges = step.edges || [];
      const drawn = new Set(stepEdges.filter(e => e.state !== "faint").map(e => key(e.u, e.v)));
      const out = [`<svg class="g" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "drawing")}" xmlns="http://www.w3.org/2000/svg">`,
        `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker></defs>`];
      // underlay: scene edges not overridden by the step
      const base = sc.edges.filter(e => !drawn.has(key(e.u, e.v))).map(e => Object.assign({ state: "faint" }, e, { state: e.state || "faint" }));
      const all = base.concat(stepEdges);
      const order = ["faint", "pheromone", "tree", "alt", "candidate", "tour", "boundary", "rejected", "removed", "path", "added"];
      all.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
      const labels = [], groups = {};
      for (const e of all) {
        if (!pos[e.u] || !pos[e.v]) continue;
        const x1 = X(e.u), y1 = Y(e.u), x2 = X(e.v), y2 = Y(e.v);
        const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        const ru = pos[e.u].shape === "point" ? 2 : rN, rv = pos[e.v].shape === "point" ? 2 : rN;
        const sx = x1 + ux * ru, sy = y1 + uy * ru, tx = x2 - ux * (rv + (e.directed ? 3 : 0)), ty = y2 - uy * (rv + (e.directed ? 3 : 0));
        const style = e.state === "pheromone" ? ` style="stroke-width:${(1 + 8 * (e.weight ?? 0.5)).toFixed(1)};opacity:${(0.25 + 0.7 * (e.weight ?? 0.5)).toFixed(2)}"` : "";
        out.push(`<line class="e ${esc(e.state || "tour")}${e.quiet ? " quiet" : ""}" x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}"${e.directed ? ' marker-end="url(#ah)"' : ""}${style}/>`);
        if (e.arrowMid) {
          const mx = (sx + tx) / 2, my = (sy + ty) / 2;
          out.push(`<line class="e ${esc(e.state)} mid" x1="${(mx - ux * 9).toFixed(1)}" y1="${(my - uy * 9).toFixed(1)}" x2="${(mx + ux * 6).toFixed(1)}" y2="${(my + uy * 6).toFixed(1)}" marker-end="url(#ah)"/>`);
        }
        if (e.group) (groups[e.u + "#" + e.group] = groups[e.u + "#" + e.group] || []).push({ ang: Math.atan2(y2 - y1, x2 - x1), x: x1, y: y1, state: e.state });
        const showLabel = e.label !== undefined && e.label !== null && e.label !== "" && e.state !== "pheromone" && !(e.quiet && e.state === "faint");
        if (showLabel) {
          const off = e.labelOff ?? 9, mx = (x1 + x2) / 2 - uy * off, my = (y1 + y2) / 2 + ux * off;
          labels.push(`<text class="w ${esc(e.state)}" x="${mx.toFixed(1)}" y="${(my + 5).toFixed(1)}" text-anchor="middle">${esc(e.label)}</text>`);
        }
      }
      // AND connectors: an arc across the edges of one hyper-arc
      for (const g of Object.values(groups)) {
        if (g.length < 2) continue;
        const angs = g.map(z => z.ang).sort((a, b) => a - b), R0 = rN + 16;
        const a0 = angs[0], a1 = angs[angs.length - 1];
        const p0 = [g[0].x + R0 * Math.cos(a0), g[0].y + R0 * Math.sin(a0)], p1 = [g[0].x + R0 * Math.cos(a1), g[0].y + R0 * Math.sin(a1)];
        out.push(`<path class="andarc ${esc(g[0].state || "")}" d="M${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${R0},${R0} 0 0 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)}"/>`);
      }
      out.push(labels.join(""));
      for (const sn of sc.nodes) {
        const id = sn.id, n = nodes[id] || {}, st = n.state || sn.state || "plain";
        const x = X(id), y = Y(id), shape = n.shape || sn.shape || "circle", r = sn.r || rN;
        if (st === "goal" || st === "goalcand") out.push(`<circle class="ring2 ${st}" cx="${x}" cy="${y}" r="${r + 5}"/>`);
        if (shape === "max") out.push(`<polygon class="n ${esc(st)}" points="${x},${y - r * 1.15} ${x + r * 1.1},${y + r * 0.75} ${x - r * 1.1},${y + r * 0.75}"/>`);
        else if (shape === "min") out.push(`<polygon class="n ${esc(st)}" points="${x - r * 1.1},${y - r * 0.75} ${x + r * 1.1},${y - r * 0.75} ${x},${y + r * 1.15}"/>`);
        else if (shape === "box" || shape === "leaf") { const w = (sn.w || (shape === "leaf" ? 1.5 : 2.4)) * r, h = shape === "leaf" ? 1.5 * r : 1.7 * r; out.push(`<rect class="n ${esc(st)}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="4"/>`); }
        else if (shape === "point") out.push(`<circle class="pt ${esc(st)}" cx="${x}" cy="${y}" r="4"/>`);
        else out.push(`<circle class="n ${esc(st)}" cx="${x}" cy="${y}" r="${r}"/>`);
        const label = n.label ?? sn.label ?? id;
        if (shape !== "point") out.push(`<text class="nl ${esc(st)}${String(label).length > 2 ? " long" : ""}" x="${x}" y="${y + r * 0.36 + (shape === "max" ? r * 0.12 : shape === "min" ? -r * 0.3 : 0)}" text-anchor="middle">${esc(label)}</text>`);
        else if (sn.label) out.push(`<text class="hlab" x="${x + 8}" y="${y - 8}">${esc(sn.label)}</text>`);
        if (n.badge !== undefined && n.badge !== null && n.badge !== "") out.push(`<text class="badge" x="${x + r * 0.95}" y="${y - r * 0.8}">${esc(n.badge)}</text>`);
        const sub = n.sub ?? sn.sub;
        if (sub !== undefined && sub !== null && sub !== "") out.push(`<text class="hlab sub ${esc(st)}" x="${x}" y="${y + r + 15}" text-anchor="middle">${esc(sub)}</text>`);
      }
      if (P.type === "graph" && P.h && opts.showH && !step.scene) for (const id of P.ids) out.push(`<text class="hlab" x="${X(id)}" y="${Y(id) + rN + 15}" text-anchor="middle">h=${esc(P.h[id])}</text>`);
      out.push("</svg>");
      return out.join("");
    },

    /* blocks world: { stacks: [[bottom..top]], holding, goal: [[...]] } */
    blocksSVG(b) {
      const stacks = b.stacks || [], all = stacks.flat().concat(b.holding ? [b.holding] : []);
      const goal = b.goal || null;
      const S = 46, gap = 18, n = Math.max(stacks.length, 1);
      const leftW = Math.max(4, n + (b.holding ? 1 : 0)) * (S + gap) + 40;
      const goalW = goal ? Math.max(2, goal.length) * (S * 0.6 + 10) + 60 : 0;
      const W = Math.max(420, leftW + goalW + 30), Hmax = Math.max(4, ...stacks.map(s => s.length), goal ? Math.max(...goal.map(s => s.length)) : 0);
      const H = (Hmax + 2.6) * S + 30, floor = H - 30;
      const o = [`<svg class="g blocks" viewBox="0 0 ${W} ${H}" role="img" aria-label="blocks world" xmlns="http://www.w3.org/2000/svg">`];
      o.push(`<line class="table" x1="16" y1="${floor}" x2="${leftW}" y2="${floor}"/>`);
      stacks.forEach((st, i) => st.forEach((blk, j) => {
        const x = 30 + i * (S + gap), y = floor - (j + 1) * S;
        const cls = (b.mark || {})[blk] || "";
        o.push(`<rect class="blk ${esc(cls)}" x="${x}" y="${y}" width="${S}" height="${S}" rx="3"/><text class="nl" x="${x + S / 2}" y="${y + S * 0.64}" text-anchor="middle">${esc(blk)}</text>`);
      }));
      // the arm
      const ax = 30 + n * (S + gap) + 10;
      o.push(`<line class="arm" x1="${ax + S / 2}" y1="6" x2="${ax + S / 2}" y2="${S * 0.9}"/><path class="arm" d="M${ax + 4},${S * 0.9 + 8} L${ax + 4},${S * 0.9} L${ax + S - 4},${S * 0.9} L${ax + S - 4},${S * 0.9 + 8}"/>`);
      if (b.holding) o.push(`<rect class="blk held" x="${ax}" y="${S * 0.9 + 2}" width="${S}" height="${S}" rx="3"/><text class="nl" x="${ax + S / 2}" y="${S * 0.9 + 2 + S * 0.64}" text-anchor="middle">${esc(b.holding)}</text>`);
      else o.push(`<text class="hlab" x="${ax + S / 2}" y="${S * 0.9 + 26}" text-anchor="middle">AE</text>`);
      if (goal) {
        const gs = S * 0.6, gx0 = leftW + 50;
        o.push(`<text class="hlab" x="${gx0}" y="${floor - (Hmax + 1) * gs - 6}">goal</text><line class="table" x1="${gx0 - 8}" y1="${floor}" x2="${gx0 + goal.length * (gs + 10)}" y2="${floor}"/>`);
        goal.forEach((st, i) => st.forEach((blk, j) => { const x = gx0 + i * (gs + 10), y = floor - (j + 1) * gs; o.push(`<rect class="blk goal" x="${x}" y="${y}" width="${gs}" height="${gs}" rx="2"/><text class="hlab" x="${x + gs / 2}" y="${y + gs * 0.66}" text-anchor="middle">${esc(blk)}</text>`); }));
      }
      o.push("</svg>");
      return o.join("");
    },

    /* ---------------------------------------------------------- table */
    tableHTML(t, { full = false } = {}) {
      if (!t) return "";
      const st = t.rowStates || [];
      const head = t.columns.map(c => `<th>${esc(c)}</th>`).join("");
      const cell = c => (c && typeof c === "object" ? `<td class="${esc(c.s || "")}">${esc(c.t)}</td>` : `<td>${esc(c)}</td>`);
      const rows = t.rows.map((r, i) => `<tr class="${esc(st[i] || "")}">${r.map(cell).join("")}</tr>`).join("");
      return `<div class="tbl${full ? " full" : ""}">${t.title ? `<div class="tcap">${esc(t.title)}</div>` : ""}<div class="tscroll"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    },

    /* ---------------------------------------------------------- OPEN / CLOSED rows */
    listsHTML(lists, stacked) {
      if (!lists || !lists.length) return "";
      return `<div class="lists${stacked ? " stacked" : ""}">${lists.map(l => `<div class="lrow"><span class="llab">${esc(l.label)}</span><span class="litems${l.boxes ? " boxes" : ""}">${l.items.length ? l.items.map(x => `<span class="li ${esc(x.state || "")}">${esc(x.text)}</span>`).join("") : '<span class="li dim">empty</span>'}</span></div>`).join("")}</div>`;
    },

    statsHTML(stats) {
      if (!stats || !stats.length) return "";
      return `<div class="stats">${stats.map(s => `<span class="stat ${esc(s.state || "")}"><span class="sl">${esc(s.label)}</span> <b>${esc(s.value)}</b></span>`).join("")}</div>`;
    },

    /* ---------------------------------------------------------- small charts */
    chartSVG(c) {
      if (!c) return "";
      const W = 420, H = 170, L = 40, B = 24, T = 12, Rr = 10;
      const o = [`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.yLabel || "chart")}" xmlns="http://www.w3.org/2000/svg">`];
      const axes = (y0, y1, xs) => {
        const ys = y => T + (H - T - B) * (1 - (y - y0) / Math.max(1e-9, y1 - y0));
        const xsF = x => L + (W - L - Rr) * (xs[1] === xs[0] ? 0.5 : (x - xs[0]) / (xs[1] - xs[0]));
        o.push(`<line class="ax" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/><line class="ax" x1="${L}" y1="${H - B}" x2="${W - Rr}" y2="${H - B}"/>`);
        [y0, (y0 + y1) / 2, y1].forEach(v => o.push(`<text class="tick" x="${L - 5}" y="${ys(v) + 4}" text-anchor="end">${Math.round(v)}</text>`));
        return [xsF, ys];
      };
      if (c.kind === "walk" || c.kind === "drops") {
        const s = c.series || [];
        if (!s.length) return "";
        const vals = c.kind === "drops" ? s.flatMap(p => [p.from, p.to]) : s.flatMap(p => [p.y, p.best ?? p.y, p.proposal ?? p.y, p.avg ?? p.y]);
        let y0 = Math.min(...vals), y1 = Math.max(...vals); const pad = Math.max(2, (y1 - y0) * 0.1); y0 -= pad; y1 += pad;
        const xs = [Math.min(...s.map(p => p.x)), Math.max(...s.map(p => p.x))];
        const [fx, fy] = axes(y0, y1, xs);
        if (c.kind === "drops") {
          s.forEach(p => {
            o.push(`<line class="drop" x1="${fx(p.x)}" y1="${fy(p.from)}" x2="${fx(p.x)}" y2="${fy(p.to)}"/><circle class="dot bad" cx="${fx(p.x)}" cy="${fy(p.from)}" r="3.5"/><circle class="dot ok" cx="${fx(p.x)}" cy="${fy(p.to)}" r="4"/>`);
            o.push(`<text class="tick" x="${fx(p.x)}" y="${H - 8}" text-anchor="middle">${p.x}</text>`);
          });
        } else {
          s.forEach(p => { if (p.proposal !== undefined) o.push(`<circle class="dot ${p.accepted ? "ok" : "bad"}" cx="${fx(p.x)}" cy="${fy(p.proposal)}" r="3"/>`); });
          if (s[0].avg !== undefined) o.push(`<polyline class="pl avg" points="${s.map(p => fx(p.x) + "," + fy(p.avg)).join(" ")}"/>`);
          if (s[0].best !== undefined) o.push(`<polyline class="pl best" points="${s.map(p => fx(p.x) + "," + fy(p.best)).join(" ")}"/>`);
          o.push(`<polyline class="pl cur" points="${s.map(p => fx(p.x) + "," + fy(p.y)).join(" ")}"/>`);
          const last = s[s.length - 1]; o.push(`<circle class="dot cur" cx="${fx(last.x)}" cy="${fy(last.y)}" r="4.5"/>`);
        }
      } else if (c.kind === "bars") {
        const n = c.values.length, bw = (W - L - Rr) / n;
        const [, fy] = axes(0, Math.max(...c.values, 0.01), [0, 1]);
        c.values.forEach((v, i) => {
          const x = L + i * bw + bw * 0.15, y = fy(v);
          o.push(`<rect class="bar${i === c.mark ? " mark" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${(H - B - y).toFixed(1)}"/>`);
          o.push(`<text class="tick" x="${(x + bw * 0.35).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(c.labels[i])}</text><text class="tick v" x="${(x + bw * 0.35).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle">${v}</text>`);
        });
      } else if (c.kind === "pie") {
        const cx = 95, cy = H / 2, r = 70; let a = -Math.PI / 2;
        const cls = ["p1", "p2", "p3", "p4", "p5", "p6"];
        c.slices.forEach((f, i) => {
          const a2 = a + f * 2 * Math.PI, large = f > 0.5 ? 1 : 0;
          o.push(`<path class="slice ${cls[i % 6]}" d="M${cx},${cy} L${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} A${r},${r} 0 ${large} 1 ${(cx + r * Math.cos(a2)).toFixed(1)},${(cy + r * Math.sin(a2)).toFixed(1)} Z"/>`);
          const m = (a + a2) / 2; o.push(`<text class="plab" x="${(cx + r * 0.62 * Math.cos(m)).toFixed(1)}" y="${(cy + r * 0.62 * Math.sin(m) + 4).toFixed(1)}" text-anchor="middle">${esc(c.labels[i])}</text>`);
          a = a2;
        });
        (c.marks || []).forEach((u, k) => { const m = -Math.PI / 2 + u * 2 * Math.PI; o.push(`<line class="spin" x1="${cx}" y1="${cy}" x2="${(cx + (r + 10) * Math.cos(m)).toFixed(1)}" y2="${(cy + (r + 10) * Math.sin(m)).toFixed(1)}"/><text class="tick" x="${(cx + (r + 20) * Math.cos(m)).toFixed(1)}" y="${(cy + (r + 20) * Math.sin(m) + 4).toFixed(1)}" text-anchor="middle">${k + 1}</text>`); });
        c.slices.forEach((f, i) => o.push(`<text class="tick" x="210" y="${30 + i * 20}">${esc(c.labels[i])}: p = ${f.toFixed(3)}</text>`));
      }
      if (c.yLabel && c.kind !== "pie") o.push(`<text class="tick" x="${L}" y="${T - 1}" dy="-2">${esc(c.yLabel)}</text>`);
      o.push("</svg>");
      return o.join("");
    },

    /* ---------------------------------------------------------- whole stage as HTML */
    stageHTML(P, step, meta = {}) {
      const drawable = step.blocks || step.scene || P.scene || P.type === "tsp" || P.type === "graph";
      if (!drawable) {
        return `<div class="stage-inner nodraw">
        <div class="st-graph">${R.listsHTML(step.lists, true)}${R.statsHTML(step.stats)}</div>
        <div class="st-side">${R.tableHTML(step.table, { full: meta.print })}</div>
        ${step.chart ? `<div class="st-chart">${R.chartSVG(step.chart)}</div>` : ""}
        <p class="st-cap">${esc(step.caption)}</p></div>`;
      }
      const g = step.blocks ? R.blocksSVG(step.blocks) : R.graphSVG(P, step, { label: meta.title || "graph", showH: meta.showH });
      const hasChart = !!step.chart;
      const wide = hasChart && step.table && step.table.columns.length >= 7;
      const cls = "stage-inner" + (hasChart ? " has-chart" : "") + (wide ? " wide" : "");
      return `<div class="${cls}">
        <div class="st-graph">${g}${R.statsHTML(step.stats)}</div>
        <div class="st-side">${R.tableHTML(step.table, { full: meta.print })}</div>
        ${hasChart ? `<div class="st-chart">${R.chartSVG(step.chart)}</div>` : ""}
        <div class="st-lists">${R.listsHTML(step.lists)}</div>
        <p class="st-cap">${esc(step.caption)}</p></div>`;
    },
  };
  Studio.render = R;
})(typeof window !== "undefined" ? window : globalThis);
