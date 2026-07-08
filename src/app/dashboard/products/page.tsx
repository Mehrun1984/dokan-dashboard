'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DokanProduct } from '@/types/dokan';
import { dokanService } from '@/services/dokan.service';
import EditPriceModal from '@/components/products/EditPriceModal';
import { AlertCircle, ArrowDownUp, Edit2, PackageSearch, Search } from 'lucide-react';
import Image from 'next/image';

type SortMode = 'newest' | 'name' | 'price-asc' | 'price-desc' | 'discounted';

const toPriceNumber = (value: string | number | undefined) => Number(value || 0);

const getCategoryLabel = (product: DokanProduct) =>
  product.categories?.length ? product.categories.map((c) => c.name).join('، ') : 'بدون دسته‌بندی';

export default function ProductsPage() {
  const [products, setProducts] = useState<DokanProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<DokanProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await dokanService.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load products', error);
      setLoadError(error?.response?.data?.message || 'خطا در دریافت محصولات.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (product: DokanProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Callback to update UI instantly without re-fetching everything
  const handleProductUpdated = (updatedProduct: DokanProduct) => {
    setProducts((prev) => 
      prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p)
    );
  };

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    products.forEach((product) => {
      (product.categories || []).forEach((category) => {
        if (!map.has(category.id)) {
          map.set(category.id, category.name);
        }
      });
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [products]);

  const displayedProducts = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const categoryText = getCategoryLabel(product).toLowerCase();
      const productName = (product.name || '').toLowerCase();

      const matchesSearch = !normalizedTerm || productName.includes(normalizedTerm) || categoryText.includes(normalizedTerm);
      const matchesCategory =
        selectedCategory === 'all' ||
        product.categories?.some((category) => String(category.id) === selectedCategory);

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aRegular = toPriceNumber(a.regular_price);
      const bRegular = toPriceNumber(b.regular_price);
      const aSale = toPriceNumber(a.sale_price);
      const bSale = toPriceNumber(b.sale_price);
      const aDiscounted = aSale > 0;
      const bDiscounted = bSale > 0;

      if (sortMode === 'name') return a.name.localeCompare(b.name, 'fa');
      if (sortMode === 'price-asc') return aRegular - bRegular;
      if (sortMode === 'price-desc') return bRegular - aRegular;
      if (sortMode === 'discounted') {
        if (aDiscounted && !bDiscounted) return -1;
        if (!aDiscounted && bDiscounted) return 1;
        return b.id - a.id;
      }

      return b.id - a.id;
    });

    return sorted;
  }, [products, searchTerm, selectedCategory, sortMode]);

  const activeFilterCount = Number(Boolean(searchTerm.trim())) + Number(selectedCategory !== 'all') + Number(sortMode !== 'newest');

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">خدمات و محصولات من</h1>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {displayedProducts.length.toLocaleString('fa-IR')} محصول نمایش داده می‌شود
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <Search size={17} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام محصول یا دسته‌بندی"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ps-4 pe-10 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <div className="relative">
              <ArrowDownUp size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 pe-9 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">جدیدترین</option>
                <option value="name">نام (الف-ی)</option>
                <option value="price-asc">قیمت (کم به زیاد)</option>
                <option value="price-desc">قیمت (زیاد به کم)</option>
                <option value="discounted">دارای تخفیف</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-1 flex lg:justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSortMode('newest');
              }}
              className="w-full lg:w-auto px-4 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ریست{activeFilterCount > 0 ? ` (${activeFilterCount.toLocaleString('fa-IR')})` : ''}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال بارگذاری اطلاعات...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">دریافت محصولات ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
            <button
              type="button"
              onClick={fetchProducts}
              className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <PackageSearch size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">هیچ محصولی یافت نشد</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">شما هنوز هیچ خدمت یا محصولی ثبت نکرده‌اید.</p>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <PackageSearch size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">محصولی با این فیلتر یافت نشد</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">عبارت جستجو یا فیلتر را تغییر دهید.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {displayedProducts.map((product) => {
              const regularPrice = toPriceNumber(product.regular_price);
              const salePrice = toPriceNumber(product.sale_price);
              const hasDiscount = salePrice > 0;

              return (
                <div key={product.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative shrink-0">
                      {product.images?.[0]?.src ? (
                        <Image src={product.images[0].src} alt={product.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-[11px]">بدون عکس</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-gray-900 dark:text-gray-100 font-bold text-sm leading-6 truncate">{product.name}</h3>
                        {hasDiscount && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 font-semibold whitespace-nowrap">
                            حراج
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">{getCategoryLabel(product)}</p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">قیمت اصلی</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{regularPrice.toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">قیمت حراج</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-300">{hasDiscount ? `${salePrice.toLocaleString('fa-IR')} تومان` : '-'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(product)}
                      className="mt-3 w-full py-2.5 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors"
                    >
                      <Edit2 size={16} />
                      ویرایش قیمت
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop rows */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <div className="col-span-5">محصول</div>
              <div className="col-span-3">دسته‌بندی</div>
              <div className="col-span-2">قیمت اصلی</div>
              <div className="col-span-1">حراج</div>
              <div className="col-span-1">عملیات</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayedProducts.map((product) => {
                const regularPrice = toPriceNumber(product.regular_price);
                const salePrice = toPriceNumber(product.sale_price);
                const hasDiscount = salePrice > 0;

                return (
                  <div key={product.id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="col-span-5 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative shrink-0">
                          {product.images?.[0]?.src ? (
                            <Image src={product.images[0].src} alt={product.name} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-[11px]">بدون عکس</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">شناسه: #{product.id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 text-sm text-gray-600 dark:text-gray-300 truncate">{getCategoryLabel(product)}</div>

                    <div className="col-span-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{regularPrice.toLocaleString('fa-IR')} تومان</div>

                    <div className="col-span-1">
                      {hasDiscount ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 font-medium">
                          {salePrice.toLocaleString('fa-IR')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => openEditModal(product)}
                        className="w-full py-2 text-xs flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors"
                      >
                        <Edit2 size={13} />
                        ویرایش
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* The Edit Modal */}
      <EditPriceModal 
        isOpen={isModalOpen}
        product={selectedProduct}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProductUpdated}
      />
    </div>
  );
}