'use client';

import Link from 'next/link';
import { Wallet, X } from 'lucide-react';

interface WalletEmptyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletEmptyModal({ isOpen, onClose }: WalletEmptyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            موجودی کیف پول کافی نیست
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wallet size={28} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">
            برای ساخت کمپین جدید، ابتدا موجودی کیف پول خود را افزایش دهید.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex flex-col gap-2">
          <Link
            href="/dashboard/wallet"
            onClick={onClose}
            className="w-full text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            شارژ کیف پول
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
