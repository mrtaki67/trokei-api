import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(JwtAuthGuard)
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
