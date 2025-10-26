import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { StorageService } from 'src/lib/storage.service'
import { PrismaService } from 'src/prisma/prisma.service'

@Controller('/attachments/:key')
@UseGuards(JwtAuthGuard) // Protege o endpoint, apenas usuários logados podem acessar
export class GetAttachmentController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async handle(@Param('key') key: string) {
    // Opcional: Verificar se a 'key' existe no seu banco de dados
    // para garantir que o usuário está pedindo um arquivo válido.
    // Exemplo:
    // const advertisement = await this.prisma.anuncio.findFirst({
    //   where: {
    //     fotos: {
    //       has: key,
    //     },
    //   },
    // });
    //
    // if (!advertisement) {
    //   throw new NotFoundException('Attachment not found.');
    // }

    return this.storage.getPresignedUrl(key)
  }
}
