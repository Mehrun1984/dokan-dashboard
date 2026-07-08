'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, Appointment } from '@/services/booking.service';
import NewAppointmentModal from '@/components/bookings/NewAppointmentModal';
import { AlertCircle, Calendar, CalendarDays, Clock, Plus, User } from 'lucide-react';

type BookingStatus = 'pending' | 'cancelled' | 'confirmed';

const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getStatusMeta = (status: string): { label: string; className: string; value: BookingStatus } => {
  if (status === 'pending') {
    return {
      label: 'در انتظار',
      value: 'pending',
      className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'لغو شده',
      value: 'cancelled',
      className: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300',
    };
  }

  return {
    label: 'تایید شده',
    value: 'confirmed',
    className: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300',
  };
};

const extractCustomerInfo = (apt: any) => {
  let customerName = 'مشتری (بدون نام)';
  let customerPhone = '---';

  if (apt.notes && apt.notes.includes('نام مشتری:')) {
    const parts = apt.notes.split('|');
    customerName = parts[0]?.replace('نام مشتری:', '').trim() || customerName;
    customerPhone = parts[1]?.replace('تلفن:', '').trim() || customerPhone;
  } else if (apt.customer_name) {
    customerName = apt.customer_name;
    customerPhone = apt.customer_phone || '---';
  }

  return { customerName, customerPhone };
};

const formatJalaliDate = (rawDate?: string) => {
  if (!rawDate) {
    return 'بدون تاریخ';
  }

  const normalizedDate = rawDate.split('T')[0];
  const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return rawDate;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate;
  }

  return jalaliDateFormatter.format(parsedDate);
};

const extractDate = (apt: any) => formatJalaliDate(apt.appointment_date || apt.date);
const extractTime = (apt: any) => (apt.start_time || apt.time_slot ? (apt.start_time || apt.time_slot).substring(0, 5) : '--:--');

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await bookingService.getAppointments();
      const normalized = Array.isArray(data)
        ? data
        : (
          Array.isArray((data as any)?.appointments)
            ? (data as any).appointments
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : []
        );

      setAppointments(normalized);
    } catch (error: any) {
      console.error('Failed to load appointments', error);
      setLoadError(error?.response?.data?.message || 'خطا در دریافت نوبت‌ها.');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-6 pb-24 relative min-h-[80vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">نوبت‌های من</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">مدیریت نوبت‌ها و رزروهای مشتریان</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus size={20} />
          ثبت نوبت جدید
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال دریافت نوبت‌ها...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">دریافت نوبت‌ها ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <CalendarDays size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">نوبتی یافت نشد</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">هنوز نوبتی برای نمایش وجود ندارد.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {appointments.map((apt: any) => {
              const { customerName, customerPhone } = extractCustomerInfo(apt);
              const status = getStatusMeta(apt.status || '');

              return (
                <div key={apt.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center shrink-0">
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{customerName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" dir="ltr">{customerPhone}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">تاریخ</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-500" />
                        {extractDate(apt)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">ساعت</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5" dir="ltr">
                        <Clock size={14} className="text-blue-500" />
                        {extractTime(apt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop rows */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <div className="col-span-4">مشتری</div>
              <div className="col-span-2">تاریخ</div>
              <div className="col-span-2">ساعت</div>
              <div className="col-span-2">وضعیت</div>
              <div className="col-span-2">تماس</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {appointments.map((apt: any) => {
                const { customerName, customerPhone } = extractCustomerInfo(apt);
                const status = getStatusMeta(apt.status || '');

                return (
                  <div key={apt.id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center shrink-0">
                          <User size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{customerName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">شماره مشتری</p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                      <Calendar size={15} className="text-blue-500" />
                      <span>{extractDate(apt)}</span>
                    </div>

                    <div className="col-span-2 text-sm font-mono font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5" dir="ltr">
                      <Clock size={15} className="text-blue-500" />
                      <span>{extractTime(apt)}</span>
                    </div>

                    <div className="col-span-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="col-span-2 text-sm text-gray-600 dark:text-gray-300 truncate" dir="ltr">
                      {customerPhone}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-24 end-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={28} />
      </button>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchAppointments} 
      />
    </div>
  );
}