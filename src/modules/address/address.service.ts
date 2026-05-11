import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';
import { ENV_VARS } from '@config/constants';

import type { AddressSuggestionDto } from './dtos/autocomplete-response.dto';

const ADDRESS_AUTOCOMPLETE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);
  private readonly nodeEnv: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {
    this.nodeEnv = this.configService.get<string>(ENV_VARS.NODE_ENV) ?? 'development';
  }

  async autocomplete(query: string): Promise<AddressSuggestionDto[]> {
    if (this.nodeEnv === 'development' || this.nodeEnv === 'test') {
      this.logger.log('[QA MODE] Mock address autocomplete', { query });
      return this.mockSuggestions(query);
    }

    const cacheKey = CACHE_KEYS.ADDRESS_AUTOCOMPLETE(query.toLowerCase().trim());
    const cached = await this.cache.get<AddressSuggestionDto[]>(cacheKey);
    if (cached) return cached;

    const suggestions = await this.fetchFromNominatim(query);
    await this.cache.set({ key: cacheKey, value: suggestions, ttlSeconds: ADDRESS_AUTOCOMPLETE_TTL_SECONDS });
    return suggestions;
  }

  private async fetchFromNominatim(query: string): Promise<AddressSuggestionDto[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&addressdetails=1&limit=5&countrycodes=br`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'domestic-backend-bff/1.0' },
      });

      if (!response.ok) {
        this.logger.warn('Nominatim returned non-OK status', { status: response.status });
        return [];
      }

      const data = (await response.json()) as NominatimResult[];
      return data.map((item) => this.mapNominatimResult(item));
    } catch (error) {
      this.logger.error('Address autocomplete failed', { error });
      return [];
    }
  }

  private mapNominatimResult(item: NominatimResult): AddressSuggestionDto {
    const address = item.address ?? {};
    const street = address.road ?? '';
    const number = address.house_number ?? '';
    const neighborhood = address.suburb ?? address.neighbourhood ?? '';
    const city = address.city ?? address.town ?? address.village ?? '';
    const state = address.state ?? '';
    const postcode = address.postcode ?? '';

    const parts = [street, number ? `, ${number}` : '', neighborhood ? `, ${neighborhood}` : '', city ? `, ${city}` : '', state ? ` - ${state}` : '', postcode ? `, ${postcode}` : ''];
    const fullAddress = parts.filter(Boolean).join('').replace(/^,\s*/, '');

    return {
      fullAddress: fullAddress || item.display_name,
      street,
      number,
      neighborhood,
      city,
      state,
      postcode,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  }

  private mockSuggestions(query: string): AddressSuggestionDto[] {
    const mock: AddressSuggestionDto[] = [
      {
        fullAddress: 'Rua Augusta, 1500, Consolação, São Paulo - SP, 01304-001',
        street: 'Rua Augusta',
        number: '1500',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        postcode: '01304-001',
        lat: -23.5558,
        lng: -46.6558,
      },
      {
        fullAddress: 'Avenida Paulista, 1000, Bela Vista, São Paulo - SP, 01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        postcode: '01310-100',
        lat: -23.5631,
        lng: -46.6543,
      },
      {
        fullAddress: 'Rua Oscar Freire, 900, Cerqueira César, São Paulo - SP, 01426-001',
        street: 'Rua Oscar Freire',
        number: '900',
        neighborhood: 'Cerqueira César',
        city: 'São Paulo',
        state: 'SP',
        postcode: '01426-001',
        lat: -23.5616,
        lng: -46.6714,
      },
      {
        fullAddress: 'Rua das Flores, 250, Centro, Curitiba - PR, 80010-010',
        street: 'Rua das Flores',
        number: '250',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        postcode: '80010-010',
        lat: -25.4295,
        lng: -49.2718,
      },
      {
        fullAddress: 'Avenida Beira Mar, 100, Centro, Florianópolis - SC, 88010-000',
        street: 'Avenida Beira Mar',
        number: '100',
        neighborhood: 'Centro',
        city: 'Florianópolis',
        state: 'SC',
        postcode: '88010-000',
        lat: -27.5969,
        lng: -48.5495,
      },
    ];

    const lower = query.toLowerCase();
    return mock.filter(
      (suggestion) =>
        suggestion.fullAddress.toLowerCase().includes(lower) ||
        suggestion.street.toLowerCase().includes(lower) ||
        suggestion.city.toLowerCase().includes(lower),
    );
  }
}
