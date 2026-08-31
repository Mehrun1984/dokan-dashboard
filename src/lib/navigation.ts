import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  User,
  ShoppingCart,
  Clock3,
  Megaphone,
  WalletCards,
} from 'lucide-react';

export type VendorNavLink = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
];

export const mobilePrimaryNavLinks: VendorNavLink[] = [
  vendorNavLinks[0],
  vendorNavLinks[1],
  vendorNavLinks[3],
  vendorNavLinks[5],
  vendorNavLinks[6],
];

export const mobileSecondaryNavLinks: VendorNavLink[] = [
  vendorNavLinks[2],
  vendorNavLinks[4],
  vendorNavLinks[7],
];

export function isNavLinkActive(pathname: string, href: string): boolean {
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const normalizedHref = href.endsWith('/') && href !== '/' ? href.slice(0, -1) : href;

  if (normalizedHref === '/dashboard') {
    return normalizedPathname === normalizedHref;
  }

  return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
}