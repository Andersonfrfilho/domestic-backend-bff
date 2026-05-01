import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class VerifyDocumentRequestDto {
  @ApiProperty({ example: '12345678909', description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) a ser verificado' })
  @IsNotEmpty({ message: 'Documento é obrigatório' })
  @Matches(/^\d{11,14}$/, { message: 'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' })
  document: string;
}
