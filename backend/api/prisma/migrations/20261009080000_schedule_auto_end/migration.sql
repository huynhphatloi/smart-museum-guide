ALTER TABLE "exhibit_assignments" ADD COLUMN "autoEnd" BOOLEAN NOT NULL DEFAULT false;
UPDATE "exhibit_assignments" SET "autoEnd" = true WHERE "activeTo" IS NULL;
