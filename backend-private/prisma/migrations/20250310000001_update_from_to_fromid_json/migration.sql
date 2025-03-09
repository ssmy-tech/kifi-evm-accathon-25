-- First, add the new JSON column
ALTER TABLE "Messages" ADD COLUMN "fromId" JSONB;

-- Update the new column with data from the old column (converting to JSON)
UPDATE "Messages" SET "fromId" = to_jsonb("from") WHERE "from" IS NOT NULL;

-- Drop the old column
ALTER TABLE "Messages" DROP COLUMN "from"; 