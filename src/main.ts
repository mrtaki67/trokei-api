import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { Env } from './env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get<ConfigService<Env, true>>(ConfigService)

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://huskiest-gidget-unperdurably.ngrok-free.dev',
      configService.get('TROKEI_APP_URL', { infer: true }),
      configService.get('TROKEI_APP_URL_WWW', { infer: true }),
    ],
  })

  const port = configService.get('PORT', { infer: true })

  await app.listen(port)
}
bootstrap()
