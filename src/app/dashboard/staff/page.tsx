'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { vendorStaffService } from '@/services/vendorStaff.service';
import type { VendorStaff } from '@/types/vendor';

const getStaffId = (staff: VendorStaff) => String(staff.ID ?? staff.id ?? '');

const getStaffName = (staff: VendorStaff) => {
  const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim();
  return fullName || staff.display_name || staff.user_login || `کارمند #${getStaffId(staff)}`;
};

export default function StaffListPage() {
  const [staffList, setStaffList] = useState<VendorStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await vendorStaffService.list({ per_page: 100 });
      setStaffList(data);
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || 'دریافت لیست کارمندان انجام نشد.');
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDelete = async (staff: VendorStaff) => {
    const confirmed = window.confirm(`آیا از حذف «${getStaffName(staff)}» مطمئن هستید؟`);

    if (!confirmed) {
      return;
    }

    const staffId = getStaffId(staff);

    try {
      setDeletingId(staffId);
      setActionError(null);
      await vendorStaffService.remove(staffId);
      setStaffList((previous) => previous.filter((item) => getStaffId(item) !== staffId));
    } catch (error: any) {
      setActionError(error?.response?.data?.message || 'حذف کارمند انجام نشد.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            کارمندان فروشگاه
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            کارمندان فروشگاه را اضافه کنید و سطح دسترسی هر کدام را مدیریت کنید.
          </p>
        </div>

        <Link
          href="/dashboard/staff/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          <UserPlus size={20} />
          افزودن کارمند
        </Link>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال دریافت کارمندان...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">دریافت لیست کارمندان ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
            <button
              type="button"
              onClick={fetchStaff}
              className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            >
              تلاش دوباره
            </button>
          </div>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <Users size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">هنوز کارمندی اضافه نشده است</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            اولین کارمند فروشگاه خود را اضافه کنید تا بتوانید دسترسی‌های او را مدیریت کنید.
          </p>
          <Link
            href="/dashboard/staff/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <UserPlus size={18} />
            افزودن کارمند
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-start font-medium px-5 py-3">کارمند</th>
                  <th className="text-start font-medium px-5 py-3">ایمیل</th>
                  <th className="text-start font-medium px-5 py-3">موبایل</th>
                  <th className="text-start font-medium px-5 py-3">دسترسی‌ها</th>
                  <th className="text-end font-medium px-5 py-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => {
                  const staffId = getStaffId(staff);
                  const isDeleting = deletingId === staffId;

                  return (
                    <tr
                      key={staffId}
                      className="border-b border-gray-50 dark:border-gray-800/70 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Users size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {getStaffName(staff)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" dir="ltr">
                              {staff.user_login}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300" dir="ltr">
                        {staff.user_email || '---'}
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300" dir="ltr">
                        {staff.phone || '---'}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/staff/${staffId}/permissions`}
                          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 text-xs font-medium"
                        >
                          <ShieldCheck size={15} />
                          مدیریت دسترسی
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/staff/${staffId}/edit`}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                            aria-label="ویرایش کارمند"
                          >
                            <Pencil size={17} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(staff)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                            aria-label="حذف کارمند"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {staffList.map((staff) => {
              const staffId = getStaffId(staff);
              const isDeleting = deletingId === staffId;

              return (
                <div
                  key={staffId}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{getStaffName(staff)}</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate" dir="ltr">
                          {staff.user_login}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/staff/${staffId}/edit`}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="ویرایش کارمند"
                      >
                        <Pencil size={17} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(staff)}
                        disabled={isDeleting}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50"
                        aria-label="حذف کارمند"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300 min-w-0" dir="ltr">
                      <Mail size={15} className="text-gray-400 shrink-0" />
                      <span className="truncate">{staff.user_email || '---'}</span>
                    </p>
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300" dir="ltr">
                      <Phone size={15} className="text-gray-400 shrink-0" />
                      <span>{staff.phone || '---'}</span>
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/staff/${staffId}/permissions`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ShieldCheck size={17} />
                    مدیریت دسترسی‌ها
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
