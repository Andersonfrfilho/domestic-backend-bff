import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiNoContentResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

@ApiTags('Device Tokens')
@ApiSecurity('kong-user-id')
@Controller('device-tokens')
export class DeviceTokensController {
  constructor(@Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registrar token FCM do dispositivo (proxy → API)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'platform'],
      properties: {
        token: { type: 'string', description: 'Token FCM do dispositivo' },
        platform: { type: 'string', enum: ['ios', 'android', 'unknown'] },
      },
    },
  })
  @ApiNoContentResponse()
  @ApiAlternativeErrorResponses({ badRequest: true, unauthorized: true })
  @TraceMethod()
  register(@Body() body: unknown, @Headers() headers: Record<string, string>) {
    return this.api.post({ path: '/v1/device-tokens', body, headers });
  }
}
