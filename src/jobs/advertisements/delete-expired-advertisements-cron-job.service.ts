import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class DeleteExpiredAdvertisementsCronJob {
  private readonly logger = new Logger(DeleteExpiredAdvertisementsCronJob.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'delete-expired-advertisements',
    timeZone: 'America/Sao_Paulo',
  })
  async handle() {
    this.logger.log(
      'Iniciando remoção de anúncios expirados há mais de 90 dias...',
    )

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const anunciosExpirados = await this.prisma.anuncio.findMany({
      where: {
        expiresAt: {
          lte: ninetyDaysAgo,
        },
      },
      select: {
        id: true,
      },
    })

    if (anunciosExpirados.length === 0) {
      this.logger.log('Nenhum anúncio expirado para remover.')
      return
    }

    let anunciosRemovidosCount = 0
    for (const anuncio of anunciosExpirados) {
      await this.prisma.$transaction(async (prisma) => {
        // Deleta as conversas associadas
        await prisma.conversa.deleteMany({
          where: { anuncioId: anuncio.id },
        })

        // Deleta o anúncio
        await prisma.anuncio.delete({
          where: { id: anuncio.id },
        })
      })
      anunciosRemovidosCount++
    }

    this.logger.log(
      `${anunciosRemovidosCount} anúncios expirados e suas conversas associadas foram removidos permanentemente.`,
    )
  }
}
