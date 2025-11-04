import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@Controller('/advertisements/:id')
export class FetchAdvertisementController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async handle(@Param('id') id: string) {
    const advertisementData = await this.prisma.anuncio.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        fotos: true,
        user: {
          select: {
            clerkId: true,
            id: true,
            name: true,
            createdAt: true,
          },
        },
        categoria: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    })

    if (!advertisementData) {
      throw new NotFoundException('Anúncio não encontrado ou não existe.')
    }

    const fotosUrls = await Promise.all(
      advertisementData.fotos.map(async (foto) => {
        const fotoUrl = foto
          ? await this.storage.getPresignedUrl(foto.key)
          : null

        return fotoUrl?.signedUrl
      }),
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fotosWithUrl = advertisementData.fotos.map((foto, index) => ({
      ...foto,
      url: fotosUrls[index],
    }))

    return { ...advertisementData, fotos: fotosWithUrl }
  }
}
