import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_jwt')?.value;

  redirect(token ? '/dashboard' : '/login');
}