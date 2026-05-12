import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { GeocodingService } from '@modules/auth/geocoding.service';
import { RegistrationServiceInterface } from './interfaces/registration-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';

@Injectable()
export class RegistrationService implements RegistrationServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly api: ApiClientService,
    private readonly geocoding: GeocodingService,
  ) {}

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    try {
      const result = await this.createApiUser(dto);

      this.logProvider.info({
        message: `User registered successfully: ${dto.email}`,
        context: `${this.constructor.name}.register`,
      });

      return {
        keycloakId: result.keycloakId,
        email: dto.email,
        success: true,
        message: 'Usuário criado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to register user ${dto.email}: ${error.message}`,
        context: `${this.constructor.name}.register`,
      });

      if (error.message?.includes('409') || error.message?.includes('already exists') || error.message?.includes('E-mail já está em uso')) {
        throw AppErrorFactory.conflict({ message: 'E-mail já está em uso', code: 'EMAIL_ALREADY_EXISTS' });
      }

      if (error instanceof AppError) throw error;
      throw AppErrorFactory.internalServer({ message: 'Falha ao criar usuário' });
    }
  }

  async saveAddress(dto: {
    keycloakId: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: string;
    longitude?: string;
  }): Promise<{ addressId: string }> {
    try {
      let lat = dto.latitude;
      let lng = dto.longitude;

      if (!lat || !lng) {
        const geocode = await this.geocoding.geocode({
          street: dto.street,
          number: dto.number,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state,
          cep: dto.cep,
        });
        if (geocode) {
          lat = String(geocode.lat);
          lng = String(geocode.lng);
        }
      }

      const result = await this.api.post<{ id: string }>({
        path: '/v1/onboarding/address',
        body: {
          keycloakId: dto.keycloakId,
          street: dto.street,
          number: dto.number,
          complement: dto.complement ?? null,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state,
          zipCode: dto.cep,
          latitude: lat ?? null,
          longitude: lng ?? null,
        },
      });

      return { addressId: result.id };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to save address for keycloakId ${dto.keycloakId}: ${error.message}`,
        context: `${this.constructor.name}.saveAddress`,
      });

      if (error instanceof AppError) throw error;
      throw AppErrorFactory.internalServer({ message: 'Falha ao salvar endereço' });
    }
  }

  private async createApiUser(dto: RegisterRequestDto): Promise<{ keycloakId: string; userId: string }> {
    return this.api.post<{ keycloakId: string; userId: string }>({
      path: '/v1/onboarding/register',
      body: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: dto.password,
        termsAccepted: dto.termsAccepted,
        ...(dto.cpf || dto.cnpj || dto.rg || dto.passport ? { document: dto.cpf || dto.cnpj || dto.rg || dto.passport } : {}),
        ...(dto.cnpj ? {
          companyName: dto.companyName,
          tradeName: dto.tradeName,
        } : {}),
        // Endereço (opcional, salvo junto com o cadastro)
        ...(dto.cep && dto.street && dto.number ? {
          address: {
            zipCode: dto.cep,
            street: dto.street,
            number: dto.number,
            complement: dto.complement ?? null,
            neighborhood: dto.neighborhood ?? null,
            city: dto.city ?? null,
            state: dto.state ?? null,
            latitude: dto.lat ?? null,
            longitude: dto.lng ?? null,
          },
        } : {}),
      },
    });
  }
}
