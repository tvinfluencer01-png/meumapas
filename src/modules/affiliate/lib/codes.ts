import { createHash, randomBytes } from "node:crypto";

export function generateAffiliateCode(fullName: string): string {
  const base = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "AFF";
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${base}-${suffix}`;
}

export function generateSecret(bytes = 32): { raw: string; hash: string } {
  const raw = randomBytes(bytes).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
