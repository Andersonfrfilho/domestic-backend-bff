import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

@ApiTags('Reviews')
@ApiSecurity('kong-user-id')
@Controller('reviews')
export class ReviewController {
  constructor(@Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService) {}

  @Post()
  @ApiOperation({ summary: 'Criar avaliação de prestador (proxy → API)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['serviceRequestId', 'rating'],
      properties: {
        serviceRequestId: { type: 'string', format: 'uuid' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Avaliação criada',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiAlternativeErrorResponses({ badRequest: true, unauthorized: true, conflict: true })
  @TraceMethod()
  create(@Body() body: unknown, @Headers() headers: Record<string, string>) {
    return this.api.post({ path: '/v1/reviews', body, headers });
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Listar avaliações de um prestador (proxy → API)' })
  @ApiParam({ name: 'providerId', type: 'string' })
  @ApiOkResponse({
    description: 'Lista de avaliações',
    schema: { type: 'array', items: { type: 'object', additionalProperties: true } },
  })
  @ApiAlternativeErrorResponses({ notFound: true })
  @TraceMethod()
  listByProvider(
    @Param('providerId') providerId: string,
    @Headers() headers: Record<string, string>,
  ) {
    return this.api.get({ path: `/v1/reviews/provider/${providerId}`, headers });
  }
}
