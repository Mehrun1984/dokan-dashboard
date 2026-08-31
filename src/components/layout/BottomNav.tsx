'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  mobilePrimaryNavLinks,
  mobileSecondaryNavLinks,
  isNavLinkActive,
} from '@/lib/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {isMoreOpen && (
        <button
          type="button"
          aria-label="بستن منوی بیشتر"
          onClick={() => setIsMoreOpen(false)}
          className="md:hidden fixed inset-0 bg-black/30 z-40"
        />
      )}

      {isMoreOpen && (
        <div className="md:hidden fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl z-50 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">دسترسی سریع</p>
          <div className="grid grid-cols-3 gap-2">
            {mobileSecondaryNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isNavLinkActive(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 gap-1 transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-medium text-center leading-tight">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-50">
        <button
          type="button"
          aria-label={isMoreOpen ? 'بستن گزینه های بیشتر' : 'نمایش گزینه های بیشتر'}
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={`absolute -top-10 start-3 h-8 px-3 rounded-full border shadow-sm text-xs font-medium flex items-center gap-1 transition-colors ${
            isMoreOpen
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <MoreHorizontal size={16} />
          بیشتر
        </button>

        <div className="flex items-center h-16 px-1">
          {mobilePrimaryNavLinks.map((link) => {
            const isActive = isNavLinkActive(pathname, link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1"
              >
                <Icon
                  size={22}
                  className={isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'}
                />
                <span
                  className={`text-xs font-medium max-w-full truncate ${
                    isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}