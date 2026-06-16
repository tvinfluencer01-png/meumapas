import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Lamp, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Guide = {
  title: string;
  why: string;
  how: string;
  purpose: string;
};

const GUIDES: Record<string, Guide> = {
  "/": {
    title: "Página Inicial",
    why: "É a porta de entrada do Código Cósmico — onde apresentamos a proposta de unir IA e sabedoria ancestral.",
    how: "Navegue pelas seções, explore os planos e escolha por onde começar sua jornada cósmica.",
    purpose: "Apresentar a plataforma, seus recursos e converter visitantes em jornadeiros.",
  },
  "/auth": {
    title: "Acesso",
    why: "A autenticação protege suas leituras, mapas e dados pessoais sensíveis.",
    how: "Entre com e-mail e senha. Para criar conta, alterne para 'Criar agora' e preencha nome, e-mail e senha.",
    purpose: "Identificar você de forma segura para personalizar toda sua experiência cósmica.",
  },
  "/profissionais": {
    title: "Para Profissionais",
    why: "Astrólogos e numerólogos precisam de ferramentas que escalem seu atendimento sem perder a profundidade.",
    how: "Conheça os recursos profissionais e contrate o plano que libera o gerenciamento de clientes.",
    purpose: "Profissionalizar seu trabalho com clientes, relatórios e contextos múltiplos.",
  },
  "/onboarding": {
    title: "Onboarding",
    why: "Seu mapa astral e numerologia dependem de dados de nascimento precisos.",
    how: "Preencha nome completo, data, hora e local de nascimento com o máximo de exatidão.",
    purpose: "Calibrar todos os cálculos cósmicos para você desde o primeiro acesso.",
  },
  "/dashboard": {
    title: "Dashboard",
    why: "É o seu painel central — o céu particular onde tudo se conecta.",
    how: "Veja seu resumo energético, calendário, leituras semanais e atalhos para cada ferramenta.",
    purpose: "Oferecer uma visão diária do seu momento cósmico e do uso da plataforma.",
  },
  "/clientes": {
    title: "Clientes",
    why: "Profissionais atendem várias pessoas e cada uma precisa do próprio contexto astral.",
    how: "Cadastre clientes com dados de nascimento, alterne o contexto ativo e gere leituras em nome de cada um.",
    purpose: "Centralizar o atendimento profissional sem misturar dados entre pessoas.",
  },
  "/mapa-astral": {
    title: "Mapa Astral",
    why: "O mapa natal é a fotografia do céu no seu nascimento — base de toda interpretação astrológica.",
    how: "Confirme seus dados, gere o mapa e leia as análises de signos, casas, aspectos e trânsitos.",
    purpose: "Revelar talentos, desafios e ciclos da sua jornada por meio da astrologia.",
  },
  "/numerologia": {
    title: "Numerologia",
    why: "Seu nome e data de nascimento carregam vibrações numéricas que descrevem sua missão.",
    how: "Confirme nome completo e data; receba os números do destino, alma, expressão e ciclos.",
    purpose: "Traduzir sua identidade em padrões numéricos para auto-conhecimento e decisões.",
  },
  "/numerologia-cabalistica": {
    title: "Numerologia Cabalística",
    why: "A Cabala associa cada letra hebraica a uma energia espiritual única.",
    how: "Informe seu nome e gere a leitura cabalística com correspondências sefiróticas.",
    purpose: "Acessar a camada mística do seu nome dentro da tradição cabalística.",
  },
  "/tarot": {
    title: "Tarot",
    why: "As cartas espelham padrões do inconsciente e do momento presente.",
    how: "Formule uma pergunta clara, escolha o spread e interprete cada posição com apoio da IA.",
    purpose: "Receber direcionamento simbólico para questões pessoais e profissionais.",
  },
  "/meditacao": {
    title: "Meditação Cabalística",
    why: "A meditação com os Nomes de Deus e a Árvore da Vida acalma e eleva a vibração.",
    how: "Escolha o foco do dia, siga a guiada e respire no ritmo proposto.",
    purpose: "Promover equilíbrio, foco e conexão espiritual diária.",
  },
  "/horoscopo": {
    title: "Horóscopo Diário",
    why: "Os trânsitos planetários mudam todo dia e influenciam decisões e emoções.",
    how: "Abra a página e leia a previsão personalizada do seu signo e momento.",
    purpose: "Orientar seu dia com base nos movimentos do céu.",
  },
  "/mapa-empresarial": {
    title: "Mapa Empresarial",
    why: "Empresas também têm carta natal — a data de fundação revela seu DNA energético.",
    how: "Informe os dados de fundação da empresa e gere a análise de potenciais e desafios.",
    purpose: "Apoiar decisões estratégicas com a leitura astral do negócio.",
  },
  "/oraculo": {
    title: "Oráculo IA",
    why: "É o seu conselheiro cósmico — combina astrologia, numerologia e IA generativa.",
    how: "Faça perguntas em linguagem natural; o oráculo responde considerando seu mapa.",
    purpose: "Acessar respostas profundas e personalizadas a qualquer hora.",
  },
  "/relatorios": {
    title: "Relatórios",
    why: "Leituras completas em PDF servem para estudo, atendimento e presente.",
    how: "Escolha o tipo de relatório, confirme dados e gere o PDF pronto para baixar ou enviar.",
    purpose: "Materializar suas leituras em documentos profissionais reutilizáveis.",
  },
  "/addons": {
    title: "Add-ons",
    why: "Cada pessoa usa um conjunto diferente de ferramentas — os add-ons evitam pagar pelo que você não usa.",
    how: "Escolha add-ons individuais ou um plano que já inclui vários módulos.",
    purpose: "Modular sua experiência conforme sua jornada evolui.",
  },
  "/configuracoes": {
    title: "Configurações",
    why: "Personalizar branding, dados e preferências deixa a plataforma com a sua cara.",
    how: "Atualize informações de perfil, branding de PDF e demais preferências disponíveis.",
    purpose: "Manter sua conta e seus materiais profissionais sempre atualizados.",
  },
  "/pdf-css": {
    title: "PDF CSS Avançado",
    why: "Profissionais querem PDFs com identidade visual única.",
    how: "Edite o CSS dos relatórios para ajustar fontes, cores, espaçamentos e estilos.",
    purpose: "Entregar relatórios visualmente alinhados à sua marca.",
  },
  "/admin": {
    title: "Painel Administrativo",
    why: "Gestão da plataforma exige controle fino de planos, créditos, usuários e marketing.",
    how: "Use as abas para gerenciar add-ons, custos, pacotes, SMTP, PWA e mais.",
    purpose: "Operar e evoluir o Código Cósmico do lado de dentro.",
  },
};

