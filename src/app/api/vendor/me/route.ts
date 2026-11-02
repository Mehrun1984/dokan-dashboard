import { NextRequest, NextResponse } from 'next/server';
import { getCurrentVendor } from '@/lib/vendorSession';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vendor = await getCurrentVendor(token);

  if (!vendor.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(vendor, { status: 200 });
}
