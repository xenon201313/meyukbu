import { PrismaClient } from "@prisma/client";

declare global {
  var meyukbuPrismaClient: PrismaClient | undefined;
}

/** Reuses one Prisma client during local Next.js hot reloads. */
export function getPrismaClient(): PrismaClient {
  if (!globalThis.meyukbuPrismaClient) {
    globalThis.meyukbuPrismaClient = new PrismaClient();
  }
  return globalThis.meyukbuPrismaClient;
}
