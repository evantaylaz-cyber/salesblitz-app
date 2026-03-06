-- CreateTable: RunDebrief
-- Post-run debrief captures user feedback after a meeting/interview.
-- Fed into subsequent runs targeting the same company for progressive context building.

CREATE TABLE "RunDebrief" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "runRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "outcome" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunDebrief_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RunDebrief" ADD CONSTRAINT "RunDebrief_runRequestId_fkey" FOREIGN KEY ("runRequestId") REFERENCES "RunRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunDebrief" ADD CONSTRAINT "RunDebrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (for fast lookups by run request)
CREATE INDEX "RunDebrief_runRequestId_idx" ON "RunDebrief"("runRequestId");

-- CreateIndex (for fast lookups by user)
CREATE INDEX "RunDebrief_userId_idx" ON "RunDebrief"("userId");
