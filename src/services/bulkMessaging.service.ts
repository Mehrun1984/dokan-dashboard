import apiClient from '@/lib/axios';
import type {
  Campaign,
  BulkCustomer,
  BulkCoupon,
  MessageTemplate,
  CreateCampaignPayload,
} from '@/types/bulkMessaging';

const BASE = '/core-plugin/v1';

// ── Campaigns ────────────────────────────────────────────────────────────────

export interface CampaignFilters {
  status?: string;
  mode?: string;
  per_page?: number;
  offset?: number;
}

export async function getCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  const res = await apiClient.get<{ data: Campaign[] }>(`${BASE}/campaigns`, {
    params: filters,
  });
  return res.data.data ?? [];
}

export async function getCampaign(id: number): Promise<Campaign> {
  const res = await apiClient.get<{ data: Campaign }>(`${BASE}/campaigns/${id}`);
  return res.data.data;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const res = await apiClient.post<{ data: Campaign }>(`${BASE}/campaigns`, payload);
  return res.data.data;
}

export async function sendCampaign(id: number): Promise<Campaign> {
  const res = await apiClient.post<{ data: Campaign }>(`${BASE}/campaigns/${id}/send`);
  return res.data.data;
}

export async function retryCampaign(id: number): Promise<Campaign> {
  const res = await apiClient.post<{ data: Campaign }>(`${BASE}/campaigns/${id}/retry`);
  return res.data.data;
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/campaigns/${id}`);
}

// ── Bulk Customers ────────────────────────────────────────────────────────────

export interface CustomerListParams {
  per_page?: number;
  offset?: number;
}

export interface CustomerListResponse {
  data: BulkCustomer[];
  total: number;
}

export async function getCustomers(params?: CustomerListParams): Promise<CustomerListResponse> {
  const res = await apiClient.get<CustomerListResponse>(`${BASE}/bulk-customers`, { params });
  return res.data;
}

export async function addCustomer(
  phone_number: string,
  name?: string,
): Promise<{ id: number }> {
  const res = await apiClient.post<{ data: { id: number } }>(`${BASE}/bulk-customers`, {
    phone_number,
    name: name ?? '',
  });
  return res.data.data;
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/bulk-customers/${id}`);
}

// ── Message Templates ─────────────────────────────────────────────────────────

export async function getTemplates(storeCategoryId?: number): Promise<MessageTemplate[]> {
  const params = storeCategoryId ? { store_category_id: storeCategoryId } : {};
  const res = await apiClient.get<{ data: MessageTemplate[] }>(`${BASE}/message-templates`, { params });
  return res.data.data ?? [];
}

// ── Coupons ──────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<BulkCoupon[]> {
  const res = await apiClient.get<{ data: BulkCoupon[] }>(`${BASE}/bulk-coupons`);
  return res.data.data ?? [];
}

// ── Vendor store category ───────────────────────────────────────────────────

export interface VendorStoreCategoryResponse {
  vendor_id: number;
  store_category_id: number;
  store_categories: { id: number; name: string; slug: string }[];
}

export async function getVendorStoreCategory(): Promise<VendorStoreCategoryResponse> {
  const res = await apiClient.get<VendorStoreCategoryResponse>(`${BASE}/vendor/store-category`);
  return res.data;
}
