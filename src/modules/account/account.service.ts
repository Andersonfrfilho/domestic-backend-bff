import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import type { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import type {
  AccountDocumentResult,
  AddressResult,
  ApiUserAddress,
  ConfirmContactChangeParams,
  ConfirmContactChangeResult,
  InitiateContactChangeParams,
  InitiateContactChangeResult,
  SaveAddressParams,
  UpdateNameParams,
  UserProfileResult,
} from './dtos/account.types';

function toAddressResult(userAddress: ApiUserAddress): AddressResult {
  return {
    id: userAddress.id,
    addressId: userAddress.addressId,
    label: userAddress.label ?? '',
    isPrimary: userAddress.isPrimary,
    street: userAddress.address?.street ?? '',
    number: userAddress.address?.number ?? '',
    neighborhood: userAddress.address?.neighborhood ?? '',
    city: userAddress.address?.city ?? '',
    state: userAddress.address?.state ?? '',
    postcode: userAddress.address?.zipCode ?? '',
    latitude: userAddress.address?.latitude ? Number(userAddress.address.latitude) : undefined,
    longitude: userAddress.address?.longitude ? Number(userAddress.address.longitude) : undefined,
  };
}

@Injectable()
export class AccountService {
  private readonly logContext = this.constructor.name;

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logger: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
  ) {}

  @TraceMethod()
  async getProfile(keycloakId: string): Promise<UserProfileResult> {
    try {
      const [profile, phones] = await Promise.all([
        this.api.get<UserProfileResult>({
          path: '/v1/users/me',
          headers: { 'X-User-Id': keycloakId },
        }),
        this.api
          .get<Array<{ id: string; isPrimary: boolean; phone?: { number: string } }>>({
            path: '/v1/users/me/phones',
            headers: { 'X-User-Id': keycloakId },
          })
          .catch(() => [] as Array<{ id: string; isPrimary: boolean; phone?: { number: string } }>),
      ]);
      const primaryPhone = phones.find((p) => p.isPrimary)?.phone?.number;
      return { ...profile, primaryPhone };
    } catch (error) {
      this.logger.error({
        message: `Error getting user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.getProfile`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async updateName(keycloakId: string, params: UpdateNameParams): Promise<UserProfileResult> {
    try {
      const response = await this.api.put<UserProfileResult>({
        path: '/v1/users/me',
        body: { fullName: params.fullName },
        headers: { 'X-User-Id': keycloakId },
      });
      this.logger.info({
        message: `User name updated for: ${keycloakId}`,
        context: `${this.logContext}.updateName`,
      });
      return response;
    } catch (error) {
      this.logger.error({
        message: `Error updating user name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.updateName`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async initiateEmailChange(
    keycloakId: string,
    params: InitiateContactChangeParams,
  ): Promise<InitiateContactChangeResult> {
    try {
      const userEmail = await this.api.post<{ id: string; emailId: string }>({
        path: '/v1/users/me/emails',
        body: { email: params.contact, isPrimary: false },
        headers: { 'X-User-Id': keycloakId },
      });

      await this.api.post({
        path: `/v1/users/me/emails/${userEmail.id}/send-verification`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });

      this.logger.info({
        message: `Email change initiated for ${keycloakId}, userEmailId: ${userEmail.id}`,
        context: `${this.logContext}.initiateEmailChange`,
      });

      return {
        contactId: userEmail.id,
        destination: params.contact,
      };
    } catch (error) {
      this.logger.error({
        message: `Error initiating email change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.initiateEmailChange`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async confirmEmailChange(
    keycloakId: string,
    params: ConfirmContactChangeParams,
  ): Promise<ConfirmContactChangeResult> {
    try {
      await this.api.post({
        path: `/v1/users/me/emails/${params.contactId}/verify`,
        body: { code: params.code },
        headers: { 'X-User-Id': keycloakId },
      });

      await this.api.post({
        path: `/v1/users/me/emails/${params.contactId}/set-primary`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });

      this.logger.info({
        message: `Email change confirmed for ${keycloakId}, contactId: ${params.contactId}`,
        context: `${this.logContext}.confirmEmailChange`,
      });

      return { success: true };
    } catch (error) {
      this.logger.error({
        message: `Error confirming email change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.confirmEmailChange`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async initiatePhoneChange(
    keycloakId: string,
    params: InitiateContactChangeParams,
  ): Promise<InitiateContactChangeResult> {
    try {
      const userPhone = await this.api.post<{ id: string; phoneId: string }>({
        path: '/v1/users/me/phones',
        body: { number: params.contact, isPrimary: false },
        headers: { 'X-User-Id': keycloakId },
      });

      await this.api.post({
        path: `/v1/users/me/phones/${userPhone.id}/send-verification`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });

      this.logger.info({
        message: `Phone change initiated for ${keycloakId}, userPhoneId: ${userPhone.id}`,
        context: `${this.logContext}.initiatePhoneChange`,
      });

      return {
        contactId: userPhone.id,
        destination: params.contact,
      };
    } catch (error) {
      this.logger.error({
        message: `Error initiating phone change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.initiatePhoneChange`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async confirmPhoneChange(
    keycloakId: string,
    params: ConfirmContactChangeParams,
  ): Promise<ConfirmContactChangeResult> {
    try {
      const phones = await this.api.get<Array<{ id: string; isPrimary: boolean }>>({
        path: '/v1/users/me/phones',
        headers: { 'X-User-Id': keycloakId },
      });

      const oldPrimary = phones.find((p) => p.isPrimary && p.id !== params.contactId);

      await this.api.post({
        path: `/v1/users/me/phones/${params.contactId}/verify`,
        body: { code: params.code },
        headers: { 'X-User-Id': keycloakId },
      });

      await this.api.post({
        path: `/v1/users/me/phones/${params.contactId}/set-primary`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });

      if (oldPrimary) {
        try {
          await this.api.delete({
            path: `/v1/users/me/phones/${oldPrimary.id}`,
            headers: { 'X-User-Id': keycloakId },
          });
        } catch (deleteError) {
          this.logger.warn({
            message: `Could not delete old primary phone ${oldPrimary.id} — ignoring: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
            context: `${this.logContext}.confirmPhoneChange`,
          });
        }
      }

      this.logger.info({
        message: `Phone change confirmed for ${keycloakId}, contactId: ${params.contactId}`,
        context: `${this.logContext}.confirmPhoneChange`,
      });

      return { success: true };
    } catch (error) {
      this.logger.error({
        message: `Error confirming phone change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.confirmPhoneChange`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async listAddresses(keycloakId: string): Promise<AddressResult[]> {
    try {
      const userAddresses = await this.api.get<ApiUserAddress[]>({
        path: '/v1/users/me/addresses',
        headers: { 'X-User-Id': keycloakId },
      });
      return userAddresses.map(toAddressResult);
    } catch (error) {
      this.logger.error({
        message: `Error listing addresses: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.listAddresses`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async createAddress(keycloakId: string, params: SaveAddressParams): Promise<AddressResult> {
    try {
      const userAddress = await this.api.post<ApiUserAddress>({
        path: '/v1/users/me/addresses',
        body: {
          label: params.label,
          isPrimary: params.isPrimary ?? false,
          street: params.street,
          number: params.number,
          neighborhood: params.neighborhood,
          city: params.city,
          state: params.state,
          zipCode: params.postcode,
          latitude: params.latitude,
          longitude: params.longitude,
        },
        headers: { 'X-User-Id': keycloakId },
      });
      return toAddressResult(userAddress);
    } catch (error) {
      this.logger.error({
        message: `Error creating address: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.createAddress`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async updateAddress(
    keycloakId: string,
    addressId: string,
    params: SaveAddressParams,
  ): Promise<AddressResult> {
    try {
      await this.api.delete({
        path: `/v1/users/me/addresses/${addressId}`,
        headers: { 'X-User-Id': keycloakId },
      });
      const userAddress = await this.api.post<ApiUserAddress>({
        path: '/v1/users/me/addresses',
        body: {
          label: params.label,
          isPrimary: params.isPrimary ?? false,
          street: params.street,
          number: params.number,
          neighborhood: params.neighborhood,
          city: params.city,
          state: params.state,
          zipCode: params.postcode,
          latitude: params.latitude,
          longitude: params.longitude,
        },
        headers: { 'X-User-Id': keycloakId },
      });
      return toAddressResult(userAddress);
    } catch (error) {
      this.logger.error({
        message: `Error updating address ${addressId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.updateAddress`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async deleteAddress(keycloakId: string, addressId: string): Promise<void> {
    try {
      await this.api.delete({
        path: `/v1/users/me/addresses/${addressId}`,
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logger.error({
        message: `Error deleting address ${addressId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.deleteAddress`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async listDocuments(keycloakId: string): Promise<AccountDocumentResult[]> {
    try {
      const docs = await this.api.get<
        Array<{
          id: string;
          documentType: string;
          documentNumber: string | null;
          status: string;
          createdAt: string;
          verifiedAt?: string | null;
        }>
      >({
        path: '/v1/users/me/documents',
        headers: { 'X-User-Id': keycloakId },
      });

      return docs.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber ?? undefined,
        status: doc.status,
        uploadedAt: doc.createdAt,
        verifiedAt: doc.verifiedAt,
      }));
    } catch (error) {
      this.logger.error({
        message: `Error listing documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.listDocuments`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async deleteDocument(keycloakId: string, documentId: string): Promise<void> {
    try {
      await this.api.delete({
        path: `/v1/users/me/documents/${documentId}`,
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logger.error({
        message: `Error deleting document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.deleteDocument`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async getDocumentUrl(documentId: string): Promise<{ url: string; expiresIn: number }> {
    try {
      return await this.api.get<{ url: string; expiresIn: number }>({
        path: `/v1/documents/${documentId}/url`,
      });
    } catch (error) {
      this.logger.error({
        message: `Error getting document URL for ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.getDocumentUrl`,
      });
      throw error;
    }
  }
}
