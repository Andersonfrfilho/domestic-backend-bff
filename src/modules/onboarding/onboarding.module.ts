import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { AuthModule } from '@modules/auth/auth.module';

import { CepService } from './cep.service';
import { DocumentService } from './document.service';
import { FieldVerificationService } from './field-verification.service';
import { GeocodingService } from '@modules/auth/geocoding.service';
import { OnboardingController } from './onboarding.controller';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

@Module({
  imports: [ConfigModule, ApiClientModule, AuthModule],
  controllers: [OnboardingController],
  providers: [
    RegistrationService,
    VerificationService,
    DocumentService,
    CepService,
    GeocodingService,
    ApiClientService,
    FieldVerificationService,
  ],
  exports: [RegistrationService, VerificationService, DocumentService, CepService],
})
export class OnboardingModule {}
