import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddressRequestDto {
  @ApiProperty({ description: 'ID do usuário no Keycloak' })
  @IsString()
  @IsNotEmpty()
  keycloakId: string;

  @ApiProperty({ description: 'CEP' })
  @IsString()
  @IsNotEmpty()
  cep: string;

  @ApiProperty({ description: 'Logradouro' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Número' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({ description: 'Complemento', required: false })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty({ description: 'Bairro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ description: 'Cidade' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Estado (UF)' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Latitude', required: false })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiProperty({ description: 'Longitude', required: false })
  @IsString()
  @IsOptional()
  longitude?: string;
}