import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'E-mail do usuário para recuperação de senha',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
