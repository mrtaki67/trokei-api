import { Body, Controller, Post } from '@nestjs/common'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { z } from 'zod'
import { EmailService } from './email.service'

const sendMailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
  replyTo: z.string().email().optional(),
})

export type SendMailBodySchema = z.infer<typeof sendMailBodySchema>

@Controller('/mail')
export class SendMailController {
  constructor(private mailService: EmailService) {}

  @Post('send')
  async handle(
    @Body(new ZodValidationPipe(sendMailBodySchema))
    body: SendMailBodySchema,
  ) {
    const { to, subject, text, html, replyTo } = body

    await this.mailService.sendEmail({ to, subject, text, html, replyTo })

    return { message: 'Email sent successfully' }
  }
}
