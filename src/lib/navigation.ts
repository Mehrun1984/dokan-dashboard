import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  User,
  ShoppingCart,
  Clock3,
  Megaphone,
  WalletCards,
  UserCog,
} from 'lucide-react';

export type VendorNavLink = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  requiresVendor?: boolean;
};

export const vendorNavLinks: VendorNavLink[] = [
  { name: 'داشبورد', href: '/dashboard', icon: LayoutDashboard },
  { name: 'نوبت‌دهی', href: '/dashboard/bookings', icon: CalendarDays },
  { name: 'برنامه کاری', href: '/dashboard/schedule', icon: Clock3 },
  { name: 'خدمات', href: '/dashboard/products', icon: ShoppingBag },
  { name: 'سفارشات', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'تبلیغات', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'پروفایل', href: '/dashboard/profile', icon: User },
  { name: 'کیف پول', href: '/dashboard/wallet', icon: WalletCards },
  { name: 'کارمندان', href: '/dashboard/staff', icon: UserCog, requiresVendor: true },
];

const MOBILE_PRIMARY_HREFS = [
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/products',
  '/dashboard/campaigns',
  '/dashboard/profile',
];

const MOBILE_SECONDARY_HREFS = [
  '/dashboard/schedule',
  '/dashboard/orders',
  '/dashboard/wallet',
  '/dashboard/staff',
];

export function getVendorNavLinks(isVendor: boolean): VendorNavLink[] {
  return vendorNavLinks.filter((link) => !link.requiresVendor || isVendor);
}

export function getMobilePrimaryNavLinks(isVendor: boolean): VendorNavLink[] {
  return getVendorNavLinks(isVendor).filter((link) => MOBILE_PRIMARY_HREFS.includes(link.href));
}

export function getMobileSecondaryNavLinks(isVendor: boolean): VendorNavLink[] {
  return getVendorNavLinks(isVendor).filter((link) => MOBILE_SECONDARY_HREFS.includes(link.href));
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const normalizedHref = href.endsWith('/') && href !== '/' ? href.slice(0, -1) : href;

  if (normalizedHref === '/dashboard') {
    return normalizedPathname === normalizedHref;
  }

  return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
}