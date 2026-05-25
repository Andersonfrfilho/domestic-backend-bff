import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AuthService } from '@modules/auth/auth.service';
import type { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import type { OnboardingStep } from './dtos/onboarding-status-response.dto';
import { OnboardingStatusResponseDto } from './dtos/onboarding-status-response.dto';

type ApiOnboardingStatus = {
  hasAddress: boolean;
  hasDocument: boolean;
};

@Injectable()
export class OnboardingStatusService {
  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
    private readonly authService: AuthService,
  ) {}

  @TraceMethod()
  async getStatus(keycloakId: string, accessToken: string): Promise<OnboardingStatusResponseDto> {
    this.logProvider.info({
      message: `Getting onboarding status for user: ${keycloakId}`,
      context: 'OnboardingStatusService.getStatus',
    });

    const [apiStatus, verificationStatus] = await Promise.all([
      this.api.get<ApiOnboardingStatus>({
        path: '/v1/users/me/onboarding-status',
        headers: { 'X-Access-Token': accessToken },
      }),
      this.authService.getVerificationStatus(keycloakId),
    ]);

    const { hasAddress, hasDocument } = apiStatus;
    const { emailVerified, phoneVerified } = verificationStatus;

    const step = this.resolveStep({ hasAddress, emailVerified, phoneVerified, hasDocument });

    this.logProvider.info({
      message: `Onboarding status resolved: step=${step}`,
      context: 'OnboardingStatusService.getStatus',
      meta: { keycloakId, hasAddress, emailVerified, phoneVerified, hasDocument, step },
    });

    return { step, hasAddress, emailVerified, phoneVerified, hasDocument };
  }

  private resolveStep(flags: {
    hasAddress: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    hasDocument: boolean;
  }): OnboardingStep {
    const { hasAddress, emailVerified, phoneVerified, hasDocument } = flags;

    if (!hasAddress) return 'address';
    if (!emailVerified || !phoneVerified) return 'verification';
    if (!hasDocument) return 'document';
    return 'complete';
  }
}
