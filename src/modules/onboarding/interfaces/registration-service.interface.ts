import { RegisterRequestDto } from '../dtos/register-request.dto';
import { RegisterResponseDto } from '../dtos/register-response.dto';

export interface RegistrationServiceInterface {
  register(dto: RegisterRequestDto): Promise<RegisterResponseDto>;
}
