import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { GeocodingService } from '@modules/auth/geocoding.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
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
      throw new BadRequestException('CEP deve conter 8 dígitos');
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

      if (!response.ok) {
        throw new Error(`ViaCEP request failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        cep: string;
        logradouro: string;
        bairro: string;
        localidade: string;
        uf: string;
        erro?: boolean;
      };

      if (data.erro) {
        throw new BadRequestException('CEP não encontrado');
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

      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Falha ao consultar CEP');
    }
  }
}
