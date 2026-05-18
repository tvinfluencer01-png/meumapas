import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import {
  Sparkles, LayoutDashboard, CircleDot, Hash, MessageCircle, LogOut, Menu, X, ScrollText, Shield, Settings, Coins, Wand2, TreePine,
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
    <div className="relative min-h-screen bg-background text-foreground">
      <Starfield count={60} className="fixed" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <span className="font-serif text-lg shimmer-text">Cosmic AI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className={`${open ? "block" : "hidden"} lg:block fixed lg:sticky inset-0 lg:inset-auto lg:top-0 z-20 lg:z-auto h-screen w-full lg:w-64 border-r border-border bg-background/90 backdrop-blur-xl`}>
          <div className="hidden lg:flex items-center gap-2 px-6 py-6 border-b border-border">
            <Sparkles className="size-6 text-gold" />
            <span className="font-serif text-xl shimmer-text">Cosmic AI</span>
          </div>
          <nav className="p-4 space-y-1">
            {NAV.map((item) => (
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
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="size-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen lg:pl-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
