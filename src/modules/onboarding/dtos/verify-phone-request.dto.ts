import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class VerifyPhoneRequestDto {
  @ApiProperty({ example: '11999999999', description: 'Telefone a ser verificado (apenas dígitos)' })
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conter 10 ou 11 dígitos' })
  phone: string;
}
