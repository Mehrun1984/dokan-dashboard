'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  AlertCircle,
  Megaphone,
  Users,
  Send,
  RefreshCw,
  Trash2,
  TicketPercent,
  Pencil,
} from 'lucide-react';
import {
  getCampaigns,
  getCustomers,
  sendCampaign,
  retryCampaign,
  deleteCampaign,
  deleteCustomer,
} from '@/services/bulkMessaging.service';
import type { Campaign, BulkCustomer, CampaignStatus } from '@/types/bulkMessaging';
import type { CreateCouponPayload, DokanCoupon, UpdateCouponPayload } from '@/types/dokan';
import NewCampaignModal from '@/components/advertising/NewCampaignModal';
import AddCustomerModal from '@/components/advertising/AddCustomerModal';
import CouponModal from '@/components/advertising/CouponModal';
import { dokanService } from '@/services/dokan.service';

type Tab = 'campaigns' | 'customers' | 'coupons';

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار',
  sent: 'ارسال شده',
  failed: 'ناموفق',
  cancelled: 'لغو شده',
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

const MODE_LABELS: Record<string, string> = {
  customer_list: 'لیست مخاطبان',
  location: 'مبتنی بر مکان',
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'پیامک',
  bale: 'بله',
  telegram: 'تلگرام',
  whatsapp: 'واتساپ',
};

const COUPON_STATUS_LABELS: Record<string, string> = {
  publish: 'فعال',
  draft: 'غیرفعال',
};

