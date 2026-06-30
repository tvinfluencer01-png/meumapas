# Affiliate Center — FASE 1 (Base Estrutural)

Módulo **totalmente isolado** do sistema atual. Nenhum arquivo existente do sistema principal será modificado, com **uma única exceção controlada**: adicionar um item de menu "Affiliate Center" na sidebar do Super Admin para acesso ao painel (sem alterar nenhuma lógica existente).

Tudo vive sob namespaces próprios: `affiliate_*` no banco, `src/modules/affiliate/` no código, `/api/public/affiliate/*` e `/_authenticated/affiliate/*` nas rotas.

## Banco de dados (schema `public`, prefixo `affiliate_`)

Tabelas criadas em uma única migração com `GRANT` + RLS + políticas:

- `affiliate_profiles` — perfil do afiliado (linkado a `auth.users`): nome, email, whatsapp, cpf (único), status (`pending|approved|rejected|suspended`), affiliate_code (único), api_key_hash, token_hash, approved_at, approved_by
- `affiliate_links` — links exclusivos por afiliado (slug único, destino, label, ativo)
- `affiliate_clicks` — cada clique (link_id, ip, user_agent, country, region, city, device, os, browser, referrer, utm_source/medium/campaign/term/content, landed_at)
- `affiliate_sessions` — sessão de visitante (session_token, click_id inicial, first_seen, last_seen, fingerprint)
- `affiliate_conversions` — visitante converteu (session_id, type: signup/lead/order, value_cents)
- `affiliate_orders` — pedidos atribuídos (order_ref, customer_ref, amount_cents, status)
- `affiliate_commissions` — comissões geradas (order_id, affiliate_id, amount_cents, rate, status: pending/approved/paid/canceled, available_at)
- `affiliate_withdraws` — solicitações de saque (amount_cents, method, bank_account_id/pix_key_id, status: requested/processing/paid/rejected)
- `affiliate_bank_accounts` — contas bancárias do afiliado
- `affiliate_pix_keys` — chaves PIX
- `affiliate_notifications` — notificações internas (afiliado/admin, lida)
- `affiliate_messages` — mensagens entre admin e afiliado
- `affiliate_audit_logs` — auditoria de ações (actor_id, action, entity, entity_id, diff jsonb, ip)
- `affiliate_settings` — config global (auto-approve on/off, default commission rate, cookie window dias)

### RBAC

- Novo enum `affiliate_role`: `affiliate_admin`, `affiliate`
- Tabela `affiliate_user_roles (user_id, role)` separada (não tocar em `user_roles` existente)
- Função `has_affiliate_role(_user, _role)` security definer
- Super Admin do sistema = automaticamente `affiliate_admin` (via `public.has_role(uid,'admin') OR has_affiliate_role(...)` nas policies)

### RLS

- Afiliado vê apenas suas próprias linhas em todas as tabelas (`affiliate_id = profile do auth.uid()`)
- `affiliate_admin` vê tudo
- `affiliate_clicks` e `affiliate_sessions` aceitam INSERT anônimo (rastreamento público) com políticas restritivas
- `service_role` total em todas

## Estrutura de código (Clean Architecture)

```text
src/modules/affiliate/
  domain/
    entities/        (Affiliate, Link, Click, Order, Commission, Withdraw…)
    events/          (AffiliateApproved, ClickRegistered, ConversionRecorded…)
  application/
    services/        (AffiliateService, TrackingService, CommissionService, WithdrawService, NotificationService)
    use-cases/       (RegisterAffiliate, ApproveAffiliate, RegisterClick, RegisterConversion, RequestWithdraw…)
    events/          (event bus simples in-process; handlers registrados aqui)
  infrastructure/
    repositories/    (Repository Pattern sobre Supabase: AffiliateRepository, LinkRepository, ClickRepository, OrderRepository, CommissionRepository, WithdrawRepository, AuditRepository)
    tracking/        (geo lookup via header CF-IPCountry, UA parser leve)
    security/        (gera affiliate_code, api_key, token; hash com sha256)
  interfaces/
    http/
      middleware/    (requireAffiliate, requireAffiliateAdmin, requireApiKey, auditMiddleware)
      controllers/   (AuthController, AffiliateController, LinkController, TrackingController, CommissionController, WithdrawController, AdminController)
      schemas/       (zod schemas para todos os inputs)
  server-fns/        (createServerFn wrappers consumidos pelo painel)
```

