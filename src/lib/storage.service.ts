import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { Env } from 'src/env'

@Injectable()
export class StorageService {
  private readonly s3: S3Client

  constructor(private configService: ConfigService<Env, true>) {
    const accountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID', {
      infer: true,
    })

    this.s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', {
          infer: true,
        }),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
    })
  }

  async upload(file: { fileName: string; fileType: string; body: Buffer }) {
    const uploadId = randomUUID()
    const uniqueFileName = `${uploadId}-${file.fileName}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.configService.getOrThrow<string>('CLOUDFLARE_BUCKET_NAME'),
        Key: uniqueFileName,
        Body: file.body,
        ContentType: file.fileType,
      }),
    )
    return { url: uniqueFileName }
  }

  async uploadMany(
    files: Array<{ fileName: string; fileType: string; body: Buffer }>,
  ) {
    const uploadPromises = files.map((file) => this.upload(file))

    const results = await Promise.all(uploadPromises)

    // Extrai apenas a 'key' (renomeada para 'url' no seu método upload) de cada resultado
    // e retorna um array de strings.
    return results.map((result) => result.url)
  }

  async getPresignedUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('CLOUDFLARE_BUCKET_NAME', { infer: true }),
      Key: key,
    })

    // A URL será válida por 5 minutos (300 segundos). Você pode ajustar este tempo.
    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 })

    return { signedUrl }
  }
}
