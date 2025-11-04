import { Controller, Get } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'

@Controller('/categories')
export class FetchCategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async handle() {
    return await this.prisma.categoria.findMany()
  }
}
