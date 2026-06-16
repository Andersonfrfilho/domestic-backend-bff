import { UploadedFile } from '../document.service';
import { UploadDocumentResponseDto } from '../dtos/upload-document-response.dto';

export interface DocumentServiceInterface {
  uploadDocument(
    userId: string,
    file: UploadedFile,
    documentType: string,
  ): Promise<UploadDocumentResponseDto>;
}
