import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import {
  Sparkles, LayoutDashboard, CircleDot, Hash, MessageCircle, LogOut, Menu, X, ScrollText, Shield, Settings, Coins, Wand2, TreePine, Crown, Infinity as InfinityIcon, FileBadge,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  addonId?: string;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mapa-astral", label: "Mapa Astral", icon: CircleDot },
  { to: "/numerologia", label: "Numerologia", icon: Hash },
  { to: "/oraculo", label: "Oráculo IA", icon: MessageCircle },
  { to: "/tarot", label: "Tarot", icon: Wand2 },
  { to: "/meditacao", label: "Meditação Cabalística", icon: TreePine, addonId: "sub_kabbalah_unlimited" },
  { to: "/relatorios", label: "Relatórios", icon: ScrollText },
  { to: "/addons", label: "Add-ons", icon: Coins },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const ADDON_MENU: Record<string, { label: string; to: string; icon: typeof LayoutDashboard }> = {
  sub_branding_pdf: { label: "Branding PDF", to: "/configuracoes", icon: FileBadge },
  sub_unlimited_reports: { label: "Relatórios Ilimitados", to: "/relatorios", icon: InfinityIcon },
  sub_oracle_premium: { label: "Oráculo Premium", to: "/oraculo", icon: Crown },
  sub_tarot_unlimited: { label: "Tarot Ilimitado", to: "/tarot", icon: Wand2 },
  sub_kabbalah_unlimited: { label: "Meditação Ilimitada", to: "/meditacao", icon: TreePine },
  sub_kabbalistic_numerology: { label: "Numerologia Cabalística", to: "/numerologia", icon: Hash },
};

function AuthedLayout() {
  const { signOut, user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAddons, setActiveAddons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading || !user) {
      setProfileChecked(false);
    }
  }, [loading, user]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const [{ data: profile }, { data: role }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        supabase.from("user_subscriptions").select("addon_id, status, current_period_end").eq("user_id", user.id).eq("status", "active"),
      ]);
      setIsAdmin(!!role);
      const now = Date.now();
      setActiveAddons(new Set(
        (subs ?? [])
          .filter((s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now)
          .map((s) => s.addon_id),
      ));
      const path = router.state.location.pathname;
      if (profile && !profile.onboarding_completed && path !== "/onboarding") {
        router.navigate({ to: "/onboarding" });
      }
      setProfileChecked(true);
    })();
  }, [loading, user, router]);

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  if (loading || !user || !profileChecked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Sparkles className="size-8 text-gold animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen bg-background text-foreground [overflow-x:clip]">
      <Starfield count={60} className="fixed" />

      {/* Mobile top bar */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-50 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <span className="font-serif text-lg shimmer-text">Cosmic AI</span>
        </Link>
        <Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        />
      )}

      <div className="relative z-0 flex">
        {/* Sidebar */}
        <aside
          className={`${open ? "flex" : "hidden"} lg:flex flex-col fixed lg:sticky top-0 z-50 lg:z-auto h-[100dvh] w-[85%] max-w-xs lg:w-64 border-r border-border bg-background/95 backdrop-blur-xl`}
        >
          <div className="hidden lg:flex items-center gap-2 px-6 py-6 border-b border-border shrink-0">
            <Sparkles className="size-6 text-gold" />
            <span className="font-serif text-xl shimmer-text">Cosmic AI</span>
          </div>
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              <span className="font-serif text-lg shimmer-text">Cosmic AI</span>
            </div>
            <Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto flex-1 overscroll-contain">
            {NAV.filter((item) => !item.addonId || activeAddons.has(item.addonId)).map((item) => (
              <Link
                key={item.to} to={item.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
              >
                <Shield className="size-4" /> Admin
              </Link>
            )}
            <div className="pt-4 mt-2 border-t border-border/60">
              <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-gold/70">
                Meus Add-ons
              </div>
              {Object.entries(ADDON_MENU).map(([id, entry]) => {
                const Icon = entry.icon;
                const isActive = activeAddons.has(id);
                return (
                  <Link
                    key={id}
                    to={entry.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                    activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-600 text-white">
                        Ativo
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="p-4 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="size-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-screen pt-[calc(4.25rem+env(safe-area-inset-top))] lg:pt-0 lg:pl-0">
          <div className="p-3 sm:p-4 lg:p-8 max-w-7xl mx-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
