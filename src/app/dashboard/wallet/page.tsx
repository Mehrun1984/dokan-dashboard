'use client';

import React, { useEffect, useState } from 'react';
import { dokanService } from '@/services/dokan.service';
import { Wallet, ArrowDownLeft, Clock } from 'lucide-react';

export default function WalletPage() {
  const [walletData, setWalletData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const data = await dokanService.getWithdrawals();
      setWalletData(data);
    } catch (error) {
      console.error('Failed to load wallet', error);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsRequesting(true);
      await dokanService.requestWithdrawal(Number(amount));
      alert('درخواست برداشت با موفقیت ثبت شد.');
      setAmount('');
      fetchWallet(); // Refresh balance and history
    } catch (error: any) {
      alert(error.response?.data?.message || 'خطا در ثبت درخواست.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">کیف پول و تسویه حساب</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm mb-1 opacity-90">موجودی قابل برداشت</p>
          <h2 className="text-3xl font-bold">
            {walletData ? Number(walletData.balance).toLocaleString('fa-IR') : '...'} <span className="text-base font-normal">تومان</span>
          </h2>
        </div>
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Wallet size={28} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm h-fit">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">ثبت درخواست برداشت</h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ درخواستی (تومان)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start"
                placeholder="حداقل مبلغ را وارد کنید"
              />
            </div>
            <button
              type="submit"
              disabled={isRequesting || !amount}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
            >
              <ArrowDownLeft size={20} />
              {isRequesting ? 'در حال ثبت...' : 'ثبت درخواست'}
            </button>
          </form>
        </div>

        {/* Withdraw History */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">تاریخچه برداشت‌ها</h3>
          <div className="space-y-3">
            {walletData?.requests?.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">هیچ درخواستی ثبت نشده است.</p>
            ) : (
              walletData?.requests?.map((req: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{Number(req.amount).toLocaleString('fa-IR')} تومان</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{req.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md ${
                    req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status === 'approved' ? 'تایید شده' : 'در حال بررسی'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}