## Objetivo

Impedir que o mesmo e-mail OU WhatsApp faça mais de um trial gratuito do horóscopo diário e criar toda a experiência de assinatura paga (Mercado Pago) com painel admin para configurar planos.

## 1. Regra: 1 trial por vida (email + telefone)

**Backend** (`src/lib/horoscope-landing.functions.ts` → `submitHoroscopeLead`):

Antes de criar novo lead, consultar `horoscope_free_leads` por `lower(email)` OU `phone_e164`. Se existir QUALQUER registro anterior (independente do status — pending, active, expired, unsubscribed), retornar:

```ts
{ blocked: true, reason: "trial_already_used", subscribeUrl: "/horoscopo-assinar" }
```

Landing (`src/routes/horoscopo-gratis.tsx`): quando o form receber `blocked: true`, abrir dialog persuasivo em vez de mostrar o painel de sucesso.

## 2. Popup persuasivo

Novo componente `HoroscopeTrialUsedDialog` (shadcn Dialog):

- Ícone estrela + título "Você já viveu o seu período gratuito ✨"
- Copy persuasiva: reforça o benefício, cita o costume diário, e propõe assinar
- 3 bullets (7h todo dia, previsão personalizada, cancela quando quiser)
- CTA primário dourado "Ver planos de assinatura" → `/horoscopo-assinar`
- Link secundário "Continuar navegando"

## 3. Página de assinatura pública `/horoscopo-assinar`

Layout no mesmo estilo da landing gratuita (Starfield, dourado, serif):

- Hero com pitch e social proof
- Grid com **2 planos** carregados de `horoscope_plans` (só `is_active=true`):
  - Mensal
  - Trimestral (destacado "Mais popular", ~15% de desconto por padrão)
- Cada card mostra: nome, preço, ciclo, features, botão "Assinar agora"
- Botão gera preferência de checkout Mercado Pago via server fn e redireciona

Requer login. Se não logado, envia para `/auth?redirect=/horoscopo-assinar`.

## 4. Tela pós-pagamento de periodicidade `/horoscopo-assinar/preferencia`

Após webhook confirmar pagamento, usuário é redirecionado. Tela mostra:

- Mensagem de sucesso
- Radio group: **Diária (padrão, 8h30)** | Dia sim / dia não | Semanal (escolher dia)
- Horário local (default 08:30)
- Botão "Salvar preferências" (grava em `horoscope_subscriptions`)
- Se pular a tela, permanece o default: `frequency='daily'`, `send_local_hour=8`, `send_local_minute=30`

## 5. Admin: gerenciar planos `/admin` (nova seção)

Novo componente `AdminHoroscopePlans` (padrão dos outros admins):

- Listar planos com: nome, preço BRL, ciclo (`month`/`quarter`), features (textarea 1 por linha), ativo, ordem
- Criar / editar / desativar
- Seeda 2 planos iniciais na migration (preços editáveis pelo admin depois)

## 6. Modelo de dados (migration)

```sql
-- planos configuráveis
CREATE TABLE public.horoscope_plans (
  id uuid PK,
  slug text UNIQUE,          -- 'mensal' | 'trimestral'
  name text,
  description text,
  price_cents int,           -- BRL
  billing_cycle text CHECK (billing_cycle IN ('month','quarter')),
  interval_months int,       -- 1 ou 3
  features jsonb,            -- array de strings
  is_active bool DEFAULT true,
  is_featured bool DEFAULT false,
  sort_order int DEFAULT 0,
  created_at, updated_at
);
GRANT SELECT ON ...horoscope_plans TO anon, authenticated;
GRANT ALL TO service_role;
-- RLS: SELECT público (só is_active), tudo mais só admin

-- assinaturas pagas (ordens/status Mercado Pago)
CREATE TABLE public.horoscope_paid_subscriptions (
  id uuid PK,
  user_id uuid REFERENCES auth.users,
  plan_id uuid REFERENCES horoscope_plans,
  status text,                -- 'pending','active','canceled','expired'
  mp_preference_id text,
  mp_payment_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  phone_e164 text,
  email text,
  created_at, updated_at
);
-- RLS: dono lê o seu; admin lê tudo

-- Seed dos 2 planos padrão
INSERT INTO horoscope_plans (slug,name,price_cents,billing_cycle,interval_months,is_featured,sort_order,features) VALUES
 ('mensal','Mensal',1990,'month',1,false,1,'["Horóscopo diário no WhatsApp","Personalizado pelo seu signo","Cancele quando quiser"]'::jsonb),
 ('trimestral','Trimestral',4990,'quarter',3,true,2,'["Tudo do plano mensal","Economize ~15%","Cobrança a cada 3 meses"]'::jsonb);
```

## 7. Checkout Mercado Pago

- Server fn `createHoroscopePlanCheckout({planId})` (autenticada): cria pref MP com `back_urls.success = /horoscopo-assinar/preferencia?sid=...`, grava `horoscope_paid_subscriptions` status=pending
- Reutiliza `MERCADO_PAGO_ACCESS_TOKEN` já existente no projeto
- Webhook `/api/public/hooks/mercadopago` (já existe): estender `handlePayment` para reconhecer `external_reference` iniciando com `horoscope_plan:` → marca subscription active, define `current_period_end = now + interval_months`, cria/atualiza `horoscope_subscriptions` (canal WhatsApp) com defaults (daily 08:30 local)

## 8. Cron `send-daily-horoscope`

Já filtra por `horoscope_subscriptions` — sem alteração. A tabela `horoscope_free_leads` continua servindo os trials. Assinantes pagos passam a viver em `horoscope_subscriptions` como qualquer outro (mas sem `user_id=auth` restrição — eles são usuários reais logados, então funciona).

## Arquivos a criar/editar

- Migration: `horoscope_plans` + `horoscope_paid_subscriptions` + seed
- `src/lib/horoscope-landing.functions.ts` — bloqueio de trial repetido
- `src/lib/horoscope-plans.functions.ts` (novo) — list/get/admin CRUD + checkout MP
- `src/components/HoroscopeTrialUsedDialog.tsx` (novo)
- `src/routes/horoscopo-gratis.tsx` — integra bloqueio + dialog
- `src/routes/horoscopo-assinar.tsx` (novo) — página pública de planos
- `src/routes/_authenticated.horoscopo-assinar.preferencia.tsx` (novo) — tela pós-pagamento
- `src/components/AdminHoroscopePlans.tsx` (novo) + registrar em `_authenticated.admin.tsx`
- `src/routes/api/public/hooks/mercadopago.ts` — handler para plano de horóscopo

## Fora do escopo (fica pra depois se você quiser)

- Cobrança recorrente automática Mercado Pago (assinatura MP nativa). Como MP recorrente exige aprovação extra, a v1 usa checkout único por período e envia lembrete de renovação perto do fim.
- Portal do assinante para trocar cartão / cancelar (por ora, cancelar = admin ou botão que marca `canceled` e mantém acesso até `current_period_end`).

Confirma que posso seguir com esse plano?
