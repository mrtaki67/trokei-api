import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { CreateAccountController } from './controllers/create-account.controller'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from './env'
import { AuthModule } from './auth/auth.module'
import { SessionsController } from './controllers/sessions.controller'
import { CreateAdvertisementsController } from './controllers/create-advertisements.controller'
import { StorageService } from './lib/storage.service'
import { GetAttachmentController } from './controllers/get-attachment.controller'
import { UpdateAdvertisementsController } from './controllers/update-advertisements.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    AuthModule,
  ],
  controllers: [
    CreateAccountController,
    SessionsController,
    CreateAdvertisementsController,
    GetAttachmentController,
    UpdateAdvertisementsController,
  ],
  providers: [PrismaService, StorageService],
})
export class AppModule {}
