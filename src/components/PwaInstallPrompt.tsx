import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Menu, Sparkles, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari
  const iosStandalone = (window.navigator as any).standalone === true;
  return mq || iosStandalone;
}

function isInPreviewOrIframe() {
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [hintMode, setHintMode] = useState<"ios" | "browser" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (isInPreviewOrIframe()) return;

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < DISMISS_TTL_MS) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHintMode(null);
      setTimeout(() => setOpen(true), 1200);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS doesn't fire beforeinstallprompt — show manual instructions
    if (isIOS()) {
      const t = setTimeout(() => {
        setHintMode("ios");
        setOpen(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    // Some browsers/incognito sessions don't expose the native prompt.
    // Still show clear install instructions so visitors know what to do.
    const fallbackTimer = setTimeout(() => {
      setHintMode("browser");
      setOpen(true);
    }, 2200);

    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // ignore
    } finally {
      setDeferred(null);
      setOpen(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-md border-gold/30 bg-card">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <Sparkles className="size-7 text-gold" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl italic">
            Instale o Código Cósmico
          </DialogTitle>
          <DialogDescription className="text-center">
            Tenha acesso rápido ao seu mapa astral, oráculo e numerologia direto da tela inicial do seu dispositivo — como um app nativo.
          </DialogDescription>
        </DialogHeader>

        {hintMode === "ios" ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-semibold text-foreground">No iPhone / iPad:</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Toque no ícone <Share className="inline size-4 align-middle text-gold" /> <b>Compartilhar</b> na barra do Safari.</li>
              <li>Escolha <b>“Adicionar à Tela de Início”</b>.</li>
              <li>Confirme em <b>Adicionar</b>.</li>
            </ol>
          </div>
        ) : null}

        {hintMode === "browser" ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-semibold text-foreground">No Android / Chrome:</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Toque no menu <Menu className="inline size-4 align-middle text-gold" /> do navegador.</li>
              <li>Escolha <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.</li>
              <li>Confirme a instalação.</li>
            </ol>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleDismiss}>
            Agora não
          </Button>
          {!hintMode && (
            <Button
              onClick={handleInstall}
              disabled={!deferred}
              className="bg-gold text-primary-foreground hover:bg-gold-glow gap-2"
            >
              <Download className="size-4" />
              Instalar app
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
