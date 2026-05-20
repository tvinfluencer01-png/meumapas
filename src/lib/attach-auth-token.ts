import { createMiddleware } from "@tanstack/react-start";
import { getFreshAccessToken } from "@/lib/auth-session";

export const attachAuthToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getFreshAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);