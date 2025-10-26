import {
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common'
import { CurrentUser } from 'src/auth/current-user.decorator'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@UseGuards(JwtAuthGuard)
@Controller('/advertisements')
export class DeleteAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Delete(':id') // Recebe o ID do anúncio a ser deletado
  async handle(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    const { sub: userId } = user

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

    // Deleta do Storage
    await this.storage.deleteMany(advertisement.fotos.map((foto) => foto.key)!)

    // Deleta do Banco de Dados
    await this.prisma.fotoAnuncio.deleteMany({
      where: {
        key: {
          in: advertisement.fotos.map((foto) => foto.key),
        },
      },
    })

    await this.prisma.anuncio.delete({
      where: { id },
    })
  }
}
