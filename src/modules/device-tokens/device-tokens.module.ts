import { Module } from '@nestjs/common';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

import { DeviceTokensController } from './device-tokens.controller';

@Module({
  imports: [ApiClientModule],
  controllers: [DeviceTokensController],
})
export class DeviceTokensModule {}
