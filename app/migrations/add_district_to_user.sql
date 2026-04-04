-- Add district column to user table
-- Run this migration against your PostgreSQL database
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS district VARCHAR NULL;
