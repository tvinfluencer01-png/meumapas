## Objetivo
Criar uma landing pública `/horoscopo-gratis` para captar **nome, e-mail e WhatsApp** oferecendo **7 dias grátis** do horóscopo diário. Após o cadastro, o usuário clica num botão que abre o WhatsApp com uma mensagem pré-pronta (ex.: `ATIVAR`) para o número oficial; ao recebermos essa mensagem no webhook da Evolution/Twilio, respondemos automaticamente confirmando a ativação e o envio começa **no dia seguinte por 7 dias**. Admin controla tudo (dias grátis, textos, número, opt-in) num novo painel.

## Estrutura

### 1. Banco (migração)
- Nova tabela `horoscope_free_leads`:
  - `id uuid pk`, `full_name text`, `email text`, `phone_e164 text`,
  - `birth_date date null`, `sign text null`,
  - `consent_marketing boolean not null default false`, `consent_ip inet`, `consent_user_agent text`, `consent_at timestamptz`,
  - `status text` (`pending_confirmation` | `active` | `expired` | `unsubscribed`),
  - `activation_code text` (curto, ex. 6 chars — usado como palavra-chave no WhatsApp),
  - `activated_at timestamptz`, `trial_starts_on date`, `trial_ends_on date`,
  - `last_sent_on date`, `source text`, `utm jsonb`,
  - `created_at`, `updated_at`.
  - Índices em `email`, `phone_e164`, `activation_code`, `status`.
  - RLS: sem SELECT anon; INSERT via server function (service role). Admin lê tudo via `has_role(admin)`.
- Nova linha em `system_settings` (chave `horoscope_landing`) com JSON:
  ```json
  {
    "enabled": true,
    "trial_days": 7,
    "whatsapp_number_e164": "+55...",
    "activation_keyword": "ATIVAR",
    "hero_title": "...", "hero_subtitle": "...",
    "consent_text": "Aceito receber mensagens ...",
    "confirmation_reply": "Cadastro confirmado! ...",
    "success_message": "Enviamos o link de ativação no WhatsApp"
  }
  ```

### 2. Server functions / rotas
- `src/lib/horoscope-landing.functions.ts`:
  - `submitHoroscopeLead` (público, com rate-limit por IP + validação Zod) — cria lead `pending_confirmation`, gera `activation_code`, retorna `{ whatsappUrl, keyword }` (link `https://wa.me/<num>?text=ATIVAR-XXXXXX`).
  - `getHoroscopeLandingSettings` (público, leitura só de campos seguros).
  - `adminGetHoroscopeLandingSettings` / `adminUpdateHoroscopeLandingSettings` (admin).
  - `adminListHoroscopeLeads` (admin, paginado, filtros por status).
- Server route `src/routes/api/public/hooks/horoscope-activation.ts` (POST) — webhook chamado pelo provedor de WhatsApp (Evolution/Twilio) quando o lead responde `ATIVAR-XXXXXX`:
  - Valida assinatura/secret.
  - Marca lead como `active`, define `trial_starts_on = amanhã`, `trial_ends_on = +trial_days-1`.
  - Cria/atualiza `horoscope_subscriptions` para envio diário durante o trial (channel WhatsApp).
  - Retorna JSON com `reply` = `confirmation_reply` para o provedor enviar.
- Integração no cron `daily-horoscope`: incluir leads com `status='active'` e `today between trial_starts_on and trial_ends_on`, marcando `last_sent_on`. Ao expirar, marcar `expired` e enviar mensagem final com CTA para assinar.

### 3. Landing pública `/horoscopo-gratis`
- Rota `src/routes/horoscopo-gratis.tsx` (SSR on, público), estilo **Éter Dourado** consistente com o resto do site.
- Seções: hero com promessa + prova social, formulário (nome, e-mail, WhatsApp com máscara +55, data de nascimento opcional p/ signo, checkbox obrigatório de consentimento com texto legal Meta/LGPD), como funciona (3 passos), FAQ curto, footer com política.
- Após submit, tela de sucesso com **botão grande "Concluir cadastro no WhatsApp"** que abre `wa.me` com a mensagem `ATIVAR-XXXXXX` pré-preenchida + instruções.
- SEO: `head()` com título, descrição e og:image próprios.

### 4. Painel Superadmin
- Nova aba em `_authenticated.admin.tsx` "Horóscopo Grátis":
  - Form de configurações (todos os campos do JSON `horoscope_landing`).
  - Tabela de leads (nome, contato, status, código, datas, origem) com filtros e export CSV.
  - Botão "Reenviar link de ativação" (regenera URL wa.me).

## Detalhes técnicos
- **Conformidade Meta/LGPD**: o consentimento é obrigatório antes do submit; armazenamos `consent_ip`, `consent_user_agent`, `consent_at`, `consent_text` (snapshot). A ativação exige uma mensagem **iniciada pelo usuário** no WhatsApp — isso abre a janela de 24h e satisfaz a política de opt-in da Meta.
- **Anti-abuso**: rate-limit no submit (IP + email + telefone), normalização E.164, dedupe por telefone+email.
- **Envio diário**: reutiliza o pipeline atual do `daily-horoscope`; adiciona um branch para leads em trial (sem `user_id`). Após `trial_ends_on`, envia mensagem final com link para `/addons`.
- **Provider WhatsApp**: usa configuração existente (Evolution/Twilio). Se nenhum estiver configurado, admin vê aviso.
- **Restauração**: as mudanças são aditivas (nova tabela, nova rota, nova aba); nada é removido, então voltar é trivial.

## Arquivos a criar/editar
- Migração SQL nova (tabela + grants + RLS + seed do `system_settings`).
- `src/lib/horoscope-landing.functions.ts` (novo).
- `src/routes/horoscopo-gratis.tsx` (novo).
- `src/routes/api/public/hooks/horoscope-activation.ts` (novo).
- `src/components/AdminHoroscopeLanding.tsx` (novo — form + tabela de leads).
- `src/routes/_authenticated.admin.tsx` (nova aba).
- `src/routes/api/public/hooks/daily-horoscope.ts` (incluir leads em trial).
- `src/routes/index.tsx` (banner/CTA discreto para a landing, opcional).

Confirmar para eu implementar. Se quiser, ajusto: (a) usar um provider específico de WhatsApp, (b) mudar keyword/URL, (c) incluir CTA na home.
