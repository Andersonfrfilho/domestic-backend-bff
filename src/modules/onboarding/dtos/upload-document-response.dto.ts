import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentResponseDto {
  @ApiProperty({
    example: 'doc-a1b2c3d4-e5f6-7890',
    description: 'ID do documento criado',
  })
  documentId: string;

  @ApiProperty({
    example: 'https://storage.domestic.local/documents/doc-a1b2c3d4.pdf',
    description: 'URL do documento armazenado',
  })
  url: string;

  @ApiProperty({
    example: 'Documento enviado com sucesso',
    description: 'Mensagem de resultado',
  })
  message: string;
}
