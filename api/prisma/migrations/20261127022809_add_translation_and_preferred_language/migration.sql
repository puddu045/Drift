-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "preferredLanguage" TEXT;

-- CreateTable
CREATE TABLE "translations" (
    "textHash" VARCHAR(64) NOT NULL,
    "targetLanguage" VARCHAR(10) NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("textHash","targetLanguage")
);
