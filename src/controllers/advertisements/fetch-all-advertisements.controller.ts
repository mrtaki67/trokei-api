import { Controller, Get, Query, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { StorageService } from 'src/lib/storage.service'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const fetchAllAdvertisementsQuerySchema = z
  .object({
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional().default(''),
    estado: z.string().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    titulo: z.string().optional(),
    localidade: z.enum(['perto-de-mim', 'qualquer-lugar']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.localidade === 'perto-de-mim') {
      if (!data.lat || !data.lng) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'As coordenadas (lat, lng) são obrigatórias para a busca "perto-de-mim".',
          path: ['lat', 'lng'],
        })
      }
    }
  })

type FetchAllAdvertisementsQuerySchema = z.infer<
  typeof fetchAllAdvertisementsQuerySchema
>

@Controller('/advertisements')
export class FetchAllAdvertisementsController {
  constructor(
    private prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async handle(
    @Query(new ZodValidationPipe(fetchAllAdvertisementsQuerySchema))
    query: FetchAllAdvertisementsQuerySchema,
  ) {
    const { lat, lng, bairro, cidade, estado, page, titulo, localidade } = query
    const perPage = 10

    const baseWhere = {
      deletedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      ...(titulo && {
        titulo: {
          contains: titulo,
        },
      }),
    }

    if (localidade === 'qualquer-lugar') {
      const advertisementsData = await this.prisma.anuncio.findMany({
        where: {
          ...baseWhere,
        },
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy: {
          createdAt: 'desc',
        },
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
    } else if (bairro || cidade || estado) {
      const advertisementsData = await this.prisma.anuncio.findMany({
        where: {
          ...baseWhere,
          ...(bairro && {
            bairro: {
              contains: bairro,
            },
          }),
          ...(cidade && {
            cidade: {
              contains: cidade,
            },
          }),
          ...(estado && {
            estado: {
              contains: estado,
            },
          }),
        },
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy: {
          createdAt: 'desc',
        },
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

    if (localidade === 'perto-de-mim' && lat && lng) {
      // Fórmula de Haversine para calcular distância em Km
      // 6371 é o raio da Terra em Km
      const advertisementsData: any[] = await this.prisma.$queryRaw`
        SELECT
          *
        FROM (
          SELECT
            anuncios.id,
            anuncios.titulo,
            anuncios.created_at as createdAt,
            anuncios.updated_at as updatedAt,
            anuncios.bairro,
            anuncios.cidade,
            (
              SELECT JSON_OBJECT('id', f.id, 'key', f.key)
              FROM \`fotos_anuncios\` f
                WHERE f.anuncioId = anuncios.id
                LIMIT 1
            ) AS foto,
            (
              SELECT JSON_OBJECT('id', c.id, 'nome', c.nome)
              FROM \`categorias\` c
                WHERE c.id = anuncios.categoriaId
            ) AS categoria,
            CASE
              WHEN ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) < 1 
              THEN CONCAT(ROUND(( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) * 1000), 'm')
              ELSE CONCAT(ROUND(( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ), 1), 'km')
            END AS distanciaFormatada,
            ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) AS distance
          FROM \`anuncios\`
          WHERE
            \`deleted_at\` IS NULL AND
            \`expires_at\` > NOW()
            ${
              titulo
                ? Prisma.sql`AND titulo LIKE ${'%' + titulo + '%'}`
                : Prisma.empty
            }
        ) AS anuncios_with_distance
        WHERE distance <= 2
        ORDER BY distance ASC
        LIMIT ${perPage}
        OFFSET ${(page - 1) * perPage};
      `

      const advertisements = await Promise.all(
        advertisementsData.map(async (ad) => {
          const fotoUrl = ad.foto
            ? await this.storage.getPresignedUrl(ad.foto.key)
            : null

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { foto, ...advertisement } = ad
          return { ...advertisement, fotoUrl: fotoUrl?.signedUrl }
        }),
      )

      return { advertisements }
    }

    // Este erro não deve ocorrer por causa da validação do Zod, mas é uma boa prática de defesa.
    throw new BadRequestException(
      'Parâmetros de busca insuficientes. Forneça coordenadas ou bairro.',
    )
  }
}
