import { createClerkClient } from '@clerk/backend'
import { ConfigService } from '@nestjs/config'
import { Env } from 'src/env'

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: (configService: ConfigService<Env, true>) => {
    return createClerkClient({
      publishableKey: configService.get('CLERK_PUBLISHABLE_KEY'),
      secretKey: configService.get('CLERK_SECRET_KEY'),
    })
  },
  inject: [ConfigService],
}
