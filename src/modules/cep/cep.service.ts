import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

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
  private readonly viaCepBaseUrl = 'https://viacep.com.br/ws';

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
  ) {}

  async search(cep: string): Promise<CepResult | null> {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      this.logProvider.warn({ message: 'Invalid CEP format', context: 'CepService.search', params: { cep } });
      return null;
    }

    try {
      const response = await fetch(`${this.viaCepBaseUrl}/${digits}/json/`);
      if (!response.ok) {
        this.logProvider.warn({ message: 'ViaCEP API returned non-OK status', context: 'CepService.search', params: { status: response.status } });
        return null;
      }

      const data = (await response.json()) as CepResult & { erro?: boolean };
      if (data.erro) {
        this.logProvider.warn({ message: 'CEP not found', context: 'CepService.search', params: { cep } });
        return null;
      }

      return data;
    } catch (error) {
      this.logProvider.error({ message: 'ViaCEP API call failed', context: 'CepService.search', params: { error } });
      return null;
    }
  }
}
