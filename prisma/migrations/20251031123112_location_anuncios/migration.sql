/*
  Warnings:

  - Added the required column `cep` to the `anuncios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `anuncios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pais` to the `anuncios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `cep` VARCHAR(50) NOT NULL,
    ADD COLUMN `estado` VARCHAR(50) NOT NULL,
    ADD COLUMN `pais` VARCHAR(50) NOT NULL;
