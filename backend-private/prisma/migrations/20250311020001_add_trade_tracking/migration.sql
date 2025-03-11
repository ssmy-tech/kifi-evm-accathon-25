-- Create new enums
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');
CREATE TYPE "ExitReason" AS ENUM ('STOP_LOSS', 'TAKE_PROFIT', 'MANUAL');

-- Create TokenTrade table
CREATE TABLE "TokenTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    -- Entry details
    "entryPrice" DOUBLE PRECISION,
    "entryTxHash" TEXT,
    "amount" TEXT NOT NULL,
    
    -- Exit conditions
    "stopLossPrice" DOUBLE PRECISION,
    "takeProfitPrice" DOUBLE PRECISION,
    
    -- Exit details
    "exitPrice" DOUBLE PRECISION,
    "exitTxHash" TEXT,
    "exitReason" "ExitReason",
    
    -- Monitoring status
    "isMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3),

    CONSTRAINT "TokenTrade_pkey" PRIMARY KEY ("id")
);

-- Create indices
CREATE INDEX "TokenTrade_userId_idx" ON "TokenTrade"("userId");
CREATE INDEX "TokenTrade_status_idx" ON "TokenTrade"("status");
CREATE INDEX "TokenTrade_isMonitoring_idx" ON "TokenTrade"("isMonitoring");

-- Add foreign key constraint
ALTER TABLE "TokenTrade" ADD CONSTRAINT "TokenTrade_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("privyId") ON DELETE RESTRICT ON UPDATE CASCADE; 