import { Controller, Get, Param } from '@nestjs/common'
import { StorageService } from 'src/lib/storage.service'

@Controller('/attachments/:key')
export class GetAttachmentController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async handle(@Param('key') key: string) {
    return this.storage.getPresignedUrl(key)
  }
}
