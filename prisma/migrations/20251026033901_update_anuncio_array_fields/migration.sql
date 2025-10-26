/*
  Warnings:

  - Added the required column `lgpdConsent` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `lgpdConsent` BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE `anuncios` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(50) NOT NULL,
    `descricao` VARCHAR(200) NOT NULL,
    `tags` JSON NOT NULL,
    `localizacao` JSON NOT NULL,
    `fotos` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anuncios` ADD CONSTRAINT `anuncios_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
