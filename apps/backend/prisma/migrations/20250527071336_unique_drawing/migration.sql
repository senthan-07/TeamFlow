/*
  Warnings:

  - A unique constraint covering the columns `[boardId]` on the table `Drawing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Drawing_boardId_key" ON "Drawing"("boardId");
