import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ClerkAuthGuard } from 'src/auth/clerk-auth-guard'
import { CurrentUser } from 'src/auth/current-user.decorator'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const updateAdvertisementsBodySchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(1, 'O título não pode estar em branco.')
      .max(50),
    descricao: z
      .string()
      .trim()
      .min(1, 'A descricao não pode estar em branco.')
      .max(200),
    // Tags virão como uma string separada por vírgulas. Ex: "novo,troca,urgente"
    categoriaId: z.string().uuid(),
    lat: z.string().pipe(z.coerce.number()),
    lng: z.string().pipe(z.coerce.number()),
    bairro: z
      .string()
      .trim()
      .min(1, 'O campo bairro não pode estar em branco.')
      .max(50),
    cidade: z
      .string()
      .trim()
      .min(1, 'O campo cidade não pode estar em branco.')
      .max(50),
    estado: z
      .string()
      .trim()
      .min(1, 'O campo estado não pode estar em branco.')
      .max(50),
    cep: z
      .string()
      .trim()
      .min(1, 'O campo estado não pode estar em branco.')
      .max(50),
    pais: z
      .string()
      .trim()
      .min(1, 'O campo estado não pode estar em branco.')
      .max(50),
    // Recebe um array de chaves de fotos para deletar
    fotosParaDeletar: z.array(z.string()).optional().default([]),
  })
  .partial() // .partial() torna todos os campos opcionais

export type UpdateAdvertisementsBodySchema = z.infer<
  typeof updateAdvertisementsBodySchema
>

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements')
export class UpdateAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Patch(':id') // Recebe o ID do anúncio a ser atualizado
  @UseInterceptors(FilesInterceptor('files', 5))
  async handle(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1024 * 1024 * 2, // 2MB
          }),
          new FileTypeValidator({
            fileType: '.(png|jpeg|jpg)',
          }),
        ],
        fileIsRequired: false, // Torna o upload de arquivos opcional
      }),
    )
    files: Array<Express.Multer.File>,
    @Body(new ZodValidationPipe(updateAdvertisementsBodySchema))
    body: UpdateAdvertisementsBodySchema,
    @Param('id') id: string,
    @CurrentUser() userKey: UserPayload,
  ) {
    const {
      fotosParaDeletar,
      titulo,
      descricao,
      lat,
      lng,
      bairro,
      cidade,
      categoriaId,
      estado,
      cep,
      pais,
    } = body

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
      include: {
        fotos: true, // Inclui as fotos atuais na consulta
      },
    })

    if (!advertisement) {
      throw new NotFoundException('Anúncio não encontrado.')
    }

    if (advertisement.userId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este anúncio.',
      )
    }

    const fotosAtuais = advertisement.fotos
    const novasFotosCount = files ? files.length : 0
    const fotosParaDeletarCount = fotosParaDeletar?.length ?? 0

    const totalFinalDeFotos =
      fotosAtuais.length - fotosParaDeletarCount + novasFotosCount

    if (totalFinalDeFotos > 5) {
      throw new ForbiddenException(
        `O anúncio não pode ter mais de 5 fotos. Operação resultaria em ${totalFinalDeFotos} fotos.`,
      )
    }

    if (totalFinalDeFotos === 0) {
      throw new ForbiddenException(
        'O anúncio não pode ficar sem fotos. A operação resultaria em 0 fotos.',
      )
    }

    // 1. Deletar fotos marcadas para exclusão
    if (fotosParaDeletarCount > 0) {
      // Deleta do Storage
      await this.storage.deleteMany(fotosParaDeletar!)
      // Deleta do Banco de Dados
      await this.prisma.fotoAnuncio.deleteMany({
        where: {
          key: {
            in: fotosParaDeletar,
          },
        },
      })
    }

    // 2. Fazer upload e preparar para criar novas fotos
    let novasFotosKeys: string[] = []
    if (novasFotosCount > 0) {
      novasFotosKeys = await this.storage.uploadMany(
        files.map((file) => ({
          fileName: file.fieldname,
          fileType: file.mimetype,
          body: file.buffer,
        })),
      )
    }

    const categoria = await this.prisma.categoria.findUnique({
      where: {
        id: categoriaId,
      },
    })

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada.')
    }

    await this.prisma.anuncio.update({
      where: { id },
      data: {
        titulo,
        descricao,
        lat,
        lng,
        bairro,
        cidade,
        estado,
        cep,
        pais,
        categoriaId,
        fotos: {
          create: novasFotosKeys.map((key) => ({
            key,
          })),
        },
      },
    })
  }
}
