import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { NavigationConfigService } from '@modules/shared/navigation/navigation-config.service';
import { NAVIGATION_CONFIG_SERVICE } from '@modules/shared/navigation/navigation-config.token';
import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';
import type { Navigation } from '@modules/shared/navigation/interfaces/navigation.interface';

const NAV_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    screenId: { type: 'string', example: 'default' },
    isActive: { type: 'boolean', example: true },
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
} as const;

@ApiTags('Navigation (Admin)')
@Controller('bff/navigation')
export class NavigationController {
  constructor(
    @Inject(NAVIGATION_CONFIG_SERVICE)
    private readonly service: NavigationConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as configurações de navegação' })
  @ApiOkResponse({
    description: 'Lista de configs de navegação no MongoDB',
    schema: { type: 'array', items: NAV_RESPONSE_SCHEMA },
  })
  @ApiAlternativeErrorResponses()
  listAll() {
    return this.service.listAll();
  }

  @Get(':screenId')
  @ApiOperation({ summary: 'Configuração de navegação ativa por tela' })
  @ApiParam({ name: 'screenId', example: 'default' })
  @ApiOkResponse({
    description: 'Configuração de navegação ativa (fallback para default se não existir)',
    schema: NAV_RESPONSE_SCHEMA,
  })
  @ApiAlternativeErrorResponses({ notFound: true })
  async getNavigation(@Param('screenId') screenId: string) {
    const config = await this.service.findOne(screenId);
    if (!config) {
      throw new NotFoundException(`No navigation config found for screen '${screenId}'`);
    }
    return config;
  }

  @Put(':screenId')
  @ApiOperation({
    summary: 'Cria ou atualiza configuração de navegação',
    description:
      'Upsert da config de navegação. Invalida cache Redis automaticamente. ' +
      'Use screenId "default" para a navegação global do app.',
  })
  @ApiParam({ name: 'screenId', example: 'default' })
  @ApiBody({
    schema: {
      example: {
        tabBar: {
          visible: true,
          items: [
            { id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true },
            { id: 'search', label: 'Buscar', icon: 'search', route: '/search', visible: true },
            { id: 'dashboard', label: 'Pedidos', icon: 'list', route: '/dashboard', visible: true },
            { id: 'chat', label: 'Chat', icon: 'chat', route: '/chat', visible: true },
            {
              id: 'notifications',
              label: 'Avisos',
              icon: 'bell',
              route: '/notifications',
              visible: true,
            },
          ],
        },
        header: { title: null, showBack: false, actions: [] },
      },
    },
  })
  @ApiOkResponse({ description: 'Configuração criada/atualizada', schema: NAV_RESPONSE_SCHEMA })
  @ApiAlternativeErrorResponses({ badRequest: true })
  upsertNavigation(@Param('screenId') screenId: string, @Body() body: Navigation) {
    return this.service.upsert({ screenId, navigation: body });
  }

  @Delete(':screenId')
  @ApiOperation({ summary: 'Desativa configuração de navegação (não deleta)' })
  @ApiParam({ name: 'screenId', example: 'default' })
  @ApiOkResponse({
    description: 'Configuração desativada',
    schema: {
      type: 'object',
      properties: {
        screenId: { type: 'string', example: 'default' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true })
  async deactivateNavigation(@Param('screenId') screenId: string) {
    await this.service.deactivate(screenId);
    return { screenId, isActive: false };
  }
}
