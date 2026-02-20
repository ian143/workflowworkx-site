-- Fix: Convert CloudProvider columns from text to PostgreSQL enum
-- This resolves: operator does not exist: text = "CloudProvider"
--
-- Run against your Neon database:
--   psql $DATABASE_URL -f prisma/fix-cloud-provider-enum.sql
-- Or via the Neon SQL Editor in the dashboard.

-- Step 1: Create the CloudProvider enum type if it doesn't already exist
DO $$ BEGIN
  CREATE TYPE "CloudProvider" AS ENUM ('google_drive', 'onedrive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Convert all text columns that should be CloudProvider enum

ALTER TABLE "cloud_connections"
  ALTER COLUMN "provider" TYPE "CloudProvider" USING "provider"::"CloudProvider";

ALTER TABLE "users"
  ALTER COLUMN "watch_folder_provider" TYPE "CloudProvider" USING "watch_folder_provider"::"CloudProvider";

ALTER TABLE "projects"
  ALTER COLUMN "source_folder_provider" TYPE "CloudProvider" USING "source_folder_provider"::"CloudProvider";

ALTER TABLE "project_files"
  ALTER COLUMN "cloud_provider" TYPE "CloudProvider" USING "cloud_provider"::"CloudProvider";
