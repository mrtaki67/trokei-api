import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  UseGuards,
} from '@nestjs/common'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('user/chats')
export class FetchChatsController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @HttpCode(201)
  async handle(@CurrentUser() userKey: UserPayload) {
    const { id: clerkId } = userKey

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId,
      },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const chats = await this.prisma.conversa.findMany({
      where: {
        participantes: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        anuncio: {
          select: {
            id: true,
            titulo: true,
            fotos: {
              take: 1,
              select: {
                id: true,
                key: true,
              },
            },
          },
        },
        participantes: {
          select: {
            id: true,
            clerkId: true,
            name: true,
          },
        },
        mensagens: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            conteudo: true,
            createdAt: true,
          },
        },
      },
    })

    const chatsComFoto = await Promise.all(
      chats.map(async (chat) => {
        const destinatario = chat.participantes.find((p) => p.id !== user.id)
        const { anuncio, ...chatData } = chat

        const fotoUrl =
          anuncio.fotos.length > 0
            ? (await this.storage.getPresignedUrl(anuncio.fotos[0].key))
                ?.signedUrl
            : null

        return {
          ...chatData,
          destinatario,
          anuncio: { ...anuncio, fotoUrl },
        }
      }),
    )

    return { chats: chatsComFoto }
  }
}
