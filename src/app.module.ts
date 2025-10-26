import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { CreateAccountController } from './controllers/users/create-account.controller'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from './env'
import { AuthModule } from './auth/auth.module'
import { SessionsController } from './controllers/auth/sessions.controller'
import { CreateAdvertisementsController } from './controllers/advertisements/create-advertisements.controller'
import { StorageService } from './lib/storage.service'
import { GetAttachmentController } from './controllers/advertisements/get-attachment.controller'
import { UpdateAdvertisementsController } from './controllers/advertisements/update-advertisements.controller'
import { DeleteAdvertisementsController } from './controllers/advertisements/delete-advertisements.controller'

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
    DeleteAdvertisementsController,
  ],
  providers: [PrismaService, StorageService],
})
export class AppModule {}
