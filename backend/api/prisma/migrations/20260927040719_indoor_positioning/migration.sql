-- CreateEnum
CREATE TYPE "SurveyPointKind" AS ENUM ('REFERENCE', 'TEST');

-- AlterTable
ALTER TABLE "beacons" ADD COLUMN     "mapX" DOUBLE PRECISION,
ADD COLUMN     "mapY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "zones" ADD COLUMN     "floorPlanId" TEXT,
ADD COLUMN     "mapShape" JSONB;

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "widthMeters" DOUBLE PRECISION NOT NULL,
    "heightMeters" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "positioningK" INTEGER NOT NULL DEFAULT 3,
    "fillDbm" INTEGER NOT NULL DEFAULT -100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_points" (
    "id" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "kind" "SurveyPointKind" NOT NULL DEFAULT 'REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_captures" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "orientationDeg" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "samples" JSONB NOT NULL,
    "fingerprint" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_captures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "floor_plans_code_key" ON "floor_plans"("code");

-- CreateIndex
CREATE INDEX "survey_points_floorPlanId_kind_idx" ON "survey_points"("floorPlanId", "kind");

-- CreateIndex
CREATE INDEX "survey_captures_pointId_idx" ON "survey_captures"("pointId");

-- CreateIndex
CREATE INDEX "survey_captures_deviceModel_idx" ON "survey_captures"("deviceModel");

-- CreateIndex
CREATE INDEX "zones_floorPlanId_idx" ON "zones"("floorPlanId");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_points" ADD CONSTRAINT "survey_points_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_captures" ADD CONSTRAINT "survey_captures_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "survey_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
