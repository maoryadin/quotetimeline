-- CreateTable
CREATE TABLE "MarketDaily" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stooq',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketDaily_symbol_date_idx" ON "MarketDaily"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDaily_symbol_date_key" ON "MarketDaily"("symbol", "date");
