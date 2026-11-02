export interface CurrentVendor {
  userId: number | null;
  name: string;
  roles: string[];
  isVendor: boolean;
  isVendorStaff: boolean;
}

export interface VendorStaff {
  ID?: number | string;
  id?: number | string;
  user_login: string;
  user_email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  registered_at?: string;
  user_registered?: string;
  capabilities?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface CreateVendorStaffPayload {
  username?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nickname?: string;
}

export type UpdateVendorStaffPayload = Partial<CreateVendorStaffPayload>;

export interface StaffCapability {
  capability: string;
  access: boolean;
}

export type VendorStaffCapabilityMap = Record<string, boolean>;

export interface VendorStaffCapabilityGroups {
  all: Record<string, Record<string, string>>;
  default?: string[];
}
