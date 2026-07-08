import { redirect } from 'next/navigation';

export default function RootPage() {
  // Automatically send users hitting the root domain to the dashboard
  redirect('/dashboard');
}