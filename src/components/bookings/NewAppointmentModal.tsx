'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingService } from '@/services/booking.service';
import { dokanService } from '@/services/dokan.service';
import { DokanProduct } from '@/types/dokan';
import { X, AlertCircle, ChevronDown, Check } from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const bookingSchema = z.object({
  customer_name: z.string().min(2, 'نام مشتری الزامی است'),
  customer_phone: z.string().regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر نیست'),
  service_id: z.coerce.number().min(1, 'انتخاب خدمت الزامی است'),
  date: z.string().min(1, 'تاریخ الزامی است'),
  time_slot: z.string().min(1, 'ساعت الزامی است'),
});

type BookingFormData = z.infer<typeof bookingSchema>;
type BookingFormInput = z.input<typeof bookingSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAppointmentModal({ isOpen, onClose, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<DokanProduct[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateObject | null>(null);
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BookingFormInput, unknown, BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: '',
    },
  });

  const selectedServiceId = Number(watch('service_id') || 0);
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedServiceId),
    [products, selectedServiceId]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setIsProductsLoading(true);
        setProductsError(null);
        const response = await dokanService.getProducts();
        if (!isMounted) {
          return;
        }
        setProducts(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setProducts([]);
        setProductsError('دریافت خدمات/محصولات ناموفق بود. لطفا دوباره تلاش کنید.');
      } finally {
        if (isMounted) {
          setIsProductsLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isServiceMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServiceMenuOpen]);

  const formatPriceLabel = (product: DokanProduct) => {
    const rawPrice = product.sale_price || product.regular_price;
    const amount = Number(rawPrice);

    if (!rawPrice || Number.isNaN(amount)) {
      return 'بدون قیمت';
    }

    return `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`;
  };

  const handleDateChange = (value: DateObject | null) => {
    if (!value) {
      setSelectedDate(null);
      setValue('date', '', { shouldValidate: true, shouldDirty: true });
      return;
    }

    const jsDate = value.toDate();
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');

    setSelectedDate(value);
    setValue('date', `${year}-${month}-${day}`, { shouldValidate: true, shouldDirty: true });
  };

  const handleClose = () => {
    reset();
    setSelectedDate(null);
    setIsServiceMenuOpen(false);
    setError(null);
    onClose();
  };

  const handleServiceSelect = (serviceId: number) => {
    setValue('service_id', serviceId as BookingFormInput['service_id'], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setIsServiceMenuOpen(false);
  };

  const getServiceTriggerLabel = () => {
    if (isProductsLoading) {
      return 'در حال دریافت لیست خدمات...';
    }

    if (selectedProduct) {
      return `${selectedProduct.name} | ${formatPriceLabel(selectedProduct)}`;
    }

    return 'انتخاب خدمت / محصول';
  };

  const onSubmit = async (data: BookingFormData) => {
    setError(null);

    try {
      await bookingService.createAppointment(data);
      alert('نوبت با موفقیت ثبت شد و فاکتور متناظر در سیستم ایجاد گردید.'); 
      onSuccess(); 
      handleClose(); 
    } catch (err: any) {
      console.error('Booking Transaction Failed:', err);
      setError(err.response?.data?.message || 'خطا در ثبت نوبت. لطفا دوباره تلاش کنید.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-slide-up sm:animate-fade-in">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">ثبت نوبت جدید</h3>
          <button onClick={handleClose} className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام مشتری</label>
              <input 
                {...register('customer_name')} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="نام و نام خانوادگی" 
              />
              {errors.customer_name && <span className="text-red-500 text-xs mt-1 block">{errors.customer_name.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شماره موبایل</label>
              <input 
                type="tel" 
                dir="ltr" 
                {...register('customer_phone')} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start" 
                placeholder="09123456789" 
              />
              {errors.customer_phone && <span className="text-red-500 text-xs mt-1 block text-start">{errors.customer_phone.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
                <input type="hidden" {...register('date')} />
                <DatePicker
                  value={selectedDate}
                  onChange={(value) => handleDateChange(value as DateObject | null)}
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  editable={false}
                  calendarPosition="bottom-right"
                  containerClassName="w-full"
                  inputClass="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="yyyy/mm/dd"
                />
                {errors.date && <span className="text-red-500 text-xs mt-1 block">{errors.date.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ساعت</label>
                <input 
                  type="time" 
                  {...register('time_slot')} 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                />
                {errors.time_slot && <span className="text-red-500 text-xs mt-1 block">{errors.time_slot.message}</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">خدمت / محصول</label>
              <div ref={serviceDropdownRef} className="relative">
                <input type="hidden" {...register('service_id')} />

                <button
                  type="button"
                  dir="rtl"
                  onClick={() => setIsServiceMenuOpen((prev) => !prev)}
                  disabled={isProductsLoading || products.length === 0}
                  className="w-full min-h-[44px] px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate text-right">{getServiceTriggerLabel()}</span>
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${isServiceMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isServiceMenuOpen && !isProductsLoading && products.length > 0 && (
                  <div className="absolute z-40 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                    <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {products.map((product) => {
                        const isSelected = product.id === selectedServiceId;

                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() => handleServiceSelect(product.id)}
                              className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-right hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {`شناسه ${product.id} | ${formatPriceLabel(product)}`}
                                </p>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-300 shrink-0" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              {productsError && <span className="text-amber-600 text-xs mt-1 block">{productsError}</span>}
              {!isProductsLoading && !productsError && products.length === 0 && (
                <span className="text-amber-600 text-xs mt-1 block">خدمتی برای انتخاب یافت نشد.</span>
              )}
              {errors.service_id && <span className="text-red-500 text-xs mt-1 block text-start">{errors.service_id.message}</span>}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 pb-safe">
          <button
            type="submit"
            form="booking-form"
            disabled={isSubmitting || isProductsLoading || products.length === 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-70 flex justify-center items-center transition-colors"
          >
            {isSubmitting ? 'در حال ثبت...' : 'ثبت نوبت'}
          </button>
        </div>

      </div>
    </div>
  );
}