import { LoggerModule, RequestContextMiddleware } from '@adatechnology/logger';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { register as tsConfigPathsRegister } from 'tsconfig-paths';

import { ConfigModule } from '@config/config.module';
import { HealthModule } from '@modules/health/health.module';

import { ApiClientModule } from './modules/shared/api-client/api-client.module';
import { BffCacheModule } from './modules/shared/cache/bff-cache.module';
import { BffMongoModule } from './modules/shared/mongo/mongo.module';
import { ScreenConfigModule } from './modules/shared/screen/screen-config.module';

import { HomeModule } from './modules/home/home.module';
import { SearchModule } from './modules/search/search.module';
import { ProviderProfileModule } from './modules/provider-profile/provider-profile.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChatModule } from './modules/chat/chat.module';
import { ErrorModule } from './modules/error/error.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ScreensModule } from './modules/screens/screens.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { NavigationModule } from './modules/navigation/navigation.module';

import * as tsConfig from '../tsconfig.json';

const compilerOptions = tsConfig.compilerOptions;
tsConfigPathsRegister({
  baseUrl: compilerOptions.baseUrl,
  paths: compilerOptions.paths,
});

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({ level: process.env.LOG_LEVEL || 'info' }),
    // Infraestrutura BFF
    BffMongoModule,
    BffCacheModule,
    ApiClientModule,
    ScreenConfigModule,
    // Módulos de domínio
    ErrorModule,
    HealthModule,
    HomeModule,
    SearchModule,
    ProviderProfileModule,
    DashboardModule,
    ChatModule,
    NotificationModule,
    ScreensModule,
    AppConfigModule,
    NavigationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
