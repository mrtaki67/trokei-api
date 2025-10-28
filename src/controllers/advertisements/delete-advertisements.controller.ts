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
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'

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

@UseGuards(JwtAuthGuard)
@Controller('/advertisements')
export class DeleteAdvertisementsController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id/delete')
  @HttpCode(204)
  async handle(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(deleteAdvertisementBodySchema))
    body: DeleteAdvertisementBodySchema,
  ) {
    const { sub: userId } = user
    const { motivoExclusao } = body

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

    if (advertisement.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este anúncio.',
      )
    }

    await this.prisma.anuncio.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        motivoExclusao,
      },
    })
  }
}
