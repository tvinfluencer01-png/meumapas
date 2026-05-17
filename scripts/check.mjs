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

const MAX_LISTED = 15;

/**
 * Imprime resumo "N erros em M arquivos" + agrupamento por arquivo
 * + lista os primeiros MAX_LISTED erros como arquivo:linha:coluna  message.
 * `errors` deve ser uma lista de { file, line, col, message }.
 */
function printSummary(label, errors) {
  if (errors.length === 0) return;
  const byFile = new Map();
  for (const e of errors) {
    byFile.set(e.file, (byFile.get(e.file) || 0) + 1);
  }
  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]);

  console.log(
    `\n${DIM}── Resumo ${label} ──${RESET} ${RED}${errors.length}${RESET} erro(s) em ${YELLOW}${byFile.size}${RESET} arquivo(s)`,
  );
  for (const [file, n] of sortedFiles) {
    console.log(`  ${YELLOW}${String(n).padStart(4)}${RESET}  ${relative(ROOT, file)}`);
  }

  const shown = errors.slice(0, MAX_LISTED);
  console.log(`\n${DIM}Primeiros ${shown.length} erro(s):${RESET}`);
  for (const e of shown) {
    const loc = `${relative(ROOT, e.file)}:${e.line || 0}:${e.col || 0}`;
    console.log(`  ${RED}•${RESET} ${loc}  ${DIM}${e.message}${RESET}`);
  }
  if (errors.length > shown.length) {
    console.log(`  ${DIM}… +${errors.length - shown.length} adicional(is)${RESET}`);
  }
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
  printSummary("Sintaxe", errors);
  console.log(`\n${RED}✗ ${errors.length} erro(s) de sintaxe${RESET}`);
  return 1;
}

function parseTscErrors(out) {
  // Formato pretty: "path/file.ts:LINHA:COL - error TS1234: mensagem"
  // Formato plain: "path/file.ts(LINHA,COL): error TS1234: mensagem"
  const errors = [];
  const re =
    /^(.+?)(?:\((\d+),(\d+)\)|:(\d+):(\d+))\s*-?\s*error\s+TS\d+:\s*(.+)$/gm;
  let m;
  while ((m = re.exec(out))) {
    const file = join(ROOT, m[1].trim());
    errors.push({
      file,
      line: Number(m[2] || m[4] || 0),
      col: Number(m[3] || m[5] || 0),
      message: m[6].trim(),
    });
  }
  return errors;
}

function checkTypes() {
  console.log(`\n${DIM}→ TypeScript (tsc --noEmit)${RESET}`);
  const r = spawnSync(
    "npx",
    ["tsc", "--noEmit", "--pretty", "false", "--incremental", "false"],
    { encoding: "utf8" },
  );
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out);
  if (r.status === 0) {
    console.log(`${GREEN}✓ Tipos OK${RESET}`);
    return 0;
  }
  const errors = parseTscErrors(out);
  const count = errors.length || (out.match(/error TS\d+/g) || []).length;
  printSummary("Tipos", errors);
  console.log(`${RED}✗ ${count || "?"} erro(s) de tipo${RESET}`);
  return r.status || 1;
}

function checkLint() {
  console.log(`\n${DIM}→ ESLint${RESET}`);
  // Saída JSON para extrair contagem por arquivo + posições exatas.
  const r = spawnSync(
    "npx",
    ["eslint", ".", "--max-warnings=0", "--format", "json"],
    { encoding: "utf8" },
  );
  if (r.status === 0) {
    console.log(`${GREEN}✓ Lint OK${RESET}`);
    return 0;
  }
  let results = [];
  try {
    results = JSON.parse(r.stdout || "[]");
  } catch {
    // Falha de parse: imprime o stdout/stderr cru para diagnóstico.
    process.stdout.write((r.stdout || "") + (r.stderr || ""));
    console.log(`${RED}✗ ESLint reportou problemas${RESET}`);
    return r.status || 1;
  }
  const errors = [];
  for (const f of results) {
    for (const msg of f.messages || []) {
      if (msg.severity < 2) continue; // só erros
      errors.push({
        file: f.filePath,
        line: msg.line || 0,
        col: msg.column || 0,
        message: `${msg.message}${msg.ruleId ? ` (${msg.ruleId})` : ""}`,
      });
    }
  }
  printSummary("ESLint", errors);
  console.log(`${RED}✗ ESLint reportou problemas${RESET}`);
  return r.status || 1;
}

function checkFormat() {
  console.log(`\n${DIM}→ Prettier${RESET}`);
  const r = spawnSync("npx", ["prettier", "--check", "."], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out);
  if (r.status === 0) {
    console.log(`${GREEN}✓ Formatação OK${RESET}`);
    return 0;
  }
  // Prettier reporta arquivos divergentes em linhas "[warn] caminho/arquivo".
  const errors = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\[warn\]\s+(.+\.[^\s]+)$/);
    if (m) {
      errors.push({
        file: join(ROOT, m[1].trim()),
        line: 0,
        col: 0,
        message: "fora do padrão Prettier",
      });
    }
  }
  printSummary("Prettier", errors);
  console.log(
    `${RED}✗ Arquivos fora do padrão Prettier${RESET} ${DIM}(rode \`bun run format\`)${RESET}`,
  );
  return r.status || 1;
}

let code = 0;
if (run.syntax) code |= checkSyntax();
if (run.lint) code |= checkLint();
if (run.format) code |= checkFormat();
if (run.types) code |= checkTypes();
process.exit(code);

