import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getPublicLanding, AVAILABLE_FIELDS } from "@/lib/product-landings.functions";
import { createProductOrder } from "@/lib/product-orders.functions";
import { showFeedback } from "@/components/system-feedback";

export const Route = createFileRoute("/_authenticated/p/$slug/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getPublicLanding);
  const createFn = useServerFn(createProductOrder);

  const { data: landing, isLoading } = useQuery({
    queryKey: ["public-landing", slug],
    queryFn: () => getFn({ data: { slug } }),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          landing_id: landing!.id,
          customer_data: form,
        },
      }),
    onSuccess: (res) => {
      window.location.href = res.checkout_url;
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-8"><Loader2 className="size-4 animate-spin" /> Carregando…</div>;
  }
  if (!landing) {
    return <div className="p-8 text-center text-muted-foreground">Produto não disponível.</div>;
  }

  const fields = (landing.required_fields as string[]) ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/p/$slug" params={{ slug }}><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      </Button>
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif shimmer-text">{landing.title}</CardTitle>
          <CardDescription>
            Preencha seus dados para gerar o relatório. Após o pagamento, você receberá tudo por email e WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((key) => {
            const meta = AVAILABLE_FIELDS.find((f) => f.key === key);
            const label = meta?.label ?? key;
            const isPhone = key === "phone";
            const type = isPhone
              ? "tel"
              : key === "email"
                ? "email"
                : key.includes("date")
                  ? "date"
                  : key === "birth_time"
                    ? "time"
                    : "text";
            return (
              <div key={key}>
                <Label>{label} *</Label>
                <Input
                  type={type}
                  inputMode={isPhone ? "numeric" : undefined}
                  placeholder={isPhone ? "(11) 99999-9999" : undefined}
                  maxLength={isPhone ? 15 : undefined}
                  value={form[key] ?? ""}
                  onChange={(e) => {
                    const val = isPhone ? maskPhoneBR(e.target.value) : e.target.value;
                    setForm({ ...form, [key]: val });
                  }}
                  required
                />
              </div>
            );
          })}

          <div className="rounded-lg border border-gold/30 bg-secondary/30 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gold/70">Total</div>
              <div className="text-2xl font-serif text-gold">
                R$ {(landing.price_cents / 100).toFixed(2).replace(".", ",")}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => {
                for (const k of fields) {
                  if (!form[k]?.trim()) {
                    showFeedback({ title: "Campos obrigatórios", description: "Preencha todos os campos.", type: "warning" });
                    return;
                  }
                }
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <CreditCard className="size-4 mr-2" />}
              Ir para o pagamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
