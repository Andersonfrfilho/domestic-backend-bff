export type UserProfileResult = {
  id: string;
  keycloakId: string;
  fullName: string;
  status: string;
  type: string;
  primaryPhone?: string;
};

export type UpdateNameParams = {
  fullName: string;
};

export type InitiateContactChangeParams = {
  contact: string;
};

export type InitiateContactChangeResult = {
  contactId: string;
  destination: string;
};

export type ConfirmContactChangeParams = {
  contactId: string;
  code: string;
};

export type ConfirmContactChangeResult = {
  success: true;
};

export type ApiUserAddress = {
  id: string;
  addressId: string;
  label: string | null;
  isPrimary: boolean;
  address?: {
    id: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: string | null;
    longitude?: string | null;
  };
};

export type AddressResult = {
  id: string;
  addressId: string;
  label: string;
  isPrimary: boolean;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
};

export type SaveAddressParams = {
  label: string;
  isPrimary?: boolean;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
};

export type AccountDocumentResult = {
  id: string;
  documentType: string;
  documentNumber?: string;
  status: string;
  uploadedAt: string;
  verifiedAt?: string | null;
};
