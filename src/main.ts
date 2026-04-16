import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule } from '@nestjs/swagger';
import { register as tsConfigPathsRegister } from 'tsconfig-paths';

import { swaggerCustomOptions } from '@config/swagger-custom.config';
import { swaggerConfig } from '@config/swagger.config';
import { AppErrorFactory } from '@modules/error';
import { docsFactory } from '@modules/shared/docs/docs.factory';
import { CamelCaseResponseInterceptor } from '@modules/shared/interceptors/camel-case-response.interceptor';

import * as tsConfig from '../tsconfig.json';

import { AppModule } from './app.module';
import { EnvironmentProviderInterface } from './config';
import { ENVIRONMENT_SERVICE_PROVIDER } from './config/config.token';

const compilerOptions = tsConfig.compilerOptions;
tsConfigPathsRegister({
  baseUrl: compilerOptions.baseUrl,
  paths: compilerOptions.paths,
});

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Socket.io adapter para WebSocket (usa Redis Pub/Sub multi-instance)
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: false,
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => AppErrorFactory.fromValidationErrors(errors),
    }),
  );

  app.useGlobalInterceptors(new CamelCaseResponseInterceptor());

  const environment = app.get<EnvironmentProviderInterface>(ENVIRONMENT_SERVICE_PROVIDER);
  const document = SwaggerModule.createDocument(app, swaggerConfig(environment));
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions(environment));
  docsFactory({ app, document });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
