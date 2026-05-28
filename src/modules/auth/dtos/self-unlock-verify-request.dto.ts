import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class SelfUnlockVerifyRequestDto {
  @ApiProperty({
    example: '1234',
    description: 'Código de verificação de 4 dígitos',
  })
  @IsString()
  @Length(4, 6)
  @IsNotEmpty()
  code: string;
}
