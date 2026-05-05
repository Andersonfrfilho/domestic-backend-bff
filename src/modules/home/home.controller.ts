import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import { HomeService } from './home.service';
import { HOME_SERVICE } from './home.token';

@ApiTags('Home')
@Controller('/home')
export class HomeController {
  constructor(@Inject(HOME_SERVICE) private readonly service: HomeService) {}

  @Get()
  @ApiOperation({
    summary: 'Tela inicial',
    description:
      'Retorna layout dinâmico (SDUI) + dados agregados para a tela inicial. ' +
      'O campo `layout` contém os componentes ordenados conforme configuração no MongoDB. ' +
      'Cache Redis de 5min.',
  })
  @ApiOkResponse({
    description: 'Dados da home resolvidos com layout SDUI + listas agregadas',
    schema: {
      type: 'object',
      required: ['layout', 'featuredCategories', 'featuredProviders'],
      properties: {
        layout: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'type', 'order', 'config', 'data'],
            properties: {
              id: { type: 'string', example: 'categories' },
              type: { type: 'string', example: 'category_list' },
              order: { type: 'number', example: 0 },
              config: { type: 'object', additionalProperties: true },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
        featuredCategories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Limpeza' },
              slug: { type: 'string', example: 'limpeza' },
              iconUrl: { type: 'string', nullable: true, example: null },
            },
          },
        },
        featuredProviders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              businessName: { type: 'string', example: 'Maria Serviços' },
              averageRating: { type: 'number', example: 4.9 },
              reviewCount: { type: 'number', example: 122 },
              services: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Limpeza residencial' },
                    priceBase: { type: 'number', example: 150 },
                    priceType: { type: 'string', example: 'FIXED' },
                  },
                },
              },
              city: { type: 'string', example: 'São Paulo' },
              state: { type: 'string', example: 'SP' },
              isAvailable: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses()
  getHome() {
    return this.service.getHome();
  }
}
