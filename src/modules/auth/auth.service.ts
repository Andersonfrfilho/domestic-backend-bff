import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import type { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import {
  type LoginParams,
  type LoginResult,
  type RefreshTokenParams,
  type LogoutParams,
  type AccountStatusResponse,
  type ForgotPasswordParams,
  type SelfUnlockInitiateParams,
  type SelfUnlockInitiateResult,
  type SelfUnlockVerifyParams,
  type SelfUnlockVerifyResult,
  type UserDocumentResponse,
  type VerificationStatusResult,
  type GetCategoriesResult,
  type GetServicesResult,
  type CreateCategoryParams,
  type CreateCategoryResult,
  type CreateServiceCatalogParams,
  type CreateServiceCatalogResult,
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
  type DeleteProviderAvailabilityResult,
  type GetPaymentMethodTypesResult,
  type GetProviderPaymentMethodsResult,
  type SetProviderPaymentMethodsParams,
  type CheckPixKeyAvailabilityResult,
  type ProviderProfileMeResult,
  type UpdateProviderProfileBody,
  type WorkLocationDto,
  type AddWorkLocationBody,
  type ProviderVerificationResult,
} from './dtos/auth.types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
  ) {}

  @TraceMethod()
  async login({ username, password }: LoginParams): Promise<LoginResult> {
    try {
      const response = await this.api.post<LoginResult>({
        path: '/v1/auth/token',
        body: { username, password },
      });
      this.logProvider.info({
        message: `User logged in: ${username}`,
        context: 'AuthService.login',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Login failed for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.login',
      });
      throw error;
    }
  }

  @TraceMethod()
  async refreshToken({ refreshToken }: RefreshTokenParams): Promise<LoginResult> {
    try {
      const response = await this.api.post<LoginResult>({
        path: '/v1/auth/token',
        body: { grantType: 'refresh_token', refreshToken },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.refreshToken',
      });
      throw error;
    }
  }

  @TraceMethod()
  async logout({ refreshToken }: LogoutParams): Promise<void> {
    try {
      await this.api.post({
        path: '/v1/auth/logout',
        body: { refreshToken },
      });
      this.logProvider.info({
        message: 'User logged out',
        context: 'AuthService.logout',
      });
    } catch (error) {
      this.logProvider.warn({
        message: `Logout failed (non-fatal): ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.logout',
      });
    }
  }

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
        path: '/v1/users/me/onboarding-status',
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
      const response = await this.api.get<UserDocumentResponse[]>({
        path: '/v1/users/me/documents',
        headers: { 'X-User-Id': keycloakId },
      });
      return response || [];
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
  async createCategory(params: CreateCategoryParams): Promise<CreateCategoryResult> {
    try {
      const response = await this.api.post<CreateCategoryResult>({
        path: '/v1/categories',
        body: params,
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error creating category: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.createCategory',
      });
      throw error;
    }
  }

  @TraceMethod()
  async createServiceCatalog(
    params: CreateServiceCatalogParams,
  ): Promise<CreateServiceCatalogResult> {
    try {
      const response = await this.api.post<CreateServiceCatalogResult>({
        path: '/v1/services',
        body: params,
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error creating service catalog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.createServiceCatalog',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getServices(): Promise<GetServicesResult> {
    try {
      const response = await this.api.get<GetServicesResult>({
        path: '/v1/services',
      });
      return response ?? { data: [] };
    } catch (error) {
      this.logProvider.error({
        message: `Error getting services: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getServices',
      });
      throw error;
    }
  }

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
        path: `/v1/auth/providers/me/availability/${params.id}`,
        body: {
          startTime: params.startTime,
          endTime: params.endTime,
          ...(params.additionalPercentage !== undefined && {
            additionalPercentage: params.additionalPercentage,
          }),
        },
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider availability updated for slot ${params.id}`,
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

  @TraceMethod()
  async deleteProviderAvailability(
    id: string,
    keycloakId: string,
  ): Promise<DeleteProviderAvailabilityResult> {
    try {
      const response = await this.api.delete<DeleteProviderAvailabilityResult>({
        path: `/v1/auth/providers/me/availability/${id}`,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: `Provider availability slot deleted: ${id}`,
        context: 'AuthService.deleteProviderAvailability',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error deleting provider availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.deleteProviderAvailability',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getPaymentMethodTypes(): Promise<GetPaymentMethodTypesResult> {
    try {
      return await this.api.get<GetPaymentMethodTypesResult>({
        path: '/v1/auth/payment-method-types',
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error getting payment method types: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getPaymentMethodTypes',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getProviderPaymentMethods(keycloakId: string): Promise<GetProviderPaymentMethodsResult> {
    try {
      return await this.api.get<GetProviderPaymentMethodsResult>({
        path: '/v1/auth/providers/me/payment-methods',
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error getting provider payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getProviderPaymentMethods',
      });
      throw error;
    }
  }

  @TraceMethod()
  async setProviderPaymentMethods(
    params: SetProviderPaymentMethodsParams,
    keycloakId: string,
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.api.put<{ success: boolean }>({
        path: '/v1/auth/providers/me/payment-methods',
        body: params,
        headers: { 'X-User-Id': keycloakId },
      });
      this.logProvider.info({
        message: 'Provider payment methods updated',
        context: 'AuthService.setProviderPaymentMethods',
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error setting provider payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.setProviderPaymentMethods',
      });
      throw error;
    }
  }

  @TraceMethod()
  async checkPixKeyAvailability(
    pixKey: string,
    keycloakId: string,
  ): Promise<CheckPixKeyAvailabilityResult> {
    try {
      const response = await this.api.get<CheckPixKeyAvailabilityResult>({
        path: `/v1/auth/providers/me/pix-key/check?key=${encodeURIComponent(pixKey)}`,
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({
        message: `Error checking PIX key availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.checkPixKeyAvailability',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getMyProviderProfile(keycloakId: string): Promise<ProviderProfileMeResult> {
    try {
      return await this.api.get<ProviderProfileMeResult>({
        path: '/v1/auth/providers/me/profile',
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error getting provider profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getMyProviderProfile',
      });
      throw error;
    }
  }

  @TraceMethod()
  async updateMyProviderProfile(
    body: UpdateProviderProfileBody,
    keycloakId: string,
  ): Promise<ProviderProfileMeResult> {
    try {
      return await this.api.put<ProviderProfileMeResult>({
        path: '/v1/auth/providers/me/profile',
        body,
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error updating provider profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.updateMyProviderProfile',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getWorkLocations(keycloakId: string): Promise<WorkLocationDto[]> {
    try {
      return await this.api.get<WorkLocationDto[]>({
        path: '/v1/auth/providers/me/work-locations',
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error getting work locations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getWorkLocations',
      });
      throw error;
    }
  }

  @TraceMethod()
  async addWorkLocation(body: AddWorkLocationBody, keycloakId: string): Promise<WorkLocationDto> {
    try {
      return await this.api.post<WorkLocationDto>({
        path: '/v1/auth/providers/me/work-locations',
        body,
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error adding work location: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.addWorkLocation',
      });
      throw error;
    }
  }

  @TraceMethod()
  async removeWorkLocation(locationId: string, keycloakId: string): Promise<void> {
    try {
      await this.api.delete({
        path: `/v1/auth/providers/me/work-locations/${locationId}`,
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error removing work location ${locationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.removeWorkLocation',
      });
      throw error;
    }
  }

  @TraceMethod()
  async getMyVerification(keycloakId: string): Promise<ProviderVerificationResult> {
    try {
      return await this.api.get<ProviderVerificationResult>({
        path: '/v1/auth/providers/me/verification',
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error getting verification status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.getMyVerification',
      });
      throw error;
    }
  }

  @TraceMethod()
  async submitMyVerification(keycloakId: string): Promise<ProviderVerificationResult> {
    try {
      return await this.api.post<ProviderVerificationResult>({
        path: '/v1/auth/providers/me/verification/submit',
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });
    } catch (error) {
      this.logProvider.error({
        message: `Error submitting verification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: 'AuthService.submitMyVerification',
      });
      throw error;
    }
  }
}
