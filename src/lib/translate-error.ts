// Traduz mensagens de erro comuns (Supabase, rede, etc.) para PT-BR.
// Mantém a mensagem original se não houver correspondência conhecida,
// mas substitui termos óbvios em inglês.
const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/invalid email or password/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
  [/email link is invalid or has expired/i, "O link do e-mail é inválido ou expirou."],
  [/token has expired or is invalid/i, "O código expirou ou é inválido."],
  [/user already registered/i, "Este e-mail já está cadastrado."],
  [/user not found/i, "Usuário não encontrado."],
  [/signups? (are )?(not allowed|disabled)/i, "Cadastros estão desativados no momento."],
  [/email rate limit exceeded/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/rate limit/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/password should be at least (\d+) characters?/i, "A senha deve ter ao menos $1 caracteres."],
  [/password is too short/i, "A senha é muito curta."],
  [/password is too weak/i, "A senha é muito fraca."],
  [/new password should be different from the old password/i, "A nova senha deve ser diferente da atual."],
  [/passwords? (do not|don't) match/i, "As senhas não conferem."],
  [/invalid email/i, "E-mail inválido."],
  [/network ?error|failed to fetch|networkerror/i, "Falha de conexão. Verifique sua internet e tente novamente."],
  [/timeout/i, "Tempo esgotado. Tente novamente."],
  [/unauthorized|not authenticated/i, "Você não está autenticado. Faça login novamente."],
  [/forbidden|permission denied/i, "Você não tem permissão para essa ação."],
  [/not found/i, "Recurso não encontrado."],
  [/internal server error/i, "Erro interno do servidor. Tente novamente em instantes."],
  [/service unavailable|bad gateway|gateway timeout/i, "Serviço temporariamente indisponível. Tente novamente em instantes."],
  [/unsupported provider/i, "Provedor de autenticação não configurado."],
  [/captcha verification process failed/i, "Falha na verificação de captcha."],
  [/over (the )?email send rate limit/i, "Limite de envio de e-mails atingido. Tente novamente mais tarde."],
];

export function translateError(input: unknown): string {
  const raw =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : input && typeof input === "object" && "message" in input
          ? String((input as { message?: unknown }).message ?? "")
          : "";
  const msg = raw.trim();
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";
  for (const [re, pt] of MAP) {
    if (re.test(msg)) return msg.replace(re, pt);
  }
  return msg;
}
