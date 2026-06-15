// Garante que qualquer toast.error / toast.warning que receba uma Error
// ou uma string em inglês seja traduzido para PT-BR antes de exibir.
// Side-effect import — chamado uma vez no boot do app.
import { toast } from "sonner";
import { translateError } from "./translate-error";

type Toaster = typeof toast;

function wrap<K extends "error" | "warning">(fn: Toaster[K]): Toaster[K] {
  const wrapped = ((message: unknown, data?: unknown) => {
    let next: unknown = message;
    if (message instanceof Error) next = translateError(message);
    else if (typeof message === "string") next = translateError(message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (fn as any)(next, data);
  }) as Toaster[K];
  return wrapped;
}

const g = globalThis as unknown as { __toastI18nPatched?: boolean };
if (!g.__toastI18nPatched) {
  g.__toastI18nPatched = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (toast as any).error = wrap(toast.error.bind(toast));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (toast as any).warning = wrap(toast.warning.bind(toast));
  } catch {
    // ignore
  }
}

export {};
