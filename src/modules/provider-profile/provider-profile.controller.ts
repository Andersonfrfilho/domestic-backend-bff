import { Controller, Get, Headers, Inject, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ProviderProfileService } from './provider-profile.service';
import { PROVIDER_PROFILE_SERVICE } from './provider-profile.token';

@ApiTags('Provider Profile')
@Controller('bff/providers')
export class ProviderProfileController {
  constructor(
    @Inject(PROVIDER_PROFILE_SERVICE)
    private readonly service: ProviderProfileService,
  ) {}

  @Get(':id/profile')
  @ApiOperation({
    summary: 'Perfil completo do prestador',
    description: 'Agrega dados do prestador + últimas 5 avaliações em paralelo. Cache Redis de 3min.',
  })
  @ApiParam({ name: 'id', description: 'UUID do prestador' })
  getProfile(
    @Param('id') id: string,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.getProfile(id, headers);
  }
}
