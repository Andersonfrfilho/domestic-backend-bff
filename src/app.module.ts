import {
  HTTP_LOGGING_INTERCEPTOR,
  LoggerModule,
  RequestContextMiddleware,
} from '@adatechnology/logger';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { register as tsConfigPathsRegister } from 'tsconfig-paths';

import { ConfigModule } from '@config/config.module';
import { HealthModule } from '@modules/health/health.module';

import * as tsConfig from '../tsconfig.json';

import { AppConfigModule } from './modules/app-config/app-config.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ErrorModule } from './modules/error/error.module';
import { HomeModule } from './modules/home/home.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProviderProfileModule } from './modules/provider-profile/provider-profile.module';
import { ScreensModule } from './modules/screens/screens.module';
import { SearchModule } from './modules/search/search.module';
import { ApiClientModule } from './modules/shared/api-client/api-client.module';
import { BffCacheModule } from './modules/shared/cache/bff-cache.module';
import { BffMongoModule } from './modules/shared/mongo/mongo.module';
import { ScreenConfigModule } from './modules/shared/screen/screen-config.module';

const compilerOptions = tsConfig.compilerOptions;
tsConfigPathsRegister({
  baseUrl: compilerOptions.baseUrl,
  paths: compilerOptions.paths,
});

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useExisting: HTTP_LOGGING_INTERCEPTOR,
    },
  ],
  imports: [
    MetricsModule,
    ConfigModule,
    LoggerModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      interceptorExcludedPaths: ['/health', '/metrics'],
    }),
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
    AuthModule,
    OnboardingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
