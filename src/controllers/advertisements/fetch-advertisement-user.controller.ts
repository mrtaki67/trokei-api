import { Controller, Get, UseGuards } from '@nestjs/common'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(ClerkAuthGuard)
@Controller('user/advertisements')
export class FetchAdvertisementsUserController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async handle(@CurrentUser() userKey: UserPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        clerkId: userKey.id,
      },
    })

    if (!user) {
      throw new Error('User Not Found')
    }

    const advertisementsData = await this.prisma.anuncio.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        titulo: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        bairro: true,
        cidade: true,
        fotos: {
          take: 1,
          select: {
            id: true,
            key: true,
          },
        },
      },
    })

    const advertisements = await Promise.all(
      advertisementsData.map(async (ad) => {
        const { fotos, ...advertisement } = ad
        const fotoUrl =
          fotos.length > 0
            ? await this.storage.getPresignedUrl(fotos[0].key)
            : null

        return { ...advertisement, fotoUrl: fotoUrl?.signedUrl }
      }),
    )

    return { advertisements }
  }
}
