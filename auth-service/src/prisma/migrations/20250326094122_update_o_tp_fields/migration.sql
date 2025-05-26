/*
  Warnings:

  - You are about to drop the column `tempUserId` on the `OTP` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `OTP` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "OTP" DROP CONSTRAINT "OTP_tempUserId_fkey";

-- DropIndex
DROP INDEX "OTP_tempUserId_key";

-- AlterTable
ALTER TABLE "OTP" DROP COLUMN "tempUserId",
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OTP_userId_key" ON "OTP"("userId");

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TempUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
