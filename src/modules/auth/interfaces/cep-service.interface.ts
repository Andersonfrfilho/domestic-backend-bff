import { CepResponseDto } from '../dtos/cep-response.dto';

export interface CepServiceInterface {
  lookupCep(cep: string): Promise<CepResponseDto>;
}
