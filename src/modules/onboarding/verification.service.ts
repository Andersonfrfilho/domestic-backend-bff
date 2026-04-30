import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { EnvironmentProvider } from '@config/providers/environment.provider';
import { VerificationServiceInterface } from './interfaces/verification-service.interface';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';

@Injectable()
export class VerificationService implements VerificationServiceInterface {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly env: EnvironmentProvider) {}

  async sendCode(dto: VerificationSendRequestDto): Promise<VerificationResponseDto> {
    if (this.env.isDevelopment() || this.env.isTest()) {
      const code = this.generateQaCode(dto);
      this.logger.log(`[QA MODE] Verification code generated: ${code}`, {
        type: dto.type,
        destination: dto.destination,
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

      this.logger.log(`Verification code sent via ${dto.type} to ${dto.destination}`);

      return {
        success: true,
        message: 'Código de verificação enviado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Failed to send verification code: ${error.message}`);
      throw new BadRequestException('Falha ao enviar código de verificação');
    }
  }

  async verifyCode(dto: VerificationVerifyRequestDto): Promise<VerificationResponseDto> {
    if (this.env.isDevelopment() || this.env.isTest()) {
      const expectedCode = this.generateQaCode({
        type: dto.type,
        destination: dto.destination,
      });

      const verified = dto.code === expectedCode;

      this.logger.log(`[QA MODE] Verification result`, {
        type: dto.type,
        destination: dto.destination,
        code: dto.code,
        expectedCode,
        verified,
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
      this.logger.error(`Failed to verify code: ${error.message}`);
      throw new BadRequestException('Falha ao verificar código');
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
      throw new Error(`Failed to send email code: ${response.status}`);
    }
  }

  private async sendSmsCode(phone: string): Promise<void> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: phone, type: 'phone' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send SMS code: ${response.status}`);
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

    const data = (await response.json()) as { verified: boolean };
    return data.verified;
  }
}
