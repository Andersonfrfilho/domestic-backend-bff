import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { EnvironmentProvider } from '@config/providers/environment.provider';

import { CepService } from './cep.service';
import { DocumentService } from './document.service';
import { OnboardingController } from './onboarding.controller';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

@Module({
  imports: [ConfigModule, ApiClientModule],
  controllers: [OnboardingController],
  providers: [
    RegistrationService,
    VerificationService,
    DocumentService,
    CepService,
    EnvironmentProvider,
    ApiClientService,
  ],
  exports: [RegistrationService, VerificationService, DocumentService, CepService],
})
export class OnboardingModule {}
