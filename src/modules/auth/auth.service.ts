import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import type { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import {
  type AccountStatusResponse,
  type ForgotPasswordParams,
  type SelfUnlockInitiateParams,
  type SelfUnlockInitiateResult,
  type SelfUnlockVerifyParams,
  type SelfUnlockVerifyResult,
  type UserDocumentResponse,
  type VerificationStatusResult,
  type GetCategoriesResult,
  type CreateProviderServiceParams,
  type CreateProviderServiceResult,
  type GetProviderServicesResult,
  type UpdateProviderServiceParams,
  type UpdateProviderServiceResult,
  type DeleteProviderServiceResult,
  type SetProviderAvailabilityParams,
  type SetProviderAvailabilityResult,
  type GetProviderAvailabilityResult,
  type UpdateProviderAvailabilityParams,
  type UpdateProviderAvailabilityResult,
} from './dtos/auth.types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
  ) {}

  @TraceMethod()
  async forgotPassword({ email }: ForgotPasswordParams): Promise<void> {
    try {
      await this.api.post({
        path: '/v1/auth/forgot-password',
        body: { email },
      });
      this.logProvider.info({
        message: `Password reset triggered for user: ${email}`,
        context: 'AuthService.forgotPassword',
      });
    } catch (error) {
      this.logProvider.error({
        message: `Failed to process forgot password for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.forgotPassword',
      });
      throw error;
    }
  }

  async getVerificationStatus(keycloakId: string): Promise<VerificationStatusResult> {
    try {
      const response = await this.api.get<VerificationStatusResult>({
        path: '/v1/users/me/verification-status',
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error getting verification status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getVerificationStatus',
      });
      return { emailVerified: false, phoneVerified: false };
    }
  }

  async updateVerificationAttribute(keycloakId: string, type: 'email' | 'phone'): Promise<void> {
    try {
      await this.api.put({
        path: '/v1/users/me/verification-attribute',
        body: { type },
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Verification attribute updated for user: ${keycloakId}`,
        context: 'AuthService.updateVerificationAttribute',
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error updating verification attribute: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.updateVerificationAttribute',
      });
    }
  }

  async getAccountStatus(keycloakId: string): Promise<AccountStatusResponse> {
    try {
      const response = await this.api.get<AccountStatusResponse>({
        path: '/v1/users/me/account-status',
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error getting account status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getAccountStatus',
      });
      return { blocked: false, status: 'UNKNOWN', reason: null, message: null };
    }
  }

  async getDocuments(keycloakId: string): Promise<UserDocumentResponse[]> {
    try {
      const response = await this.api.get<{ documents: UserDocumentResponse[] }>({
        path: '/v1/users/me/documents',
        headers: { 'X-User-Id': keycloakId },
      });
      return response.documents || [];
    } catch (error) {
      this.logProvider.error({
        message: `Error getting documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getDocuments',
      });
      return [];
    }
  }

  async initiateSelfUnlock(params: SelfUnlockInitiateParams): Promise<SelfUnlockInitiateResult> {
    try {
      const response = await this.api.post<SelfUnlockInitiateResult>({
        path: `/v1/users/me/account-block/${params.blockId}/self-unlock`,
        body: {},
        headers: { 'X-User-Id': params.keycloakId },
      });
      this.logProvider.info({
        message: `Self-unlock initiated for block: ${params.blockId}`,
        context: 'AuthService.initiateSelfUnlock',
      });
      return response;
    } catch (error) {
      this.logProvider.warn({
        message: `Failed to initiate self-unlock for block ${params.blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.initiateSelfUnlock',
      });
      throw error;
    }
  }

  async verifySelfUnlock(params: SelfUnlockVerifyParams): Promise<SelfUnlockVerifyResult> {
    try {
      const response = await this.api.post<SelfUnlockVerifyResult>({
        path: `/v1/users/me/account-block/${params.blockId}/self-unlock/verify`,
        body: { code: params.code },
        headers: { 'X-User-Id': params.keycloakId },
      });
      this.logProvider.info({
        message: `Self-unlock verification result for block ${params.blockId}: success=${response.success}, blockResolved=${response.blockResolved}`,
        context: 'AuthService.verifySelfUnlock',
      });
      return response;
    } catch (error) {
      this.logProvider.warn({
        message: `Failed to verify self-unlock code for block ${params.blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.verifySelfUnlock',
      });
      throw error;
    }
  }

  // Provider Profile Methods

  @TraceMethod()
  async getCategories(): Promise<GetCategoriesResult> {
    try {
      const response = await this.api.get<GetCategoriesResult>({
        path: '/v1/auth/categories',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error getting categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getCategories',
      });
      throw error;
    }
  }

  @TraceMethod()
  async createProviderService(
    params: CreateProviderServiceParams,
    keycloakId: string,
  ): Promise<CreateProviderServiceResult> {
    try {
      const response = await this.api.post<CreateProviderServiceResult>({
        path: '/v1/auth/providers/me/services',
        body: params,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider service created: ${response.data.id}`,
        context: 'AuthService.createProviderService',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error creating provider service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.createProviderService',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getProviderServices(keycloakId: string): Promise<GetProviderServicesResult> {
    try {
      const response = await this.api.get<GetProviderServicesResult>({
        path: '/v1/auth/providers/me/services',
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error getting provider services: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getProviderServices',
      });
      throw error;
    }
  }

  @TraceMethod()
  async updateProviderService(
    serviceId: string,
    params: UpdateProviderServiceParams,
    keycloakId: string,
  ): Promise<UpdateProviderServiceResult> {
    try {
      const response = await this.api.put<UpdateProviderServiceResult>({
        path: `/v1/auth/providers/me/services/${serviceId}`,
        body: params,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider service updated: ${serviceId}`,
        context: 'AuthService.updateProviderService',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error updating provider service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.updateProviderService',
      });
      throw error;
    }
  }

  @TraceMethod()
  async deleteProviderService(
    serviceId: string,
    keycloakId: string,
  ): Promise<DeleteProviderServiceResult> {
    try {
      const response = await this.api.delete<DeleteProviderServiceResult>({
        path: `/v1/auth/providers/me/services/${serviceId}`,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider service deleted: ${serviceId}`,
        context: 'AuthService.deleteProviderService',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error deleting provider service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.deleteProviderService',
      });
      throw error;
    }
  }

  @TraceMethod()
  async setProviderAvailability(
    params: SetProviderAvailabilityParams,
    keycloakId: string,
  ): Promise<SetProviderAvailabilityResult> {
    try {
      const response = await this.api.post<SetProviderAvailabilityResult>({
        path: '/v1/auth/providers/me/availability',
        body: params,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider availability set for day ${params.dayOfWeek}`,
        context: 'AuthService.setProviderAvailability',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error setting provider availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.setProviderAvailability',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getProviderAvailability(keycloakId: string): Promise<GetProviderAvailabilityResult> {
    try {
      const response = await this.api.get<GetProviderAvailabilityResult>({
        path: '/v1/auth/providers/me/availability',
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error getting provider availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getProviderAvailability',
      });
      throw error;
    }
  }

  @TraceMethod()
  async updateProviderAvailability(
    params: UpdateProviderAvailabilityParams,
    keycloakId: string,
  ): Promise<UpdateProviderAvailabilityResult> {
    try {
      const response = await this.api.put<UpdateProviderAvailabilityResult>({
        path: `/v1/auth/providers/me/availability/${params.dayOfWeek}`,
        body: { startTime: params.startTime, endTime: params.endTime },
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider availability updated for day ${params.dayOfWeek}`,
        context: 'AuthService.updateProviderAvailability',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error updating provider availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.updateProviderAvailability',
      });
      throw error;
    }
  }
}
