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

export type LoginParams = {
  username: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

export type RefreshTokenParams = {
  refreshToken: string;
};

export type LogoutParams = {
  refreshToken: string;
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

export type ServiceDto = {
  id: string;
  name: string;
  categoryId: string;
  description: string | null;
};

export type GetServicesResult = {
  data: ServiceDto[];
};

export type CreateCategoryParams = {
  name: string;
  slug: string;
};

export type CreateCategoryResult = {
  id: string;
  name: string;
  slug: string;
};

export type CreateServiceCatalogParams = {
  name: string;
  categoryId: string;
  description?: string;
};

export type CreateServiceCatalogResult = {
  id: string;
  name: string;
  categoryId: string;
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
  additionalPercentage: number;
};

export type SetProviderAvailabilityParams = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  additionalPercentage?: number;
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
  id: string;
  startTime: string;
  endTime: string;
  additionalPercentage?: number;
};

export type UpdateProviderAvailabilityResult = {
  success: boolean;
  data: ProviderAvailabilityDto;
};

export type DeleteProviderAvailabilityResult = {
  success: boolean;
};

export type PaymentMethodTypeDto = {
  id: string;
  name: string;
  label: string;
  icon: string | null;
};

export type GetPaymentMethodTypesResult = {
  success: boolean;
  data: PaymentMethodTypeDto[];
};

export type ProviderPaymentMethodDto = {
  id: string;
  paymentMethodTypeId: string;
  name: string;
  label: string;
  icon: string | null;
  isEnabled: boolean;
  details: Record<string, string> | null;
};

export type GetProviderPaymentMethodsResult = {
  success: boolean;
  data: ProviderPaymentMethodDto[];
};

export type SetProviderPaymentMethodEntry = {
  paymentMethodTypeId: string;
  details: Record<string, unknown> | null;
};

export type SetProviderPaymentMethodsParams = {
  methods: SetProviderPaymentMethodEntry[];
};

export type CheckPixKeyAvailabilityResult = {
  available: boolean;
};

export type ProviderProfileMeResult = {
  id: string;
  businessName: string | null;
  description: string | null;
  isAvailable: boolean;
  avatarUrl: string | null;
  averageRating: number | null;
};

export type UpdateProviderProfileBody = {
  businessName?: string;
  description?: string;
  isAvailable?: boolean;
};

export type WorkLocationDto = {
  id: string;
  addressId: string;
  name: string | null;
  isPrimary: boolean;
  city: string;
  state: string;
  street: string;
  neighborhood: string | null;
};

export type AddWorkLocationBody = {
  addressId: string;
  name?: string;
  isPrimary?: boolean;
};

export type ProviderVerificationResult = {
  status: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
};
