import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABLE_FIELDS } from "@/lib/product-landings.functions";

export function maskPhoneBR(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function inputTypeFor(key: string): string {
  if (key === "email") return "email";
  if (key === "phone") return "tel";
  if (key.endsWith("_time")) return "time";
  if (key.includes("date") || key.endsWith("_founded_at")) return "date";
  return "text";
}

function placeholderFor(key: string): string | undefined {
  if (key === "phone") return "(11) 99999-9999";
  if (key === "email") return "voce@exemplo.com";
  if (key === "full_name") return "Seu nome completo";
  if (key.endsWith("_place")) return "Cidade / Estado / País";
  return undefined;
}

export type LandingFieldsFormProps = {
  fields: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  idPrefix?: string;
};

/**
 * Componente compartilhado de cadastro para landing pages.
 * Todos os campos são derivados de AVAILABLE_FIELDS (rótulos em português)
 * e o campo de WhatsApp recebe máscara (11) 99999-9999 automaticamente.
 */
export function LandingFieldsForm({ fields, values, onChange, idPrefix = "lf" }: LandingFieldsFormProps) {
  return (
    <>
      {fields.map((key) => {
        const meta = AVAILABLE_FIELDS.find((f) => f.key === key);
        const label = meta?.label ?? key;
        const isPhone = key === "phone";
        const type = inputTypeFor(key);
        const placeholder = placeholderFor(key);
        return (
          <div key={key} className="space-y-1">
            <Label htmlFor={`${idPrefix}-${key}`}>{label} *</Label>
            <Input
              id={`${idPrefix}-${key}`}
              type={type}
              inputMode={isPhone ? "numeric" : undefined}
              placeholder={placeholder}
              maxLength={isPhone ? 15 : undefined}
              value={values[key] ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const val = isPhone ? maskPhoneBR(raw) : raw;
                onChange({ ...values, [key]: val });
              }}
              required
            />
          </div>
        );
      })}
    </>
  );
}
