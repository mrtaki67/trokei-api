import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { Prisma } from '@prisma/client'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const fetchAllAdvertisementsQuerySchema = z
  .object({
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    titulo: z.string().optional(),
  })
  .refine((data) => (data.lat && data.lng) || data.bairro, {
    message:
      'É necessário fornecer as coordenadas (lat, lng) ou o bairro para a busca.',
    path: ['lat', 'lng', 'bairro'],
  })
  .refine((data) => !(data.lat && data.bairro) && !(data.lng && data.bairro), {
    message: 'Forneça apenas as coordenadas (lat, lng) ou o bairro, não ambos.',
    path: ['lat', 'lng', 'bairro'],
  })

type FetchAllAdvertisementsQuerySchema = z.infer<
  typeof fetchAllAdvertisementsQuerySchema
>

@UseGuards(JwtAuthGuard)
@Controller('/advertisements')
export class FetchAllAdvertisementsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async handle(
    @Query(new ZodValidationPipe(fetchAllAdvertisementsQuerySchema))
    query: FetchAllAdvertisementsQuerySchema,
  ) {
    const { lat, lng, bairro, cidade, page, titulo } = query
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

    if (bairro && cidade) {
      const advertisements = await this.prisma.anuncio.findMany({
        where: {
          ...baseWhere,
          bairro: {
            contains: bairro,
          },
          cidade: {
            contains: cidade,
          },
        },
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          titulo: true,
          tags: true,
          createdAt: true,
          bairro: true,
          cidade: true,
        },
      })
      return { advertisements }
    }

    if (lat && lng) {
      // Fórmula de Haversine para calcular distância em Km
      // 6371 é o raio da Terra em Km
      const advertisements: unknown[] = await this.prisma.$queryRaw`
        SELECT * FROM (
          SELECT
            *, 
            CASE
              WHEN ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) < 1 
              THEN CONCAT(ROUND(( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) * 1000), 'm')
              ELSE CONCAT(ROUND(( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ), 1), 'km')
            END AS distanciaFormatada,
            ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( lat ) ) ) ) AS distance
          FROM \`anuncios\`
        ) AS anuncios_with_distance
        WHERE
          distance <= 2 AND
          \`deleted_at\` IS NULL AND
          \`expires_at\` > NOW()
          ${
            titulo
              ? Prisma.sql`AND titulo LIKE ${'%' + titulo + '%'}`
              : Prisma.empty
          }
        ORDER BY distance ASC
        LIMIT ${perPage}
        OFFSET ${(page - 1) * perPage};
      `
      return { advertisements }
    }

    // Este erro não deve ocorrer por causa da validação do Zod, mas é uma boa prática de defesa.
    throw new BadRequestException(
      'Parâmetros de busca insuficientes. Forneça coordenadas ou bairro.',
    )
  }
}
