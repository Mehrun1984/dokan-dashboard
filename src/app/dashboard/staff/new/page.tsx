'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserPlus } from 'lucide-react';
import StaffForm, { StaffFormValues } from '@/components/staff/StaffForm';
import { vendorStaffService } from '@/services/vendorStaff.service';

export default function NewStaffPage() {
  const router = useRouter();

  const handleSave = async (values: StaffFormValues) => {
    const created = await vendorStaffService.create({
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      username: values.username,
    });

    const createdId = created?.ID ?? created?.id;

    if (createdId) {
      router.push(`/dashboard/staff/${createdId}/permissions`);
    } else {
      router.push('/dashboard/staff');
    }

    router.refresh();
  };

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
            <UserPlus size={24} className="text-blue-600" />
            افزودن کارمند جدید
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            اطلاعات کارمند را وارد کنید و سپس سطح دسترسی او را مشخص کنید.
          </p>
        </div>
      </div>

      <StaffForm mode="create" onSave={handleSave} cancelHref="/dashboard/staff" />
    </div>
  );
}
