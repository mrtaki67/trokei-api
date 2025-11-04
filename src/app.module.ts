import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
// import { CreateAccountController } from './controllers/users/create-account.controller'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from './env'
import { AuthModule } from './auth/auth.module'
// import { SessionsController } from './controllers/auth/sessions.controller'
import { CreateAdvertisementsController } from './controllers/advertisements/create-advertisements.controller'
import { StorageService } from './lib/storage.service'
import { GetAttachmentController } from './lib/get-attachment.controller'
import { UpdateAdvertisementsController } from './controllers/advertisements/update-advertisements.controller'
import { DeleteAdvertisementsController } from './controllers/advertisements/delete-advertisements.controller'
import { FetchAllAdvertisementsController } from './controllers/advertisements/fetch-all-advertisements.controller'
import { FetchAdvertisementController } from './controllers/advertisements/fetch-advertisement.controller'
import { StartChatController } from './controllers/chat/start-chat.controller'
import { SendMessageController } from './controllers/chat/send-message.controller'
import { FetchAdvertisementsUserController } from './controllers/advertisements/fetch-advertisement-user.controller'
import { ClerkWebhook } from './controllers/webhooks/clerk-webhook.controller'
import { ClerkClientProvider } from './auth/clerk-client.service'
import { FetchChatsController } from './controllers/chat/fetch-chats.controller'
import { FetchChatController } from './controllers/chat/fetch-chat.controller'
import { ChatGateway } from './events/chat.gateway'
import { SavedAdvertisementsController } from './controllers/advertisements/saved-advertisements.controller'
import { FetchCategoriesController } from './controllers/categories/fetch-categories.controller'
import { ScheduleModule } from '@nestjs/schedule'
import { DeleteExpiredAdvertisementsCronJob } from './jobs/advertisements/delete-expired-advertisements-cron-job.service'
import { RenewAdvertisementController } from './controllers/advertisements/renew-advertisements.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    AuthModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    // CreateAccountController,
    // SessionsController,
    CreateAdvertisementsController,
    GetAttachmentController,
    UpdateAdvertisementsController,
    DeleteAdvertisementsController,
    FetchAllAdvertisementsController,
    FetchAdvertisementController,
    StartChatController,
    SendMessageController,
    FetchAdvertisementsUserController,
    ClerkWebhook,
    FetchChatsController,
    FetchChatController,
    SavedAdvertisementsController,
    FetchCategoriesController,
    RenewAdvertisementController,
  ],
  providers: [
    PrismaService,
    StorageService,
    ClerkClientProvider,
    ChatGateway,
    DeleteExpiredAdvertisementsCronJob,
  ],
})
export class AppModule {}
