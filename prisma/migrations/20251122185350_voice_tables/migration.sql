-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'ERROR');

-- CreateTable
CREATE TABLE "LeadGenSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "depth" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT,
    "keywords" TEXT NOT NULL,
    "includeEmail" BOOLEAN NOT NULL DEFAULT false,
    "includePhone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeadGenSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clones" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sample_audio_url" TEXT NOT NULL,
    "audio_duration_seconds" DOUBLE PRECISION NOT NULL,
    "transcript" TEXT,
    "status" TEXT NOT NULL,
    "playht_voice_id" TEXT,
    "voice_manifest_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_clones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_usage_tracking" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "month_year" TEXT NOT NULL,
    "characters_used" INTEGER NOT NULL DEFAULT 0,
    "generations_count" INTEGER NOT NULL DEFAULT 0,
    "clones_count" INTEGER NOT NULL DEFAULT 0,
    "is_byok" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "voice_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tts_generations" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "text_content" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "voice_name" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "audio_duration_seconds" DOUBLE PRECISION NOT NULL,
    "settings" JSONB NOT NULL,
    "character_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tts_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_premade_refs" (
    "voice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sample_url" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_premade_refs_pkey" PRIMARY KEY ("voice_id")
);

-- CreateTable
CREATE TABLE "LeadProviderUsage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadProviderUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "confidenceScore" INTEGER NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadGenSession_status_idx" ON "LeadGenSession"("status");

-- CreateIndex
CREATE INDEX "LeadGenSession_userId_idx" ON "LeadGenSession"("userId");

-- CreateIndex
CREATE INDEX "LeadGenSession_startedAt_idx" ON "LeadGenSession"("startedAt");

-- CreateIndex
CREATE INDEX "voice_clones_user_id_idx" ON "voice_clones"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_usage_tracking_user_id_month_year_key" ON "voice_usage_tracking"("user_id", "month_year");

-- CreateIndex
CREATE INDEX "voice_favorites_user_id_idx" ON "voice_favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_favorites_user_id_voice_id_key" ON "voice_favorites"("user_id", "voice_id");

-- CreateIndex
CREATE INDEX "tts_generations_user_id_idx" ON "tts_generations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadProviderUsage_sessionId_providerId_key" ON "LeadProviderUsage"("sessionId", "providerId");

-- CreateIndex
CREATE INDEX "Lead_company_idx" ON "Lead"("company");

-- CreateIndex
CREATE INDEX "Lead_title_idx" ON "Lead"("title");

-- CreateIndex
CREATE INDEX "Lead_confidenceScore_idx" ON "Lead"("confidenceScore");

-- AddForeignKey
ALTER TABLE "LeadProviderUsage" ADD CONSTRAINT "LeadProviderUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LeadGenSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LeadGenSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
