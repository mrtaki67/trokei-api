import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard'
import { StorageService } from 'src/lib/storage.service'

@Controller('/attachments/:key')
@UseGuards(JwtAuthGuard) // Protege o endpoint, apenas usuários logados podem acessar
export class GetAttachmentController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async handle(@Param('key') key: string) {
    return this.storage.getPresignedUrl(key)
  }
}
