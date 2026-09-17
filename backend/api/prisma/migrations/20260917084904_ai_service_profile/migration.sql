-- CreateTable
CREATE TABLE "ai_service_profile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "languages" TEXT[],
    "translationModel" TEXT,
    "ttsModels" TEXT[],
    "device" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_service_profile_pkey" PRIMARY KEY ("id")
);
