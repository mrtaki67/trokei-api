/*
  Warnings:

  - You are about to drop the column `ativo` on the `anuncios` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `anuncios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `anuncios` DROP COLUMN `ativo`,
    ADD COLUMN `expires_at` DATETIME(3) NOT NULL;
