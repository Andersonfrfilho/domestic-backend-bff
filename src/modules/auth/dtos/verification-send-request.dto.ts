import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerificationSendRequestDto {
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
    description: 'E-mail ou telefone para envio do código',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;
}
