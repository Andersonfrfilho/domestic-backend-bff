import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'E-mail do usuário',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Senha do usuário (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'João',
    description: 'Nome do usuário',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Silva',
    description: 'Sobrenome do usuário',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: '11999999999',
    description: 'Telefone com DDD (apenas números)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conter 10 ou 11 dígitos' })
  phone: string;

  @ApiProperty({
    example: '12345678900',
    description: 'CPF (apenas números)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf?: string;

  @ApiProperty({
    example: '12345678000195',
    description: 'CNPJ (apenas números) — quando informado, cria empresa automaticamente',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter 14 dígitos' })
  cnpj?: string;

  @ApiProperty({
    example: 'Empresa LTDA',
    description: 'Razão Social (obrigatório quando CNPJ é informado)',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    example: 'Empresa',
    description: 'Nome Fantasia',
    required: false,
  })
  @IsString()
  @IsOptional()
  tradeName?: string;
}
