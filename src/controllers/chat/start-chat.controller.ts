import {
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { ChatGateway } from 'src/events/chat.gateway'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements/:anuncioId/chats')
export class StartChatController {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private storage: StorageService,
  ) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Param('anuncioId') anuncioId: string,
    @CurrentUser() userKey: UserPayload,
  ) {
    const { id: clerkId } = userKey

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId,
      },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const anuncio = await this.prisma.anuncio.findUnique({
      where: { id: anuncioId },
    })

    if (!anuncio) {
      throw new NotFoundException('Anúncio não encontrado.')
    }

    if (anuncio.deletedAt) {
      throw new ForbiddenException('Este anúncio foi excluído.')
    }

    if (anuncio.expiresAt && anuncio.expiresAt < new Date()) {
      throw new ForbiddenException('Este anúncio expirou.')
    }

    const anuncianteId = anuncio.userId

    if (user.id === anuncianteId) {
      throw new ForbiddenException(
        'Você não pode iniciar uma conversa em seu próprio anúncio.',
      )
    }

    // Verifica se já existe uma conversa entre esses usuários para este anúncio
    let conversa = await this.prisma.conversa.findFirst({
      where: {
        anuncioId,
        participantes: {
          every: {
            id: { in: [user.id, anuncianteId] },
          },
        },
      },
    })

    // Se não existir, cria uma nova conversa
    if (!conversa) {
      conversa = await this.prisma.conversa.create({
        data: {
          anuncioId,
          participantes: {
            connect: [{ id: user.id }, { id: anuncianteId }],
          },
        },
      })
    }

    // Após criar ou encontrar, busca os dados completos para notificar os usuários
    const fullConversation = await this.prisma.conversa.findUnique({
      where: { id: conversa.id },
      include: {
        anuncio: {
          select: {
            id: true,
            titulo: true,
            fotos: { take: 1, select: { id: true, key: true } },
          },
        },
        participantes: {
          select: { id: true, clerkId: true, name: true },
        },
        mensagens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { conteudo: true, createdAt: true },
        },
      },
    })

    if (fullConversation) {
      // Notifica ambos os participantes
      for (const participante of fullConversation.participantes) {
        // Se o usuário estiver online, ele recebe a notificação em tempo real
        this.chatGateway.handleNewConversation(participante.clerkId)
      }
    }

    return {
      conversaId: conversa.id,
    }
  }
}
