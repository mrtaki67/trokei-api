import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'

const deleteAdvertisementBodySchema = z.object({
  motivoExclusao: z.enum([
    'TROQUEI_PELA_TROKE',
    'DOEI_PELA_TROKE',
    'DESAPEGUEI_POR_OUTRO_MEIO',
    'DESISTI_DE_DESAPEGAR',
    'OUTRO_MOTIVO',
  ]),
})

type DeleteAdvertisementBodySchema = z.infer<
  typeof deleteAdvertisementBodySchema
>

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements')
export class DeleteAdvertisementsController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id/delete')
  @HttpCode(204)
  async handle(
    @CurrentUser() userKey: UserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(deleteAdvertisementBodySchema))
    body: DeleteAdvertisementBodySchema,
  ) {
    const { id: clerkId } = userKey
    const { motivoExclusao } = body

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId,
      },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const advertisement = await this.prisma.anuncio.findUnique({
      where: {
        id,
      },
      include: {
        fotos: true, // Inclui as fotos atuais na consulta
      },
    })

    if (!advertisement) {
      throw new NotFoundException('Anúncio não encontrado.')
    }

    if (advertisement.userId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este anúncio.',
      )
    }

    // Usar uma transação para garantir que ambas as operações sejam concluídas com sucesso.
    await this.prisma.$transaction([
      // 1. Marcar o anúncio como deletado
      this.prisma.anuncio.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          motivoExclusao,
        },
      }),
      // 2. Encerrar todas as conversas associadas a este anúncio
      this.prisma.conversa.updateMany({
        where: {
          anuncioId: id,
        },
        data: {
          status: 'ENCERRADA',
        },
      }),
    ])
  }
}
