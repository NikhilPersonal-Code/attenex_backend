-- Add passcode column to lectures table
ALTER TABLE "lectures" ADD COLUMN "passcode" varchar(4);

-- Add passcodeUpdatedAt column to lectures table
ALTER TABLE "lectures" ADD COLUMN "passcode_updated_at" timestamp with time zone;
