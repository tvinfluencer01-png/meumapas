/**
 * Notifica todos os componentes (ex.: CreditCostBadge) que o saldo/custos
 * de créditos do usuário podem ter mudado e devem ser recarregados.
 *
 * Use após qualquer ação que consome, estorna ou ajusta créditos —
 * inclusive em onSettled (sucesso E erro) para refletir estornos.
 */
export const CREDITS_CHANGED_EVENT = "credits:changed";

export function emitCreditsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT));
}
