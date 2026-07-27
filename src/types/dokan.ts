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