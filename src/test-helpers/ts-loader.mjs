import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const requireFromHost = createRequire(import.meta.url);

/**
 * Shared TypeScript module loader for node:test files.
 *
 * Transpiles a TS module (and its relative/alias dependency graph) to CommonJS
 * and executes it in the host realm, so values returned to tests share the
 * host's Array/Object intrinsics (vm sandboxes break assert.deepStrictEqual).
 * Resolves "./module", "./dir" (index.ts), ".tsx", ".json" and "@/" aliases.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRootDir = path.resolve(__dirname, "../..");
const srcDir = path.join(repoRootDir, "src");

const cache = new Map();

function resolveModulePath(fromDir, request) {
  const base = request.startsWith("@/")
    ? path.join(srcDir, request.slice(2))
    : path.resolve(fromDir, request);

  if (base.endsWith(".ts") || base.endsWith(".tsx") || base.endsWith(".json")) {
    return base;
  }
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx")
  ]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    return path.join(base, "index.ts");
  }
  return `${base}.ts`;
}

export function loadTsModule(absPath) {
  const resolved = path.isAbsolute(absPath)
    ? resolveModulePath(path.dirname(absPath), absPath)
    : resolveModulePath(repoRootDir, absPath);

  if (cache.has(resolved)) {
    return cache.get(resolved);
  }

  if (resolved.endsWith(".json")) {
    const parsed = JSON.parse(readFileSync(resolved, "utf8"));
    cache.set(resolved, parsed);
    return parsed;
  }

  const source = readFileSync(resolved, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolved
  }).outputText;

  const mod = { exports: {} };
  cache.set(resolved, mod.exports);
  const dir = path.dirname(resolved);
  const requireShim = (request) => {
    if (!request.startsWith(".") && !request.startsWith("@/") && !path.isAbsolute(request)) {
      // Bare specifier (node_modules package): resolve from the host realm.
      return requireFromHost(request);
    }
    return loadTsModule(resolveModulePath(dir, request));
  };

  const evaluate = new Function(
    "exports",
    "module",
    "require",
    "process",
    "console",
    "__filename",
    "__dirname",
    output
  );
  evaluate(mod.exports, mod, requireShim, process, console, resolved, dir);

  cache.set(resolved, mod.exports);
  return mod.exports;
}

/** Load a module by path relative to the repository root. */
export function loadFromRepoRoot(...segments) {
  return loadTsModule(path.join(repoRootDir, ...segments));
}
