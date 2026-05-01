import { ApiProperty } from '@nestjs/swagger';

export class FieldVerificationResponseDto {
  @ApiProperty({ example: true, description: 'Indica se o campo está disponível para cadastro' })
  available: boolean;

  @ApiProperty({ example: true, description: 'Indica se o formato do campo é válido' })
  valid: boolean;
}
