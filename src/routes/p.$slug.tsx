import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Starfield } from "@/components/Starfield";
import { getPublicLanding } from "@/lib/product-landings.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    try {
      const landing = await getPublicLanding({ data: { slug: params.slug } });
      return { landing };
    } catch {
      return { landing: null };
    }
  },
  head: ({ loaderData }) => {
    const l = loaderData?.landing;
    if (!l) return { meta: [{ title: "Produto não encontrado" }] };
    const title = l.seo_title || `${l.title} — Código Cósmico`;
    const desc = l.seo_description || l.subtitle || l.title;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(l.hero_image_url ? [{ property: "og:image", content: l.hero_image_url }] : []),
      ],
    };
  },
  component: ProductLandingPage,
  errorComponent: () => <NotFound />,
  notFoundComponent: () => <NotFound />,
});

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-center p-8">
      <div>
        <h1 className="font-serif text-3xl shimmer-text mb-3">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6">Esta landing page não existe ou foi desativada.</p>
        <Button asChild><Link to="/">Voltar à página inicial</Link></Button>
      </div>
    </div>
  );
}

function ProductLandingPage() {
  const { landing } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!landing) return <NotFound />;

  function handleBuy() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/p/${landing.slug}/checkout` } as any });
    } else {
      navigate({ to: "/p/$slug/checkout" as any, params: { slug: landing.slug } });
    }
  }

  const benefits = (landing.benefits as string[]) ?? [];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Starfield count={80} className="fixed" />
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
        </Link>
        {!user ? (
          <Button variant="ghost" size="sm" asChild><Link to="/auth">Entrar</Link></Button>
        ) : (
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Meu painel</Link></Button>
        )}
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-4 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
              <Sparkles className="size-3" /> Relatório exclusivo
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl shimmer-text leading-tight mb-4">
              {landing.title}
            </h1>
            {landing.subtitle && (
              <p className="text-lg text-stardust mb-6">{landing.subtitle}</p>
            )}
            {landing.description && (
              <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap mb-8">
                {landing.description}
              </div>
            )}

            {benefits.length > 0 && (
              <ul className="space-y-2 mb-8">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 text-gold mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            <Card className="border-gold/40 bg-gradient-to-br from-secondary/60 to-secondary/20">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-widest text-gold/70 mb-1">Investimento único</div>
                <div className="text-4xl font-serif text-gold mb-4">
                  R$ {(landing.price_cents / 100).toFixed(2).replace(".", ",")}
                </div>
                <Button onClick={handleBuy} size="lg" className="w-full text-base font-medium">
                  {landing.cta_text}
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Você criará sua conta antes de finalizar o pagamento.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            {landing.hero_image_url ? (
              <img
                src={landing.hero_image_url}
                alt={landing.title}
                className="rounded-2xl shadow-2xl border border-gold/30 w-full"
              />
            ) : (
              <div className="aspect-[4/5] rounded-2xl border border-gold/30 bg-gradient-to-br from-secondary to-background grid place-items-center">
                <Logo sizeClassName="size-32" animation="float" />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Código Cósmico
      </footer>
    </div>
  );
}
