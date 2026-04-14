import { Module } from '@nestjs/common';

import { ScreenConfigModule } from '@modules/shared/screen/screen-config.module';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DASHBOARD_SERVICE } from './dashboard.token';

@Module({
  imports: [ScreenConfigModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: DASHBOARD_SERVICE,
      useClass: DashboardService,
    },
  ],
  exports: [DASHBOARD_SERVICE],
})
export class DashboardModule {}
