/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add username column as nullable first
ALTER TABLE "usuarios" ADD COLUMN "username" TEXT;

-- Step 2: Populate username from email (take part before @)
UPDATE "usuarios" 
SET "username" = LOWER(SPLIT_PART(email, '@', 1))
WHERE "username" IS NULL;

-- Step 3: Handle potential duplicates by appending row number
WITH numbered_users AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM "usuarios"
)
UPDATE "usuarios" u
SET "username" = nu.username || '_' || nu.rn
FROM numbered_users nu
WHERE u.id = nu.id AND nu.rn > 1;

-- Step 4: Make username NOT NULL
ALTER TABLE "usuarios" ALTER COLUMN "username" SET NOT NULL;

-- Step 5: Create unique index
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
