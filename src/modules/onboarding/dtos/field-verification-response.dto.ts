import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldVerificationResponseDto {
  @ApiProperty({ example: true, description: 'Indica se o campo está disponível para cadastro' })
  available: boolean;

  @ApiProperty({ example: true, description: 'Indica se o formato do campo é válido' })
  valid: boolean;

  @ApiProperty({ example: 'email', description: 'Nome do campo verificado' })
  field: string;

  @ApiPropertyOptional({ example: 'E-mail já está em uso', description: 'Mensagem de erro (apenas quando disponível=false ou valid=false)' })
  message?: string;

  @ApiPropertyOptional({ example: 'EMAIL_ALREADY_EXISTS', description: 'Código do erro' })
  error?: string;
}
