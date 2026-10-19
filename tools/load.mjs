// Shared loader: core files + every algorithm file + every example, inside a Node vm context.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CORE = ["src/core/studio.js", "src/core/problems.js", "src/core/search.js", "src/core/tsp-steps.js", "src/core/crossovers.js"];

export function listTypeFiles() {
  const dir = path.join(ROOT, "problem-types");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".js") && !f.startsWith("_")).sort().map(f => path.join("problem-types", f)) : [];
}

export function listAlgorithmFiles() {
  const out = [];
  const walk = dir => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (f.name.startsWith("_") || f.name.startsWith(".")) continue;
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p); else if (f.name.endsWith(".js")) out.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, "algorithms"));
  return out;
}

export function listExampleFiles() {
  const dir = path.join(ROOT, "examples");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("_")).sort().map(f => path.join("examples", f)) : [];
}

export function loadStudio({ extraFiles = [] } = {}) {
  const ctx = { console, Math, JSON, Object, Array, Map, Set, Number, String, Error };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const errors = [];
  for (const f of CORE) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  for (const f of listTypeFiles()) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  }
  const files = listAlgorithmFiles().concat(extraFiles);
  const owner = {};
  for (const f of files) {
    const before = ctx.Studio.algorithms.length;
    const ids = new Set(ctx.Studio.algorithms.map(a => a.id));
    try {
      vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
      const added = ctx.Studio.algorithms.filter(a => !ids.has(a.id));
      if (!added.length && ctx.Studio.algorithms.length === before) errors.push(`${f}: did not call Studio.register (or re-registered an existing id)`);
      added.forEach(a => (owner[a.id] = f));
    } catch (e) { errors.push(`${f}: ${e.message}`); }
  }
  for (const f of listExampleFiles()) {
    try { ctx.Studio.registerExample(JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"))); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  }
  return { Studio: ctx.Studio, files, owner, errors };
}
