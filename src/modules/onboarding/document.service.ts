import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { DocumentServiceInterface } from './interfaces/document-service.interface';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';

@Injectable()
export class DocumentService implements DocumentServiceInterface {
  private readonly logger = new Logger(DocumentService.name);

  constructor(private readonly apiClient: ApiClientService) {}

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
        this.logger.warn(`Document upload returned ${response.status}`);
        throw new Error(`API error ${response.status} on document upload`);
      }

      const data = (await response.json()) as { id: string; url: string };

      this.logger.log(`Document uploaded successfully for user ${keycloakId}`);

      return {
        documentId: data.id,
        url: data.url,
        message: 'Documento enviado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Failed to upload document for user ${keycloakId}: ${error.message}`);
      throw new InternalServerErrorException('Falha ao enviar documento');
    }
  }

  private getBaseUrl(): string {
    return process.env.API_BASE_URL ?? 'http://localhost:3000';
  }
}
