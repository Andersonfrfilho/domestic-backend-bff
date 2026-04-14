import { Global, Module } from '@nestjs/common';

import { ApiClientService } from './api-client.service';
import { API_CLIENT_SERVICE } from './api-client.token';

@Global()
@Module({
  providers: [
    {
      provide: API_CLIENT_SERVICE,
      useClass: ApiClientService,
    },
  ],
  exports: [API_CLIENT_SERVICE],
})
export class ApiClientModule {}
