-- AlterTable
ALTER TABLE "translations" ADD COLUMN     "detectedSourceLanguage" VARCHAR(10),
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- CreateTable
CREATE TABLE "translation_usage" (
    "month" VARCHAR(7) NOT NULL,
    "characterCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "translation_usage_pkey" PRIMARY KEY ("month")
);
