'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DokanProduct } from '@/types/dokan';
import { dokanService } from '@/services/dokan.service';
import { X } from 'lucide-react';

const priceSchema = z.object({
  regular_price: z.string().min(1, 'قیمت اصلی الزامی است'),
  sale_price: z.string().optional(),
});

type PriceFormData = z.infer<typeof priceSchema>;

interface EditPriceModalProps {
  product: DokanProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: DokanProduct) => void;
}

export default function EditPriceModal({ product, isOpen, onClose, onSuccess }: EditPriceModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PriceFormData>({
    resolver: zodResolver(priceSchema),
  });

  // Populate form when modal opens with a new product
  useEffect(() => {
    if (product) {
      reset({
        regular_price: product.regular_price || '',
        sale_price: product.sale_price || '',
      });
    }
  }, [product, reset]);

  if (!isOpen || !product) return null;

  const onSubmit = async (data: PriceFormData) => {
    try {
      const updated = await dokanService.updateProductPrices(product.id, data);
      onSuccess(updated);
      onClose();
    } catch (error) {
      console.error('Failed to update product', error);
      alert('خطا در بروزرسانی قیمت. لطفا دوباره تلاش کنید.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">ویرایش قیمت</h3>
          <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <form id="edit-price-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* STRICTLY READ-ONLY AREA */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">عنوان خدمت / محصول</label>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{product.name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">دسته‌بندی</label>
                <div className="flex flex-wrap gap-1">
                  {product.categories.map((cat: any) => (
                    <span key={cat.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-md">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* EDITABLE AREA */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-start">قیمت اصلی (تومان)</label>
                <input
                  type="number"
                  {...register('regular_price')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-start"
                  placeholder="مثال: 500000"
                />
                {errors.regular_price && (
                  <span className="text-red-500 text-xs mt-1 block text-start">{errors.regular_price.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-start">قیمت حراج (تومان)</label>
                <input
                  type="number"
                  {...register('sale_price')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-start"
                  placeholder="در صورت نداشتن حراج خالی بگذارید"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="edit-price-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center min-w-[120px]"
          >
            {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>

      </div>
    </div>
  );
}