import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UsePipes,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import z from 'zod'

const sessionAccountBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

type SessionAccountBodySchema = z.infer<typeof sessionAccountBodySchema>

@Controller('/sessions')
export class SessionsController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(sessionAccountBodySchema))
  async handle(@Body() body: SessionAccountBodySchema) {
    const { email, password } = body

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (!user) {
      throw new NotFoundException('User credentials do not match')
    }

    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      throw new NotFoundException('User credentials do not match')
    }

    const accessToken = this.jwt.sign({ sub: user.id })

    return { access_token: accessToken }
  }
}
