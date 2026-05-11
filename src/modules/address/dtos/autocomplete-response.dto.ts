import { ApiProperty } from '@nestjs/swagger';

export class AddressSuggestionDto {
  @ApiProperty({ example: 'Rua Augusta, 1500, Consolação, São Paulo, SP, 01304-001' })
  fullAddress: string;

  @ApiProperty({ example: 'Rua Augusta' })
  street: string;

  @ApiProperty({ example: '1500' })
  number: string;

  @ApiProperty({ example: 'Consolação' })
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  city: string;

  @ApiProperty({ example: 'SP' })
  state: string;

  @ApiProperty({ example: '01304-001' })
  postcode: string;

  @ApiProperty({ example: -23.5558 })
  lat: number;

  @ApiProperty({ example: -46.6558 })
  lng: number;
}

export class AutocompleteResponseDto {
  @ApiProperty({ type: [AddressSuggestionDto] })
  suggestions: AddressSuggestionDto[];
}
