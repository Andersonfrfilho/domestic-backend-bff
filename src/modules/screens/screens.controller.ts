import { Body, Controller, Delete, Get, Inject, Param, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import { ScreenComponent } from '@modules/shared/screen/schemas/screen-config.schema';

@ApiTags('Screens')
@Controller('bff/screens')
export class ScreensController {
  constructor(
    @Inject(SCREEN_CONFIG_SERVICE)
    private readonly screenConfig: ScreenConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as configurações de tela' })
  listAll() {
    return this.screenConfig.listAll();
  }

  @Get(':screenId')
  @ApiOperation({ summary: 'Configuração ativa de uma tela' })
  @ApiParam({ name: 'screenId', example: 'home' })
  getScreen(@Param('screenId') screenId: string) {
    return this.screenConfig.getActiveScreen(screenId);
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
          { id: 'cats', type: 'category_list', data_source: 'categories', order: 0, config: { scroll: 'horizontal' }, visible: true },
          { id: 'featured', type: 'provider_grid', data_source: 'featured_providers', order: 1, config: { columns: 2 }, visible: true },
        ],
      },
    },
  })
  upsertScreen(
    @Param('screenId') screenId: string,
    @Body() body: { version: string; components: ScreenComponent[] },
  ) {
    return this.screenConfig.upsert(screenId, body.version, body.components);
  }

  @Delete(':screenId')
  @ApiOperation({ summary: 'Desativa configuração de tela (não deleta)' })
  @ApiParam({ name: 'screenId', example: 'home' })
  async deactivateScreen(@Param('screenId') screenId: string) {
    await this.screenConfig.deactivate(screenId);
    return { screen_id: screenId, is_active: false };
  }
}
