import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class VerifyDocumentRequestDto {
  @ApiProperty({ example: '12345678909', description: 'CPF, CNPJ ou outro documento a ser verificado' })
  @IsNotEmpty({ message: 'Documento é obrigatório' })
  @Matches(/^[a-zA-Z0-9]{8,20}$/, { message: 'Documento deve conter entre 8 e 20 caracteres alfanuméricos' })
  document: string;
}
