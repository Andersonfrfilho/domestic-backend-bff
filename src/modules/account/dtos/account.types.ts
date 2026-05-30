export type UserProfileResult = {
  id: string;
  keycloakId: string;
  fullName: string;
  status: string;
  type: string;
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
