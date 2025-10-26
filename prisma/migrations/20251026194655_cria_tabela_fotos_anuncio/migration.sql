/*
  Warnings:

  - You are about to drop the column `fotos` on the `anuncios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `anuncios` DROP COLUMN `fotos`;

-- CreateTable
CREATE TABLE `fotos_anuncios` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `anuncioId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `fotos_anuncios_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fotos_anuncios` ADD CONSTRAINT `fotos_anuncios_anuncioId_fkey` FOREIGN KEY (`anuncioId`) REFERENCES `anuncios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
