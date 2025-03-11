-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('Telegram', 'Twitter');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('BASE', 'SOLANA', 'MONAD');

-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('Private', 'Public');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('Channel', 'Group', 'User');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('Call', 'Context');

-- CreateTable
CREATE TABLE "User" (
    "privyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tgApiLink" TEXT,
    "tgApiSecret" TEXT NOT NULL,
    "dataStatus" "DataStatus" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("privyId")
);

-- CreateTable
CREATE TABLE "Chats" (
    "tgChatId" TEXT NOT NULL,
    "tgChatName" TEXT,
    "tgChatImageUrl" TEXT,
    "tgChatType" "ChatType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastProcessedMessageId" TEXT,
    "lastProcessedAt" TIMESTAMP(3),

    CONSTRAINT "Chats_pkey" PRIMARY KEY ("tgChatId")
);

-- CreateTable
CREATE TABLE "Messages" (
    "telegramMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tgChatId" TEXT NOT NULL,
    "text" TEXT,
    "fromId" JSONB,
    "messageType" "MessageType" NOT NULL DEFAULT 'Call',
    "reason" TEXT,
    "tgMessageId" TEXT NOT NULL,
    "callId" TEXT,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("telegramMessageId")
);

-- CreateTable
CREATE TABLE "Calls" (
    "telegram_call_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ticker" TEXT,
    "tokenName" TEXT,
    "chain" "Chain" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tgChatId" TEXT NOT NULL,
    "summaryId" TEXT,
    "hasInitialAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "hasFutureAnalysis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Calls_pkey" PRIMARY KEY ("telegram_call_id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "privyId" TEXT NOT NULL,
    "summaryType" "SummaryType" NOT NULL,
    "Blockchain" "Chain" NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatsToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChatsToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_privyId_key" ON "User"("privyId");

-- CreateIndex
CREATE UNIQUE INDEX "Chats_tgChatId_key" ON "Chats"("tgChatId");

-- CreateIndex
CREATE INDEX "Chats_lastProcessedAt_idx" ON "Chats"("lastProcessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Messages_telegramMessageId_key" ON "Messages"("telegramMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Calls_telegram_call_id_key" ON "Calls"("telegram_call_id");

-- CreateIndex
CREATE UNIQUE INDEX "Summary_id_key" ON "Summary"("id");

-- CreateIndex
CREATE INDEX "_ChatsToUser_B_index" ON "_ChatsToUser"("B");

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_tgChatId_fkey" FOREIGN KEY ("tgChatId") REFERENCES "Chats"("tgChatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Calls"("telegram_call_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calls" ADD CONSTRAINT "Calls_tgChatId_fkey" FOREIGN KEY ("tgChatId") REFERENCES "Chats"("tgChatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calls" ADD CONSTRAINT "Calls_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatsToUser" ADD CONSTRAINT "_ChatsToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Chats"("tgChatId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatsToUser" ADD CONSTRAINT "_ChatsToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("privyId") ON DELETE CASCADE ON UPDATE CASCADE;
