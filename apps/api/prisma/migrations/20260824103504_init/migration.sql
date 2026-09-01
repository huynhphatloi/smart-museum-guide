-- CreateEnum
CREATE TYPE "ExhibitStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "BeaconProtocol" AS ENUM ('EDDYSTONE_UID', 'IBEACON', 'GENERIC');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "floor" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beacons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "protocol" "BeaconProtocol" NOT NULL DEFAULT 'EDDYSTONE_UID',
    "namespaceId" TEXT,
    "instanceId" TEXT,
    "uuid" TEXT,
    "major" INTEGER,
    "minor" INTEGER,
    "txPower" INTEGER,
    "advertisingIntervalMs" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beacons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibits" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "defaultTitle" TEXT NOT NULL,
    "status" "ExhibitStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibit_translations" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibit_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibit_media" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibit_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibit_assignments" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "zones_qrCode_key" ON "zones"("qrCode");

-- CreateIndex
CREATE INDEX "zones_code_idx" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "beacons_identifier_key" ON "beacons"("identifier");

-- CreateIndex
CREATE INDEX "beacons_zoneId_idx" ON "beacons"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "beacons_namespaceId_instanceId_key" ON "beacons"("namespaceId", "instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "beacons_uuid_major_minor_key" ON "beacons"("uuid", "major", "minor");

-- CreateIndex
CREATE UNIQUE INDEX "exhibits_code_key" ON "exhibits"("code");

-- CreateIndex
CREATE INDEX "exhibits_status_idx" ON "exhibits"("status");

-- CreateIndex
CREATE INDEX "exhibit_translations_languageCode_idx" ON "exhibit_translations"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "exhibit_translations_exhibitId_languageCode_key" ON "exhibit_translations"("exhibitId", "languageCode");

-- CreateIndex
CREATE INDEX "exhibit_media_exhibitId_sortOrder_idx" ON "exhibit_media"("exhibitId", "sortOrder");

-- CreateIndex
CREATE INDEX "exhibit_assignments_zoneId_activeFrom_idx" ON "exhibit_assignments"("zoneId", "activeFrom");

-- CreateIndex
CREATE INDEX "exhibit_assignments_exhibitId_idx" ON "exhibit_assignments"("exhibitId");

-- AddForeignKey
ALTER TABLE "beacons" ADD CONSTRAINT "beacons_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit_translations" ADD CONSTRAINT "exhibit_translations_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit_media" ADD CONSTRAINT "exhibit_media_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit_assignments" ADD CONSTRAINT "exhibit_assignments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit_assignments" ADD CONSTRAINT "exhibit_assignments_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "exhibits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
