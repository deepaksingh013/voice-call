import { PrismaClient } from "@prisma/client";
import { isProd } from "./env.js";

/**
 * A single client for the process. `tsx watch` reloads the module graph on
 * every save, so without the global cache dev would leak a connection pool
 * per reload and exhaust Postgres within a few minutes.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isProd ? ["error"] : ["warn", "error"] });

if (!isProd) globalForPrisma.prisma = prisma;
