/*
  Warnings:

  - You are about to drop the `thought_translation_quota` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "thought_translation_quota";

-- CreateTable
CREATE TABLE "translation_quota" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "contentType" VARCHAR(20) NOT NULL,
    "contentId" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_quota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translation_quota_userId_day_idx" ON "translation_quota"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "translation_quota_userId_contentType_contentId_day_key" ON "translation_quota"("userId", "contentType", "contentId", "day");
