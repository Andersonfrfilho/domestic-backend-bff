import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerificationVerifyRequestDto {
  @ApiProperty({
    example: 'email',
    description: 'Tipo de verificação: email ou sms',
    enum: ['email', 'sms'],
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(email|sms)$/, { message: 'Tipo deve ser email ou sms' })
  type: 'email' | 'sms';

  @ApiProperty({
    example: 'user@example.com',
    description: 'E-mail ou telefone usado para receber o código',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({
    example: '123456',
    description: 'Código de verificação recebido',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
