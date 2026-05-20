import { createMiddleware } from "@tanstack/react-start";
import { getFreshAccessToken } from "@/lib/auth-session";

export const attachAuthToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getFreshAccessToken();

    if (!token) {
      throw new Error("Sessão expirada. Entre novamente para continuar.");
    }

    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);