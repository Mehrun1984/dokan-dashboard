import apiClient from '@/lib/axios';
import { DokanProduct } from '@/types/dokan'; // Ensure this matches your types location

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
  getStoreSettings: async () => {
    const { data } = await apiClient.get('/dokan/v1/settings');
    return data;
  },

  updateStoreSettings: async (settingsPayload: any) => {
    const { data } = await apiClient.put('/dokan/v1/settings', settingsPayload);
    return data;
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
  }
};