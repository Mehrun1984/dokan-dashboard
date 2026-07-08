'use client';

import React, { useEffect, useState } from 'react';
import { dokanService } from '@/services/dokan.service';
import { AlertCircle, ShoppingBag } from 'lucide-react';

const ORDER_STATUSES = [
  { value: 'wc-pending', label: 'در انتظار پرداخت' },
  { value: 'wc-processing', label: 'در حال انجام' },
  { value: 'wc-contacted', label: 'تماس گرفته شد' }, // Custom Status
  { value: 'wc-completed', label: 'تکمیل شده' },
  { value: 'wc-cancelled', label: 'لغو شده' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
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
      const data = await dokanService.getOrders();
      const normalizedOrders = Array.isArray(data)
        ? data
        : (
          Array.isArray((data as any)?.orders)
            ? (data as any).orders
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : Array.isArray((data as any)?.results)
                ? (data as any).results
                : Array.isArray((data as any)?.items)
                  ? (data as any).items
                  : []
        );

      setOrders(normalizedOrders);
    } catch (error: any) {
      console.error('Failed to load orders', error);
      setLoadError(error?.response?.data?.message || 'خطا در دریافت سفارشات.');
      setOrders([]);
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

  return (
    <div className="space-y-6 pb-24 relative min-h-[80vh]">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">سفارشات مشتریان</h1>

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
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center text-center">
          <ShoppingBag size={44} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">سفارشی یافت نشد</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">هنوز سفارشی برای نمایش وجود ندارد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

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