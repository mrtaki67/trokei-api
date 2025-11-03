-- CreateTable
CREATE TABLE `anuncios_salvos` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `anuncioId` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `anuncios_salvos_userId_anuncioId_key`(`userId`, `anuncioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anuncios_salvos` ADD CONSTRAINT `anuncios_salvos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anuncios_salvos` ADD CONSTRAINT `anuncios_salvos_anuncioId_fkey` FOREIGN KEY (`anuncioId`) REFERENCES `anuncios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
