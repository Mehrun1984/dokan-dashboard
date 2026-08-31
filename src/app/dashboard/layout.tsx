import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import DashboardMobileHeader from '@/components/layout/DashboardMobileHeader';
import { DashboardThemeProvider } from '@/providers/DashboardThemeProvider';
import { DashboardStoreProvider } from '@/providers/DashboardStoreProvider';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_jwt')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <DashboardThemeProvider>
      <DashboardStoreProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
          <Sidebar />

        {/* 
          Main content wrapper. 
          - Mobile: padding bottom to clear the BottomNav (pb-16).
          - Desktop: logical margin start (ms-64) to clear the expanded Sidebar.
          (Note: If you implement a global state for the sidebar collapse, 
          you can dynamically switch this between ms-20 and ms-64) 
        */}
          <main className="flex-1 pb-16 md:pb-0 md:ms-64 transition-all duration-300">
            <DashboardMobileHeader />

            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          <BottomNav />
        </div>
      </DashboardStoreProvider>
    </DashboardThemeProvider>
  );
}