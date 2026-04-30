import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENV_VARS } from '@config/constants';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface GeocodeParams {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.nodeEnv = this.configService.get<string>(ENV_VARS.NODE_ENV) ?? 'development';
  }

  async geocode(params: GeocodeParams): Promise<GeocodeResult | null> {
    if (this.nodeEnv === 'development' || this.nodeEnv === 'test') {
      this.logger.log('[QA MODE] Mock geocoding for address', {
        street: params.street,
        city: params.city,
        state: params.state,
      });
      return {
        lat: -23.5505,
        lng: -46.6333,
        formattedAddress: `${params.street}, ${params.number} - ${params.neighborhood}, ${params.city} - ${params.state}`,
      };
    }

    const query = `${params.street}, ${params.number}, ${params.neighborhood}, ${params.city}, ${params.state}, Brazil`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'domestic-backend-bff/1.0',
        },
      });

      if (!response.ok) {
        this.logger.warn('Geocoding API returned non-OK status', { status: response.status });
        return null;
      }

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (data.length === 0) {
        this.logger.warn('No geocoding results found', { query });
        return null;
      }

      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    } catch (error) {
      this.logger.error('Geocoding failed', { error });
      return null;
    }
  }
}
