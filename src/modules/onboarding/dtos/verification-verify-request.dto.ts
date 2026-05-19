import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

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

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID do usuário no Keycloak — obrigatório apenas em fluxos sem autenticação (pós-cadastro)',
  })
  @IsOptional()
  @IsString()
  keycloakId?: string;
}
