import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import type { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import type {
  CreateServiceRequestParams,
  ServiceRequestResult,
  UserType,
} from './dtos/service-requests.types';

@Injectable()
export class ServiceRequestsService {
  private readonly logContext = this.constructor.name;

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logger: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
  ) {}

  @TraceMethod()
  async create(params: CreateServiceRequestParams): Promise<ServiceRequestResult> {
    try {
      return await this.api.post<ServiceRequestResult>({
        path: '/v1/service-requests',
        body: params,
      });
    } catch (error) {
      this.logger.error({
        message: `Error creating service request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.create`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async list(userType: UserType): Promise<ServiceRequestResult[]> {
    try {
      return await this.api.get<ServiceRequestResult[]>({
        path: '/v1/service-requests',
        headers: { 'X-User-Type': userType },
      });
    } catch (error) {
      this.logger.error({
        message: `Error listing service requests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.list`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async findById(id: string): Promise<ServiceRequestResult> {
    try {
      return await this.api.get<ServiceRequestResult>({
        path: `/v1/service-requests/${id}`,
      });
    } catch (error) {
      this.logger.error({
        message: `Error finding service request ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.findById`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async accept(id: string): Promise<ServiceRequestResult> {
    try {
      return await this.api.put<ServiceRequestResult>({
        path: `/v1/service-requests/${id}/accept`,
        body: {},
      });
    } catch (error) {
      this.logger.error({
        message: `Error accepting service request ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.accept`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async reject(id: string): Promise<ServiceRequestResult> {
    try {
      return await this.api.put<ServiceRequestResult>({
        path: `/v1/service-requests/${id}/reject`,
        body: {},
      });
    } catch (error) {
      this.logger.error({
        message: `Error rejecting service request ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.reject`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async complete(id: string): Promise<ServiceRequestResult> {
    try {
      return await this.api.put<ServiceRequestResult>({
        path: `/v1/service-requests/${id}/complete`,
        body: {},
      });
    } catch (error) {
      this.logger.error({
        message: `Error completing service request ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.complete`,
      });
      throw error;
    }
  }

  @TraceMethod()
  async cancel(id: string): Promise<ServiceRequestResult> {
    try {
      return await this.api.put<ServiceRequestResult>({
        path: `/v1/service-requests/${id}/cancel`,
        body: {},
      });
    } catch (error) {
      this.logger.error({
        message: `Error cancelling service request ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: `${this.logContext}.cancel`,
      });
      throw error;
    }
  }
}
