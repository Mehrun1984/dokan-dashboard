'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { vendorNavLinks } from '@/lib/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {vendorNavLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              <Icon 
                size={24} 
                className={isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'} 
              />
              <span 
                className={`text-[10px] font-medium ${
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
  );
}