import { Module } from '@nestjs/common';

import { ScreenConfigModule } from '@modules/shared/screen/screen-config.module';

import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { HOME_SERVICE } from './home.token';

@Module({
  imports: [ScreenConfigModule],
  controllers: [HomeController],
  providers: [
    {
      provide: HOME_SERVICE,
      useClass: HomeService,
    },
  ],
  exports: [HOME_SERVICE],
})
export class HomeModule {}
