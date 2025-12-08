-- Migration: Update classes table to use id as primary key with unique constraint on (name, teacher_id)
-- This allows multiple teachers to have classes with the same name

-- Step 1: Clean up any classes with NULL teacher_id (student-created classes)
DELETE FROM "classes" WHERE "teacher_id" IS NULL;

-- Step 2: Make teacher_id NOT NULL
ALTER TABLE "classes" ALTER COLUMN "teacher_id" SET NOT NULL;

-- Step 3: Drop the old primary key constraint on name
ALTER TABLE "classes" DROP CONSTRAINT "classes_pkey";

-- Step 4: Add id column as new primary key
ALTER TABLE "classes" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- Step 5: Add unique constraint on (name, teacher_id) to prevent duplicate class names per teacher
CREATE UNIQUE INDEX "classes_name_teacher_idx" ON "classes" USING btree ("name", "teacher_id");

-- Step 6: Drop the old foreign key constraint from lectures
ALTER TABLE "lectures" DROP CONSTRAINT IF EXISTS "lectures_class_name_classes_name_fk";

-- Step 7: Add class_id column to lectures table
ALTER TABLE "lectures" ADD COLUMN "class_id" uuid;

-- Step 8: Populate class_id from class_name
-- Match by class name AND teacher_id to handle duplicate class names
UPDATE "lectures" 
SET "class_id" = (
    SELECT "classes"."id" 
    FROM "classes" 
    WHERE "classes"."name" = "lectures"."class_name" 
    AND "classes"."teacher_id" = "lectures"."teacher_id"
    LIMIT 1
);

-- Step 9: Handle any lectures where class_id is still NULL (orphaned lectures)
DELETE FROM "lectures" WHERE "class_id" IS NULL;

-- Step 10: Make class_id NOT NULL after populating
ALTER TABLE "lectures" ALTER COLUMN "class_id" SET NOT NULL;

-- Step 11: Add foreign key constraint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_class_id_classes_id_fk" 
FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 12: Drop old index on class_name
DROP INDEX IF EXISTS "lectures_class_idx";

-- Step 13: Create new index on class_id
CREATE INDEX "lectures_class_idx" ON "lectures" USING btree ("class_id");

-- Step 14: Drop the old class_name column from lectures
ALTER TABLE "lectures" DROP COLUMN "class_name";
