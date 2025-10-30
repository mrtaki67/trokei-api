import {
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  Req,
} from '@nestjs/common'
import { Webhook, WebhookRequiredHeaders } from 'svix'
import { PrismaService } from 'src/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { Env } from 'src/env'

@Controller('webhook/clerk')
export class ClerkWebhook {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post()
  @HttpCode(200)
  async handleClerkEvent(
    @Req() req: Request & { body: unknown; headers: WebhookRequiredHeaders },
  ) {
    const webhook = new Webhook(
      this.config.get('CLERK_WEBHOOK_SECRET', { infer: true }),
    )

    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value
      }
    }
    const event: any = webhook.verify(JSON.stringify(req.body), headers)
    const data = event.data

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId: data.id,
      },
    })

    switch (event.type) {
      case 'user.created':
        if (user) {
          throw new ConflictException('User already exists')
        }

        await this.prisma.user.create({
          data: {
            clerkId: data.id,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            email:
              data.email_addresses.lenghth > 0
                ? data.email_addresses[0]?.email_address
                : null,
            lgpdConsent: true,
          },
        })

        break

      case 'user.updated':
        if (!user) {
          throw new NotFoundException('User not found')
        }

        await this.prisma.user.update({
          where: {
            clerkId: data.id,
          },
          data: {
            clerkId: data.id,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            email:
              data.email_addresses.lenghth > 0
                ? data.email_addresses[0]?.email_address
                : null,
          },
        })
        break

      case 'user.deleted':
        if (!user) {
          throw new NotFoundException('User not found')
        }

        await this.prisma.user.delete({
          where: {
            clerkId: data.id,
          },
        })
        break
    }

    return { received: true }
  }
}
