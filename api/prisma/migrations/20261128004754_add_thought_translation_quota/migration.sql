-- CreateTable
CREATE TABLE "thought_translation_quota" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "thoughtId" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thought_translation_quota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thought_translation_quota_userId_day_idx" ON "thought_translation_quota"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "thought_translation_quota_userId_thoughtId_day_key" ON "thought_translation_quota"("userId", "thoughtId", "day");
