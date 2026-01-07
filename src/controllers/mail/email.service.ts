import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'
import { Env } from '../../env'

interface IMailOptions {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(private configService: ConfigService<Env, true>) {
    // Configuração do transporte SMTP usando variáveis de ambiente
    this.transporter = nodemailer.createTransport({
      host: configService.get('SMTP_HOST', { infer: true }),
      port: configService.get('SMTP_PORT', { infer: true }),
      secure: configService.get('SMTP_SECURE', { infer: true }), // true para 465, false para outras portas
      auth: {
        user: configService.get('SMTP_USER', { infer: true }),
        pass: configService.get('SMTP_PASS', { infer: true }),
      },
    })
  }

  async sendEmail({
    to,
    subject,
    text,
    html,
    replyTo,
  }: IMailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        replyTo,
        subject,
        text,
        html: html || text, // Fallback para texto se HTML não for fornecido
      })

      console.log(`E-mail enviado: ${info.messageId}`)
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error)
      throw new Error('Falha ao enviar o e-mail.')
    }
  }
}
