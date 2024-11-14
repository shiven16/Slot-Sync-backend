/*
  Warnings:

  - You are about to drop the column `userId` on the `ServiceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `ServiceProvider` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `ServiceProvider` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `ServiceProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `ServiceProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `ServiceProvider` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ServiceProvider` DROP FOREIGN KEY `ServiceProvider_userId_fkey`;

-- AlterTable
ALTER TABLE `ServiceProvider` DROP COLUMN `userId`,
    ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `password_hash` VARCHAR(191) NOT NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `role`;

-- DropTable
DROP TABLE `Notification`;

-- CreateIndex
CREATE UNIQUE INDEX `ServiceProvider_username_key` ON `ServiceProvider`(`username`);

-- CreateIndex
CREATE UNIQUE INDEX `ServiceProvider_email_key` ON `ServiceProvider`(`email`);
