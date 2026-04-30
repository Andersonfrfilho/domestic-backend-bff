import { ApiProperty } from '@nestjs/swagger';

export class CepResponseDto {
  @ApiProperty({
    example: '01001-000',
    description: 'CEP consultado',
  })
  cep: string;

  @ApiProperty({
    example: 'Praça da Sé',
    description: 'Logradouro',
  })
  street: string;

  @ApiProperty({
    example: 'Sé',
    description: 'Bairro',
  })
  neighborhood: string;

  @ApiProperty({
    example: 'São Paulo',
    description: 'Cidade',
  })
  city: string;

  @ApiProperty({
    example: 'SP',
    description: 'Estado (UF)',
  })
  state: string;

  @ApiProperty({
    example: -23.5505,
    description: 'Latitude',
    required: false,
  })
  lat?: number;

  @ApiProperty({
    example: -46.6333,
    description: 'Longitude',
    required: false,
  })
  lng?: number;
}
