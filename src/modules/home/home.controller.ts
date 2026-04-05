import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { HomeService } from './home.service';

@ApiTags('Home')
@Controller('bff/home')
export class HomeController {
  constructor(private readonly service: HomeService) {}

  @Get()
  @ApiOperation({
    summary: 'Tela inicial',
    description:
      'Retorna layout dinâmico (SDUI) + dados agregados para a tela inicial. ' +
      'O campo `layout` contém os componentes ordenados conforme configuração no MongoDB. ' +
      'Cache Redis de 5min.',
  })
  getHome() {
    return this.service.getHome();
  }
}
