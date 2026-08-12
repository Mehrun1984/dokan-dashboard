import apiClient from '@/lib/axios';
import {
  CreateCouponPayload,
  DokanCoupon,
  DokanProduct,
  StoreSettings,
  UpdateCouponPayload,
} from '@/types/dokan'; // Ensure this matches your types location

const INTERNAL_SETTINGS_ENDPOINT = '/api/vendor/settings';
const INTERNAL_SERVICE_AREA_ENDPOINT = '/api/vendor/service-area';
const INTERNAL_SERVICE_AREAS_ENDPOINT = '/api/vendor/service-areas';
const INTERNAL_REVERSE_GEOCODE_ENDPOINT = '/api/vendor/reverse-geocode';

export interface VendorServiceAreaTerm {
  id: number;
  name: string;
  slug: string;
}

export interface VendorServiceAreaResponse {
  vendor_id: number;
  service_area: VendorServiceAreaTerm | null;
  location_name: string;
  latitude: string;
  longitude: string;
}

export interface VendorServiceAreasResponse {
  locations: VendorServiceAreaTerm[];
}

export interface UpdateVendorServiceAreaPayload {
  service_area_id?: number;
  latitude?: string;
  longitude?: string;
}

export interface ReverseGeocodePayload {
  latitude: string;
  longitude: string;
}

export interface ReverseGeocodeResponse {
  latitude: string;
  longitude: string;
  address: string;
}

const parseInternalApiResponse = async (res: Response) => {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message || payload?.error || 'Request failed';
    throw new Error(message);
  }
  return payload;
};

export const dokanService = {
  // ==========================================
  // PRODUCTS
  // ==========================================
  getProducts: async (): Promise<DokanProduct[]> => {
    const { data } = await apiClient.get('/dokan/v1/products');
    return data;
  },

  updateProductPrices: async (
    id: number, 
    prices: { regular_price: string; sale_price?: string }
  ): Promise<DokanProduct> => {
    // We strictly ONLY send the prices in the PUT payload
    const { data } = await apiClient.put(`/dokan/v1/products/${id}`, prices);
    return data;
  },

  // ==========================================
  // ORDERS
  // ==========================================
  getOrders: async () => {
    const { data } = await apiClient.get('/dokan/v1/orders', {
      params: {
        status: 'any',
        per_page: 100,
        page: 1,
      },
    });
    return data;
  },

  updateOrderStatus: async (orderId: number, status: string) => {
    const { data } = await apiClient.put(`/dokan/v1/orders/${orderId}`, { status });
    return data;
  },

  // ==========================================
  // WALLET & WITHDRAWALS
  // ==========================================
  getWithdrawals: async () => {
    const { data } = await apiClient.get('/dokan/v1/withdraw');
    return data;
  },

  requestWithdrawal: async (amount: number, method: string = 'bank_transfer') => {
    const { data } = await apiClient.post('/dokan/v1/withdraw', { amount, method });
    return data;
  },

  // ==========================================
  // PROFILE & SETTINGS
  // ==========================================
  getStoreSettings: async (): Promise<StoreSettings> => {
    const res = await fetch(INTERNAL_SETTINGS_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  updateStoreSettings: async (settingsPayload: StoreSettings): Promise<StoreSettings> => {
    const res = await fetch(INTERNAL_SETTINGS_ENDPOINT, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsPayload),
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  getVendorServiceArea: async (): Promise<VendorServiceAreaResponse> => {
    const res = await fetch(INTERNAL_SERVICE_AREA_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  getServiceAreas: async (): Promise<VendorServiceAreasResponse> => {
    const res = await fetch(INTERNAL_SERVICE_AREAS_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  updateVendorServiceArea: async (payload: UpdateVendorServiceAreaPayload) => {
    const res = await fetch(INTERNAL_SERVICE_AREA_ENDPOINT, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  reverseGeocode: async (payload: ReverseGeocodePayload): Promise<ReverseGeocodeResponse> => {
    const res = await fetch(INTERNAL_REVERSE_GEOCODE_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return parseInternalApiResponse(res);
  },

  // ==========================================
  // MEDIA UPLOADS
  // ==========================================
  uploadMedia: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Using WP Core Media endpoint. Requires multipart/form-data.
    const { data } = await apiClient.post('/wp/v2/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.id; // Return the Attachment ID required by Dokan settings
  },

  // ==========================================
  // DASHBOARD REPORTS (Stats & Charts)
  // ==========================================
  getReportSummary: async () => {
    try {
      const { data } = await apiClient.get('/dokan/v1/report/summary');
      return data;
    } catch (error: any) {
      // If endpoint doesn't exist (Dokan Lite), return fallback zeros
      if (error.response?.status === 404) {
        return { sales: 0, balance: 0, orders: 0 };
      }
      throw error;
    }
  },

  getSalesReport: async () => {
    try {
      const { data } = await apiClient.get('/dokan/v1/report/sales');
      return data;
    } catch (error: any) {
      // If endpoint doesn't exist, return empty array so the chart doesn't crash
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // ==========================================
  // COUPONS
  // ==========================================
  getCoupons: async (): Promise<DokanCoupon[]> => {
    const { data } = await apiClient.get('/dokan/v1/coupons', {
      params: {
        per_page: 100,
        page: 1,
      },
    });
    return data;
  },

  createCoupon: async (payload: CreateCouponPayload): Promise<DokanCoupon> => {
    const { data } = await apiClient.post('/dokan/v1/coupons', payload);
    return data;
  },

  updateCoupon: async (couponId: number, payload: UpdateCouponPayload): Promise<DokanCoupon> => {
    const { data } = await apiClient.put(`/dokan/v1/coupons/${couponId}`, payload);
    return data;
  },

  deleteCoupon: async (couponId: number): Promise<void> => {
    await apiClient.delete(`/dokan/v1/coupons/${couponId}`);
  },

  toggleCouponStatus: async (couponId: number, isActive: boolean): Promise<DokanCoupon> => {
    const nextStatus = isActive ? 'draft' : 'publish';
    return dokanService.updateCoupon(couponId, { status: nextStatus });
  }
};