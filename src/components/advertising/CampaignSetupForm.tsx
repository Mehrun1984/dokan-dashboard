'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Camera, Loader2, Megaphone, MessageCircle, Pin, RefreshCw, Send, Sparkles, Target, TrendingUp, Users, Clapperboard, Film, MessagesSquare, Image as ImageIcon, PenLine, BadgeDollarSign, X } from 'lucide-react';
import {
  CampaignFormDefinition,
  CampaignFormField,
  CampaignFormUploadData,
  getCampaignFormDefinition,
  submitCampaignForm,
  uploadCampaignFormFile,
} from '@/services/campaignForm.service';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

interface FileItem {
  key: string;
  name: string;
  uploading: boolean;
  error?: string;
  data?: CampaignFormUploadData;
}

type ValuesMap = Record<string, string | string[]>;

const JALALI_DATE_RE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LucideIcon = React.ComponentType<{ className?: string }>;

const CHOICE_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/اینستاگرام/, Camera],
  [/تلگرام ادز/, Megaphone],
  [/تلگرام/, Send],
  [/روبیکا|بله(?!مب)/, MessageCircle],
  [/پین/, Pin],
  [/پیام انبوه/, MessagesSquare],
  [/ریلز|استوری|ویدیو|فیلم|بنر/, Clapperboard],
  [/پست/, ImageIcon],
  [/محتوای تبلیغ|اینفلوئنسر/, PenLine],
  [/آگاهی از برند/, Megaphone],
  [/ترافیک/, TrendingUp],
  [/مشتری بالقوه|لید|Lead/i, Users],
  [/فروش/, BadgeDollarSign],
];

const CHOICE_ICON_FALLBACKS: LucideIcon[] = [Target, Sparkles, Megaphone, TrendingUp];

const CHOICE_COLORS = [
  'text-amber-500 bg-amber-500/10',
  'text-blue-500 bg-blue-500/10',
  'text-emerald-500 bg-emerald-500/10',
  'text-violet-500 bg-violet-500/10',
  'text-rose-500 bg-rose-500/10',
];

function choiceIcon(label: string, index: number): { Icon: LucideIcon; tint: string } {
  const Icon = CHOICE_ICON_RULES.find(([re]) => re.test(label))?.[1] ?? CHOICE_ICON_FALLBACKS[index % CHOICE_ICON_FALLBACKS.length];
  return { Icon, tint: CHOICE_COLORS[index % CHOICE_COLORS.length] };
}

