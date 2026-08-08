import { LayoutDashboard, CalendarDays, ShoppingBag, User, ShoppingCart, Clock3, Megaphone } from 'lucide-react';

export const vendorNavLinks = [
  { name: 'داشبورد', href: '/dashboard', icon: LayoutDashboard },
  { name: 'نوبت‌دهی', href: '/dashboard/bookings', icon: CalendarDays },
  { name: 'برنامه کاری', href: '/dashboard/schedule', icon: Clock3 },
  { name: 'خدمت/محصول', href: '/dashboard/products', icon: ShoppingBag },
  { name: 'سفارشات', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'تبلیغات', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'پروفایل', href: '/dashboard/profile', icon: User },
];