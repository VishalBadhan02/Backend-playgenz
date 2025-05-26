/*
  Warnings:

  - You are about to drop the column `name` on the `TempUser` table. All the data in the column will be lost.
  - Added the required column `address` to the `TempUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `TempUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `TempUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TempUser" DROP COLUMN "name",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT;
