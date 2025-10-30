-- DropForeignKey
ALTER TABLE `anuncios` DROP FOREIGN KEY `anuncios_userId_fkey`;

-- DropForeignKey
ALTER TABLE `conversas` DROP FOREIGN KEY `conversas_anuncioId_fkey`;

-- DropIndex
DROP INDEX `anuncios_userId_fkey` ON `anuncios`;

-- DropIndex
DROP INDEX `conversas_anuncioId_fkey` ON `conversas`;

-- AddForeignKey
ALTER TABLE `anuncios` ADD CONSTRAINT `anuncios_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas` ADD CONSTRAINT `conversas_anuncioId_fkey` FOREIGN KEY (`anuncioId`) REFERENCES `anuncios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
