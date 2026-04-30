import { UploadDocumentResponseDto } from '../dtos/upload-document-response.dto';

export interface DocumentServiceInterface {
  uploadDocument(userId: string, file: Express.Multer.File, documentType: string): Promise<UploadDocumentResponseDto>;
}
