export type UserDocumentResponse = {
  id: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  fileUrl?: string;
};

export type AccountStatusResponse = {
  blocked: boolean;
  status: string;
  reason: string | null;
  message: string | null;
};

export type SelfUnlockInitiateParams = {
  blockId: string;
  keycloakId: string;
};

export type SelfUnlockInitiateResult = {
  success: true;
  message: string;
  destination: string;
  expiresIn: number;
};

export type SelfUnlockVerifyParams = {
  blockId: string;
  code: string;
  keycloakId: string;
};

export type SelfUnlockVerifyResult = {
  success: boolean;
  blockResolved: boolean;
  message: string;
  canRetryAt?: string;
};

export type ForgotPasswordParams = {
  email: string;
};

export type VerificationStatusResult = {
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
};

export type GetCategoriesResult = {
  success: boolean;
  data: CategoryDto[];
};

export type ProviderServiceDto = {
  id: string;
  serviceId: string;
  categoryId: string;
  categoryName: string;
  serviceName: string;
  priceBase: number | null;
  priceType: string | null;
  estimatedDurationMinutes: number | null;
  pricePerHour: number | null;
  isActive: boolean;
};

export type CreateProviderServiceParams = {
  serviceId: string;
  estimatedDurationMinutes: number;
  pricePerHour: number;
  priceBase?: number;
  priceType?: string;
};

export type CreateProviderServiceResult = {
  success: boolean;
  data: ProviderServiceDto;
};

export type GetProviderServicesResult = {
  success: boolean;
  data: ProviderServiceDto[];
};

export type UpdateProviderServiceParams = {
  serviceId: string;
  estimatedDurationMinutes?: number;
  pricePerHour?: number;
  priceBase?: number;
  priceType?: string;
  isActive?: boolean;
};

export type UpdateProviderServiceResult = {
  success: boolean;
  data: ProviderServiceDto;
};

export type DeleteProviderServiceResult = {
  success: boolean;
};

export type ProviderAvailabilityDto = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type SetProviderAvailabilityParams = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type SetProviderAvailabilityResult = {
  success: boolean;
  data: ProviderAvailabilityDto;
};

export type GetProviderAvailabilityResult = {
  success: boolean;
  data: ProviderAvailabilityDto[];
};

export type UpdateProviderAvailabilityParams = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type UpdateProviderAvailabilityResult = {
  success: boolean;
  data: ProviderAvailabilityDto;
};
