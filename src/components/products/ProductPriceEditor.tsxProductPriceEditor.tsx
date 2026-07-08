'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { dokanService } from '@/services/dokan.service';

// 1. Define Zod Schema (Only allowing price edits)
const priceSchema = z.object({
  regular_price: z.string().min(1, 'قیمت اصلی الزامی است'),
  sale_price: z.string().optional(),
});

type PriceFormData = z.infer<typeof priceSchema>;

// Props simulating data passed from a parent page
interface ProductEditProps {
  product: {
    id: number;
    title: string;
    category: string;
    regular_price: string;
    sale_price: string;
  };
}

export default function ProductPriceEditor({ product }: ProductEditProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PriceFormData>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      regular_price: product.regular_price,
      sale_price: product.sale_price,
    },
  });

  const onSubmit = async (data: PriceFormData) => {
    try {
      await dokanService.updateProductPrices(product.id, data);
      alert('قیمت با موفقیت بروزرسانی شد!'); // Success notification
    } catch (error) {
      console.error('Update failed', error);
    }
  };

  return (
    // Assuming root layout has dir="rtl", but explicitly added here for safety
    <div dir="rtl" className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-start">ویرایش قیمت خدمات/محصول</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* READ-ONLY FIELDS: Title & Category */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">عنوان (غیر قابل تغییر)</label>
            <p className="text-gray-900 font-semibold">{product.title}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">دسته‌بندی (غیر قابل تغییر)</label>
            <p className="text-gray-900">{product.category}</p>
          </div>
        </div>

        {/* EDITABLE FIELDS: Prices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قیمت اصلی (تومان)</label>
            <input
              type="number"
              {...register('regular_price')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-start outline-none transition-all"
              placeholder="مثال: 500000"
            />
            {errors.regular_price && (
              <span className="text-red-500 text-xs mt-1 block">{errors.regular_price.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قیمت حراج (تومان)</label>
            <input
              type="number"
              {...register('sale_price')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-start outline-none transition-all"
              placeholder="در صورت نداشتن حراج خالی بگذارید"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </form>
    </div>
  );
}