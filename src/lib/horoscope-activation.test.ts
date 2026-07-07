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
        select(cols: string) {
          selectCols = cols;
          // Executa como um "thenable" (await na chain resolve aqui)
          return {
            then(resolve: (v: any) => void) {
              updateCallCount++;
              const results: any[] = [];
              for (const [id, row] of rows) {
                const match = filters.every(([c, v]) => row[c] === v);
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
