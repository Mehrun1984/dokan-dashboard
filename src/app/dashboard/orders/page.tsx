'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { dokanService } from '@/services/dokan.service';
import { bookingService, Appointment } from '@/services/booking.service';
import { useCurrentVendor } from '@/providers/CurrentVendorProvider';
import { enrichAppointmentsWithOperators } from '@/utils/bookingAppointments';
import { AlertCircle, Calendar, Clock, ShoppingBag, User } from 'lucide-react';
import {
  extractDate,
  extractOperator,
  extractTime,
  getStatusMeta,
} from '@/utils/bookingDisplay';

const ORDER_STATUSES = [
  { value: 'wc-pending', label: 'در انتظار پرداخت' },
  { value: 'wc-processing', label: 'در حال انجام' },
  { value: 'wc-contacted', label: 'تماس گرفته شد' }, // Custom Status
  { value: 'wc-completed', label: 'تکمیل شده' },
  { value: 'wc-cancelled', label: 'لغو شده' },
];

interface OrderLineItem {
  product_id?: number;
  name?: string;
  quantity?: number;
  total?: string | number;
}

interface OrderAddress {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

interface DokanOrder {
  id: number;
  status: string;
  total: string | number;
  date_created: string;
  billing?: OrderAddress;
  shipping?: OrderAddress;
  line_items?: OrderLineItem[];
}

const normalizeList = <T,>(data: unknown, keys: string[]): T[] => {
  if (Array.isArray(data)) {
    return data as T[];
  }

  const source = data as Record<string, unknown> | null | undefined;
  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key] as T[];
    }
  }

  return [];
};

const normalizePhone = (value: unknown) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  return String(value || '')
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[^\d]/g, '')
    .replace(/^0+/, '');
};

const buildAppointmentIndex = (appointments: Appointment[]) => {
  const byOrderId = new Map<number, Appointment[]>();
  const withoutOrderId: Appointment[] = [];

  appointments.forEach((appointment) => {
    const orderId = Number(appointment.order_id || 0);

    if (orderId > 0) {
      const existing = byOrderId.get(orderId) || [];
      existing.push(appointment);
      byOrderId.set(orderId, existing);
      return;
    }

    withoutOrderId.push(appointment);
  });

  return { byOrderId, withoutOrderId };
};

const findAppointmentsForOrder = (
  order: DokanOrder,
  index: ReturnType<typeof buildAppointmentIndex>
) => {
  const directMatch = index.byOrderId.get(order.id);
  if (directMatch && directMatch.length > 0) {
    return directMatch;
  }

  const orderPhone = normalizePhone(order.billing?.phone || order.shipping?.phone);
  if (!orderPhone) {
    return [];
  }

  const phoneMatches = index.withoutOrderId.filter(
    (appointment) => normalizePhone(appointment.customer_phone) === orderPhone
  );

  if (phoneMatches.length === 0) {
    return [];
  }

  const orderProductIds = new Set<number>();
  (order.line_items || []).forEach((item) => {
    const productId = Number(item.product_id || 0);
    if (productId > 0) {
      orderProductIds.add(productId);
    }
  });

  const productMatches = phoneMatches.filter((appointment) => {
    const productId = Number(appointment.product_id || appointment.service_id || 0);
    return productId > 0 && orderProductIds.has(productId);
  });

  if (productMatches.length > 0) {
    return productMatches;
  }

  return phoneMatches.length === 1 ? phoneMatches : [];
};

