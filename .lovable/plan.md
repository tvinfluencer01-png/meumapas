# Affiliate Center — FASE 3

Painel administrativo completo do módulo Affiliate integrado ao Super Admin existente, sem alterar funcionalidades atuais.

## 1. Banco de dados (nova migration)

Novas tabelas em `public`:
- `affiliate_products` — catálogo de produtos afiliáveis (nome, slug, preço, categoria, ativo, comissão override).
- `affiliate_coupons` — cupons vinculados a afiliados (código, desconto, uso, validade).
- `affiliate_campaigns` — campanhas de marketing (nome, período, meta, bônus).
- `affiliate_commission_rules` — regras de comissão configuráveis: escopo (produto/categoria/afiliado/global), tipo (fixa/percentual), modelo (primeira/recorrente/vitalícia), valor.
- `affiliate_fraud_flags` — flags antifraude (motivo, evidência, ação: bloqueado/liberado, meta json).
- `affiliate_webhook_events` — eventos brutos recebidos de gateways externos (payload, provider, status).
- `affiliate_processing_queue` — fila de processamento assíncrono (job, payload, status, tentativas).
- Extensões em `affiliate_settings`: min_withdraw, hold_days, cookie_days, auto_approve, antifraud flags (same_cpf/ip/card/vpn/self_purchase).
- Extensões em `affiliate_profiles`: cpf, ip_signup para detecção de fraude.

Todas com GRANTs + RLS (admin via `has_role('admin')` ou `has_affiliate_role('affiliate_admin')`).

## 2. Server functions

`src/modules/affiliate/admin.functions.ts`:
- `adminDashboardStats` — KPIs, séries temporais, geo, top produtos/afiliados.
- CRUD: `adminListAffiliates/updateStatus`, `adminListProducts/upsert`, `adminListCoupons/upsert`, `adminListCampaigns/upsert`, `adminListMaterials/upsert`, `adminListCommissionRules/upsert`.
- Comissões/saques: `adminListCommissions`, `adminApproveCommission`, `adminListWithdraws`, `adminPayWithdraw`.
- Mensagens broadcast: `adminSendMessage`, `adminSendNotification`.
- Antifraude: `adminListFraudFlags`, `adminResolveFraudFlag`.
- Exportação: `adminExport({ entity, format: csv|excel|pdf })`.
- Logs/auditoria: `adminListAuditLogs`.

`src/modules/affiliate/fraud.server.ts` — detector centralizado (CPF/IP/cartão/VPN/auto-compra).
`src/modules/affiliate/commission.server.ts` — cálculo respeitando regras + confirmação de pagamento.

## 3. Rotas públicas (webhooks)

`src/routes/api/public/affiliate/webhooks/$provider.ts` — recebe eventos (compra aprovada, estorno, cancelamento, refund) de gateways externos. Valida assinatura HMAC, grava em `affiliate_webhook_events`, enfileira processamento.

`src/routes/api/public/affiliate/track/click.ts` e `.../conversion.ts` — endpoints públicos JSON para integração com checkouts externos (além do tracker já existente).

## 4. UI Super Admin

Nova área sob `src/routes/_authenticated/admin/affiliate/*`:
- `admin.affiliate.tsx` — layout com sidebar dos 12 menus.
- Páginas: `dashboard`, `affiliates`, `products`, `commissions`, `withdraws`, `messages`, `materials`, `campaigns`, `ranking`, `reports`, `settings`, `logs`.
- Componentes reutilizáveis: `AdminAffiliateShell`, `KpiCard`, `DataTable` com filtros, `ExportMenu` (CSV/Excel/PDF).
- Mapa mundial: react-simple-maps (leve) OU heatmap por país via Recharts. Optar por lista de países com barras para evitar nova dep pesada.

Integração no menu Super Admin existente (`src/routes/_authenticated.admin.tsx`): substituir o link atual "Affiliate Center" para apontar para `/admin/affiliate/dashboard`.

## 5. Exportação

`src/modules/affiliate/export.server.ts`: gera CSV/Excel (xlsx via lib já instalada) e PDF (pdf-lib já em uso). Endpoint via server function retornando base64 + download client-side.

## 6. Antifraude

Integrado no `commission.server.ts`:
- Antes de aprovar comissão, roda checks conforme `affiliate_settings`.
- Se detectar fraude, cria `affiliate_fraud_flags` e bloqueia comissão (`status='blocked'`).

## 7. Filas & cache

- Tabela `affiliate_processing_queue` processada por cron pg_cron a cada minuto chamando `/api/public/affiliate/queue/process`.
- Cache leve em memória por request (dashboard stats agregados com queries otimizadas + índices).

## 8. Logs & auditoria

Reaproveita `affiliate_audit_logs` existente. Toda ação admin registra entry.

## 9. Revisão de consistência

- Rodar build + typecheck.
- Verificar RLS scan.
- Confirmar que nada em `_authenticated` (usuário) foi alterado.

## Escopo excluído nesta fase

- Push real (VAPID) — mantém canal já registrado.
- Integração real com gateway PIX de saque — apenas marca como pago.
- Detecção VPN real — heurística por header/ASN placeholder configurável.
