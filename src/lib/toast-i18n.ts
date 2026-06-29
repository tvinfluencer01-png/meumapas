// Redireciona todas as chamadas do `sonner` para o popup do sistema
// (showFeedback) com o CSS temático e tradução automática em PT-BR.
// Side-effect import — chamado uma vez no boot do app.
import { toast } from "sonner";
import { translateError } from "./translate-error";
import { showFeedback } from "@/components/system-feedback";

type FeedbackType = "info" | "success" | "warning" | "error";

function normalize(message: unknown): string {
  if (message == null) return "";
  if (message instanceof Error) return translateError(message);
  if (typeof message === "string") return translateError(message);
  try {
    return String(message);
  } catch {
    return "";
  }
}

function route(type: FeedbackType, message: unknown, data?: unknown) {
  const title = normalize(message) || (type === "error" ? "Erro" : "Aviso");
  let description: string | undefined;
  if (data && typeof data === "object" && "description" in (data as Record<string, unknown>)) {
    const d = (data as Record<string, unknown>).description;
    if (typeof d === "string") description = translateError(d);
  }
  // Dispara o popup do sistema (não-bloqueante)
  void showFeedback({ title, description, type });
  return Date.now();
}

const g = globalThis as unknown as { __toastI18nPatched?: boolean };
if (!g.__toastI18nPatched) {
  g.__toastI18nPatched = true;
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const base: any = (msg: unknown, data?: unknown) => route("info", msg, data);
    base.success = (msg: unknown, data?: unknown) => route("success", msg, data);
    base.error = (msg: unknown, data?: unknown) => route("error", msg, data);
    base.warning = (msg: unknown, data?: unknown) => route("warning", msg, data);
    base.info = (msg: unknown, data?: unknown) => route("info", msg, data);
    base.message = (msg: unknown, data?: unknown) => route("info", msg, data);
    base.dismiss = () => {};
    base.loading = (msg: unknown, data?: unknown) => route("info", msg, data);
    base.promise = async <T,>(p: Promise<T>, opts?: { loading?: string; success?: string | ((v: T) => string); error?: string | ((e: unknown) => string) }) => {
      if (opts?.loading) route("info", opts.loading);
      try {
        const v = await p;
        if (opts?.success) route("success", typeof opts.success === "function" ? opts.success(v) : opts.success);
        return v;
      } catch (e) {
        if (opts?.error) route("error", typeof opts.error === "function" ? opts.error(e) : opts.error);
        throw e;
      }
    };
    // Substitui os métodos do export `toast` mantendo a função chamável.
    Object.assign(toast as any, base);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch {
    // ignore
  }
}

export {};
