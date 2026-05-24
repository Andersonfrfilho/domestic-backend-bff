import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { Injectable, Inject } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AuthService } from '@modules/auth/auth.service';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import { VerificationResponseDto } from './dtos/verification-response.dto';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerificationServiceInterface } from './interfaces/verification-service.interface';

@Injectable()
export class VerificationService implements VerificationServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly api: ApiClientService,
    private readonly authService: AuthService,
  ) {}

  @TraceMethod()
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
      throw AppErrorFactory.businessLogic({
        message: 'Falha ao enviar código de verificação',
        code: 'VERIFICATION_SEND_FAILED',
      });
    }
  }

  async verifyCode(
    dto: VerificationVerifyRequestDto,
    authorization?: string,
  ): Promise<VerificationResponseDto> {
    try {
      const verified = await this.verifyCodeWithApi(dto);

      if (verified) {
        const keycloakId = this.extractKeycloakIdFromToken(authorization) ?? dto.keycloakId;
        if (keycloakId) {
          const attributeType = dto.type === 'sms' ? 'phone' : 'email';
          await this.authService.updateVerificationAttribute(keycloakId, attributeType);
        } else {
          this.logProvider.warn({
            message: `Verification succeeded but keycloakId not available — Keycloak attribute not updated. type=${dto.type}`,
            context: `${this.constructor.name}.verifyCode`,
          });
        }
      }

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
      throw AppErrorFactory.businessLogic({
        message: 'Falha ao verificar código',
        code: 'VERIFICATION_VERIFY_FAILED',
      });
    }
  }

  private extractKeycloakIdFromToken(authorization?: string): string | null {
    if (!authorization) return null;
    try {
      const token = authorization.split(' ')[1];
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      return (payload?.sub as string) ?? null;
    } catch {
      return null;
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