## API REST pública — `src/routes/api/public/affiliate/*`

Todas com Zod, rate-limit por IP, audit log:

- `POST /api/public/affiliate/register` — cadastro (Nome, Email, WhatsApp, CPF, Senha, Confirmação)
- `POST /api/public/affiliate/track/click` — registra clique (slug do link + UTM + ctx)
- `POST /api/public/affiliate/track/visit` — registra visita/sessão
- `POST /api/public/affiliate/track/checkout` — checkout iniciado
- `POST /api/public/affiliate/track/order` — compra concluída (autenticado via X-API-Key do parceiro)
- `POST /api/public/affiliate/track/commission` — emissão manual de comissão (admin via API key admin)
- `POST /api/public/affiliate/track/withdraw` — registro externo de saque
- `GET  /api/public/affiliate/r/:slug` — short-redirect que registra clique e redireciona

## Rotas internas (server functions + UI)

- `/_authenticated/affiliate/dashboard` — painel do afiliado (cliques, conversões, comissões, link)
- `/_authenticated/affiliate/links`, `/wallet`, `/withdraws`, `/messages`
- `/_authenticated/admin/affiliate` — painel super admin (aprovar, suspender, ver tudo, configurar)

Server functions sob `src/modules/affiliate/server-fns/` usando `requireSupabaseAuth` + verificação de role.

## Sistema de rastreamento

`TrackingService.captureContext(request)` extrai: IP (`cf-connecting-ip`/`x-forwarded-for`), país/região/cidade (`cf-ipcountry`, `cf-iplongitude`/headers Cloudflare), UA parse (browser, OS, device), referrer, UTM da query, timestamp. Persiste em `affiliate_clicks` e abre/atualiza `affiliate_sessions` por cookie `aff_sid`.

## Event-Driven

Event bus simples in-process (`EventEmitter`) no `application/events`. Eventos: `affiliate.registered`, `affiliate.approved`, `click.registered`, `conversion.recorded`, `commission.created`, `withdraw.requested`. Handlers gravam notificações, audit logs e disparam comissões automaticamente.

## Segurança

- Senhas via Supabase Auth (cria usuário no auth + perfil em `affiliate_profiles`)
- `api_key` e `token` gerados com `crypto.randomBytes(32)`, armazenados como SHA-256 hash; valor cru mostrado **uma única vez** ao afiliado
- CPF validado por algoritmo e armazenado com unique constraint
- Todas as mutations passam por `auditMiddleware` → `affiliate_audit_logs`

## Toque mínimo no sistema atual

- Adicionar **um único item** ao menu do Super Admin em `src/routes/_authenticated.admin.tsx` apontando para `/_authenticated/admin/affiliate` (label "Affiliate Center", ícone Users)
- Nenhum outro arquivo existente é alterado

## Entregáveis FASE 1 (nesta ordem)

1. Migração: enums, tabelas, GRANTs, RLS, policies, função `has_affiliate_role`, trigger de `updated_at`, settings default
2. Camada de domínio + entidades + eventos
3. Repositórios (infrastructure)
4. Serviços + use cases + event bus
5. Middlewares HTTP + schemas Zod
6. Rotas API públicas de rastreamento e registro
7. Server functions do painel
8. UIs mínimas: cadastro público (`/affiliate/register`), dashboard afiliado, painel admin (lista + aprovação)
9. Item de menu no admin

Ao terminar todos os 9 passos, **parar e aguardar FASE 2** (relatórios, pagamentos automáticos, gamificação, etc.) conforme instruído.

## Fora de escopo (FASE 2+)

Integração de pagamento real para saque, cálculo automático de comissão a partir do checkout do sistema principal, e-mails de boas-vindas, dashboards avançados, gamificação, multi-nível.
