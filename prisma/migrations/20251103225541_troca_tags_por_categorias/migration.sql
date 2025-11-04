/*
  Warnings:

  - Added the required column `categoriaId` to the `anuncios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `anuncios` ADD COLUMN `categoriaId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `categorias` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categorias_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anuncios` ADD CONSTRAINT `anuncios_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
