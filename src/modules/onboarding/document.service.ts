import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { DocumentServiceInterface } from './interfaces/document-service.interface';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';

@Injectable()
export class DocumentService implements DocumentServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly apiClient: ApiClientService,
  ) {}

  async uploadDocument(
    keycloakId: string,
    file: Express.Multer.File,
    documentType: string,
  ): Promise<UploadDocumentResponseDto> {
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer as BlobPart], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('documentType', documentType);

      const url = `${this.getBaseUrl()}/documents`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-User-Id': keycloakId,
        },
        body: formData,
      });

      if (!response.ok) {
        this.logProvider.warn({
          message: `Document upload returned ${response.status}`,
          context: 'DocumentService.uploadDocument',
        });
        throw new Error(`API error ${response.status} on document upload`);
      }

      const data = (await response.json()) as { id: string; url: string };

      this.logProvider.info({
        message: `Document uploaded successfully for user ${keycloakId}`,
        context: 'DocumentService.uploadDocument',
      });

      return {
        documentId: data.id,
        url: data.url,
        message: 'Documento enviado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to upload document for user ${keycloakId}: ${error.message}`,
        context: 'DocumentService.uploadDocument',
      });
      throw new InternalServerErrorException('Falha ao enviar documento');
    }
  }

  private getBaseUrl(): string {
    return process.env.API_BASE_URL ?? 'http://localhost:3000';
  }
}
