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
