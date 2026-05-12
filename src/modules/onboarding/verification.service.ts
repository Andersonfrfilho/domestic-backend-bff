import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { VerificationServiceInterface } from './interfaces/verification-service.interface';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';

@Injectable()
export class VerificationService implements VerificationServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly api: ApiClientService,
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
        context: `${this.constructor.name}.sendCode`,
      });

      return {
        success: true,
        message: 'Código de verificação enviado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to send verification code: ${error.message}`,
        context: `${this.constructor.name}.sendCode`,
      });

      if (error instanceof AppError) throw error;
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
        context: `${this.constructor.name}.verifyCode`,
      });

      if (error instanceof AppError) throw error;
      throw AppErrorFactory.businessLogic({ message: 'Falha ao verificar código', code: 'VERIFICATION_VERIFY_FAILED' });
    }
  }

  private async sendEmailCode(email: string): Promise<void> {
    await this.api.post({
      path: '/v1/onboarding/verification/send',
      body: { destination: email, type: 'email' },
    });
  }

  private async sendSmsCode(phone: string): Promise<void> {
    await this.api.post({
      path: '/v1/onboarding/verification/send',
      body: { destination: phone, type: 'sms' },
    });
  }

  private async verifyCodeWithApi(dto: VerificationVerifyRequestDto): Promise<boolean> {
    try {
      const result = await this.api.post<{ verified: boolean }>({
        path: '/v1/onboarding/verification/verify',
        body: {
          destination: dto.destination,
          type: dto.type,
          code: dto.code,
        },
      });
      return result?.verified ?? false;
    } catch {
      return false;
    }
  }
}
