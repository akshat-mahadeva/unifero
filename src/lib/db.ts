import { PrismaClient } from "../generated/prisma";

declare global {
  // allow a global var for the Prisma client to prevent multiple instances in dev
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

export default prisma;
