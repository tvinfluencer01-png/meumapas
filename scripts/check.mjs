#!/usr/bin/env node
/**
 * Verificação rápida do projeto:
 *  1. Parser Babel (TS + JSX) — pega erros de sintaxe com arquivo:linha:coluna
 *     (mesmos que quebram o HMR do Vite no preview).
 *  2. tsc --noEmit — checagem de tipos com formato pretty (arquivo + linha).
 *
 * Uso:
 *   node scripts/check.mjs           # tudo
 *   node scripts/check.mjs --syntax  # só parser
 *   node scripts/check.mjs --types   # só tsc
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "@babel/parser";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const args = new Set(process.argv.slice(2));
const onlySyntax = args.has("--syntax");
const onlyTypes = args.has("--types");
const onlyLint = args.has("--lint");
const onlyFormat = args.has("--format");
const anyFilter = onlySyntax || onlyTypes || onlyLint || onlyFormat;
const run = {
  syntax: !anyFilter || onlySyntax,
  types: !anyFilter || onlyTypes,
  lint: !anyFilter || onlyLint,
  format: !anyFilter || onlyFormat,
};

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function showContext(file, line, col) {
  try {
    const lines = readFileSync(file, "utf8").split("\n");
    const start = Math.max(0, line - 2);
    const end = Math.min(lines.length, line + 1);
    const out = [];
    for (let i = start; i < end; i++) {
      const n = i + 1;
      const marker = n === line ? `${RED}>${RESET}` : " ";
      out.push(`  ${marker} ${DIM}${String(n).padStart(4)}${RESET} │ ${lines[i]}`);
      if (n === line && col) {
        out.push(`         ${DIM}│${RESET} ${" ".repeat(col - 1)}${RED}^${RESET}`);
      }
    }
    return out.join("\n");
  } catch {
    return "";
  }
}

function checkSyntax() {
  console.log(`${DIM}→ Parser (Babel TS+JSX)${RESET}`);
  const files = walk(SRC);
  const errors = [];
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    try {
      parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx", "decorators-legacy"],
      });
    } catch (e) {
      errors.push({
        file,
        line: e.loc?.line ?? 0,
        col: e.loc?.column != null ? e.loc.column + 1 : 0,
        message: e.message.replace(/\s*\(\d+:\d+\)\s*$/, ""),
      });
    }
  }
  if (errors.length === 0) {
    console.log(`${GREEN}✓ ${files.length} arquivos sem erro de sintaxe${RESET}`);
    return 0;
  }
  for (const err of errors) {
    const rel = relative(ROOT, err.file);
    console.log(
      `\n${RED}✗ Sintaxe${RESET} ${rel}:${YELLOW}${err.line}${RESET}:${YELLOW}${err.col}${RESET}`,
    );
    console.log(`  ${err.message}`);
    const ctx = showContext(err.file, err.line, err.col);
    if (ctx) console.log(ctx);
  }
  console.log(`\n${RED}✗ ${errors.length} erro(s) de sintaxe${RESET}`);
  return 1;
}

function checkTypes() {
  console.log(`\n${DIM}→ TypeScript (tsc --noEmit)${RESET}`);
  const r = spawnSync(
    "npx",
    ["tsc", "--noEmit", "--pretty", "--incremental", "false"],
    { encoding: "utf8" },
  );
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out);
  if (r.status === 0) {
    console.log(`${GREEN}✓ Tipos OK${RESET}`);
    return 0;
  }
  const count = (out.match(/error TS\d+/g) || []).length;
  console.log(`${RED}✗ ${count || "?"} erro(s) de tipo${RESET}`);
  return r.status || 1;
}

let code = 0;
if (!onlyTypes) code |= checkSyntax();
if (!onlySyntax) code |= checkTypes();
process.exit(code);
