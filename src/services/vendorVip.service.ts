import apiClient from '@/lib/axios';

const NAMESPACE = '/core-plugin/v1';

export interface VendorVipStatus {
  vendor_id: number;
  is_vip: boolean;
}

export const vendorVipService = {
  getCurrentStatus: async (): Promise<VendorVipStatus> => {
    const { data } = await apiClient.get(`${NAMESPACE}/vendor/vip`);
    return data;
  },
};
