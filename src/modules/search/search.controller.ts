import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import { SearchRequestDto } from './dtos/search-request.dto';
import { SearchService } from './search.service';
import { SEARCH_SERVICE } from './search.token';

@ApiTags('Search')
@Controller('bff/search')
export class SearchController {
  constructor(@Inject(SEARCH_SERVICE) private readonly service: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Busca de prestadores',
    description:
      'Retorna layout SDUI dos filtros + prestadores paginados. ' +
      'Cache Redis de 2min por combinação de parâmetros (hash sha256).',
  })
  @ApiOkResponse({
    description: 'Resultado da busca com layout, filtros, dados e paginação',
    schema: {
      type: 'object',
      required: ['layout', 'filters', 'data', 'meta', 'links'],
      properties: {
        layout: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'results' },
              type: { type: 'string', example: 'provider_list' },
              order: { type: 'number', example: 1 },
              config: { type: 'object', additionalProperties: true },
            },
          },
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'rating' },
              label: { type: 'string', example: 'Avaliação mínima' },
              type: { type: 'string', example: 'range' },
              param: { type: 'string', example: 'rating_min' },
              options: {
                type: 'array',
                nullable: true,
                items: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                    label: { type: 'string' },
                  },
                },
              },
              config: { type: 'object', additionalProperties: true },
            },
          },
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              businessName: { type: 'string', example: 'João Elétrica' },
              averageRating: { type: 'number', example: 4.7 },
              reviewCount: { type: 'number', example: 88 },
              services: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Instalação de tomada' },
                    priceBase: { type: 'number', example: 120 },
                    priceType: { type: 'string', example: 'FIXED' },
                  },
                },
              },
              workLocations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    city: { type: 'string', example: 'São Paulo' },
                    state: { type: 'string', example: 'SP' },
                  },
                },
              },
              isAvailable: { type: 'boolean', example: true },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 145 },
            totalPages: { type: 'number', example: 8 },
          },
        },
        links: {
          type: 'object',
          properties: {
            first: {
              type: 'string',
              nullable: true,
              example: 'http://localhost:3001/bff/search?page=1&limit=20',
            },
            last: {
              type: 'string',
              nullable: true,
              example: 'http://localhost:3001/bff/search?page=8&limit=20',
            },
            next: {
              type: 'string',
              nullable: true,
              example: 'http://localhost:3001/bff/search?page=2&limit=20',
            },
            previous: { type: 'string', nullable: true, example: null },
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true })
  search(@Query() query: SearchRequestDto) {
    return this.service.search(query);
  }
}
