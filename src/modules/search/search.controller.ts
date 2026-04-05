import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SearchRequestDto } from './dtos/search-request.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('bff/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Busca de prestadores',
    description:
      'Retorna layout SDUI dos filtros + prestadores paginados. ' +
      'Cache Redis de 2min por combinação de parâmetros (hash sha256).',
  })
  search(@Query() query: SearchRequestDto) {
    return this.service.search(query);
  }
}
