import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ClerkAuthGuard } from '../../auth/clerk-auth-guard'
import { CurrentUser } from '../../auth/current-user.decorator'
import { type UserPayload } from '../../auth/jwt.strategy'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from 'src/lib/storage.service'

@UseGuards(ClerkAuthGuard)
@Controller('/saved-advertisements')
export class SavedAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post(':advertisementId')
  @HttpCode(201)
  async save(
    @Param('advertisementId') advertisementId: string,
    @CurrentUser() userPayload: UserPayload,
  ) {
    const { id: clerkId } = userPayload

    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const advertisement = await this.prisma.anuncio.findUnique({
      where: { id: advertisementId },
    })

    if (!advertisement) {
      throw new NotFoundException('Anúncio não encontrado.')
    }

    const alreadySaved = await this.prisma.anuncioSalvo.findUnique({
      where: {
        userId_anuncioId: {
          userId: user.id,
          anuncioId: advertisementId,
        },
      },
    })

    if (alreadySaved) {
      throw new ForbiddenException('Este anúncio já está salvo.')
    }

    await this.prisma.anuncioSalvo.create({
      data: {
        userId: user.id,
        anuncioId: advertisementId,
      },
    })
  }

  @Delete(':advertisementId')
  @HttpCode(204)
  async remove(
    @Param('advertisementId') advertisementId: string,
    @CurrentUser() userPayload: UserPayload,
  ) {
    const { id: clerkId } = userPayload

    const user = await this.prisma.user.findUnique({ where: { clerkId } })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    await this.prisma.anuncioSalvo.delete({
      where: {
        userId_anuncioId: {
          userId: user.id,
          anuncioId: advertisementId,
        },
      },
    })
  }

  @Get()
  async list(@CurrentUser() userPayload: UserPayload) {
    const { id: clerkId } = userPayload

    const user = await this.prisma.user.findUnique({ where: { clerkId } })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    const advertisements = await this.prisma.anuncioSalvo.findMany({
      where: {
        userId: user.id,
        anuncio: {
          deletedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        anuncio: {
          select: {
            id: true,
            titulo: true,
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
            categoria: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    })

    const savedAdvertisements = await Promise.all(
      advertisements.map(async (ad) => {
        const { fotos, ...advertisement } = ad.anuncio
        const fotoUrl =
          fotos.length > 0
            ? await this.storage.getPresignedUrl(fotos[0].key)
            : null
        return { ...advertisement, fotoUrl: fotoUrl?.signedUrl }
      }),
    )

    return { savedAdvertisements }
  }
}
