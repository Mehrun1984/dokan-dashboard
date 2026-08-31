'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  createCampaign,
  sendCampaign,
  getCustomers,
  getTemplates,
  getCoupons,
  getVendorStoreCategory,
} from '@/services/bulkMessaging.service';
import { dokanService } from '@/services/dokan.service';
import type {
  BulkCoupon,
  BulkCustomer,
  CampaignChannel,
  CampaignLinkType,
  CampaignMode,
  MessageTemplate,
} from '@/types/bulkMessaging';
import type { Category, DokanProduct } from '@/types/dokan';

const BusinessLocationMap = dynamic(
  () => import('@/components/profile/BusinessLocationMap'),
  { ssr: false },
);

const CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: 'sms', label: 'پیامک (SMS)' },
  { value: 'bale', label: 'بله (Bale)' },
  { value: 'telegram', label: 'تلگرام' },
  { value: 'whatsapp', label: 'واتساپ' },
];

const LINK_TYPES: { value: CampaignLinkType; label: string }[] = [
  { value: 'service', label: 'خدمت / محصول' },
  { value: 'category', label: 'دسته‌بندی' },
  { value: 'coupon', label: 'کوپن' },
];

/** Whether the template body contains the given {{variable}} placeholder. */
function templateHasVariable(body: string | undefined, variable: string): boolean {
  return !!body && body.includes(`{{${variable}}}`);
}

interface LatLng { lat: number; lng: number }

// Default center: Tehran
const DEFAULT_CENTER: LatLng = { lat: 35.6892, lng: 51.389 };

interface FormData {
  name: string;
  mode: CampaignMode;
  channels: CampaignChannel[];
  selectedCustomerIds: number[];
  recipientRowFrom: number;
  recipientRowCount: number;
  location: LatLng | null;
  radius: number;
  lbsStartTime: number;
  lbsEndTime: number;
  lbsReceiverCount: number;
  lbsDispatchMoment: string;
  address: string;
  receiverGender: string;
  receiverAgeFrom: number;
  receiverAgeTo: number;
  device: string;
  templateId: number | null;
  linkType: CampaignLinkType;
  linkTargetId: number | null;
}

