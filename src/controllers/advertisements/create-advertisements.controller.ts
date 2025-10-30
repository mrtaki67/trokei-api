import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
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

const createAdvertisementsBodySchema = z.object({
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
    .transform((val) => val.split(',').map((tag) => tag.trim()))
    .pipe(
      z
        .array(z.string())
        .min(1, 'Pelo menos uma tag é necessária.')
        .max(5, 'O anúncio pode ter no máximo 5 tags.'),
    ),
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
})

export type CreateAdvertisementsBodySchema = z.infer<
  typeof createAdvertisementsBodySchema
>

@UseGuards(ClerkAuthGuard)
@Controller('/advertisements')
export class CreateAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService, // Injetar o StorageService
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5)) // Alterado para receber até 5 arquivos do campo 'files'
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
      }),
    )
    files: Array<Express.Multer.File>,
    @Body(new ZodValidationPipe(createAdvertisementsBodySchema))
    body: CreateAdvertisementsBodySchema,
    @CurrentUser() userKey: UserPayload,
  ) {
    const { titulo, descricao, tags, lat, lng, bairro, cidade } = body
    const { id: clerkId } = userKey

    const user = await this.prisma.user.findUnique({
      where: {
        clerkId,
      },
    })

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.')
    }

    if (!files || files.length === 0) {
      throw new ForbiddenException('Pelo menos uma foto é necessária.')
    }

    const uploadedPhotoKeys = await this.storage.uploadMany(
      files.map((file) => ({
        fileName: file.fieldname,
        fileType: file.mimetype,
        body: file.buffer,
      })),
    )

    const userAdvertisementsCount = await this.prisma.anuncio.count({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date(), // Conta apenas anúncios que ainda não expiraram
        },
      },
    })

    if (userAdvertisementsCount >= 5) {
      throw new ForbiddenException(
        'O usuário atingiu o número máximo de anúncios ativos (5).',
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Anúncio expira em 7 dias

    await this.prisma.anuncio.create({
      data: {
        userId: user.id,
        titulo,
        expiresAt,
        descricao,
        tags,
        lat,
        lng,
        bairro,
        cidade,
        fotos: {
          create: uploadedPhotoKeys.map((key) => ({
            key,
          })),
        },
      },
    })
  }
}
