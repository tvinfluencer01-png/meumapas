// Service worker registration with strict guards.
// - Never registers in dev, iframe preview, or Lovable preview hosts.
// - `?sw=off` acts as a kill switch and unregisters any existing /sw.js.
export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const killSwitch = url.searchParams.get("sw") === "off";

  const isPreviewHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  const refuse = !import.meta.env.PROD || inIframe || isPreviewHost || killSwitch;

  if (refuse) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => {
            const u = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
            return u.endsWith("/sw.js");
          })
          .map((r) => r.unregister()),
      );
    } catch {}
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("[pwa] registration failed", err);
  }
}
