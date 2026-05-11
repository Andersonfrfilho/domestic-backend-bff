import { BadRequestException, Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AddressService } from './address.service';
import { AutocompleteResponseDto } from './dtos/autocomplete-response.dto';

@ApiTags('Address')
@Controller('bff/address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('autocomplete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autocomplete de endereço',
    description: 'Busca sugestões de endereço por texto livre. Mínimo 3 caracteres. Cache Redis de 7 dias.',
  })
  @ApiQuery({ name: 'q', description: 'Texto de busca (mínimo 3 caracteres)', example: 'Rua Augusta, São Paulo' })
  @ApiResponse({ status: 200, description: 'Sugestões de endereço.', type: AutocompleteResponseDto })
  @ApiResponse({ status: 400, description: 'Query muito curta (mínimo 3 caracteres).' })
  async autocomplete(@Query('q') query: string): Promise<AutocompleteResponseDto> {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Query deve ter no mínimo 3 caracteres');
    }
    const suggestions = await this.addressService.autocomplete(query.trim());
    return { suggestions };
  }
}
