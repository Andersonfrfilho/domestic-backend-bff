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
    if (this.env.isDevelopment() || this.env.isTest()) {
      const code = this.generateQaCode(dto);
      this.logProvider.info({
        message: `[QA MODE] Verification code generated: ${code}`,
        context: 'VerificationService.sendCode',
        params: { type: dto.type, destination: dto.destination },
      });

      return {
        success: true,
        message: `Código de verificação gerado (QA Mode): ${code}`,
      };
    }

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
    if (this.env.isDevelopment() || this.env.isTest()) {
      const expectedCode = this.generateQaCode({
        type: dto.type,
        destination: dto.destination,
      });

      const verified = dto.code === expectedCode;

      this.logProvider.info({
        message: '[QA MODE] Verification result',
        context: 'VerificationService.verifyCode',
        params: {
          type: dto.type,
          destination: dto.destination,
          code: dto.code,
          expectedCode,
          verified,
        },
      });

      return {
        success: verified,
        verified,
        message: verified ? 'Código verificado com sucesso' : 'Código inválido',
      };
    }

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

  private generateQaCode(dto: VerificationSendRequestDto): string {
    if (dto.type === 'email') {
      return '0000';
    }

    const lastFourDigits = dto.destination.slice(-4);
    return lastFourDigits.padStart(4, '0');
  }

  private async sendEmailCode(email: string): Promise<void> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: email, type: 'email' }),
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: `Failed to send email code: ${response.status}` });
    }
  }

  private async sendSmsCode(phone: string): Promise<void> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: phone, type: 'phone' }),
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: `Failed to send SMS code: ${response.status}` });
    }
  }

  private async verifyCodeWithApi(dto: VerificationVerifyRequestDto): Promise<boolean> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/verification/verify`, {
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
