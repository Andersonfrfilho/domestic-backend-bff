import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { EnvironmentProvider } from '@config/providers/environment.provider';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';
import { VerificationServiceInterface } from './interfaces/verification-service.interface';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';

@Injectable()
export class VerificationService implements VerificationServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly env: EnvironmentProvider,
  ) {}

  async sendCode(dto: VerificationSendRequestDto): Promise<VerificationResponseDto> {
    try {
      if (dto.type === 'email') {
        await this.sendEmailCode(dto.destination);
      } else {
        await this.sendSmsCode(dto.destination);
      }

      this.logProvider.info({
        message: `Verification code sent via ${dto.type} to ${dto.destination}`,
        context: 'VerificationService.sendCode',
      });

      return {
        success: true,
        message: 'Código de verificação enviado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to send verification code: ${error.message}`,
        context: 'VerificationService.sendCode',
      });
      throw AppErrorFactory.businessLogic({ message: 'Falha ao enviar código de verificação', code: 'VERIFICATION_SEND_FAILED' });
    }
  }

  async verifyCode(dto: VerificationVerifyRequestDto): Promise<VerificationResponseDto> {
    try {
      const verified = await this.verifyCodeWithApi(dto);

      return {
        success: verified,
        verified,
        message: verified ? 'Código verificado com sucesso' : 'Código inválido ou expirado',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to verify code: ${error.message}`,
        context: 'VerificationService.verifyCode',
      });
      throw AppErrorFactory.businessLogic({ message: 'Falha ao verificar código', code: 'VERIFICATION_VERIFY_FAILED' });
    }
  }

  private async sendEmailCode(email: string): Promise<void> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/onboarding/verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: email, type: 'email' }),
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: `Failed to send email code: ${response.status}` });
    }
  }

  private async sendSmsCode(phone: string): Promise<void> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/onboarding/verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: phone, type: 'sms' }),
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: `Failed to send SMS code: ${response.status}` });
    }
  }

  private async verifyCodeWithApi(dto: VerificationVerifyRequestDto): Promise<boolean> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/onboarding/verification/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: dto.destination,
        type: dto.type,
        code: dto.code,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await safeJsonParse<{ verified: boolean }>(response);
    return data?.verified ?? false;
  }
}
