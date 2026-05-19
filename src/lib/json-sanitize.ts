/**
 * Sanitiza saída JSON de LLM: escapa caracteres de controle crus
 * (\n, \r, \t, etc.) que apareçam dentro de strings literais.
 * Preserva os escapes válidos (já com barra invertida).
 */
export function sanitizeJsonString(input: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const code = ch.charCodeAt(0);
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && code < 0x20) {
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else if (ch === "\b") out += "\\b";
      else if (ch === "\f") out += "\\f";
      // descarta outros controles
      continue;
    }
    out += ch;
  }
  return out;
}

import { jsonrepair } from "jsonrepair";

/**
 * Parse JSON tolerante: tenta JSON.parse direto, depois sanitize,
 * e por fim jsonrepair como fallback final para saídas de LLM com
 * aspas não escapadas, vírgulas extras, etc.
 */
export function safeParseLlmJson<T = unknown>(input: string): T {
  const tryParse = (s: string): T | undefined => {
    try { return JSON.parse(s) as T; } catch { return undefined; }
  };
  let s = input.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);

  let parsed = tryParse(s);
  if (parsed !== undefined) return parsed;
  const sanitized = sanitizeJsonString(s);
  parsed = tryParse(sanitized);
  if (parsed !== undefined) return parsed;
  // Última tentativa: jsonrepair
  const repaired = jsonrepair(sanitized);
  return JSON.parse(repaired) as T;
}
