import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { GeocodingService } from '@modules/auth/geocoding.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';
import { CepServiceInterface } from './interfaces/cep-service.interface';
import { CepResponseDto } from './dtos/cep-response.dto';

@Injectable()
export class CepService implements CepServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly geocoding: GeocodingService,
  ) {}

  async lookupCep(cep: string): Promise<CepResponseDto> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      throw AppErrorFactory.validation({ message: 'CEP deve conter 8 dígitos' });
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

      if (!response.ok) {
        throw AppErrorFactory.internalServer({ message: `ViaCEP request failed: ${response.status}` });
      }

      const data = await safeJsonParse<{
        cep: string;
        logradouro: string;
        bairro: string;
        localidade: string;
        uf: string;
        erro?: boolean;
      }>(response);

      if (!data || data.erro) {
        throw AppErrorFactory.notFound({ message: 'CEP não encontrado', code: 'CEP_NOT_FOUND' });
      }

      const geocodeResult = await this.geocoding.geocode({
        street: data.logradouro,
        number: '',
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        cep: data.cep,
      });

      return {
        cep: data.cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        ...(geocodeResult ? { lat: geocodeResult.lat, lng: geocodeResult.lng } : {}),
      };
    } catch (error) {
      this.logProvider.error({
        message: `CEP lookup failed for ${cep}: ${error.message}`,
        context: 'CepService.lookupCep',
      });

      if (error instanceof AppError) throw error;
      throw AppErrorFactory.internalServer({ message: 'Falha ao consultar CEP' });
    }
  }
}
