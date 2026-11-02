'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2, Mail, Phone, User } from 'lucide-react';

const PERSIAN_ARABIC_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const toEnglishDigits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (digit) => PERSIAN_ARABIC_DIGITS[digit] ?? digit);

const staffFormSchema = z.object({
  first_name: z.string().trim().min(2, 'نام الزامی است'),
  last_name: z.string().trim().min(2, 'نام خانوادگی الزامی است'),
  email: z.string().trim().min(1, 'ایمیل الزامی است').email('ایمیل معتبر نیست'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر نیست'),
  username: z.string().trim().optional(),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<StaffFormValues>;
  onSave: (values: StaffFormValues) => Promise<void>;
  cancelHref: string;
}

const inputClassName =
  'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-start text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-60';

const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-start flex items-center gap-1.5';

export default function StaffForm({ mode, initialValues, onSave, cancelHref }: StaffFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      username: '',
      ...initialValues,
    },
  });

  const onSubmit = async (values: StaffFormValues) => {
    setServerError(null);

    try {
      await onSave({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        username: values.username?.trim() || undefined,
      });
    } catch (error: any) {
      setServerError(error?.response?.data?.message || 'ذخیره اطلاعات کارمند انجام نشد.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium text-start flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              <User size={16} className="text-gray-400" />
              نام
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              {...register('first_name')}
              className={inputClassName}
              placeholder="نام کارمند"
            />
            {errors.first_name && (
              <span className="text-red-500 text-xs mt-1.5 block text-start">{errors.first_name.message}</span>
            )}
          </div>

          <div>
            <label className={labelClassName}>
              <User size={16} className="text-gray-400" />
              نام خانوادگی
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              {...register('last_name')}
              className={inputClassName}
              placeholder="نام خانوادگی کارمند"
            />
            {errors.last_name && (
              <span className="text-red-500 text-xs mt-1.5 block text-start">{errors.last_name.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              <Mail size={16} className="text-gray-400" />
              ایمیل
            </label>
            <input
              type="email"
              dir="ltr"
              disabled={isSubmitting}
              {...register('email')}
              className={inputClassName}
              placeholder="staff@example.com"
            />
            {errors.email && (
              <span className="text-red-500 text-xs mt-1.5 block text-start">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className={labelClassName}>
              <Phone size={16} className="text-gray-400" />
              شماره موبایل
            </label>
            <input
              type="tel"
              dir="ltr"
              disabled={isSubmitting}
              {...register('phone', {
                onChange: (event) => {
                  event.target.value = toEnglishDigits(event.target.value);
                },
              })}
              className={inputClassName}
              placeholder="0912 345 6789"
            />
            {errors.phone && (
              <span className="text-red-500 text-xs mt-1.5 block text-start">{errors.phone.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              <User size={16} className="text-gray-400" />
              نام کاربری
            </label>
            <input
              type="text"
              dir="ltr"
              disabled={isSubmitting}
              {...register('username')}
              className={inputClassName}
              placeholder="اختیاری"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 text-start">
              اگر خالی بماند، نام کاربری توسط سیستم تعیین می‌شود.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-start">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">ورود کارمند با کد تایید</p>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-300/80 mt-1 leading-5">
              کارمند با همین شماره موبایل و کد تایید وارد اپ می‌شود؛ نیازی به تعیین رمز عبور نیست.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={cancelHref}
          className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          انصراف
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {isSubmitting ? 'در حال ذخیره...' : mode === 'create' ? 'ایجاد کارمند' : 'ذخیره تغییرات'}
        </button>
      </div>
    </form>
  );
}
