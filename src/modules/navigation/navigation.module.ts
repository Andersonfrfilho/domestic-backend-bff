import { Module } from '@nestjs/common';

import { NavigationConfigModule } from '@modules/shared/navigation/navigation-config.module';

import { NavigationController } from './navigation.controller';

@Module({
  imports: [NavigationConfigModule],
  controllers: [NavigationController],
})
export class NavigationModule {}
