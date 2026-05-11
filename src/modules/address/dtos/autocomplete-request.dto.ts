import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AutocompleteRequestDto {
  @ApiProperty({
    example: 'Rua Augusta, São Paulo',
    description: 'Texto de busca (mínimo 3 caracteres)',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  q: string;
}
