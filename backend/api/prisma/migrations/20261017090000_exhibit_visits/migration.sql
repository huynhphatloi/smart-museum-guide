CREATE TABLE "exhibit_visits" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "exhibitId" TEXT,
  "exhibitCode" TEXT NOT NULL,
  "exhibitTitle" TEXT NOT NULL,
  "zoneCode" TEXT NOT NULL,
  "source" TEXT NOT NULL CHECK ("source" IN ('QR', 'BLE', 'MANUAL')),
  "platform" TEXT NOT NULL CHECK ("platform" IN ('WEB', 'IOS', 'ANDROID')),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exhibit_visits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exhibit_visits_occurredAt_idx" ON "exhibit_visits"("occurredAt");
CREATE INDEX "exhibit_visits_exhibitId_occurredAt_idx" ON "exhibit_visits"("exhibitId", "occurredAt");
CREATE INDEX "exhibit_visits_visitorId_exhibitId_source_occurredAt_idx" ON "exhibit_visits"("visitorId", "exhibitId", "source", "occurredAt");
ALTER TABLE "exhibit_visits" ADD CONSTRAINT "exhibit_visits_exhibitId_fkey"
  FOREIGN KEY ("exhibitId") REFERENCES "exhibits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
