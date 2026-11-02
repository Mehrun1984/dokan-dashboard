import apiClient from '@/lib/axios';
import type {
  CreateVendorStaffPayload,
  StaffCapability,
  UpdateVendorStaffPayload,
  VendorStaff,
  VendorStaffCapabilityGroups,
  VendorStaffCapabilityMap,
} from '@/types/vendor';

const BASE_ENDPOINT = '/dokan/v1/vendor-staff';

const normalizeStaffList = (payload: unknown): VendorStaff[] => {
  if (Array.isArray(payload)) {
    return payload as VendorStaff[];
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: VendorStaff[] }).data;
  }

  return [];
};

const normalizeStaff = (payload: unknown): VendorStaff | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('ID' in payload || 'id' in payload) {
    return payload as VendorStaff;
  }

  const nested = (payload as { data?: unknown }).data;
  return nested && typeof nested === 'object' ? (nested as VendorStaff) : null;
};

const normalizeCapabilityMap = (payload: unknown): VendorStaffCapabilityMap => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const source =
    'capabilities' in payload && (payload as { capabilities?: unknown }).capabilities
      ? (payload as { capabilities: unknown }).capabilities
      : payload;

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  return Object.entries(source as Record<string, unknown>).reduce<VendorStaffCapabilityMap>(
    (accumulator, [capability, value]) => {
      if (typeof value === 'boolean') {
        accumulator[capability] = value;
      }
      return accumulator;
    },
    {}
  );
};

export const vendorStaffService = {
  list: async (params?: { page?: number; per_page?: number; search?: string }): Promise<VendorStaff[]> => {
    const { data } = await apiClient.get(BASE_ENDPOINT, { params });
    return normalizeStaffList(data);
  },

  get: async (id: string | number): Promise<VendorStaff | null> => {
    const { data } = await apiClient.get(`${BASE_ENDPOINT}/${id}`);
    return normalizeStaff(data);
  },

  create: async (payload: CreateVendorStaffPayload): Promise<VendorStaff | null> => {
    const { data } = await apiClient.post(BASE_ENDPOINT, payload);
    return normalizeStaff(data);
  },

  update: async (id: string | number, payload: UpdateVendorStaffPayload): Promise<VendorStaff | null> => {
    const { data } = await apiClient.put(`${BASE_ENDPOINT}/${id}`, payload);
    return normalizeStaff(data);
  },

  remove: async (id: string | number): Promise<void> => {
    await apiClient.delete(`${BASE_ENDPOINT}/${id}`, { params: { force: true } });
  },

  getAllCapabilities: async (): Promise<VendorStaffCapabilityGroups> => {
    const { data } = await apiClient.get(`${BASE_ENDPOINT}/capabilities`);
    return data as VendorStaffCapabilityGroups;
  },

  getCapabilities: async (id: string | number): Promise<VendorStaffCapabilityMap> => {
    const { data } = await apiClient.get(`${BASE_ENDPOINT}/${id}/capabilities`);
    return normalizeCapabilityMap(data);
  },

  updateCapabilities: async (
    id: string | number,
    capabilities: StaffCapability[]
  ): Promise<VendorStaffCapabilityMap> => {
    const { data } = await apiClient.put(`${BASE_ENDPOINT}/${id}/capabilities`, { capabilities });
    return normalizeCapabilityMap(data);
  },
};
