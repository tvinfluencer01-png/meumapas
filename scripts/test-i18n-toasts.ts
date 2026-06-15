#!/usr/bin/env bun
// Teste rápido: garante que toda mensagem de erro vinda da API (em inglês)
// seja exibida em português após passar por translateError().
// Rodar com: bun scripts/test-i18n-toasts.ts

import { translateError } from "../src/lib/translate-error";

// Frases típicas que a API pode devolver em inglês.
const SAMPLES: Array<unknown> = [
  "Invalid login credentials",
  "Email not confirmed",
  "User already registered",
  "Password should be at least 8 characters",
  "Passwords do not match",
  "Invalid email",
  "Network error",
  "Failed to fetch",
  "Unauthorized",
  "Forbidden",
  "Not found",
  "Internal server error",
  "Service unavailable",
  "Bad gateway",
  "Email rate limit exceeded",
  "Unsupported provider: foo",
  "New password should be different from the old password",
  new Error("Invalid login credentials"),
  { message: "User not found" },
  "",
  null,
  undefined,
];

// Palavras inglesas que NUNCA podem sobrar após a tradução.
const FORBIDDEN: RegExp[] = [
  /\bpassword\b/i,
  /\bemail\b/i,
  /\binvalid\b/i,
  /\bnot found\b/i,
  /\bunauthorized\b/i,
  /\bforbidden\b/i,
  /\bnetwork error\b/i,
  /\bfailed to fetch\b/i,
  /\binternal server error\b/i,
  /\brate limit\b/i,
  /\bunsupported\b/i,
];

let failed = 0;
let passed = 0;
const failures: string[] = [];

for (const sample of SAMPLES) {
  const out = translateError(sample);
  const label =
    sample instanceof Error ? `Error("${sample.message}")` : JSON.stringify(sample);

  if (typeof out !== "string" || out.length === 0) {
    failed++;
    failures.push(`✗ ${label} → saída vazia/inválida`);
    continue;
  }

  const hit = FORBIDDEN.find((re) => re.test(out));
  if (hit) {
    failed++;
    failures.push(`✗ ${label} → "${out}" (termo em inglês detectado: ${hit})`);
  } else {
    passed++;
    console.log(`✓ ${label} → "${out}"`);
  }
}

console.log(`\n${passed} ok, ${failed} falhas`);
if (failed) {
  console.error("\nFalhas:");
  failures.forEach((f) => console.error("  " + f));
  process.exit(1);
}
