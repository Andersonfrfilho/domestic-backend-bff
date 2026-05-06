import { Injectable } from '@nestjs/common';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';

@Injectable()
export class CompanyService {
  constructor(private readonly apiClient: ApiClientService) {}

  async listUserCompanies(userId: string) {
    return this.apiClient.get({
      path: '/companies/me',
      headers: { 'X-User-Id': userId },
    });
  }

  async getCompanyDetails(companyId: string) {
    return this.apiClient.get({
      path: `/companies/${companyId}`,
    });
  }

  async addAddress(companyId: string, body: any) {
    return this.apiClient.post({
      path: `/companies/${companyId}/addresses`,
      body,
    });
  }

  async addMember(companyId: string, body: { userId: string; role: string }) {
    return this.apiClient.post({
      path: `/companies/${companyId}/members`,
      body,
    });
  }

  async addProvider(companyId: string, body: any) {
    return this.apiClient.post({
      path: `/companies/${companyId}/providers`,
      body,
    });
  }
}
