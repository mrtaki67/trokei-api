import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('user/chats/:id')
export class FetchChatController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @HttpCode(201)
  async handle(@Param('id') id: string, @CurrentUser() userKey: UserPayload) {
    const { id: clerkId } = userKey

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId,
      },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const chat = await this.prisma.conversa.findUnique({
      where: {
        id,
        status: 'ATIVA',
      },
      include: {
        anuncio: {
          select: {
            id: true,
            titulo: true,
            categoria: {
              select: {
                id: true,
                nome: true,
              },
            },
            fotos: {
              take: 1,
              select: {
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
            createdAt: 'asc',
          },
        },
      },
    })

    if (!chat) throw new NotFoundException('Chat não encontrado.')

    const { anuncio, ...chatData } = chat

    const fotoUrl =
      anuncio.fotos.length > 0
        ? (await this.storage.getPresignedUrl(anuncio.fotos[0].key))?.signedUrl
        : null

    const anuncioComFoto = { ...anuncio, fotoUrl }

    const mensagensComRemetente = chat.mensagens.map((mensagem) => {
      return {
        ...mensagem,
        enviadaPorMim: mensagem.remetenteId === user.id,
      }
    })

    const ultimaMensagem =
      mensagensComRemetente.length > 0
        ? mensagensComRemetente[mensagensComRemetente.length - 1]
        : null

    const chatComUltimaMensagem = {
      ...chatData,
      anuncio: anuncioComFoto,
      mensagens: mensagensComRemetente,
      ultimaMensagem,
    }

    return { chat: chatComUltimaMensagem }
  }
}