export default function CampaignSetupForm({ onSuccess, onBack }: Props) {
  const [definition, setDefinition] = useState<CampaignFormDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<ValuesMap>({});
  const [filesByField, setFilesByField] = useState<Record<number, FileItem[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const def = await getCampaignFormDefinition();
      setDefinition(def);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'خطا در بارگذاری فرم');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fieldById = useMemo(() => {
    const map: Record<number, CampaignFormField> = {};
    definition?.fields.forEach((f) => (map[f.id] = f));
    return map;
  }, [definition]);

  function fieldMatchesRule(rule: { field: string; operator: string; value: string }): boolean {
    const source = fieldById[Number(rule.field)];
    if (!source) return false;
    const current = values[source.name];
    if (rule.operator === '==') return Array.isArray(current) ? current.includes(rule.value) : current === rule.value;
    if (rule.operator === '!=') return Array.isArray(current) ? !current.includes(rule.value) : current !== rule.value;
    if (rule.operator === 'contains')
      return (Array.isArray(current) ? current.join(' ') : String(current ?? '')).includes(rule.value);
    return false;
  }

  function isFieldVisible(field: CampaignFormField): boolean {
    const logic = definition?.conditional[String(field.id)];
    if (!logic || !logic.rules || logic.rules.length === 0) return true;
    const satisfied = logic.rules.some((row) => row.every(fieldMatchesRule));
    return logic.action === 'hide' ? !satisfied : satisfied;
  }

  function setValue(name: string, value: string | string[]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function valueHas(field: CampaignFormField): boolean {
    if (field.type === 'file-upload') {
      const items = filesByField[field.id] ?? [];
      return items.some((it) => it.data && !it.error);
    }
    const v = values[field.name];
    if (v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    const s = String(v).trim();
    if (s === '') return false;
    if (field.type === 'jalali-date-time' || field.type === 'jalali-date') return JALALI_DATE_RE.test(s);
    if (field.type === 'email') return EMAIL_RE.test(s);
    return true;
  }

  async function handleFiles(field: CampaignFormField, selected: FileList | null) {
    if (!field.file || !selected || selected.length === 0) return;
    const existing = filesByField[field.id] ?? [];
    const maxFiles = field.file.maxFiles || 1;
    const slots = Math.max(0, maxFiles - existing.filter((it) => !it.error).length);
    if (slots <= 0) return;
    const picked = Array.from(selected).slice(0, slots);
    if (picked.length === 0) return;

    const newItems: FileItem[] = picked.map((f, i) => ({
      key: `${f.name}-${Date.now()}-${i}`,
      name: f.name,
      uploading: true,
    }));
    setFilesByField((prev) => ({ ...prev, [field.id]: [...(prev[field.id] ?? []), ...newItems] }));

    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      const itemKey = newItems[i].key;
      try {
        const data = await uploadCampaignFormFile(field.id, field.file.inputName, file);
        setFilesByField((prev) => ({
          ...prev,
          [field.id]: (prev[field.id] ?? []).map((it) =>
            it.key === itemKey ? { ...it, uploading: false, data } : it,
          ),
        }));
      } catch (e) {
        setFilesByField((prev) => ({
          ...prev,
          [field.id]: (prev[field.id] ?? []).map((it) =>
            it.key === itemKey
              ? { ...it, uploading: false, error: e instanceof Error ? e.message : 'خطا در آپلود' }
              : it,
          ),
        }));
      }
    }
  }

  function removeFile(field: CampaignFormField, key: string) {
    setFilesByField((prev) => ({
      ...prev,
      [field.id]: (prev[field.id] ?? []).filter((it) => it.key !== key),
    }));
  }

  async function handleSubmit() {
    if (!definition) return;
    setShowErrors(true);
    const missing = definition.fields.find((f) => f.required && isFieldVisible(f) && !valueHas(f));
    if (missing) {
      setSubmitError(`تکمیل فیلد «${missing.label || 'الزامی'}» الزامی است`);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: ValuesMap = {};
      definition.fields.forEach((f) => {
        if (f.type === 'file-upload') {
          const uploaded = (filesByField[f.id] ?? []).filter((it) => it.data && !it.error);
          if (uploaded.length > 0 && f.file) {
            payload[f.file.inputName] = JSON.stringify(uploaded.map((it) => it.data));
          }
          return;
        }
        const v = values[f.name];
        if (v === undefined) return;
        if (Array.isArray(v)) {
          if (v.length > 0) payload[f.name] = v;
        } else if (String(v).trim() !== '') {
          payload[f.name] = String(v);
        }
      });

      const res = await submitCampaignForm(payload);
      if (!res.ok) {
        setSubmitError(res.error ?? 'ارسال کمپین ناموفق بود');
        return;
      }
      onSuccess();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'خطا در ارسال فرم');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <X className="w-10 h-10 text-red-500" />
        <p className="text-sm text-gray-600 dark:text-gray-300">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> تلاش مجدد
        </button>
      </div>
    );
  }

  if (!definition) {
    return null;
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const labelClass = 'block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5';
  const hintClass = 'text-xs mt-1 mb-3 text-gray-500 dark:text-gray-400 leading-5';

  function renderField(field: CampaignFormField) {
    if (!isFieldVisible(field)) return null;
    const missing = showErrors && field.required && !valueHas(field);
    const invalidRing = missing ? ' ring-1 ring-red-400' : '';

    const requiredMark = field.required ? <span className="text-red-500"> *</span> : null;
    const hint = field.description ? <p className={hintClass}>{field.description}</p> : null;
    const errorText = missing ? <p className="text-xs text-red-500 mt-1">این فیلد الزامی است</p> : null;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'phone': {
        const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            {hint}
            <input
              type="text"
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              value={value}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={`${inputClass}${invalidRing}`}
            />
            {errorText}
          </div>
        );
      }
      case 'textarea': {
        const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            {hint}
            <textarea
              rows={3}
              value={value}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={`${inputClass}${invalidRing}`}
            />
            {errorText}
          </div>
        );
      }
      case 'jalali-date-time':
      case 'jalali-date': {
        const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            <p className={hintClass}>قالب تاریخ: ۱۴۰۴/۰۱/۰۱</p>
            <input
              type="text"
              dir="ltr"
              value={value}
              onChange={(e) => setValue(field.name, e.target.value.replace(/[^\d/]/g, ''))}
              className={`${inputClass} text-left${invalidRing}`}
            />
            {errorText}
          </div>
        );
      }
      case 'radio':
      case 'select': {
        const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
        const choices = field.choices ?? [];
        const wide = choices.length <= 1;
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            {hint}
            <div
              className={`grid gap-3.5 mt-1${invalidRing} ${
                wide ? 'grid-cols-1' : choices.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {choices.map((choice, i) => {
                const selected = value === choice.value;
                const { Icon, tint } = choiceIcon(choice.label, i);
                return (
                  <label
                    key={choice.value}
                    className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer select-none transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10 ring-1 ring-blue-500 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-600/60 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`wpforms-field-${field.id}`}
                      value={choice.value}
                      checked={selected}
                      onChange={() => setValue(field.name, choice.value)}
                      className="sr-only"
                    />
                    <span className="flex-1 text-sm leading-6 font-medium text-gray-900 dark:text-gray-100 break-words">
                      {choice.label}
                    </span>
                    <span
                      className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all ${tint} ${
                        selected ? 'scale-105' : 'opacity-90 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                  </label>
                );
              })}
            </div>
            {errorText}
          </div>
        );
      }
      case 'checkbox': {
        const current = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
        const choices = field.choices ?? [];
        const wide = choices.length <= 1;
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            {hint}
            <div
              className={`grid gap-3.5 mt-1${invalidRing} ${
                wide ? 'grid-cols-1' : choices.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {choices.map((choice, i) => {
                const selected = current.includes(choice.value);
                const { Icon, tint } = choiceIcon(choice.label, i);
                return (
                  <label
                    key={choice.value}
                    className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer select-none transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10 ring-1 ring-blue-500 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-600/60 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, choice.value]
                          : current.filter((v) => v !== choice.value);
                        setValue(field.name, next);
                      }}
                      className="sr-only"
                    />
                    <span className="flex-1 text-sm leading-6 font-medium text-gray-900 dark:text-gray-100 break-words">
                      {choice.label}
                    </span>
                    <span
                      className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all ${tint} ${
                        selected ? 'scale-105' : 'opacity-90 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                  </label>
                );
              })}
            </div>
            {errorText}
          </div>
        );
      }
      case 'file-upload': {
        const items = filesByField[field.id] ?? [];
        const accept = field.file?.extensions?.length
          ? field.file.extensions.map((e) => `.${e}`).join(',')
          : undefined;
        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {requiredMark}
            </label>
            {hint}
            <div
              className={`rounded-xl border-2 border-dashed px-4 py-5 text-center${
                missing ? ' border-red-400' : ' border-gray-300 dark:border-gray-700'
              }`}
            >
              <input
                type="file"
                multiple={field.file && field.file.maxFiles > 1}
                accept={accept}
                onChange={(e) => handleFiles(field, e.target.files)}
                className="text-sm text-gray-600 dark:text-gray-300"
              />
            </div>
            {items.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {items.map((it) => (
                  <li
                    key={it.key}
                    className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <span className="truncate text-gray-800 dark:text-gray-200">
                      {it.name}
                      {it.uploading && <span className="text-gray-400"> — در حال آپلود…</span>}
                      {it.error && <span className="text-red-500"> — {it.error}</span>}
                      {it.data && !it.error && !it.uploading && <span className="text-emerald-600"> — آپلود شد</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(field, it.key)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errorText}
          </div>
        );
      }
      default:
        return (
          <div
            key={field.id}
            className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300"
          >
            فیلد «{field.label || field.type}» در این نسخه پشتیبانی نمی‌شود؛ برای تکمیل آن از صفحه اصلی سایت استفاده کنید.
          </div>
        );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {definition!.fields.map((f) => renderField(f))}

      {submitError && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{submitError}</p>
      )}
      {submitting && (
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> در حال ارسال کمپین…
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
          بازگشت
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          ثبت و ارسال
        </button>
      </div>
    </div>
  );
}
