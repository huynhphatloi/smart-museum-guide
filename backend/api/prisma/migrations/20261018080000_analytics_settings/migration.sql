CREATE TABLE "analytics_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "visitMultiplier" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "analytics_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_settings_multiplier_check" CHECK ("visitMultiplier" BETWEEN 1 AND 100)
);
