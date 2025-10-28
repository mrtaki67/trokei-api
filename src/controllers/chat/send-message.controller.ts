import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CurrentUser } from 'src/auth/current-user.decorator'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import type { UserPayload } from 'src/auth/jwt.strategy'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const sendMessageBodySchema = z.object({
  conteudo: z.string().min(1, 'O conteúdo da mensagem não pode ser vazio.'),
})

type SendMessageBodySchema = z.infer<typeof sendMessageBodySchema>

@UseGuards(JwtAuthGuard)
@Controller('/chats/:chatId/messages')
export class SendMessageController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(sendMessageBodySchema))
    body: SendMessageBodySchema,
    @CurrentUser() user: UserPayload,
  ) {
    const { sub: remetenteId } = user
    const { conteudo } = body

    const conversa = await this.prisma.conversa.findUnique({
      where: {
        id: chatId,
      },
      include: {
        participantes: {
          where: {
            id: remetenteId,
          },
        },
      },
    })

    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.')
    }

    if (conversa.status === 'ENCERRADA') {
      throw new ForbiddenException('Esta conversa foi encerrada.')
    }

    if (conversa.participantes.length === 0) {
      throw new ForbiddenException(
        'Você não tem permissão para enviar mensagens nesta conversa.',
      )
    }

    const mensagem = await this.prisma.mensagem.create({
      data: {
        conteudo,
        conversaId: chatId,
        remetenteId,
      },
    })

    return { mensagem }
  }
}
