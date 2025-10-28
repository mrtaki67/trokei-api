-- DropForeignKey
ALTER TABLE `mensagens` DROP FOREIGN KEY `mensagens_conversaId_fkey`;

-- DropIndex
DROP INDEX `mensagens_conversaId_fkey` ON `mensagens`;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_conversaId_fkey` FOREIGN KEY (`conversaId`) REFERENCES `conversas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
