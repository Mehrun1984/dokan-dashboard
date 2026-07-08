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