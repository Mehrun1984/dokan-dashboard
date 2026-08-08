'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  createCampaign,
  sendCampaign,
  getCustomers,
  getTemplates,
} from '@/services/bulkMessaging.service';
import { dokanService } from '@/services/dokan.service';
import type {
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
];

interface LatLng { lat: number; lng: number }

// Default center: Tehran
const DEFAULT_CENTER: LatLng = { lat: 35.6892, lng: 51.389 };

interface FormData {
  name: string;
  mode: CampaignMode;
  channels: CampaignChannel[];
  selectedCustomerIds: number[];
  location: LatLng | null;
  radius: number;
  templateId: number | null;
  linkType: CampaignLinkType;
  linkTargetId: number | null;
}

const initialForm: FormData = {
  name: '',
  mode: 'customer_list',
  channels: [],
  selectedCustomerIds: [],
  location: null,
  radius: 5,
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
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setForm(initialForm);
      setSubmitError(null);
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
      Promise.all([getTemplates(), dokanService.getProducts()])
        .then(([tmpl, prods]) => {
          setTemplates(tmpl);
          setProducts(prods);
          const catMap = new Map<number, Category>();
          prods.forEach((p) => p.categories?.forEach((c) => catMap.set(c.id, c)));
          setCategories(Array.from(catMap.values()));
        })
        .finally(() => setIsLoadingResources(false));
    }
  }, [isOpen, step, templates.length]);

  if (!isOpen) return null;

  const patch = (partial: Partial<FormData>) => setForm((f) => ({ ...f, ...partial }));

  const toggleChannel = (ch: CampaignChannel) => {
    patch({
      channels: form.channels.includes(ch)
        ? form.channels.filter((c) => c !== ch)
        : [...form.channels, ch],
    });
  };

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
      if (form.mode === 'customer_list') return form.selectedCustomerIds.length > 0;
      return form.location !== null;
    }
    if (step === 3) return form.templateId !== null && form.linkTargetId !== null;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const campaign = await createCampaign({
        name: form.name,
        mode: form.mode,
        channels: form.channels,
        template_id: form.templateId!,
        link_type: form.linkType,
        link_target_id: form.linkTargetId!,
        customer_ids: form.mode === 'customer_list' ? form.selectedCustomerIds : undefined,
        location_lat: form.mode === 'location' ? form.location?.lat : undefined,
        location_lng: form.mode === 'location' ? form.location?.lng : undefined,
        location_radius: form.mode === 'location' ? form.radius : undefined,
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
              onClick={() => patch({ mode: opt.value })}
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
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((ch) => {
            const selected = form.channels.includes(ch.value);
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  selected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
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
      <div>
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
      {form.location && (
        <p className="text-xs text-gray-400 dir-ltr" dir="ltr">
          {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
        </p>
      )}
    </div>
  );

  const renderStep3 = () => {
    const targetOptions =
      form.linkType === 'service'
        ? products.map((p) => ({ id: p.id, label: p.name }))
        : categories.map((c) => ({ id: c.id, label: c.name }));

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
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ templateId: t.id })}
                  className={`w-full text-right px-4 py-3 rounded-xl border transition-colors ${
                    form.templateId === t.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {t.body}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* نوع لینک */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نوع لینک <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {LINK_TYPES.map((lt) => (
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

        {/* هدف لینک */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {form.linkType === 'service' ? 'انتخاب خدمت / محصول' : 'انتخاب دسته‌بندی'}{' '}
            <span className="text-red-500">*</span>
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
      </div>
    );
  };

  const renderStep4 = () => {
    const selectedTemplate = templates.find((t) => t.id === form.templateId);
    const modeLabel = form.mode === 'customer_list' ? 'لیست مخاطبان' : 'مبتنی بر مکان';
    const channelLabels = form.channels
      .map((ch) => CHANNELS.find((c) => c.value === ch)?.label ?? ch)
      .join('، ');
    const linkTypeLabel = LINK_TYPES.find((lt) => lt.value === form.linkType)?.label ?? form.linkType;
    const targetOptions =
      form.linkType === 'service'
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
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">تعداد مخاطبان</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {form.selectedCustomerIds.length.toLocaleString('fa-IR')} نفر
              </dd>
            </div>
          )}
          {form.mode === 'location' && form.location && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">شعاع</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {form.radius.toLocaleString('fa-IR')} کیلومتر
              </dd>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">نوع لینک</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{linkTypeLabel}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">هدف لینک</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{targetLabel}</dd>
          </div>
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
  );
}
