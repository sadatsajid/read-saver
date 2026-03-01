import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

function hasExtractionDelegates(client: PrismaClient): boolean {
  const runtimeClient = client as unknown as Record<string, unknown>;
  return (
    runtimeClient.extractionJob !== undefined &&
    runtimeClient.extractionResult !== undefined
  );
}

const existingClient = globalForPrisma.prisma;
const shouldCreateClient =
  !existingClient ||
  // Hot-reload safety: if schema changed and old client instance is cached, recreate.
  !hasExtractionDelegates(existingClient);

if (shouldCreateClient) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
