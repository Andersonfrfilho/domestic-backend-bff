import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ScreenConfig, ScreenConfigSchema } from './schemas/screen-config.schema';
import { ScreenConfigService } from './screen-config.service';
import { SCREEN_CONFIG_SERVICE } from './screen-config.token';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScreenConfig.name, schema: ScreenConfigSchema },
    ]),
  ],
  providers: [
    {
      provide: SCREEN_CONFIG_SERVICE,
      useClass: ScreenConfigService,
    },
  ],
  exports: [SCREEN_CONFIG_SERVICE],
})
export class ScreenConfigModule {}
