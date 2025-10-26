import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  HttpCode,
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
import { CurrentUser } from 'src/auth/current-user.decorator'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { StorageService } from 'src/lib/storage.service'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

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
    tags: z
      .string()
      .trim()
      .min(1, 'O campo de tags não pode estar em branco.')
      .transform((val) => val.split(',').map((tag) => tag.trim()))
      .pipe(
        z
          .array(z.string())
          .min(1, 'Pelo menos uma tag é necessária.')
          .max(5, 'O anúncio pode ter no máximo 5 tags.'),
      ),
    // Localização virá como uma string JSON. Ex: '{"lat": -23.5, "lng": -46.6}'
    localizacao: z
      .string()
      .trim()
      .max(200)
      .transform((val) => locationSchema.parse(JSON.parse(val))),
    // Recebe um array de chaves de fotos para deletar
    fotosParaDeletar: z.array(z.string()).optional().default([]),
  })
  .partial() // .partial() torna todos os campos opcionais

export type UpdateAdvertisementsBodySchema = z.infer<
  typeof updateAdvertisementsBodySchema
>

@UseGuards(JwtAuthGuard)
@Controller('/advertisements')
export class UpdateAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Patch(':id') // Recebe o ID do anúncio a ser atualizado
  @HttpCode(204) // Retorna 204 No Content em caso de sucesso
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
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    const { sub: userId } = user
    const { fotosParaDeletar, titulo, descricao, localizacao, tags } = body

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

    await this.prisma.anuncio.update({
      where: { id },
      data: {
        titulo,
        descricao,
        localizacao,
        tags,
        fotos: {
          create: novasFotosKeys.map((key) => ({
            key,
          })),
        },
      },
    })
  }
}