function findGuide(pathname: string): Guide | null {
  if (GUIDES[pathname]) return GUIDES[pathname];
  // Match by prefix (e.g. /admin/logs → /admin)
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const candidate = "/" + segments.join("/");
    if (GUIDES[candidate]) return GUIDES[candidate];
    segments.pop();
  }
  return GUIDES["/"] ?? null;
}

export function SectionGuide() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Não exibe no splash/erro de chunk
  if (pathname.startsWith("/api/")) return null;

  const guide = findGuide(pathname);
  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Ajuda sobre: ${guide.title}`}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 grid place-items-center size-11 rounded-full bg-gold/15 border border-gold/40 text-gold backdrop-blur-md shadow-[0_0_24px_-6px_rgba(212,175,55,0.5)] hover:bg-gold/25 hover:scale-105 transition-all animate-fade-in"
      >
        <Lamp className="size-5 -rotate-12" />
        <Sparkles
          className="absolute -top-1 -right-1 size-3 text-amber-200 animate-pulse"
          aria-hidden="true"
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md glass-card border-gold/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-gold">
              <Lamp className="size-5 -rotate-12" />
              {guide.title}
            </DialogTitle>
            <DialogDescription className="text-stardust">
              Toque na lâmpada em qualquer sessão para entender por quê, como
              usar e para que serve.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4 text-sm leading-relaxed">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Por quê
              </h3>
              <p className="text-foreground/90">{guide.why}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Como usar
              </h3>
              <p className="text-foreground/90">{guide.how}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Para que serve
              </h3>
              <p className="text-foreground/90">{guide.purpose}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
