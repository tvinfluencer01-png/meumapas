import { useState } from "react";
import { Lamp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type SectionLampProps = {
  /** Identificador único da sessão (ex.: "dashboard", "mapa-astral"). */
  sectionKey: string;
  title: string;
  why: string;
  how: string;
  purpose: string;
  className?: string;
  size?: "sm" | "md";
};

type GuideRow = { section_key: string };

const QUERY_KEY = ["section-guides-seen"] as const;

/**
 * Pequena lâmpada piscante exibida ao lado do título de uma sessão.
 * Ao ser clicada, abre um diálogo explicando por que, como usar e para
 * que serve aquela sessão específica. A preferência (já lida) é
 * sincronizada com o Supabase em `user_section_guides`, mantendo o
 * estado consistente entre dispositivos do mesmo usuário.
 */
export function SectionLamp({
  sectionKey,
  title,
  why,
  how,
  purpose,
  className,
  size = "sm",
}: SectionLampProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const { data: seenSet } = useQuery({
    queryKey: [...QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data, error } = await supabase
        .from("user_section_guides")
        .select("section_key")
        .eq("user_id", userId);
      if (error) return new Set<string>();
      return new Set<string>((data as GuideRow[]).map((r) => r.section_key));
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const seen = !!seenSet?.has(sectionKey);

  const markSeen = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase
        .from("user_section_guides")
        .upsert(
          { user_id: userId, section_key: sectionKey, seen_at: new Date().toISOString() },
          { onConflict: "user_id,section_key" },
        );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...QUERY_KEY, userId] });
      const prev = queryClient.getQueryData<Set<string>>([...QUERY_KEY, userId]);
      const next = new Set<string>(prev ?? []);
      next.add(sectionKey);
      queryClient.setQueryData([...QUERY_KEY, userId], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([...QUERY_KEY, userId], ctx.prev);
    },
  });

  const dim = size === "sm" ? "size-6" : "size-7";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  const handleOpen = () => {
    setOpen(true);
    if (!seen) markSeen.mutate();
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Sobre: ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        className={cn(
          "relative inline-grid place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:scale-110 transition-all align-middle",
          dim,
          className,
        )}
      >
        <Lamp className={cn(icon, "-rotate-12")} />
        {!seen && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full ring-2 ring-gold/50 animate-ping opacity-60 pointer-events-none"
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md glass-card border-gold/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-gold">
              <Lamp className="size-5 -rotate-12" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-stardust">
              Entenda esta sessão: por quê, como usar e para que serve.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4 text-sm leading-relaxed">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Por quê
              </h3>
              <p className="text-foreground/90">{why}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Como usar
              </h3>
              <p className="text-foreground/90">{how}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Para que serve
              </h3>
              <p className="text-foreground/90">{purpose}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
