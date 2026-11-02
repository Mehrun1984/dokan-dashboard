'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react';
import { vendorStaffService } from '@/services/vendorStaff.service';
import type { StaffCapability, VendorStaff, VendorStaffCapabilityGroups } from '@/types/vendor';

const GROUP_LABELS: Record<string, string> = {
  overview: 'نمای کلی',
  report: 'گزارش‌ها',
  order: 'سفارش‌ها',
  coupon: 'کوپن‌ها',
  review: 'نظرات',
  withdraw: 'برداشت‌ها',
  product: 'محصولات',
  menu: 'منوها',
  booking: 'نوبت‌دهی',
  store_support: 'پشتیبانی فروشگاه',
  auction: 'مزایده',
};

const getGroupLabel = (key: string) => GROUP_LABELS[key] ?? key;

export default function StaffPermissionsPage() {
  const params = useParams<{ id: string }>();
  const staffId = String(params?.id ?? '');

  const [staff, setStaff] = useState<VendorStaff | null>(null);
  const [capabilityGroups, setCapabilityGroups] = useState<VendorStaffCapabilityGroups | null>(null);
  const [capabilityState, setCapabilityState] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [groups, staffCapabilities, staffData] = await Promise.all([
          vendorStaffService.getAllCapabilities(),
          vendorStaffService.getCapabilities(staffId),
          vendorStaffService.get(staffId),
        ]);

        if (!isMounted) {
          return;
        }

        setCapabilityGroups(groups);
        setCapabilityState(staffCapabilities);
        setStaff(staffData);
      } catch (error: any) {
        if (isMounted) {
          setLoadError(error?.response?.data?.message || 'دریافت دسترسی‌های کارمند انجام نشد.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (staffId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  const { groupedCapabilities, extraCapabilities, allCapabilities } = useMemo(() => {
    const groups = capabilityGroups?.all ?? {};
    const known = new Set<string>();

    const grouped = Object.entries(groups)
      .map(([groupKey, capabilities]) => {
        const entries = Object.entries(capabilities ?? {});
        entries.forEach(([capability]) => known.add(capability));

        return {
          key: groupKey,
          label: getGroupLabel(groupKey),
          capabilities: entries,
        };
      })
      .filter((group) => group.capabilities.length > 0);

    const extras = Object.keys(capabilityState)
      .filter((capability) => !known.has(capability))
      .map((capability) => [capability, capability] as [string, string]);

    const all = [
      ...grouped.flatMap((group) => group.capabilities.map(([capability]) => capability)),
      ...extras.map(([capability]) => capability),
    ];

    return {
      groupedCapabilities: grouped,
      extraCapabilities: extras,
      allCapabilities: Array.from(new Set(all)),
    };
  }, [capabilityGroups, capabilityState]);

  const toggleCapability = (capability: string) => {
    setSuccessMessage(null);
    setCapabilityState((previous) => ({ ...previous, [capability]: !previous[capability] }));
  };

  const toggleGroup = (capabilities: Array<[string, string]>) => {
    setSuccessMessage(null);
    const allEnabled = capabilities.every(([capability]) => Boolean(capabilityState[capability]));

    setCapabilityState((previous) => {
      const next = { ...previous };
      capabilities.forEach(([capability]) => {
        next[capability] = !allEnabled;
      });
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSuccessMessage(null);

      const payload: StaffCapability[] = allCapabilities.map((capability) => ({
        capability,
        access: Boolean(capabilityState[capability]),
      }));

      await vendorStaffService.updateCapabilities(staffId, payload);
      setSuccessMessage('دسترسی‌های کارمند با موفقیت ذخیره شد.');
    } catch (error: any) {
      setSaveError(error?.response?.data?.message || 'ذخیره دسترسی‌ها انجام نشد.');
    } finally {
      setIsSaving(false);
    }
  };

  const staffName =
    [staff?.first_name, staff?.last_name].filter(Boolean).join(' ') ||
    staff?.display_name ||
    staff?.user_login ||
    `کارمند #${staffId}`;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/staff"
          className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="بازگشت به لیست کارمندان"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShieldCheck size={24} className="text-blue-600" />
            مدیریت دسترسی‌ها
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{staffName}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال دریافت دسترسی‌ها...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">دریافت دسترسی‌ها ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
          </div>
        </div>
      ) : (
        <>
          {saveError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm font-medium flex items-start gap-2">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {groupedCapabilities.map((group) => {
              const allEnabled = group.capabilities.every(([capability]) => Boolean(capabilityState[capability]));

              return (
                <div
                  key={group.key}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-800">
                    <h2 className="font-bold text-gray-900 dark:text-gray-100">{group.label}</h2>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.capabilities)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200"
                    >
                      {allEnabled ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {group.capabilities.map(([capability, label]) => (
                      <label
                        key={capability}
                        className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 dark:border-gray-800/70 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(capabilityState[capability])}
                          onChange={() => toggleCapability(capability)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm text-gray-800 dark:text-gray-100">{label}</span>
                          <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5" dir="ltr">
                            {capability}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {extraCapabilities.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">سایر دسترسی‌ها</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {extraCapabilities.map(([capability, label]) => (
                    <label
                      key={capability}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 dark:border-gray-800/70 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(capabilityState[capability])}
                        onChange={() => toggleCapability(capability)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-800 dark:text-gray-100">{label}</span>
                        <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5" dir="ltr">
                          {capability}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/dashboard/staff"
              className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              بازگشت به لیست
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'در حال ذخیره...' : 'ذخیره دسترسی‌ها'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
