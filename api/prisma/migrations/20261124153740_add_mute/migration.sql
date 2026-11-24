-- CreateTable
CREATE TABLE "mutes" (
    "id" UUID NOT NULL,
    "muterId" UUID NOT NULL,
    "mutedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mutes_muterId_mutedId_key" ON "mutes"("muterId", "mutedId");

-- AddForeignKey
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
