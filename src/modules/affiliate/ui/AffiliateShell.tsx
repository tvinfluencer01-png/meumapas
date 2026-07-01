import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAffiliate } from "@/modules/affiliate/affiliate.functions";
import { listNotifications } from "@/modules/affiliate/panel.functions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LayoutDashboard, Link2, Image as ImageIcon, Wallet, HandCoins, History,
  Bell, MessageSquare, User, Settings, Moon, Sun, LogOut, Sparkles, Trophy, Menu, X,
} from "lucide-react";

const MENU = [
  { to: "/affiliate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/affiliate/link", label: "Meu Link", icon: Link2 },
  { to: "/affiliate/materials", label: "Materiais", icon: ImageIcon },
  { to: "/affiliate/financial", label: "Financeiro", icon: Wallet },
  { to: "/affiliate/withdraw", label: "Solicitar Saque", icon: HandCoins },
  { to: "/affiliate/history", label: "Histórico", icon: History },
  { to: "/affiliate/ranking", label: "Ranking & Metas", icon: Trophy },
  { to: "/affiliate/gamification", label: "Gamificação", icon: Sparkles },
  { to: "/affiliate/notifications", label: "Notificações", icon: Bell },
  { to: "/affiliate/messages", label: "Mensagens", icon: MessageSquare },
  { to: "/affiliate/account", label: "Minha Conta", icon: User },
  { to: "/affiliate/settings", label: "Configurações", icon: Settings },
] as const;

export function AffiliateShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authed, setAuthed] = useState<null | boolean>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", replace: true });
      else setAuthed(true);
    });
  }, [navigate]);

  const fetchMe = useServerFn(getMyAffiliate);
  const fetchNotifs = useServerFn(listNotifications);
  const { data: me } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => fetchMe(), enabled: !!authed });
  const { data: notifs, refetch: refetchNotifs } = useQuery({
    queryKey: ["affiliate-notifs"], queryFn: () => fetchNotifs(), enabled: !!authed,
    refetchInterval: 30000,
  });

  const profile = (me as any)?.profile;
  const theme = profile?.theme ?? "dark";

  // Apply theme scope
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "light") el.classList.add("affiliate-light");
    else el.classList.remove("affiliate-light");
    return () => el.classList.remove("affiliate-light");
  }, [theme]);

  // Realtime notifications
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`aff-notif-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "affiliate_notifications", filter: `affiliate_id=eq.${profile.id}` }, (payload: any) => {
        const n = payload.new;
        if (profile.notify_toast !== false) toast(n.title, { description: n.body });
        if (profile.notify_push && "Notification" in window && Notification.permission === "granted") {
          new Notification(n.title, { body: n.body ?? "" });
        }
        refetchNotifs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, profile?.notify_toast, profile?.notify_push, refetchNotifs]);

  const toggleTheme = useCallback(async () => {
    const next = theme === "dark" ? "light" : "dark";
    await supabase.from("affiliate_profiles" as any).update({ theme: next }).eq("user_id", profile?.user_id);
    window.location.reload();
  }, [theme, profile?.user_id]);

  const doLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (authed === null) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

  if (me && !profile) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Sparkles className="size-8 text-gold mx-auto" />
          <h2 className="text-2xl font-serif">Você ainda não é afiliado</h2>
          <p className="text-sm text-muted-foreground">Cadastre-se para acessar o painel.</p>
          <Button asChild><Link to="/affiliate/register">Cadastrar-me</Link></Button>
        </div>
      </div>
    );
  }

  const unread = (notifs ?? []).filter((n: any) => !n.read_at).length;

  const initials = profile?.full_name?.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase() ?? "AF";

  return (
    <div className={`min-h-screen flex w-full bg-background text-foreground ${theme === "light" ? "affiliate-light" : ""}`}>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-md bg-card border p-2 shadow"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 w-64 shrink-0 border-r bg-card/60 backdrop-blur flex flex-col transition-transform`}>
        <div className="p-4 border-b flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-serif truncate">Affiliate Center</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel do Afiliado</div>
          </div>
        </div>

        <div className="p-4 border-b flex items-center gap-3">
          <Avatar className="size-10">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gold/20 text-gold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{profile?.full_name}</div>
            <Badge variant="outline" className="text-[10px] mt-0.5">{profile?.status}</Badge>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {MENU.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-gold text-white" : "hover:bg-gold/10 text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.to === "/affiliate/notifications" && unread > 0 && (
                  <span className="ml-auto text-[10px] rounded-full bg-red-500 text-white px-1.5 py-0.5">{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t space-y-1">
          <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600" onClick={doLogout}>
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
