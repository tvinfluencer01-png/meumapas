import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard, CircleDot, Hash, MessageCircle, LogOut, Menu, X, ScrollText, Shield, Settings, Coins, Wand2, TreePine, Crown, Infinity as InfinityIcon, FileBadge, User as UserIcon,
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
  { to: "/relatorios", label: "Relatórios", icon: ScrollText },
  { to: "/addons", label: "Add-ons", icon: Coins },
];

const ADDON_MENU: Record<string, { label: string; to: string; icon: typeof LayoutDashboard }> = {
  sub_branding_pdf: { label: "Branding PDF", to: "/configuracoes", icon: FileBadge },
  sub_unlimited_reports: { label: "Relatórios Ilimitados", to: "/relatorios", icon: InfinityIcon },
  sub_oracle_premium: { label: "Oráculo Premium", to: "/oraculo", icon: Crown },
  sub_tarot_unlimited: { label: "Tarot Ilimitado", to: "/tarot", icon: Wand2 },
  sub_kabbalah_unlimited: { label: "Meditação Ilimitada", to: "/meditacao", icon: TreePine },
  sub_kabbalistic_numerology: { label: "Numerologia Cabalística", to: "/numerologia-cabalistica", icon: Hash },
};

function AuthedLayout() {
  const { signOut, user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAddons, setActiveAddons] = useState<Set<string>>(new Set());
  const [profileOpen, setProfileOpen] = useState(false);

  // Saldo de créditos + pico histórico para calcular a barra
  const { data: credits } = useQuery({
    queryKey: ["sidebar-credits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: bal }, { data: peak }] = await Promise.all([
        supabase.from("user_credits").select("balance").eq("user_id", user!.id).maybeSingle(),
        supabase
          .from("credit_transactions")
          .select("balance_after")
          .eq("user_id", user!.id)
          .order("balance_after", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        balance: bal?.balance ?? 0,
        peak: Math.max(peak?.balance_after ?? 0, bal?.balance ?? 0, 5),
      };
    },
    refetchOnWindowFocus: false,
  });

  const balance = credits?.balance ?? 0;
  const peak = credits?.peak ?? 5;
  const pct = Math.max(0, Math.min(100, (balance / peak) * 100));

  useEffect(() => {
    if (!loading || !user) {
      setProfileChecked(false);
    }
  }, [loading, user]);

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
        <Logo sizeClassName="size-24" animation="loading" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Starfield count={60} className="fixed" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Cosmic AI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className={`${open ? "flex" : "hidden"} lg:flex flex-col fixed lg:sticky inset-0 lg:inset-auto lg:top-0 z-20 lg:z-auto h-screen w-full lg:w-64 border-r border-border bg-background/90 backdrop-blur-xl`}>
          <div className="hidden lg:flex items-center gap-2.5 px-6 py-6 border-b border-border shrink-0">
            <Logo sizeClassName="size-12" animation="float" />
            <span className="font-serif text-xl shimmer-text">Cosmic AI</span>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {NAV.filter((item) => !item.addonId || activeAddons.has(item.addonId)).map((item) => (
              <Link
                key={item.to} to={item.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
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
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                    activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {isActive && (
                      <span className="text-[8px] font-semibold uppercase leading-none px-1 py-0.5 rounded bg-green-600 text-white">
                        Ativo
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="shrink-0 p-4 border-t border-border bg-background/90 space-y-3">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/40 transition-colors text-left group"
              aria-label="Abrir configurações do perfil"
            >
              <span className="grid place-items-center size-9 rounded-full bg-gold/15 border border-gold/30 text-gold group-hover:bg-gold/25 transition-colors shrink-0">
                <UserIcon className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-stardust truncate">{user?.email}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-amber-300 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-gold font-medium shrink-0">
                    {balance}
                  </span>
                </div>
              </div>
            </button>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="size-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

        <main className="flex-1 min-h-screen lg:pl-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
