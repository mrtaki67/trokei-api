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
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements/:anuncioId/chats')
export class StartChatController {
  constructor(private prisma: PrismaService) {}

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

    return {
      conversaId: conversa.id,
    }
  }
}
