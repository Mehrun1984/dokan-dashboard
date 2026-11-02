'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Pencil } from 'lucide-react';
import StaffForm, { StaffFormValues } from '@/components/staff/StaffForm';
import { vendorStaffService } from '@/services/vendorStaff.service';
import type { VendorStaff } from '@/types/vendor';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const staffId = String(params?.id ?? '');

  const [staff, setStaff] = useState<VendorStaff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStaff = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await vendorStaffService.get(staffId);
        if (isMounted) {
          setStaff(data);
        }
      } catch (error: any) {
        if (isMounted) {
          setLoadError(error?.response?.data?.message || 'دریافت اطلاعات کارمند انجام نشد.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (staffId) {
      loadStaff();
    }

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  const handleSave = async (values: StaffFormValues) => {
    await vendorStaffService.update(staffId, {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      username: values.username,
    });

    router.push('/dashboard/staff');
    router.refresh();
  };

  const initialValues: Partial<StaffFormValues> | undefined = staff
    ? {
        first_name: String(staff.first_name ?? ''),
        last_name: String(staff.last_name ?? ''),
        email: String(staff.user_email ?? ''),
        phone: String(staff.phone ?? ''),
        username: String(staff.user_login ?? ''),
      }
    : undefined;

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
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
            <Pencil size={22} className="text-blue-600" />
            ویرایش کارمند
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">اطلاعات کارمند را ویرایش کنید.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال دریافت اطلاعات کارمند...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">دریافت اطلاعات ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
          </div>
        </div>
      ) : !staff ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">کارمند مورد نظر یافت نشد.</p>
        </div>
      ) : (
        <StaffForm
          mode="edit"
          initialValues={initialValues}
          onSave={handleSave}
          cancelHref="/dashboard/staff"
        />
      )}
    </div>
  );
}
