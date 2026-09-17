-- CreateEnum
CREATE TYPE "LocalizationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "exhibit_translations" ADD COLUMN     "sourceHash" TEXT;

-- CreateTable
CREATE TABLE "localization_tasks" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "status" "LocalizationStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT,
    "error" TEXT,
    "dispatchedTo" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "audioUrl" TEXT,
    "translationModel" TEXT,
    "ttsModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localization_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "localization_tasks_exhibitId_languageCode_createdAt_idx" ON "localization_tasks"("exhibitId", "languageCode", "createdAt");

-- CreateIndex
CREATE INDEX "localization_tasks_status_idx" ON "localization_tasks"("status");

-- AddForeignKey
ALTER TABLE "localization_tasks" ADD CONSTRAINT "localization_tasks_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
