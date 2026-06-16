export type ServiceRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRequestResult = {
  id: string;
  contractorId: string;
  providerId: string;
  serviceId: string;
  addressId: string;
  status: ServiceRequestStatus;
  contractorConfirmed: boolean;
  providerConfirmed: boolean;
  description?: string;
  scheduledAt?: string;
  priceFinal?: number;
  createdAt: string;
  updatedAt?: string;
  paymentMethodTypeId?: string;
  service?: { id: string; name: string };
  provider?: { id: string; businessName: string };
  paymentMethodType?: { id: string; name: string; label: string };
  address?: {
    id: string;
    street: string;
    number: string;
    city: string;
    state: string;
    neighborhood: string;
    latitude?: string;
    longitude?: string;
  };
};

export type CreateServiceRequestParams = {
  providerId: string;
  serviceId: string;
  addressId: string;
  description?: string;
  scheduledAt?: string;
  priceFinal?: number;
  paymentMethodTypeId?: string;
};

export type UserType = 'CUSTOMER' | 'PROVIDER';
