'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { dokanService } from '@/services/dokan.service';
import type { CreateCouponPayload, DokanCoupon, DokanProduct, UpdateCouponPayload } from '@/types/dokan';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function normalizeDigits(value: string): string {
  return value
    .split('')
    .map((char) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(char);
      if (persianIndex >= 0) return String(persianIndex);

      const arabicIndex = ARABIC_DIGITS.indexOf(char);
      if (arabicIndex >= 0) return String(arabicIndex);

      return char;
    })
    .join('');
}

function normalizeNumericInput(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';

  let value = normalizeDigits(trimmed)
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0\s]/g, '')
    .replace(/٬/g, '')
    .replace(/٫/g, '.');

  value = value.replace(/،/g, ',');
  const commaCount = (value.match(/,/g) || []).length;

  if (commaCount > 0) {
    if (value.includes('.')) {
      value = value.replace(/,/g, '');
    } else if (commaCount === 1) {
      const [leftPart = '', rightPart = ''] = value.split(',');
      if (/^\d+$/.test(leftPart) && /^\d+$/.test(rightPart) && rightPart.length > 0 && rightPart.length <= 2) {
        value = `${leftPart}.${rightPart}`;
      } else {
        value = value.replace(/,/g, '');
      }
    } else {
      value = value.replace(/,/g, '');
    }
  }

  return value;
}

function parseNormalizedNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLocalDayEndIso(dateInput: string): string | undefined {
  if (!dateInput) return undefined;
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T23:59:59`;
}

const schema = z.object({
  code: z.string().trim().min(1, 'کد کوپن الزامی است'),
  discount_type: z.enum(['percent', 'fixed_cart']),
  amount: z
    .string()
    .trim()
    .min(1, 'مقدار تخفیف الزامی است')
    .refine((val) => {
      const parsed = parseNormalizedNumber(normalizeNumericInput(val));
      return parsed !== null;
    }, {
      message: 'فرمت مقدار تخفیف معتبر نیست',
    })
    .refine((val) => {
      const parsed = parseNormalizedNumber(normalizeNumericInput(val));
      return parsed !== null && parsed > 0;
    }, {
      message: 'مقدار تخفیف باید بزرگتر از صفر باشد',
    }),
  minimum_amount: z
    .string()
    .optional()
    .refine((val) => {
      const normalized = normalizeNumericInput(val ?? '');
      if (!normalized) return true;
      return parseNormalizedNumber(normalized) !== null;
    }, {
      message: 'فرمت حداقل خرید معتبر نیست',
    })
    .refine((val) => {
      const normalized = normalizeNumericInput(val ?? '');
      if (!normalized) return true;
      const parsed = parseNormalizedNumber(normalized);
      return parsed !== null && parsed >= 0;
    }, {
      message: 'حداقل خرید نمی تواند منفی باشد',
    }),
  usage_limit: z
    .string()
    .optional()
    .refine((val) => {
      const normalized = normalizeNumericInput(val ?? '');
      if (!normalized) return true;
      const parsed = parseNormalizedNumber(normalized);
      return parsed !== null && Number.isInteger(parsed);
    }, {
      message: 'محدودیت استفاده باید عدد صحیح باشد',
    })
    .refine((val) => {
      const normalized = normalizeNumericInput(val ?? '');
      if (!normalized) return true;
      const parsed = parseNormalizedNumber(normalized);
      return parsed !== null && parsed > 0;
    }, {
      message: 'محدودیت استفاده باید بزرگتر از صفر باشد',
    }),
  date_expires: z.string().optional().refine((val) => {
    if (!val) return true;
    const picked = new Date(`${val}T00:00:00`);
    if (Number.isNaN(picked.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked.getTime() >= today.getTime();
  }, 'تاریخ انقضا نباید در گذشته باشد'),
  product_ids: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCouponPayload | UpdateCouponPayload) => Promise<void>;
  editingCoupon?: DokanCoupon | null;
}

function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CouponModal({ isOpen, onClose, onSubmit, editingCoupon }: Props) {
  if (!isOpen) return null;
  return <CouponForm onClose={onClose} onSubmit={onSubmit} editingCoupon={editingCoupon} />;
}

function CouponForm({ onClose, onSubmit, editingCoupon }: Omit<Props, 'isOpen'>) {
  const isEdit = !!editingCoupon;
  const [products, setProducts] = useState<DokanProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: editingCoupon?.code ?? '',
      discount_type: editingCoupon?.discount_type === 'fixed_cart' ? 'fixed_cart' : 'percent',
      amount: editingCoupon?.amount != null ? String(editingCoupon.amount) : '',
      minimum_amount: editingCoupon?.minimum_amount != null ? String(editingCoupon.minimum_amount) : '',
      usage_limit: editingCoupon?.usage_limit != null ? String(editingCoupon.usage_limit) : '',
      date_expires: toDateInputValue(editingCoupon?.date_expires),
      product_ids: editingCoupon?.product_ids ?? [],
    },
  });

  const selectedProductIds = watch('product_ids') ?? [];

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setIsProductsLoading(true);
      setProductsError(null);
      try {
        const list = await dokanService.getProducts();
        if (!active) return;
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        if (!active) return;
        setProductsError('دریافت محصولات با خطا مواجه شد.');
      } finally {
        if (!active) return;
        setIsProductsLoading(false);
      }
    };

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setValue('product_ids', editingCoupon?.product_ids ?? []);
  }, [editingCoupon, setValue]);

  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) => {
      const name = String(product.name ?? '').toLowerCase();
      return name.includes(normalized);
    });
  }, [productSearch, products]);

  const toggleProduct = (productId: number) => {
    const next = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];
    setValue('product_ids', next, { shouldDirty: true });
  };

  const submitHandler = async (data: FormData) => {
    const normalizedCode = data.code.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim().toUpperCase();
    const normalizedAmount = normalizeNumericInput(data.amount);
    const normalizedMinimumAmount = normalizeNumericInput(data.minimum_amount ?? '');
    const normalizedUsageLimit = normalizeNumericInput(data.usage_limit ?? '');
    const basePayload = {
      code: normalizedCode,
      discount_type: data.discount_type,
      amount: normalizedAmount,
      minimum_amount: normalizedMinimumAmount || undefined,
      product_ids: data.product_ids && data.product_ids.length > 0 ? data.product_ids : [],
      usage_limit: normalizedUsageLimit ? Number(normalizedUsageLimit) : undefined,
      date_expires: toLocalDayEndIso(data.date_expires ?? '') ?? undefined,
    };

    if (isEdit) {
      const payload: UpdateCouponPayload = {
        code: basePayload.code,
        discount_type: basePayload.discount_type,
        amount: basePayload.amount,
        minimum_amount: basePayload.minimum_amount,
        product_ids: basePayload.product_ids,
        usage_limit: basePayload.usage_limit,
        date_expires: basePayload.date_expires,
      };
      await onSubmit(payload);
    } else {
      const payload: CreateCouponPayload = {
        ...basePayload,
        status: 'publish',
      };
      await onSubmit(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'ویرایش کوپن' : 'کوپن جدید'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col min-h-0">
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                کد کوپن <span className="text-red-500">*</span>
              </label>
              <input
                {...register('code')}
                type="text"
                dir="ltr"
                placeholder="SUMMER20"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              />
              {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  نوع تخفیف <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('discount_type')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="percent">درصدی</option>
                  <option value="fixed_cart">مبلغ ثابت</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  مقدار <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('amount')}
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="10"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                />
                {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  حداقل خرید
                </label>
                <input
                  {...register('minimum_amount')}
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                />
                {errors.minimum_amount && (
                  <p className="mt-1 text-sm text-red-500">{errors.minimum_amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  محدودیت استفاده
                </label>
                <input
                  {...register('usage_limit')}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                />
                {errors.usage_limit && (
                  <p className="mt-1 text-sm text-red-500">{errors.usage_limit.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                تاریخ انقضا
              </label>
              <input
                {...register('date_expires')}
                type="date"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              />
              {errors.date_expires && (
                <p className="mt-1 text-sm text-red-500">{errors.date_expires.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  محصولات مشمول
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedProductIds.length.toLocaleString('fa-IR')} انتخاب شده
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                اگر محصولی انتخاب نکنید، کوپن برای همه محصولات اعمال می‌شود.
              </p>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="جستجو محصول..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 mb-2"
              />
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-2 max-h-48 overflow-y-auto bg-gray-50/60 dark:bg-gray-800/40">
                {isProductsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : productsError ? (
                  <p className="text-sm text-red-500 py-2">{productsError}</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    محصولی پیدا نشد.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredProducts.map((product) => {
                      const checked = selectedProductIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-gray-700/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(product.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                            {product.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