export default function OrdersPage() {
  const currentVendor = useCurrentVendor();
  const isStaffMode = currentVendor.isVendorStaff && !currentVendor.isVendor;
  const currentUserId = Number(currentVendor.userId || 0);

  const [orders, setOrders] = useState<DokanOrder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const [ordersResult, appointmentsResult] = await Promise.allSettled([
        dokanService.getOrders(),
        bookingService.getAppointments(),
      ]);

      if (ordersResult.status === 'rejected') {
        throw ordersResult.reason;
      }

      const normalizedOrders = normalizeList<DokanOrder>(ordersResult.value, [
        'orders',
        'data',
        'results',
        'items',
      ]);
      setOrders(normalizedOrders);

      if (appointmentsResult.status === 'fulfilled') {
        const normalizedAppointments = normalizeList<Appointment>(appointmentsResult.value, [
          'appointments',
          'data',
          'results',
          'items',
        ]);
        const enrichedAppointments = await enrichAppointmentsWithOperators(normalizedAppointments);
        setAppointments(enrichedAppointments);
      } else {
        console.error('Failed to load appointments for orders', appointmentsResult.reason);
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Failed to load orders', error);
      setLoadError(error?.response?.data?.message || 'خطا در دریافت سفارشات.');
      setOrders([]);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      setIsUpdating(true);
      await dokanService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus.replace('wc-', '') } : o))
      );
      alert('وضعیت سفارش بروزرسانی شد.');
    } catch (error) {
      alert('خطا در بروزرسانی وضعیت.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const match = ORDER_STATUSES.find(s => s.value.includes(status));
    return match ? match.label : status;
  };

  const scopedAppointments = useMemo(() => {
    if (!isStaffMode) {
      return appointments;
    }

    if (currentUserId <= 0) {
      return [];
    }

    return appointments.filter(
      (appointment) => Number(appointment.operator_user_id || 0) === currentUserId
    );
  }, [appointments, isStaffMode, currentUserId]);

  const appointmentIndex = useMemo(
    () => buildAppointmentIndex(scopedAppointments),
    [scopedAppointments]
  );

  const visibleOrders = useMemo(() => {
    if (!isStaffMode) {
      return orders;
    }

    return orders.filter(
      (order) => findAppointmentsForOrder(order, appointmentIndex).length > 0
    );
  }, [orders, isStaffMode, appointmentIndex]);

  return (
    <div className="space-y-6 pb-24 relative min-h-[80vh]">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">سفارشات مشتریان</h1>

      {isStaffMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-2xl border border-blue-100 dark:border-blue-900/40 p-4 flex items-start gap-3">
          <User size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm">شما فقط سفارش‌های مربوط به نوبت‌های خودتان را می‌بینید.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>در حال دریافت سفارشات...</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">دریافت سفارشات ناموفق بود</p>
            <p className="text-sm mt-1">{loadError}</p>
          </div>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <ShoppingBag size={44} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            {isStaffMode ? 'سفارشی مرتبط با نوبت‌های شما یافت نشد' : 'سفارشی یافت نشد'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isStaffMode
              ? 'هنوز سفارشی که شما اپراتور آن باشید ثبت نشده است.'
              : 'هنوز سفارشی برای نمایش وجود ندارد.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const relatedAppointments = findAppointmentsForOrder(order, appointmentIndex);

            return (
              <div key={order.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Card Header (Always Visible) */}
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl flex items-center justify-center">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">سفارش #{order.id}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{order.shipping?.first_name} {order.shipping?.last_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{Number(order.total).toLocaleString('fa-IR')} تومان</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

                {/* Card Details (Expandable) */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">تاریخ:</span> {new Date(order.date_created).toLocaleDateString('fa-IR')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">موبایل:</span> <span dir="ltr">{order.billing?.phone}</span></p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">تغییر وضعیت:</label>
                        <select 
                          disabled={isUpdating}
                          value={`wc-${order.status}`}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="w-full sm:w-48 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">اطلاعات نوبت</p>

                      {relatedAppointments.length > 0 ? (
                        <div className="space-y-2">
                          {relatedAppointments.map((appointment) => {
                            const status = getStatusMeta(appointment.status || '');

                            return (
                              <div
                                key={appointment.id}
                                className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                              >
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <p className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                    <User size={15} className="text-blue-500 shrink-0" />
                                    <span className="font-medium whitespace-nowrap">اپراتور:</span>
                                    <span className="truncate">{extractOperator(appointment)}</span>
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                                    <Calendar size={15} className="text-blue-500 shrink-0" />
                                    <span className="font-medium whitespace-nowrap">تاریخ نوبت:</span>
                                    <span>{extractDate(appointment)}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                  <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5" dir="ltr">
                                    <Clock size={15} className="text-blue-500" />
                                    {extractTime(appointment)}
                                  </span>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${status.className}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">نوبت مرتبطی برای این سفارش یافت نشد.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
