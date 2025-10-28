/*
  Warnings:

  - You are about to drop the column `localizacao` on the `anuncios` table. All the data in the column will be lost.
  - Added the required column `bairro` to the `anuncios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cidade` to the `anuncios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lat` to the `anuncios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `anuncios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `anuncios` DROP COLUMN `localizacao`,
    ADD COLUMN `bairro` VARCHAR(50) NOT NULL,
    ADD COLUMN `cidade` VARCHAR(50) NOT NULL,
    ADD COLUMN `lat` DOUBLE NOT NULL,
    ADD COLUMN `lng` DOUBLE NOT NULL;
