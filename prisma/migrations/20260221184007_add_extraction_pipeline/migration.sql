-- CreateEnum
CREATE TYPE "ExtractionJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'blocked_robots');

-- CreateEnum
CREATE TYPE "ExtractionJobStep" AS ENUM ('normalize', 'robots', 'extract', 'persist', 'complete');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('jina', 'readability', 'unknown');

-- CreateTable
CREATE TABLE "extraction_jobs" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "ExtractionJobStatus" NOT NULL DEFAULT 'queued',
    "step" "ExtractionJobStep" NOT NULL DEFAULT 'normalize',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "extraction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_results" (
    "id" TEXT NOT NULL,
    "extractionJobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "excerpt" TEXT,
    "author" TEXT,
    "siteName" TEXT,
    "method" "ExtractionMethod" NOT NULL DEFAULT 'unknown',
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_policies" (
    "domain" TEXT NOT NULL,
    "robotsAllowed" BOOLEAN NOT NULL DEFAULT true,
    "maxRps" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_policies_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "robots_cache" (
    "domain" TEXT NOT NULL,
    "robotsBody" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "robots_cache_pkey" PRIMARY KEY ("domain")
);

-- CreateIndex
CREATE INDEX "extraction_jobs_status_createdAt_idx" ON "extraction_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "extraction_jobs_domain_createdAt_idx" ON "extraction_jobs"("domain", "createdAt");

-- CreateIndex
CREATE INDEX "extraction_jobs_canonicalUrl_idx" ON "extraction_jobs"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_extractionJobId_key" ON "extraction_results"("extractionJobId");

-- CreateIndex
CREATE INDEX "extraction_results_method_idx" ON "extraction_results"("method");

-- CreateIndex
CREATE INDEX "robots_cache_expiresAt_idx" ON "robots_cache"("expiresAt");

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_extractionJobId_fkey" FOREIGN KEY ("extractionJobId") REFERENCES "extraction_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
