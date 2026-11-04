import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import { getCurrentVendor } from '@/lib/vendorSession';

export default async function WalletLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_jwt')?.value;

  if (!token) {
    redirect('/login');
  }

  const vendor = await getCurrentVendor(token);

  if (!vendor.isVendor) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
