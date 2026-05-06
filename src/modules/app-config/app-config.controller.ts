import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import { AppConfigService } from './app-config.service';
import { APP_CONFIG_SERVICE } from './app-config.token';

@ApiTags('App Config')
@Controller('app-config')
export class AppConfigController {
  constructor(@Inject(APP_CONFIG_SERVICE) private readonly service: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Configuração global do app',
    description:
      'Buscado uma vez no startup do app e cacheado localmente pelo cliente. ' +
      'Contém: configuração de navegação (tab bar), feature flags e versão mínima. ' +
      'Cache Redis de 5min.',
  })
  @ApiOkResponse({
    description: 'Configuração global do app',
    schema: {
      type: 'object',
      required: ['navigation', 'features', 'version'],
      properties: {
        navigation: {
          type: 'object',
          required: ['tabBar', 'header'],
          properties: {
            tabBar: {
              type: 'object',
              properties: {
                visible: { type: 'boolean', example: true },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'home' },
                      label: { type: 'string', example: 'Início' },
                      icon: { type: 'string', example: 'home' },
                      route: { type: 'string', example: '/home' },
                      visible: { type: 'boolean', example: true },
                      badge: { type: 'number', nullable: true, example: null },
                    },
                  },
                },
              },
            },
            header: {
              type: 'object',
              properties: {
                title: { type: 'string', nullable: true, example: null },
                showBack: { type: 'boolean', example: false },
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'filter' },
                      icon: { type: 'string', example: 'filter' },
                      action: { type: 'string', example: 'open_filters' },
                    },
                  },
                },
              },
            },
          },
        },
        features: {
          type: 'object',
          properties: {
            chatEnabled: { type: 'boolean', example: true },
            notificationsEnabled: { type: 'boolean', example: true },
            reviewsEnabled: { type: 'boolean', example: true },
            providerSearchEnabled: { type: 'boolean', example: true },
          },
        },
        version: {
          type: 'object',
          properties: {
            minRequired: { type: 'string', example: '1.0.0' },
            latest: { type: 'string', example: '1.2.0' },
            forceUpdate: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses()
  getAppConfig() {
    return this.service.getAppConfig();
  }
}
