import { createServerFn } from "@tanstack/react-start";

export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({
  now: new Date().toISOString(),
}));
