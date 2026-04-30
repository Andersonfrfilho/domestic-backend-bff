import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { DocumentService } from './document.service';
import { CepService } from './cep.service';
import { GeocodingService } from './geocoding.service';
import { EnvironmentProvider } from '@config/providers/environment.provider';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { REGISTRATION_SERVICE, VERIFICATION_SERVICE, DOCUMENT_SERVICE, CEP_SERVICE } from './auth.token';
import { RegistrationServiceInterface } from './interfaces/registration-service.interface';
import { VerificationServiceInterface } from './interfaces/verification-service.interface';
import { DocumentServiceInterface } from './interfaces/document-service.interface';
import { CepServiceInterface } from './interfaces/cep-service.interface';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EnvironmentProvider,
    GeocodingService,
    ApiClientService,
    RegistrationService,
    VerificationService,
    DocumentService,
    CepService,
    {
      provide: REGISTRATION_SERVICE,
      useClass: RegistrationService,
    },
    {
      provide: VERIFICATION_SERVICE,
      useClass: VerificationService,
    },
    {
      provide: DOCUMENT_SERVICE,
      useClass: DocumentService,
    },
    {
      provide: CEP_SERVICE,
      useClass: CepService,
    },
  ],
  exports: [
    AuthService,
    REGISTRATION_SERVICE,
    VERIFICATION_SERVICE,
    DOCUMENT_SERVICE,
    CEP_SERVICE,
  ],
})
export class AuthModule {}
