import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { SystemFeedbackHost } from "@/components/system-feedback";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { SplashScreen } from "@/components/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function isChunkLoadError(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message ?? String(error ?? "");
  return (
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Load failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

function hardReload() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      const t = window.setTimeout(hardReload, 600);
      return () => window.clearTimeout(t);
    }
  }, [chunkError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {chunkError ? "Atualizando para a versão mais recente…" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chunkError
            ? "Detectamos uma nova versão do app. Recarregando automaticamente."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (chunkError) {
                hardReload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {chunkError ? "Recarregar agora" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Código Cósmico — Mapa Astral, Numerologia e IA Espiritual" },
      { name: "description", content: "Onde a inteligência artificial encontra o sagrado. Mapa astral, numerologia cabalística e IA espiritual em uma plataforma cinematográfica." },
      { name: "author", content: "Código Cósmico" },
      { property: "og:title", content: "Código Cósmico — Mapa Astral, Numerologia e IA Espiritual" },
      { property: "og:description", content: "Onde a inteligência artificial encontra o sagrado. Mapa astral, numerologia cabalística e IA espiritual em uma plataforma cinematográfica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Código Cósmico — Mapa Astral, Numerologia e IA Espiritual" },
      { name: "twitter:description", content: "Onde a inteligência artificial encontra o sagrado. Mapa astral, numerologia cabalística e IA espiritual em uma plataforma cinematográfica." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/41a4d552-240e-4c67-9b8d-c52663ce0277/id-preview-dfdf7967--4f283795-23ae-4277-a648-a3d236f5b58f.lovable.app-1778993373692.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/41a4d552-240e-4c67-9b8d-c52663ce0277/id-preview-dfdf7967--4f283795-23ae-4277-a648-a3d236f5b58f.lovable.app-1778993373692.png" },
      { name: "theme-color", content: "#1a1430" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Cósmico" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/api/public/manifest/webmanifest" },
      { rel: "apple-touch-icon", href: "/api/public/manifest/icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    void import("@/lib/register-sw").then((m) => m.registerServiceWorker());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" />
        <SystemFeedbackHost />
        <PwaInstallPrompt />
        <SplashScreen minimumDuration={4500} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
