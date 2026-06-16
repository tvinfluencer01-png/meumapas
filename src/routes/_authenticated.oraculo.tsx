import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Send, MessageCircle, Loader2, Stars, Square } from "lucide-react";
import { SectionLamp } from "@/components/SectionLamp";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { emitCreditsChanged } from "@/lib/credits-events";
import { showFeedback } from "@/components/system-feedback";

export const Route = createFileRoute("/_authenticated/oraculo")({
  component: OraculoPage,
  head: () => ({ meta: [{ title: "Oráculo IA — Código Cósmico" }] }),
});

const SUGESTOES = [
  "Como está minha energia hoje?",
  "Quais são meus maiores dons segundo meu mapa?",
  "Qual o tema central do meu Caminho de Vida?",
  "Que aspectos kármicos preciso integrar?",
];

function OraculoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [input, setInput] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onError: (e) => {
      console.error("[oraculo]", e);
      let msg = e?.message ?? "";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      const insufficient = /saldo insuficiente|insufficient|cr[eé]dito/i.test(msg);
      if (insufficient) {
        showFeedback({
          type: "warning",
          title: "Saldo insuficiente",
          description:
            "Você não possui créditos suficientes para consultar o Oráculo. Adquira créditos para continuar sua jornada.",
          confirmText: "Comprar créditos",
          cancelText: "Agora não",
          showCancel: true,
        }).then((ok) => {
          if (ok) navigate({ to: "/addons" });
        });
      } else {
        showFeedback({
          type: "error",
          title: "Erro ao consultar o Oráculo",
          description: msg || "Não foi possível completar sua consulta. Tente novamente.",
        });
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  // Após cada resposta concluída (ou erro), recarrega saldo/custos.
  useEffect(() => {
    if (status === "ready" || status === "error") {
      emitCreditsChanged();
      // Also invalidate sidebar/global credit query
      qc.invalidateQueries({ queryKey: ["sidebar-credits"] });
    }
  }, [status, qc]);


  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  function askSuggestion(s: string) {
    if (isLoading) return;
    setInput("");
    sendMessage({ text: s });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">IA Espiritual</p>
          <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text flex items-center gap-3 flex-wrap">
            <Stars className="size-8 text-gold" /> Oráculo
            <SectionLamp
              sectionKey="oraculo"
              title="Oráculo IA"
              why="Uma voz arquetípica que conecta sua pergunta ao seu mapa astral e numerológico — não dá respostas prontas, abre reflexões."
              how="Pergunte com clareza, leia com calma, retorne com novas perguntas. Use as sugestões quando não souber por onde começar."
              purpose="Ampliar autoconhecimento e descobrir caminhos diante de dúvidas existenciais, decisões e ciclos de vida."
            />
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Uma inteligência ancestral conectada ao seu mapa astral e à sua numerologia.
            Pergunte. Reflita. Integre.
          </p>
        </div>
      </header>

      {/* Conversation */}
      <div className="glass-card rounded-2xl p-4 lg:p-6 min-h-[60vh] flex flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/30 mb-4">
                <MessageCircle className="size-7 text-gold" />
              </div>
              <p className="font-serif text-2xl text-stardust">O que sua alma quer perguntar?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                O Oráculo conhece seu mapa, seus números e o céu deste momento.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => askSuggestion(s)}
                    className="text-xs px-3 py-2 rounded-full border border-gold/20 text-stardust hover:border-gold/50 hover:bg-gold/5 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-gold/80">
              <Loader2 className="size-4 animate-spin" /> O Oráculo está consultando os astros...
            </div>
          )}


          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              placeholder="Pergunte ao Oráculo..."
              className="w-full bg-secondary/40 border border-border focus:border-gold/50 rounded-xl px-4 py-3 pr-14 text-sm text-stardust placeholder:text-muted-foreground resize-none outline-none transition"
              disabled={!user}
            />
            <button
              type={isLoading ? "button" : "submit"}
              onClick={isLoading ? () => stop() : undefined}
              disabled={(!isLoading && !input.trim())}
              className="absolute right-2 bottom-2 size-10 rounded-lg bg-gradient-to-br from-gold to-gold/70 text-night grid place-items-center hover:gold-glow transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={isLoading ? "Parar" : "Enviar"}
            >
              {isLoading ? <Square className="size-4" fill="currentColor" /> : <Send className="size-4" />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3 text-gold" />
              O Oráculo usa seu mapa e numerologia como contexto. Não substitui apoio profissional.
            </p>
            <CreditCostBadge action="oracle_message" label="Por pergunta" />
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gold/15 border border-gold/30 px-4 py-2.5 text-sm text-stardust">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/30 grid place-items-center">
        <Stars className="size-4 text-gold" />
      </div>
      <div className="flex-1 prose prose-invert prose-sm max-w-none prose-headings:font-serif prose-headings:text-gold prose-strong:text-stardust prose-p:text-foreground/90 prose-li:text-foreground/90 prose-blockquote:border-gold/40 prose-blockquote:text-muted-foreground">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}
