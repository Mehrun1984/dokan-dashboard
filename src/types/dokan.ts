export interface Category {
  id: number;
  name: string;
}

export interface ProductImage {
  id: number;
  src: string;
  alt: string;
}

export interface DokanProduct {
  id: number;
  name: string;
  categories: Category[];
  images: ProductImage[];
  regular_price: string;
  sale_price: string;
  status: string;
}

export interface StoreSocialSettings {
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
  telegram?: string;
  [key: string]: unknown;
}

export interface StoreAddressSettings {
  street_1?: string;
  [key: string]: unknown;
}

export interface StoreSettings {
  store_name?: string;
  phone?: string;
  address?: StoreAddressSettings;
  social?: StoreSocialSettings;
  gravatar?: number;
  banner?: number;
  // Compatibility fallback for custom meta serializers.
  whatsapp?: string;
  telegram?: string;
  [key: string]: unknown;
}

export type DokanCouponStatus = 'publish' | 'draft' | string;

export interface DokanCoupon {
  id: number;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed_cart' | string;
  amount: string;
  minimum_amount?: string;
  product_ids?: number[];
  usage_limit?: number;
  usage_count?: number;
  date_expires?: string | null;
  status?: DokanCouponStatus;
  date_created?: string;
  date_modified?: string;
}

export interface CreateCouponPayload {
  code: string;
  discount_type: 'percent' | 'fixed_cart';
  amount: string;
  description?: string;
  minimum_amount?: string;
  product_ids?: number[];
  usage_limit?: number;
  date_expires?: string;
  status?: 'publish' | 'draft';
}

export interface UpdateCouponPayload {
  code?: string;
  discount_type?: 'percent' | 'fixed_cart';
  amount?: string;
  description?: string;
  minimum_amount?: string;
  product_ids?: number[];
  usage_limit?: number;
  date_expires?: string;
  status?: 'publish' | 'draft';
}

