-- AlterTable
ALTER TABLE "Chats" ADD COLUMN     "lastProcessedAt" TIMESTAMP(3),
ADD COLUMN     "lastProcessedMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Chats_lastProcessedAt_idx" ON "Chats"("lastProcessedAt");
