import { VerificationSendRequestDto } from '../dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from '../dtos/verification-verify-request.dto';
import { VerificationResponseDto } from '../dtos/verification-response.dto';

export interface VerificationServiceInterface {
  sendCode(dto: VerificationSendRequestDto): Promise<VerificationResponseDto>;
  verifyCode(dto: VerificationVerifyRequestDto): Promise<VerificationResponseDto>;
}
