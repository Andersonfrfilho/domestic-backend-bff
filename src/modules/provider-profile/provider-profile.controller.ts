import { Controller, Get, Headers, Inject, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import { ProviderProfileService } from './provider-profile.service';
import { PROVIDER_PROFILE_SERVICE } from './provider-profile.token';

@ApiTags('Provider Profile')
@Controller('providers')
export class ProviderProfileController {
  constructor(
    @Inject(PROVIDER_PROFILE_SERVICE)
    private readonly service: ProviderProfileService,
  ) {}

  @Get(':id/profile')
  @ApiOperation({
    summary: 'Perfil completo do prestador',
    description:
      'Agrega dados do prestador + últimas 5 avaliações em paralelo. Cache Redis de 3min.',
  })
  @ApiParam({ name: 'id', description: 'UUID do prestador' })
  @ApiOkResponse({
    description: 'Perfil agregado do prestador',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        businessName: { type: 'string', example: 'Clean Pro' },
        description: { type: 'string', nullable: true },
        averageRating: { type: 'number', example: 4.8 },
        reviewCount: { type: 'number', example: 321 },
        isAvailable: { type: 'boolean', example: true },
        verificationStatus: { type: 'string', example: 'VERIFIED' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              priceBase: { type: 'number' },
              priceType: { type: 'string' },
            },
          },
        },
        workLocations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
              isPrimary: { type: 'boolean' },
            },
          },
        },
        recentReviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rating: { type: 'number' },
              comment: { type: 'string', nullable: true },
              contractorName: { type: 'string' },
              serviceName: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ notFound: true })
  getProfile(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    return this.service.getProfile({ providerId: id, headers });
  }
}
