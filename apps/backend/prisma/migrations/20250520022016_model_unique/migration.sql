/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Board` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Board_title_key" ON "Board"("title");
