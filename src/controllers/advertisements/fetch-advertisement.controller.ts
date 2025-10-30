import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'

@Controller('/advertisements/:id')
export class FetchAdvertisementController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async handle(@Param('id') id: string) {
    const advertisement = await this.prisma.anuncio.findUnique({
      where: {
        id,
      },
      include: {
        fotos: true,
      },
    })

    if (!advertisement) {
      throw new NotFoundException('Anúncio não encontrado ou não existe.')
    }

    return { advertisement }
  }
}
