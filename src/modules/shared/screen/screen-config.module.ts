import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ScreenConfig, ScreenConfigSchema } from './schemas/screen-config.schema';
import { ScreenConfigService } from './screen-config.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScreenConfig.name, schema: ScreenConfigSchema },
    ]),
  ],
  providers: [ScreenConfigService],
  exports: [ScreenConfigService],
})
export class ScreenConfigModule {}
