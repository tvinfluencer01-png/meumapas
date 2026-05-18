import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* =========================================================================
 * Cosmic Loader Overlay — temático com o CSS do sistema (gold + nebula).
 * Usado em qualquer operação demorada (geração de PDF, mapa astral, IA...).
 * ========================================================================= */

type LoaderState = {
  open: boolean;
  title: string;
  subtitle?: string;
  messages: string[];
  progress?: number; // 0..100, optional
  step?: string; // current step label override
};

let loaderState: LoaderState = { open: false, title: "", messages: [] };
const loaderListeners = new Set<() => void>();

function emitLoader() {
  for (const l of loaderListeners) l();
}

export function showLoader(opts: {
  title: string;
  subtitle?: string;
  messages?: string[];
  progress?: number;
  step?: string;
}) {
  loaderState = {
    open: true,
    title: opts.title,
    subtitle: opts.subtitle,
    progress: opts.progress,
    step: opts.step,
    messages:
      opts.messages && opts.messages.length
        ? opts.messages
        : ["Alinhando energias...", "Consultando os astros...", "Tecendo sua leitura..."],
  };
  emitLoader();
}

export function updateLoader(patch: Partial<Omit<LoaderState, "open">>) {
  if (!loaderState.open) return;
  loaderState = { ...loaderState, ...patch };
  emitLoader();
}

export function hideLoader() {
  loaderState = { ...loaderState, open: false };
  emitLoader();
}

/** Roda uma promise envolvida pelo overlay cósmico. */
export async function withLoader<T>(
  opts: { title: string; subtitle?: string; messages?: string[] },
  fn: () => Promise<T>,
): Promise<T> {
  showLoader(opts);
  try {
    return await fn();
  } finally {
    hideLoader();
  }
}

function subscribeLoader(cb: () => void) {
  loaderListeners.add(cb);
  return () => loaderListeners.delete(cb);
}
function getLoaderSnapshot() {
  return loaderState;
}

export function CosmicLoaderOverlay() {
  const state = useSyncExternalStore(subscribeLoader, getLoaderSnapshot, getLoaderSnapshot);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!state.open) return;
    setIdx(0);
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % Math.max(1, state.messages.length));
    }, 2400);
    return () => clearInterval(id);
  }, [state.open, state.messages]);

  if (!state.open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center bg-night/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="glass-card gold-glow rounded-3xl px-8 py-10 max-w-md w-[90%] text-center relative overflow-hidden">
        <div className="absolute inset-0 nebula-bg opacity-60 pointer-events-none" />
        <div className="relative">
          {/* Orbit animation around the brand logo */}
          <div className="relative mx-auto size-28 mb-6">
            <div className="absolute inset-0 rounded-full border border-gold/30 animate-slow-spin" />
            <div className="absolute inset-2 rounded-full border border-gold/20 animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute inset-0 grid place-items-center">
              <Logo sizeClassName="size-20" animation="spin" />
            </div>
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold animate-twinkle" />
            <span className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rounded-full bg-stardust animate-twinkle" style={{ animationDelay: "1s" }} />
            <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold-glow animate-twinkle" style={{ animationDelay: "2s" }} />
          </div>

          <h2 className="font-serif text-2xl shimmer-text">{state.title}</h2>
          {state.subtitle && (
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold/80">{state.subtitle}</p>
          )}

          <div className="mt-5 min-h-[2.5rem] flex items-center justify-center">
            <p
              key={state.step ?? idx}
              className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-500"
            >
              {state.step ?? state.messages[idx] ?? ""}
            </p>
          </div>

          {typeof state.progress === "number" && (
            <div className="mt-5">
              <div className="h-1.5 w-full rounded-full bg-gold/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold/70 via-gold to-gold-glow transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-gold/70">
                {Math.round(Math.min(100, Math.max(0, state.progress)))}%
              </p>
            </div>
          )}

          <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold/80">
            <Loader2 className="size-3.5 animate-spin" /> Aguarde um instante
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Confirm Dialog — substitui window.confirm com o CSS do sistema.
 * ========================================================================= */

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmState = {
  open: boolean;
  opts: ConfirmOptions;
  resolve?: (v: boolean) => void;
};

let confirmState: ConfirmState = {
  open: false,
  opts: { title: "" },
};
const confirmListeners = new Set<() => void>();
function emitConfirm() {
  for (const l of confirmListeners) l();
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { open: true, opts, resolve };
    emitConfirm();
  });
}

function subscribeConfirm(cb: () => void) {
  confirmListeners.add(cb);
  return () => confirmListeners.delete(cb);
}
function getConfirmSnapshot() {
  return confirmState;
}

export function ConfirmDialogHost() {
  const state = useSyncExternalStore(subscribeConfirm, getConfirmSnapshot, getConfirmSnapshot);

  function close(value: boolean) {
    state.resolve?.(value);
    confirmState = { open: false, opts: state.opts };
    emitConfirm();
  }

  return (
    <AlertDialog open={state.open} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent className="glass-card gold-glow border-gold/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl text-stardust flex items-center gap-2">
            {state.opts.destructive && <AlertTriangle className="size-5 text-destructive" />}
            {state.opts.title}
          </AlertDialogTitle>
          {state.opts.description && (
            <AlertDialogDescription className="text-muted-foreground">
              {state.opts.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {state.opts.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={
              state.opts.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {state.opts.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SystemFeedbackHost() {
  return (
    <>
      <CosmicLoaderOverlay />
      <ConfirmDialogHost />
    </>
  );
}