const COUPON_DISCOUNT_LABELS: Record<string, string> = {
  percent: 'درصدی',
  fixed_cart: 'مبلغ ثابت',
};

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<BulkCustomer[]>([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersOffset, setCustomersOffset] = useState(0);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customersFetched, setCustomersFetched] = useState(false);

  const [coupons, setCoupons] = useState<DokanCoupon[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [couponsFetched, setCouponsFetched] = useState(false);
  const [couponActionLoading, setCouponActionLoading] = useState<Record<number, string>>({});
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DokanCoupon | null>(null);

  // Per-row action loading: maps campaign id → action name
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});

  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const PER_PAGE = 50;

  const fetchCampaigns = useCallback(async () => {
    setIsCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const data = await getCampaigns({ per_page: 100 });
      setCampaigns(data);
    } catch {
      setCampaignsError('دریافت کمپین‌ها با خطا مواجه شد.');
    } finally {
      setIsCampaignsLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async (offset: number) => {
    setIsCustomersLoading(true);
    setCustomersError(null);
    try {
      const res = await getCustomers({ per_page: PER_PAGE, offset });
      setCustomers(res.data);
      setCustomersTotal(res.total);
      setCustomersFetched(true);
    } catch {
      setCustomersError('دریافت مخاطبان با خطا مواجه شد.');
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    setIsCouponsLoading(true);
    setCouponsError(null);
    try {
      const data = await dokanService.getCoupons();
      setCoupons(data);
      setCouponsFetched(true);
    } catch {
      setCouponsError('دریافت کوپن‌ها با خطا مواجه شد.');
    } finally {
      setIsCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (activeTab === 'customers' && !customersFetched) {
      fetchCustomers(0);
    }
  }, [activeTab, customersFetched, fetchCustomers]);

  useEffect(() => {
    if (activeTab === 'coupons' && !couponsFetched) {
      fetchCoupons();
    }
  }, [activeTab, couponsFetched, fetchCoupons]);

  // ── Campaign actions ────────────────────────────────────────────────────────

  const handleSend = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'send' }));
    try {
      const updated = await sendCampaign(id);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleRetry = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'retry' }));
    try {
      const updated = await retryCampaign(id);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این کمپین مطمئن هستید؟')) return;
    setActionLoading((prev) => ({ ...prev, [id]: 'delete' }));
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('آیا از حذف این مخاطب مطمئن هستید؟')) return;
    await deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setCustomersTotal((t) => t - 1);
  };

  const handlePageChange = (offset: number) => {
    setCustomersOffset(offset);
    fetchCustomers(offset);
  };

  // ── Coupon actions ─────────────────────────────────────────────────────────

  const handleCreateCoupon = async (payload: CreateCouponPayload | UpdateCouponPayload) => {
    const created = await dokanService.createCoupon(payload as CreateCouponPayload);
    setCoupons((prev) => [created, ...prev]);
  };

  const handleUpdateCoupon = async (payload: CreateCouponPayload | UpdateCouponPayload) => {
    if (!editingCoupon) return;
    const updated = await dokanService.updateCoupon(editingCoupon.id, payload as UpdateCouponPayload);
    setCoupons((prev) => prev.map((coupon) => (coupon.id === updated.id ? updated : coupon)));
  };

  const openNewCouponModal = () => {
    setEditingCoupon(null);
    setShowCouponModal(true);
  };

  const openEditCouponModal = (coupon: DokanCoupon) => {
    setEditingCoupon(coupon);
    setShowCouponModal(true);
  };

  const handleDeleteCoupon = async (couponId: number) => {
    if (!confirm('آیا از حذف این کوپن مطمئن هستید؟')) return;
    setCouponActionLoading((prev) => ({ ...prev, [couponId]: 'delete' }));
    try {
      await dokanService.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));
    } finally {
      setCouponActionLoading((prev) => {
        const next = { ...prev };
        delete next[couponId];
        return next;
      });
    }
  };

  const handleToggleCouponStatus = async (coupon: DokanCoupon) => {
    const currentStatus = coupon.status === 'publish';
    setCouponActionLoading((prev) => ({ ...prev, [coupon.id]: 'toggle' }));
    try {
      const updated = await dokanService.toggleCouponStatus(coupon.id, currentStatus);
      setCoupons((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setCouponActionLoading((prev) => {
        const next = { ...prev };
        delete next[coupon.id];
        return next;
      });
    }
  };

  const formatCouponAmount = (coupon: DokanCoupon): string => {
    const value = Number(coupon.amount || 0);
    if (coupon.discount_type === 'percent') {
      return `${value.toLocaleString('fa-IR')}%`;
    }
    return `${value.toLocaleString('fa-IR')} تومان`;
  };

  // ── Renders ─────────────────────────────────────────────────────────────────

  const renderCampaigns = () => {
    if (isCampaignsLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (campaignsError) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{campaignsError}</span>
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <Megaphone className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-base font-medium">هنوز کمپینی ایجاد نشده</p>
          <p className="text-sm mt-1">برای شروع روی «کمپین جدید» کلیک کنید.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {campaigns.map((c) => {
          const loading = actionLoading[c.id];
          const status = (c.status ?? 'draft') as CampaignStatus;
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {c.name}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {MODE_LABELS[c.mode] ?? c.mode}
                    </span>
                    {c.channels?.map((ch) => (
                      <span
                        key={ch}
                        className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full"
                      >
                        {CHANNEL_LABELS[ch] ?? ch}
                      </span>
                    ))}
                  </div>
                  {c.created_at && (
                    <p className="text-xs text-gray-400 mt-1">{formatDate(c.created_at)}</p>
                  )}
                  {(c.recipients_count != null || c.delivered_count != null) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.recipients_count != null &&
                        `${c.recipients_count.toLocaleString('fa-IR')} گیرنده`}
                      {c.recipients_count != null && c.delivered_count != null && ' · '}
                      {c.delivered_count != null &&
                        `${c.delivered_count.toLocaleString('fa-IR')} تحویل داده شده`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(status === 'draft' || status === 'failed') && (
                    <button
                      onClick={() => handleSend(c.id)}
                      disabled={!!loading}
                      title="ارسال"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {loading === 'send' ? '...' : 'ارسال'}
                    </button>
                  )}
                  {status === 'failed' && (
                    <button
                      onClick={() => handleRetry(c.id)}
                      disabled={!!loading}
                      title="تلاش مجدد"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {loading === 'retry' ? '...' : 'مجدد'}
                    </button>
                  )}
                  {(status === 'draft' || status === 'cancelled') && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={!!loading}
                      title="حذف"
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
                    >
                      {loading === 'delete' ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomers = () => {
    if (isCustomersLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (customersError) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{customersError}</span>
        </div>
      );
    }

    if (customers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <Users className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-base font-medium">هیچ مخاطبی ثبت نشده</p>
          <p className="text-sm mt-1">برای افزودن روی «افزودن مخاطب» کلیک کنید.</p>
        </div>
      );
    }

    const totalPages = Math.ceil(customersTotal / PER_PAGE);
    const currentPage = Math.floor(customersOffset / PER_PAGE) + 1;

    return (
      <div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">شماره</th>
                <th className="text-right px-4 py-3 font-medium">نام</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">منبع</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">تاریخ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300" dir="ltr">
                    {c.phone_number}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {c.name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.source}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {c.created_at ? formatDate(c.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteCustomer(c.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              {customersTotal.toLocaleString('fa-IR')} مخاطب · صفحه{' '}
              {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
            </span>
            <div className="flex gap-2">
              <button
                disabled={customersOffset === 0}
                onClick={() => handlePageChange(Math.max(0, customersOffset - PER_PAGE))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                قبلی
              </button>
              <button
                disabled={customersOffset + PER_PAGE >= customersTotal}
                onClick={() => handlePageChange(customersOffset + PER_PAGE)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCoupons = () => {
    if (isCouponsLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (couponsError) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{couponsError}</span>
        </div>
      );
    }

    if (coupons.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <TicketPercent className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-base font-medium">هنوز کوپنی ایجاد نشده</p>
          <p className="text-sm mt-1">برای شروع روی «کوپن جدید» کلیک کنید.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {coupons.map((coupon) => {
          const status = coupon.status ?? 'publish';
          const isActive = status === 'publish';
          const loading = couponActionLoading[coupon.id];
          return (
            <div
              key={coupon.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100" dir="ltr">
                      {coupon.code}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {COUPON_STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {COUPON_DISCOUNT_LABELS[coupon.discount_type] ?? coupon.discount_type}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                      {formatCouponAmount(coupon)}
                    </span>
                    {coupon.minimum_amount && (
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        حداقل خرید: {Number(coupon.minimum_amount).toLocaleString('fa-IR')}
                      </span>
                    )}
                    {coupon.usage_limit != null && (
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        محدودیت: {coupon.usage_limit.toLocaleString('fa-IR')}
                      </span>
                    )}
                    {coupon.product_ids && coupon.product_ids.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        محصولات: {coupon.product_ids.length.toLocaleString('fa-IR')}
                      </span>
                    )}
                  </div>
                  {coupon.date_expires && (
                    <p className="text-xs text-gray-400 mt-1">
                      انقضا: {formatDate(coupon.date_expires)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => handleToggleCouponStatus(coupon)}
                    disabled={!!loading}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 ${
                      isActive
                        ? 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {loading === 'toggle' ? '...' : isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  </button>
                  <button
                    onClick={() => openEditCouponModal(coupon)}
                    disabled={!!loading}
                    className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors"
                    title="ویرایش"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    disabled={!!loading}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
                    title="حذف"
                  >
                    {loading === 'delete' ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تبلیغات</h1>
        <button
          onClick={() =>
            activeTab === 'campaigns'
              ? setShowNewCampaign(true)
              : activeTab === 'customers'
                ? setShowAddCustomer(true)
                : openNewCouponModal()
          }
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'campaigns'
            ? 'کمپین جدید'
            : activeTab === 'customers'
              ? 'افزودن مخاطب'
              : 'کوپن جدید'}
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {([
          { key: 'campaigns', label: 'کمپین‌ها', icon: Megaphone },
          { key: 'customers', label: 'مخاطبان', icon: Users },
          { key: 'coupons', label: 'کوپن‌ها', icon: TicketPercent },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'campaigns'
        ? renderCampaigns()
        : activeTab === 'customers'
          ? renderCustomers()
          : renderCoupons()}

      {/* Modals */}
      <NewCampaignModal
        isOpen={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
        onSuccess={() => fetchCampaigns()}
      />
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={() => {
          setCustomersFetched(false);
          fetchCustomers(0);
        }}
      />
      <CouponModal
        isOpen={showCouponModal}
        onClose={() => {
          setShowCouponModal(false);
          setEditingCoupon(null);
        }}
        editingCoupon={editingCoupon}
        onSubmit={async (payload) => {
          if (editingCoupon) {
            await handleUpdateCoupon(payload);
          } else {
            await handleCreateCoupon(payload);
          }
        }}
      />
    </div>
  );
}
