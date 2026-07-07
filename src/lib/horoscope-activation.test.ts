/**
 * Testa a idempotência de ativação quando webhook e poll processam
 * a mesma mensagem "ao mesmo tempo".
 *
 * Roda com: `bun test` (nenhuma dep extra).
 */
// @ts-expect-error — bun:test types not bundled; runtime is provided by `bun test`
import { describe, expect, test } from "bun:test";
import {
  buildActivationPatch,
  tryClaimConfirmationSend,
  tryActivateLead,
  tryClaimRetry,
  tryClaimExpiryReminder,
} from "./horoscope-activation.server";

/** Mock supabase com UPDATE atômico condicional (simula o Postgres). */
function makeFakeSupabase(initialRow: Record<string, any>) {
  const rows = new Map<string, Record<string, any>>();
  rows.set(initialRow.id, { ...initialRow });
  let updateCallCount = 0;

  const client = {
    __rows: rows,
    __stats: () => ({ updateCallCount }),
    from(_table: string) {
      let filters: Array<[string, any]> = [];
      let patch: Record<string, any> | null = null;
      let selectCols: string | null = null;

      const chain: any = {
        update(p: Record<string, any>) {
          patch = p;
          return chain;
        },
        eq(col: string, val: any) {
          filters.push([col, val]);
          return chain;
        },
        is(col: string, val: any) {
          // simula NULL / NOT NULL check
          filters.push([col, val]);
          return chain;
        },
        select(cols: string) {
          selectCols = cols;
          // Executa como um "thenable" (await na chain resolve aqui)
          return {
            then(resolve: (v: any) => void) {
              updateCallCount++;
              const results: any[] = [];
              for (const [id, row] of rows) {
                const match = filters.every(([c, v]) => {
                  if (v === null) return row[c] === null || row[c] === undefined;
                  return row[c] === v;
                });
                if (match) {
                  Object.assign(row, patch);
                  results.push({ id: row.id });
                }
              }
              resolve({ data: results, error: null });
            },
          };
        },
      };
      return chain;
    },
  };
  return client;
}

describe("tryActivateLead — idempotência", () => {
  test("webhook e poll concorrentes → apenas uma ativação", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-1",
      status: "pending_confirmation",
      phone_e164: "+5511999998888",
    });
    const patch = buildActivationPatch(7, new Date("2026-07-07T12:00:00Z"));

    // Dispara webhook + poll simultaneamente
    const [webhookOk, pollOk] = await Promise.all([
      tryActivateLead(supabase, "lead-1", patch),
      tryActivateLead(supabase, "lead-1", patch),
    ]);

    // Exatamente um venceu
    expect([webhookOk, pollOk].filter(Boolean).length).toBe(1);

    // A linha ficou ativa uma única vez
    const row = supabase.__rows.get("lead-1")!;
    expect(row.status).toBe("active");
    expect(row.trial_days).toBe(7);
    expect(row.activated_at).toBe(patch.activated_at);
  });

  test("terceira chamada após ativado também é no-op", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-2",
      status: "pending_confirmation",
    });
    const patch = buildActivationPatch(7);

    const first = await tryActivateLead(supabase, "lead-2", patch);
    const second = await tryActivateLead(supabase, "lead-2", patch);
    const third = await tryActivateLead(supabase, "lead-2", patch);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(third).toBe(false);
  });

  test("10 chamadas paralelas → só 1 retorna true", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-3",
      status: "pending_confirmation",
    });
    const patch = buildActivationPatch(7);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => tryActivateLead(supabase, "lead-3", patch)),
    );

    expect(results.filter(Boolean).length).toBe(1);
    expect(supabase.__rows.get("lead-3")!.status).toBe("active");
  });
});

/**
 * Simula o loop do poll: claim atômico → só quem venceu envia WhatsApp.
 * Isso replica exatamente o padrão usado em src/routes/api/public/hooks/horoscope-poll.ts.
 */
async function claimAndSend(
  supabase: any,
  leadId: string,
  claim: () => Promise<boolean>,
  send: () => Promise<void>,
) {
  const won = await claim();
  if (won) await send();
  return won;
}

