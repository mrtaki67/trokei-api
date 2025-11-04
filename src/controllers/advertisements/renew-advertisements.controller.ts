import {
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements')
export class RenewAdvertisementController {
  constructor(private prisma: PrismaService) {}

  @Patch(':id/renew')
  @HttpCode(204)
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

    const advertisement = await this.prisma.anuncio.findUnique({
      where: {
        id,
      },
    })

    if (!advertisement) {
      throw new NotFoundException('Anúncio não encontrado.')
    }

    if (advertisement.userId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para renovar este anúncio.',
      )
    }

    if (advertisement.deletedAt) {
      throw new ForbiddenException(
        'Este anúncio foi excluído e não pode ser renovado.',
      )
    }

    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 30)

    if (advertisement.expiresAt && advertisement.expiresAt > sevenDaysFromNow) {
      throw new ForbiddenException(
        'Este anúncio só pode ser renovado quando faltarem 30 dias ou menos para expirar.',
      )
    }

    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 30) // Renova por mais 30 dias

    await this.prisma.anuncio.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
      },
    })
  }
}