const initialForm: FormData = {
  name: '',
  mode: 'customer_list',
  channels: [],
  selectedCustomerIds: [],
  recipientRowFrom: 0,
  recipientRowCount: 1000,
  location: null,
  radius: 5,
  lbsStartTime: 8,
  lbsEndTime: 20,
  lbsReceiverCount: 1000,
  lbsDispatchMoment: 'حضور',
  address: '',
  receiverGender: 'همه',
  receiverAgeFrom: 0,
  receiverAgeTo: 0,
  device: 'همه',
  templateId: null,
  linkType: 'service',
  linkTargetId: null,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewCampaignModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [customers, setCustomers] = useState<BulkCustomer[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [products, setProducts] = useState<DokanProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<BulkCoupon[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setForm(initialForm);
      setSubmitError(null);
      setPreviewTemplate(null);
    }
  }, [isOpen]);

  // Fetch customers when entering step 2 in customer_list mode
  useEffect(() => {
    if (isOpen && step === 2 && form.mode === 'customer_list' && customers.length === 0) {
      setIsLoadingCustomers(true);
      getCustomers({ per_page: 200 })
        .then((res) => setCustomers(res.data))
        .finally(() => setIsLoadingCustomers(false));
    }
  }, [isOpen, step, form.mode, customers.length]);

  // Fetch templates + products/categories together when entering step 3
  useEffect(() => {
    if (isOpen && step === 3 && templates.length === 0) {
      setIsLoadingResources(true);
      let cancelled = false;

      getVendorStoreCategory()
        .then((storeCategory) => storeCategory.store_category_id)
        .catch(() => 0)
        .then((storeCategoryId) => {
          if (cancelled) return;
          return Promise.all([
            getTemplates(storeCategoryId || undefined),
            dokanService.getProducts(),
            getCoupons(),
          ])
            .then(([tmpl, prods, coups]) => {
              if (cancelled) return;
              setTemplates(tmpl);
              setProducts(prods);
              setCoupons(coups);
              const catMap = new Map<number, Category>();
              prods.forEach((p) => p.categories?.forEach((c) => catMap.set(c.id, c)));
              setCategories(Array.from(catMap.values()));
            });
        })
        .finally(() => {
          if (!cancelled) setIsLoadingResources(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, step, templates.length]);

  if (!isOpen) return null;

  const patch = (partial: Partial<FormData>) => setForm((f) => ({ ...f, ...partial }));

  const toggleChannel = (ch: CampaignChannel) => {
    if (form.mode === 'location') {
      patch({ channels: ['sms'] });
      return;
    }

    patch({
      channels: form.channels.includes(ch)
        ? form.channels.filter((c) => c !== ch)
        : [...form.channels, ch],
    });
  };

  useEffect(() => {
    if (form.mode === 'location' && (form.channels.length !== 1 || form.channels[0] !== 'sms')) {
      patch({ channels: ['sms'] });
    }
  }, [form.mode, form.channels]);

  const toggleCustomer = (id: number) => {
    patch({
      selectedCustomerIds: form.selectedCustomerIds.includes(id)
        ? form.selectedCustomerIds.filter((c) => c !== id)
        : [...form.selectedCustomerIds, id],
    });
  };

  const canGoNext = (): boolean => {
    if (step === 1) return form.name.trim().length > 0 && form.channels.length > 0;
    if (step === 2) {
      if (form.mode === 'customer_list') {
        const rowFromValid = Number.isInteger(form.recipientRowFrom) && form.recipientRowFrom >= 0;
        const rowCountValid = Number.isInteger(form.recipientRowCount) && form.recipientRowCount >= 1;
        return form.selectedCustomerIds.length > 0 && rowFromValid && rowCountValid;
      }

      const hasLocation = form.location !== null;
      const startValid = Number.isInteger(form.lbsStartTime) && form.lbsStartTime >= 0 && form.lbsStartTime <= 23;
      const endValid = Number.isInteger(form.lbsEndTime) && form.lbsEndTime >= 0 && form.lbsEndTime <= 23;
      const receiverCountValid =
        Number.isInteger(form.lbsReceiverCount) && form.lbsReceiverCount >= 1;
      const ageFromValid =
        Number.isInteger(form.receiverAgeFrom) && form.receiverAgeFrom >= 0 && form.receiverAgeFrom <= 120;
      const ageToValid =
        Number.isInteger(form.receiverAgeTo) && form.receiverAgeTo >= 0 && form.receiverAgeTo <= 120;
      const ageRangeValid = form.receiverAgeTo === 0 || form.receiverAgeFrom <= form.receiverAgeTo;

      return (
        hasLocation &&
        startValid &&
        endValid &&
        receiverCountValid &&
        ageFromValid &&
        ageToValid &&
        ageRangeValid
      );
    }
    if (step === 3) {
      if (form.templateId === null) return false;
      const selectedTemplate = templates.find((t) => t.id === form.templateId);
      const needsTarget =
        templateHasVariable(selectedTemplate?.body, 'link') ||
        templateHasVariable(selectedTemplate?.body, 'coupon');
      return !needsTarget || form.linkTargetId !== null;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const selectedTemplate = templates.find((t) => t.id === form.templateId);
      const usesLink = templateHasVariable(selectedTemplate?.body, 'link');
      const usesCoupon = templateHasVariable(selectedTemplate?.body, 'coupon');

      const campaign = await createCampaign({
        name: form.name,
        mode: form.mode,
        channels: form.mode === 'location' ? ['sms'] : form.channels,
        template_id: form.templateId!,
        ...(usesLink
          ? { link_type: form.linkType as 'service' | 'category', link_target_id: form.linkTargetId! }
          : {}),
        ...(usesCoupon ? { coupon_id: form.linkTargetId! } : {}),
        customer_ids: form.mode === 'customer_list' ? form.selectedCustomerIds : undefined,
        recipient_row_from: form.mode === 'customer_list' ? form.recipientRowFrom : undefined,
        recipient_row_count: form.mode === 'customer_list' ? form.recipientRowCount : undefined,
        location_lat: form.mode === 'location' ? form.location?.lat : undefined,
        location_lng: form.mode === 'location' ? form.location?.lng : undefined,
        location_radius: form.mode === 'location' ? form.radius : undefined,
        lbs_start_time: form.mode === 'location' ? form.lbsStartTime : undefined,
        lbs_end_time: form.mode === 'location' ? form.lbsEndTime : undefined,
        lbs_receiver_count: form.mode === 'location' ? form.lbsReceiverCount : undefined,
        lbs_dispatch_moment: form.mode === 'location' ? form.lbsDispatchMoment : undefined,
        address: form.mode === 'location' ? form.address.trim() : undefined,
        receiver_gender: form.mode === 'location' ? form.receiverGender : undefined,
        receiver_age_from: form.mode === 'location' ? form.receiverAgeFrom : undefined,
        receiver_age_to: form.mode === 'location' ? form.receiverAgeTo : undefined,
        device: form.mode === 'location' ? form.device : undefined,
      });
      await sendCampaign(campaign.id);
      onClose();
      onSuccess();
    } catch {
      setSubmitError('خطا در ارسال کمپین. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step renderers ─────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Campaign name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          نام کمپین <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="مثال: تخفیف عید نوروز"
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          نوع مخاطبان
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'customer_list', label: 'لیست مخاطبان' },
            { value: 'location', label: 'مبتنی بر مکان' },
          ] as { value: CampaignMode; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                patch({
                  mode: opt.value,
                  channels: opt.value === 'location' ? ['sms'] : form.channels,
                })
              }
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                form.mode === opt.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          کانال‌های ارسال <span className="text-red-500">*</span>
        </label>
        {form.mode === 'location' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            در حالت مبتنی بر مکان، فقط ارسال پیامک فعال است.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((ch) => {
            const selected = form.channels.includes(ch.value);
            const isLockedByMode = form.mode === 'location' && ch.value !== 'sms';
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                disabled={isLockedByMode}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  selected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                } ${isLockedByMode ? 'opacity-50 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-700' : ''}`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                    selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-white" />}
                </span>
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep2CustomerList = () => {
    if (isLoadingCustomers) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (customers.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>هیچ مخاطبی ثبت نشده است.</p>
          <p className="text-sm mt-1">ابتدا از صفحه مخاطبان اضافه کنید.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              شروع ردیف گیرندگان
            </label>
            <input
              type="number"
              min={0}
              value={form.recipientRowFrom}
              onChange={(e) => patch({ recipientRowFrom: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              تعداد ردیف گیرندگان
            </label>
            <input
              type="number"
              min={1}
              value={form.recipientRowCount}
              onChange={(e) => patch({ recipientRowCount: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          بازه گیرندگان به‌صورت ردیفی در سمت سرور اعمال می‌شود.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {form.selectedCustomerIds.length} مخاطب انتخاب شده
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {customers.map((c) => {
            const selected = form.selectedCustomerIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCustomer(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-colors ${
                  selected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border ${
                    selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.name || '—'}
                  </span>
                  <span className="block text-xs text-gray-500 dir-ltr" dir="ltr">
                    {c.phone_number}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep2Location = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        روی نقشه کلیک کنید تا مرکز ارسال را تعیین نمایید. سپس شعاع را وارد کنید.
      </p>
      <BusinessLocationMap
        center={form.location ?? DEFAULT_CENTER}
        selectedLocation={form.location}
        onLocationChange={(loc) => patch({ location: loc })}
      />
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          شعاع (کیلومتر)
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={form.radius}
          onChange={(e) => patch({ radius: Math.max(1, Number(e.target.value)) })}
          className="w-28 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 text-center"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            ساعت شروع
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={form.lbsStartTime}
            onChange={(e) =>
              patch({ lbsStartTime: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            ساعت پایان
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={form.lbsEndTime}
            onChange={(e) =>
              patch({ lbsEndTime: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            تعداد گیرنده
          </label>
          <input
            type="number"
            min={1}
            value={form.lbsReceiverCount}
            onChange={(e) => patch({ lbsReceiverCount: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          وضعیت ارسال (dispatch moment)
        </label>
        <select
          value={form.lbsDispatchMoment}
          onChange={(e) => patch({ lbsDispatchMoment: e.target.value })}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        >
          <option value="حضور">حضور</option>
          <option value="ورود">ورود</option>
          <option value="خروج">خروج</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          آدرس
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => patch({ address: e.target.value })}
          placeholder="مثال: تهران، ولیعصر"
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            جنسیت گیرنده
          </label>
          <select
            value={form.receiverGender}
            onChange={(e) => patch({ receiverGender: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          >
            <option value="همه">همه</option>
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            نوع دستگاه
          </label>
          <select
            value={form.device}
            onChange={(e) => patch({ device: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          >
            <option value="همه">همه</option>
            <option value="اندروید">اندروید</option>
            <option value="iOS">iOS</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            سن از
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={form.receiverAgeFrom}
            onChange={(e) =>
              patch({ receiverAgeFrom: Math.min(120, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            سن تا
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={form.receiverAgeTo}
            onChange={(e) =>
              patch({ receiverAgeTo: Math.min(120, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      {form.location && (
        <p className="text-xs text-gray-400 dir-ltr" dir="ltr">
          {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
        </p>
      )}
    </div>
  );

  const renderStep3 = () => {
    const selectedTemplate = templates.find((t) => t.id === form.templateId);
    const templateUsesLink = templateHasVariable(selectedTemplate?.body, 'link');
    const templateUsesCoupon = templateHasVariable(selectedTemplate?.body, 'coupon');
    const needsLinkSelection = templateUsesLink || templateUsesCoupon;
    const availableLinkTypes = LINK_TYPES.filter((lt) =>
      lt.value === 'coupon' ? templateUsesCoupon : templateUsesLink,
    );

    const targetOptions =
      form.linkType === 'coupon'
        ? coupons.map((c) => ({ id: c.id, label: c.code }))
        : form.linkType === 'service'
          ? products.map((p) => ({ id: p.id, label: p.name }))
          : categories.map((c) => ({ id: c.id, label: c.name }));

    const targetLabel =
      form.linkType === 'coupon'
        ? 'انتخاب کوپن'
        : form.linkType === 'service'
          ? 'انتخاب خدمت / محصول'
          : 'انتخاب دسته‌بندی';

    return (
      <div className="space-y-5">
        {/* Template selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            قالب پیام <span className="text-red-500">*</span>
          </label>
          {isLoadingResources ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
              هیچ قالبی تعریف نشده است.
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const usesLink = templateHasVariable(t.body, 'link');
                    const usesCoupon = templateHasVariable(t.body, 'coupon');
                    const nextLinkType: CampaignLinkType =
                      usesCoupon && !usesLink ? 'coupon' : 'service';
                    patch({ templateId: t.id, linkType: nextLinkType, linkTargetId: null });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const usesLink = templateHasVariable(t.body, 'link');
                      const usesCoupon = templateHasVariable(t.body, 'coupon');
                      const nextLinkType: CampaignLinkType =
                        usesCoupon && !usesLink ? 'coupon' : 'service';
                      patch({ templateId: t.id, linkType: nextLinkType, linkTargetId: null });
                    }
                  }}
                  className={`w-full flex items-start gap-2 text-right px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                    form.templateId === t.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.title}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {t.body}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(t);
                    }}
                    className="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-1"
                  >
                    مشاهده
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* نوع لینک — only relevant once a template is selected and it actually
            references {{link}} and/or {{coupon}}; otherwise there's nothing to pick. */}
        {needsLinkSelection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع لینک <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {availableLinkTypes.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => patch({ linkType: lt.value, linkTargetId: null })}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                    form.linkType === lt.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* هدف لینک */}
        {needsLinkSelection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {targetLabel} <span className="text-red-500">*</span>
            </label>
            {isLoadingResources ? (
              <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ) : targetOptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                موردی یافت نشد.
              </p>
            ) : (
              <select
                value={form.linkTargetId ?? ''}
                onChange={(e) =>
                  patch({ linkTargetId: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="">انتخاب کنید...</option>
                {targetOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    const selectedTemplate = templates.find((t) => t.id === form.templateId);
    const modeLabel = form.mode === 'customer_list' ? 'لیست مخاطبان' : 'مبتنی بر مکان';
    const channelLabels = form.channels
      .map((ch) => CHANNELS.find((c) => c.value === ch)?.label ?? ch)
      .join('، ');
    const needsLinkSelection =
      templateHasVariable(selectedTemplate?.body, 'link') ||
      templateHasVariable(selectedTemplate?.body, 'coupon');
    const linkTypeLabel = LINK_TYPES.find((lt) => lt.value === form.linkType)?.label ?? form.linkType;
    const targetOptions =
      form.linkType === 'coupon'
        ? coupons.map((c) => ({ id: c.id, label: c.code }))
        : form.linkType === 'service'
          ? products.map((p) => ({ id: p.id, label: p.name }))
          : categories.map((c) => ({ id: c.id, label: c.name }));
    const targetLabel = targetOptions.find((o) => o.id === form.linkTargetId)?.label ?? String(form.linkTargetId);

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">خلاصه کمپین</h3>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">نام</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{form.name}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">نوع</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{modeLabel}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">کانال‌ها</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{channelLabels}</dd>
          </div>
          {form.mode === 'customer_list' && (
            <>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">تعداد مخاطبان</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.selectedCustomerIds.length.toLocaleString('fa-IR')} نفر
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">شروع ردیف</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.recipientRowFrom.toLocaleString('fa-IR')}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">تعداد ردیف</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.recipientRowCount.toLocaleString('fa-IR')}
                </dd>
              </div>
            </>
          )}
          {form.mode === 'location' && form.location && (
            <>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">شعاع</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.radius.toLocaleString('fa-IR')} کیلومتر
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">ساعت شروع</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.lbsStartTime.toLocaleString('fa-IR')}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">ساعت پایان</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.lbsEndTime.toLocaleString('fa-IR')}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">تعداد گیرنده</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {form.lbsReceiverCount.toLocaleString('fa-IR')}
                </dd>
              </div>
            </>
          )}
          {needsLinkSelection && (
            <>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">نوع لینک</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{linkTypeLabel}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">هدف لینک</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{targetLabel}</dd>
              </div>
            </>
          )}
          <div className="text-sm">
            <dt className="text-gray-500 mb-1">قالب پیام</dt>
            <dd className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-sm">
              {selectedTemplate?.body ?? '—'}
            </dd>
          </div>
        </dl>

        {submitError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
            {submitError}
          </p>
        )}
      </div>
    );
  };

  const stepTitles = ['اطلاعات پایه', 'مخاطبان', 'پیام و لینک', 'تأیید نهایی'];

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">کمپین جدید</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              مرحله {step.toLocaleString('fa-IR')} از ۴ — {stepTitles[step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && renderStep1()}
          {step === 2 && form.mode === 'customer_list' && renderStep2CustomerList()}
          {step === 2 && form.mode === 'location' && renderStep2Location()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              قبلی
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              انصراف
            </button>
          )}

          <div className="flex-1" />

          {step < 4 ? (
            <button
              type="button"
              disabled={!canGoNext()}
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              بعدی
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {isSubmitting ? 'در حال ارسال...' : 'ارسال کمپین'}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Template preview modal */}
    {previewTemplate && (
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => setPreviewTemplate(null)}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {previewTemplate.title}
            </h3>
            <button
              onClick={() => setPreviewTemplate(null)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {previewTemplate.body}
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
