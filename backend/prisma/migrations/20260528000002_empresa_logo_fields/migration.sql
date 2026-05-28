-- Migration: empresa_logo_fields
-- Rename logo → logoUrl and add metadata columns

ALTER TABLE "empresas" RENAME COLUMN "logo" TO "logoUrl";
ALTER TABLE "empresas" ADD COLUMN "logoPath"         TEXT;
ALTER TABLE "empresas" ADD COLUMN "logoMimeType"     VARCHAR(50);
ALTER TABLE "empresas" ADD COLUMN "logoOriginalName" TEXT;
ALTER TABLE "empresas" ADD COLUMN "logoSize"         INTEGER;
