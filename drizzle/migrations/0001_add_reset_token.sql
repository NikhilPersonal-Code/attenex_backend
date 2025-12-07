-- Add reset token fields to users table for password reset functionality
ALTER TABLE "users" ADD COLUMN "reset_token" text;
ALTER TABLE "users" ADD COLUMN "reset_token_expires_at" timestamp with time zone;
