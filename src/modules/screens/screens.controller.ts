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

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';
import { ScreenComponent } from '@modules/shared/screen/schemas/screen-config.schema';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';

@ApiTags('Screens')
@Controller('screens')
export class ScreensController {
  constructor(
    @Inject(SCREEN_CONFIG_SERVICE)
    private readonly screenConfig: ScreenConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as configurações de tela' })
  @ApiOkResponse({
    description: 'Lista completa de configurações de tela',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          screenId: { type: 'string', example: 'home' },
          version: { type: 'string', example: '1.0' },
          isActive: { type: 'boolean', example: true },
          components: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses()
  listAll() {
    return this.screenConfig.listAll();
  }

  @Get(':screenId')
  @ApiOperation({ summary: 'Configuração ativa de uma tela' })
  @ApiParam({ name: 'screenId', example: 'home' })
  @ApiOkResponse({
    description: 'Configuração ativa da tela',
    schema: {
      type: 'object',
      properties: {
        screenId: { type: 'string', example: 'home' },
        version: { type: 'string', example: '1.1' },
        isActive: { type: 'boolean', example: true },
        components: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true, notFound: true })
  async getScreen(@Param('screenId') screenId: string) {
    const config = await this.screenConfig.getActiveScreen(screenId);
    if (!config) {
      throw new NotFoundException(`No active screen config found for screen '${screenId}'`);
    }
    return config;
  }

  @Put(':screenId')
  @ApiOperation({
    summary: 'Cria ou atualiza configuração de tela (SDUI)',
    description: 'Upsert da configuração. Os componentes definem o layout da tela no app.',
  })
  @ApiParam({ name: 'screenId', example: 'home' })
  @ApiBody({
    schema: {
      example: {
        version: '1.1',
        components: [
          {
            id: 'cats',
            type: 'category_list',
            data_source: 'categories',
            order: 0,
            config: { scroll: 'horizontal' },
            visible: true,
            action: null,
          },
          {
            id: 'featured',
            type: 'provider_grid',
            data_source: 'featured_providers',
            order: 1,
            config: { columns: 2 },
            visible: true,
            action: { type: 'navigate', route: '/providers/{id}' },
          },
        ],
      },
    },
  })
  @ApiOkResponse({
    description: 'Configuração criada/atualizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        screenId: { type: 'string', example: 'home' },
        version: { type: 'string', example: '1.1' },
        isActive: { type: 'boolean', example: true },
        components: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true })
  upsertScreen(
    @Param('screenId') screenId: string,
    @Body() body: { version: string; components: ScreenComponent[] },
  ) {
    return this.screenConfig.upsert({
      screenId,
      version: body.version,
      components: body.components,
    });
  }

  @Delete(':screenId')
  @ApiOperation({ summary: 'Desativa configuração de tela (não deleta)' })
  @ApiParam({ name: 'screenId', example: 'home' })
  @ApiOkResponse({
    description: 'Configuração de tela desativada',
    schema: {
      type: 'object',
      properties: {
        screenId: { type: 'string', example: 'home' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true })
  async deactivateScreen(@Param('screenId') screenId: string) {
    await this.screenConfig.deactivate(screenId);
    return { screenId, isActive: false };
  }
}
