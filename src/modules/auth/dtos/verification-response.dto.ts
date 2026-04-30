import { ApiProperty } from '@nestjs/swagger';

export class VerificationResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se a operação foi bem-sucedida',
  })
  success: boolean;

  @ApiProperty({
    example: 'Código de verificação enviado com sucesso',
    description: 'Mensagem de resultado da operação',
  })
  message: string;

  @ApiProperty({
    example: false,
    description: 'Indica se o código foi validado corretamente (apenas na verificação)',
    required: false,
  })
  verified?: boolean;
}
