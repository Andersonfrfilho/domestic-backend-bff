import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';

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
      this.logProvider.warn({ message: 'Invalid CEP format', context: 'CepService.search', meta: { cep } });
      return null;
    }

    try {
      const response = await fetch(`${this.viaCepBaseUrl}/${digits}/json/`);
      if (!response.ok) {
        this.logProvider.warn({ message: 'ViaCEP API returned non-OK status', context: 'CepService.search', meta: { status: response.status } });
        return null;
      }

      const data = await safeJsonParse<CepResult & { erro?: boolean }>(response);
      if (!data || data.erro) {
        this.logProvider.warn({ message: 'CEP not found', context: 'CepService.search', meta: { cep } });
        return null;
      }

      return data;
    } catch (error) {
      this.logProvider.error({ message: 'ViaCEP API call failed', context: 'CepService.search', meta: { error } });
      return null;
    }
  }
}
