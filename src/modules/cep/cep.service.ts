import { Injectable, Logger } from '@nestjs/common';

export interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);
  private readonly viaCepBaseUrl = 'https://viacep.com.br/ws';

  async search(cep: string): Promise<CepResult | null> {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      this.logger.warn('Invalid CEP format', { cep });
      return null;
    }

    try {
      const response = await fetch(`${this.viaCepBaseUrl}/${digits}/json/`);
      if (!response.ok) {
        this.logger.warn('ViaCEP API returned non-OK status', { status: response.status });
        return null;
      }

      const data = await response.json() as CepResult & { erro?: boolean };
      if (data.erro) {
        this.logger.warn('CEP not found', { cep });
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('ViaCEP API call failed', { error });
      return null;
    }
  }
}
