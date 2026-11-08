-- DropForeignKey
ALTER TABLE "Drawing" DROP CONSTRAINT "Drawing_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_boardId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_boardId_fkey";

-- DropForeignKey
ALTER TABLE "RTCSessions" DROP CONSTRAINT "RTCSessions_boardId_fkey";

-- DropIndex
DROP INDEX "Board_title_key";

-- CreateIndex
CREATE INDEX "Board_ownerId_idx" ON "Board"("ownerId");

-- CreateIndex
CREATE INDEX "Chat_boardId_createdAt_idx" ON "Chat"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "File_boardId_createdAt_idx" ON "File"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "RTCSessions_boardId_startedAt_idx" ON "RTCSessions"("boardId", "startedAt");

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RTCSessions" ADD CONSTRAINT "RTCSessions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

