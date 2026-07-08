'use client';

import React, { useEffect, useState } from 'react';
import { dokanService } from '@/services/dokan.service';
import { bookingService } from '@/services/booking.service';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Wallet, TrendingUp, ShoppingBag, CalendarClock, Clock, User, ChevronLeft 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, salesRes, appointmentsRes] = await Promise.all([
          dokanService.getReportSummary(),
          dokanService.getSalesReport(),
          bookingService.getTodayAppointments()
        ]);

        // DEBUG: See the structure of the data returning from your API
        console.log('API Response Structure:', { summaryRes, salesRes, appointmentsRes });

        setSummary(summaryRes);
        
        // FIX: Ensure we only set the array part if the API returns an object
        // If appointmentsRes is { appointments: [...] }, use appointmentsRes.appointments
        // If it is just an array, use it as is
        setTodayAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : ((appointmentsRes as any)?.appointments || []));

        if (salesRes && typeof salesRes === 'object') {
          const formattedSales = Object.entries(salesRes).map(([date, data]: any) => ({
            day: new Date(date).toLocaleDateString('fa-IR', { weekday: 'short' }),
            total: Number(data.total || 0),
          }));
          setSalesData(formattedSales);
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Filter out appointments that have already passed today
  const upcomingAppointments = (Array.isArray(todayAppointments) ? todayAppointments : [])
    .filter(apt => {
      const now = new Date();
      const currentTimeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':00';
      return (apt.start_time || '') >= currentTimeString;
    })
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 dark:text-gray-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>در حال دریافت اطلاعات داشبورد...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">سلام، وقت بخیر! 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">خلاصه‌ای از وضعیت امروز فروشگاه شما</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-3">
            <TrendingUp size={20} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">فروش کل</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {Number(summary?.sales || 0).toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">تومان</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">موجودی فعلی</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {Number(summary?.balance || 0).toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">تومان</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-3">
            <ShoppingBag size={20} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">تعداد سفارشات</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {Number(summary?.orders || 0).toLocaleString('fa-IR')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 flex items-center justify-center mb-3">
            <CalendarClock size={20} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">نوبت‌های امروز</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {Number(todayAppointments.length).toLocaleString('fa-IR')}
          </p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6">نمودار فروش (۷ روز اخیر)</h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af' }} 
                dy={10}
              />
              <Tooltip 
                formatter={(value: any) => [`${Number(value || 0).toLocaleString('fa-IR')} تومان`, 'فروش']}
                labelStyle={{ color: '#374151', fontWeight: 'bold', fontFamily: 'inherit', textAlign: 'right' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Appointments Widget */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            نوبت‌های پیش‌رو (امروز)
          </h3>
          <Link href="/dashboard/bookings" className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700">
            همه نوبت‌ها
            <ChevronLeft size={16} />
          </Link>
        </div>

        <div className="p-2">
          {upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              شما هیچ نوبت آزادی برای ادامه امروز ندارید. استراحت کنید! ☕
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      {/* Add fallbacks for missing API data */}
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{apt.customer_name || 'مشتری (بدون نام)'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">{apt.customer_phone || '---'}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono text-sm px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/60 flex items-center gap-1.5">
                    <Clock size={14} />
                    {/* Convert "03:45:00" to "03:45" */}
                    {apt.start_time ? apt.start_time.substring(0, 5) : '--:--'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}