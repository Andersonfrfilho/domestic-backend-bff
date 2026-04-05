import { Module } from '@nestjs/common';

import { ScreenConfigModule } from '@modules/shared/screen/screen-config.module';

import { ScreensController } from './screens.controller';

@Module({
  imports: [ScreenConfigModule],
  controllers: [ScreensController],
})
export class ScreensModule {}
