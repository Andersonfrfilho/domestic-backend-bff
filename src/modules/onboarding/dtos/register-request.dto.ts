import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

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

  @ApiProperty({ example: true, description: 'Aceite dos termos de uso' })
  @IsBoolean()
  @IsNotEmpty()
  termsAccepted: boolean;

  @ApiProperty({
    example: '14403772',
    description: 'CEP do endereço',
    required: false,
  })
  @IsString()
  @IsOptional()
  cep?: string;

  @ApiProperty({
    example: 'Rua Professora Ambrosina Veloso Ribeiro',
    description: 'Logradouro',
    required: false,
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({
    example: '6531',
    description: 'Número do endereço',
    required: false,
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({
    example: 'Casa',
    description: 'Complemento',
    required: false,
  })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty({
    example: 'Jardim Noêmia',
    description: 'Bairro',
    required: false,
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({
    example: 'Franca',
    description: 'Cidade',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'SP',
    description: 'Estado (UF)',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    example: '-20.5386',
    description: 'Latitude',
    required: false,
  })
  @IsString()
  @IsOptional()
  lat?: string;

  @ApiProperty({
    example: '-45.5343',
    description: 'Longitude',
    required: false,
  })
  @IsString()
  @IsOptional()
  lng?: string;
}
