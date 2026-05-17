import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFavorites, toggleFavorite, updateFavoriteNote, generateFavoriteNote } from "@/lib/favorites.functions";
import { Star, Trash2, Pencil, Check, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FavoritesSummary() {
  const qc = useQueryClient();
  const fetchFavs = useServerFn(listFavorites);
  const toggleFav = useServerFn(toggleFavorite);
  const updateNote = useServerFn(updateFavoriteNote);

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["calendar-favorites"],
    queryFn: () => fetchFavs({ data: undefined }),
    staleTime: 1000 * 60 * 5,
  });

  const removeMutation = useMutation({
    mutationFn: (date: string) => toggleFav({ data: { date } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-favorites"] }),
  });
  const noteMutation = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) =>
      updateNote({ data: { date, note } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-favorites"] }),
  });
  const generateFn = useServerFn(generateFavoriteNote);
  const generateMutation = useMutation({
    mutationFn: (date: string) => generateFn({ data: { date } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-favorites"] });
      toast.success("Nota gerada com sua energia do dia ✨");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível gerar a nota."),
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = (favorites ?? []).filter((f) => f.date >= todayISO);
  const past = (favorites ?? []).filter((f) => f.date < todayISO).slice(-3).reverse();

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-8">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
            <Star className="size-3.5" /> Dias Importantes
          </p>
          <h2 className="font-serif text-2xl text-stardust mt-1">Seus marcos energéticos</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {favorites?.length ?? 0} {favorites?.length === 1 ? "favorito" : "favoritos"}
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-stardust/5 animate-pulse" />
          ))}
        </div>
      ) : (favorites?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          Toque em qualquer dia do calendário e marque como <span className="text-gold">"importante"</span> para vê-lo aqui.
        </p>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold/80 mb-2">Próximos</p>
              <div className="space-y-2">
                {upcoming.map((f) => (
                  <FavRow
                    key={f.id}
                    fav={f}
                    isToday={f.date === todayISO}
                    editing={editing === f.date}
                    draft={draft}
                    onStartEdit={() => { setEditing(f.date); setDraft(f.note ?? ""); }}
                    onCancel={() => setEditing(null)}
                    onDraftChange={setDraft}
                    onSave={() => {
                      noteMutation.mutate({ date: f.date, note: draft });
                      setEditing(null);
                    }}
                    onRemove={() => removeMutation.mutate(f.date)}
                    onGenerate={() => generateMutation.mutate(f.date)}
                    generating={generateMutation.isPending && generateMutation.variables === f.date}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Anteriores</p>
              <div className="space-y-2 opacity-70">
                {past.map((f) => (
                  <FavRow
                    key={f.id}
                    fav={f}
                    isToday={false}
                    editing={editing === f.date}
                    draft={draft}
                    onStartEdit={() => { setEditing(f.date); setDraft(f.note ?? ""); }}
                    onCancel={() => setEditing(null)}
                    onDraftChange={setDraft}
                    onSave={() => {
                      noteMutation.mutate({ date: f.date, note: draft });
                      setEditing(null);
                    }}
                    onRemove={() => removeMutation.mutate(f.date)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

type Fav = { id: string; date: string; note: string | null; created_at: string };

function FavRow({
  fav, isToday, editing, draft, onStartEdit, onCancel, onDraftChange, onSave, onRemove,
}: {
  fav: Fav; isToday: boolean; editing: boolean; draft: string;
  onStartEdit: () => void; onCancel: () => void;
  onDraftChange: (v: string) => void; onSave: () => void; onRemove: () => void;
}) {
  const d = new Date(fav.date + "T12:00:00Z");
  return (
    <div className={cn(
      "rounded-xl border p-3 flex items-start gap-3 transition-colors",
      isToday ? "border-gold/60 bg-gold/5" : "border-stardust/10 bg-background/40",
    )}>
      <div className="text-center min-w-12">
        <div className="font-serif text-2xl text-gold leading-none">{d.getUTCDate()}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
          {d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground capitalize">
          {d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" })}
          {isToday && <span className="ml-2 text-gold">• Hoje</span>}
        </div>
        {editing ? (
          <div className="mt-1 flex gap-2 items-start">
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Por que este dia é importante?"
              className="flex-1 text-sm bg-background/60 border border-gold/30 rounded-md p-2 text-stardust resize-none"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <button onClick={onSave} className="p-1.5 rounded-md bg-gold/20 text-gold hover:bg-gold/30">
                <Check className="size-3.5" />
              </button>
              <button onClick={onCancel} className="p-1.5 rounded-md text-muted-foreground hover:text-stardust">
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-stardust/90 break-words">
            {fav.note || <span className="text-muted-foreground italic">Sem nota — toque no lápis para adicionar.</span>}
          </p>
        )}
      </div>
      {!editing && (
        <div className="flex flex-col gap-1">
          <button onClick={onStartEdit} aria-label="Editar nota"
            className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-gold/10">
            <Pencil className="size-3.5" />
          </button>
          <button onClick={onRemove} aria-label="Remover favorito"
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