describe("tryClaimRetry — WhatsApp reenviado apenas 1 vez", () => {
  test("webhook e poll concorrentes → 1 claim, 1 envio", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-r1",
      status: "pending_confirmation",
      retry_count: 0,
    });
    let sends = 0;
    const send = async () => { sends++; };

    const [a, b] = await Promise.all([
      claimAndSend(supabase, "lead-r1", () => tryClaimRetry(supabase, "lead-r1", 0), send),
      claimAndSend(supabase, "lead-r1", () => tryClaimRetry(supabase, "lead-r1", 0), send),
    ]);

    expect([a, b].filter(Boolean).length).toBe(1);
    expect(sends).toBe(1);
    expect(supabase.__rows.get("lead-r1")!.retry_count).toBe(1);
  });

  test("5 chamadas paralelas → 1 envio; próxima janela (retry_count=1) permite +1", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-r2",
      status: "pending_confirmation",
      retry_count: 0,
    });
    let sends = 0;
    const send = async () => { sends++; };

    // Rajada 1: todos tentam com retry_count=0
    const wave1 = await Promise.all(
      Array.from({ length: 5 }, () =>
        claimAndSend(supabase, "lead-r2", () => tryClaimRetry(supabase, "lead-r2", 0), send),
      ),
    );
    expect(wave1.filter(Boolean).length).toBe(1);
    expect(sends).toBe(1);

    // Rajada 2 (nova janela de tempo): agora leem retry_count=1
    const wave2 = await Promise.all(
      Array.from({ length: 5 }, () =>
        claimAndSend(supabase, "lead-r2", () => tryClaimRetry(supabase, "lead-r2", 1), send),
      ),
    );
    expect(wave2.filter(Boolean).length).toBe(1);
    expect(sends).toBe(2);
    expect(supabase.__rows.get("lead-r2")!.retry_count).toBe(2);
  });
});

describe("tryClaimExpiryReminder — lembrete final enviado apenas 1 vez", () => {
  test("webhook e poll concorrentes → 1 claim, 1 envio", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-e1",
      status: "pending_confirmation",
      expiry_reminder_sent_at: null,
    });
    let sends = 0;
    const send = async () => { sends++; };

    const [a, b, c] = await Promise.all([
      claimAndSend(supabase, "lead-e1", () => tryClaimExpiryReminder(supabase, "lead-e1"), send),
      claimAndSend(supabase, "lead-e1", () => tryClaimExpiryReminder(supabase, "lead-e1"), send),
      claimAndSend(supabase, "lead-e1", () => tryClaimExpiryReminder(supabase, "lead-e1"), send),
    ]);

    expect([a, b, c].filter(Boolean).length).toBe(1);
    expect(sends).toBe(1);
    expect(supabase.__rows.get("lead-e1")!.expiry_reminder_sent_at).not.toBeNull();
  });

  test("execução subsequente após lembrete enviado → no-op, sem novo envio", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-e2",
      status: "pending_confirmation",
      expiry_reminder_sent_at: null,
    });
    let sends = 0;
    const send = async () => { sends++; };

    await claimAndSend(supabase, "lead-e2", () => tryClaimExpiryReminder(supabase, "lead-e2"), send);
    await claimAndSend(supabase, "lead-e2", () => tryClaimExpiryReminder(supabase, "lead-e2"), send);
    await claimAndSend(supabase, "lead-e2", () => tryClaimExpiryReminder(supabase, "lead-e2"), send);

    expect(sends).toBe(1);
  });
});

describe("tryClaimConfirmationSend — confirmação não duplica e pode tentar de novo", () => {
  test("webhook e poll concorrentes → 1 claim, 1 envio de confirmação", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-c1",
      status: "active",
      confirmation_attempts: 0,
      confirmation_sent_at: null,
    });
    let sends = 0;
    const send = async () => { sends++; };

    const [a, b] = await Promise.all([
      claimAndSend(supabase, "lead-c1", () => tryClaimConfirmationSend(supabase, "lead-c1", 0), send),
      claimAndSend(supabase, "lead-c1", () => tryClaimConfirmationSend(supabase, "lead-c1", 0), send),
    ]);

    expect([a, b].filter(Boolean).length).toBe(1);
    expect(sends).toBe(1);
    expect(supabase.__rows.get("lead-c1")!.confirmation_attempts).toBe(1);
  });

  test("se a tentativa anterior falhou, a próxima execução pode reivindicar novo envio", async () => {
    const supabase = makeFakeSupabase({
      id: "lead-c2",
      status: "active",
      confirmation_attempts: 1,
      confirmation_sent_at: null,
      confirmation_error: "Evolution HTTP 500",
    });

    const claimed = await tryClaimConfirmationSend(supabase, "lead-c2", 1);

    expect(claimed).toBe(true);
    expect(supabase.__rows.get("lead-c2")!.confirmation_attempts).toBe(2);
    expect(supabase.__rows.get("lead-c2")!.confirmation_error).toBeNull();
  });
});
